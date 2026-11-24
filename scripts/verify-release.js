// Validate the unified Mini Program release in root (or a target directory), with synthetic data and no live network/WeChat calls.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')

const root = path.resolve(process.argv[2] || path.resolve(__dirname, '..'))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const app = JSON.parse(read('app.json'))
const routes = app.pages.concat(app.subPackages.flatMap(pkg => pkg.pages.map(page => `${pkg.root}/${page}`)))
assert.equal(routes.length, 9)
assert.deepEqual(app.subPackages, [{ root: 'pkg-add', pages: ['item-form/item-form'] }])
for (const route of routes) {
  for (const ext of ['js', 'json', 'wxml', 'wxss']) assert.ok(fs.existsSync(path.join(root, `${route}.${ext}`)), `${route}.${ext}`)
}

const RUNTIME_ENTRIES = [
  'app.js',
  'app.json',
  'app.wxss',
  'sitemap.json',
  'project.config.json',
  'custom-tab-bar',
  'images',
  'pages',
  'pkg-add',
  'services',
  'styles',
  'utils',
]

function collectFiles(entry) {
  const full = path.join(root, entry)
  if (!fs.existsSync(full)) return []
  const stat = fs.statSync(full)
  if (stat.isFile()) return [entry]
  return fs.readdirSync(full, { recursive: true })
    .map(rel => path.join(entry, rel))
    .filter(rel => fs.statSync(path.join(root, rel)).isFile())
}

const files = RUNTIME_ENTRIES.flatMap(collectFiles)
let frontBytes = 0
let javascriptCount = 0
for (const file of files) {
  if (file.endsWith('.DS_Store')) continue
  frontBytes += fs.statSync(path.join(root, file)).size
  if (!/\.(js|json|wxml|wxss)$/.test(file)) continue
  const source = read(file)
  if (file.endsWith('.js')) {
    new vm.Script(source, { filename: file })
    javascriptCount++
    assert.doesNotMatch(source, /captureImageService|recognitionService|captureConfirmation|quick-capture|capture-confirm|chooseMedia|chooseImage|wx\.cloud/, file)
    for (const [, reference] of source.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
      assert.ok(reference.startsWith('.'), `Unexpected frontend dependency: ${file}: ${reference}`)
      createRequire(path.join(root, file)).resolve(reference)
    }
  }
  if (file.endsWith('.json')) JSON.parse(source)
  if (file.endsWith('.wxss')) {
    for (const [, reference] of source.matchAll(/@import\s+['"]([^'"]+)['"]/g)) {
      assert.ok(fs.existsSync(path.resolve(path.dirname(path.join(root, file)), reference)), `${file}: ${reference}`)
    }
  }
}

const config = JSON.parse(read('project.config.json'))
assert.equal(config.miniprogramRoot, './')
assert.equal(Object.hasOwn(config, 'cloudfunctionRoot'), false)
assert.ok(read('services/backendService.js').includes('https://fridge.playgamelab.cn/fridge-api/v2'))
assert.match(read('pages/about/about.wxml'), /open-type="feedback"/)
assert.match(read('pages/about/about.wxml'), /提交问题反馈/)
assert.match(read('pages/recipes/recipes.wxml'), /bindtap="handleOpenAbout"/)
assert.doesNotMatch(read('pages/about/about.wxml'), /open-type="contact"/)

function loadForm(service) {
  const filename = path.join(root, 'pkg-add/item-form/item-form.js')
  const actualRequire = createRequire(filename)
  let page
  const messages = []
  vm.runInNewContext(read('pkg-add/item-form/item-form.js'), {
    Page(definition) { page = definition },
    require(name) {
      if (name === '../../services/itemService') return service
      if (name === '../../services/reminderService') return { requestAndRecordSubscribeMessage: async () => ({ authorized: false }) }
      return actualRequire(name)
    },
    wx: { getStorageSync: () => [], setStorageSync() {}, setNavigationBarTitle() {}, showLoading() {}, hideLoading() {}, showToast: options => messages.push(options.title), navigateBack() {} },
    setTimeout: callback => callback(),
  })
  page.data = JSON.parse(JSON.stringify(page.data))
  page.setData = patch => Object.assign(page.data, patch)
  return { page, messages }
}

async function run() {
  const saves = []
  const runtime = loadForm({ createItem: async data => saves.push(data), updateItem: async (id, data) => saves.push({ id, ...data }) })
  const { page, messages } = runtime
  page.onLoad({ storageLocation: encodeURIComponent('冷冻') })
  assert.equal(page.data.form.storageLocation, '冷冻')
  page.handleSubmit()
  assert.equal(saves.length, 0)
  assert.equal(messages.at(-1), '请填写食品名称')
  Object.assign(page.data.form, { name: '合成测试食材', expireDate: '2030-01-01', quantityTracked: false })
  page.data.dateMode = 'expire'
  page.data.expireModeDate = page.data.form.expireDate
  page.handleSubmit()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(saves.length, 1)
  assert.equal(saves[0].quantityTracked, false)
  assert.equal(saves[0].source, 'manual')
  assert.equal(page.data.saving, false)
  page.saved = false
  page.data.isEdit = true
  page.data.id = 'synthetic-edit'
  page.data.form.quantityTracked = true
  page.data.form.quantity = 3
  page.handleSubmit()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(saves.length, 2)
  assert.equal(saves[1].id, 'synthetic-edit')
  assert.equal(saves[1].quantity, 3)
  page.data.dateMode = 'production'
  page.data.form.productionDate = '2028-02-28'
  page.handleShelfLifeInput({ detail: { value: '2' } })
  assert.equal(page.data.form.expireDate, '2028-03-01')
  const failed = loadForm({ createItem: async () => { throw new Error('synthetic network error') } })
  Object.assign(failed.page.data.form, { name: '合成失败测试', expireDate: '2030-01-01' })
  failed.page.data.dateMode = 'expire'
  failed.page.data.expireModeDate = failed.page.data.form.expireDate
  failed.page.handleSubmit()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(failed.page.data.saving, false)
  assert.equal(failed.messages.at(-1), '保存失败')
  console.log(JSON.stringify({ directory: root, routes: routes.length, frontendJavascript: javascriptCount, frontendFileBytes: frontBytes, checks: 'syntax, dependencies, routes, no OCR/wx.cloud, add/edit/failure/date: PASS' }, null, 2))
}
run().catch(error => { console.error(error); process.exitCode = 1 })
