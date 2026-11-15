// Build a new, explicit v2.1 release directory without modifying the V3 candidate.
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const destination = path.resolve(process.argv[2] || '')
if (!process.argv[2] || destination === root || fs.existsSync(destination)) {
  throw new Error('Provide a new, empty destination path; existing directories are never overwritten.')
}

function write(relative, content) {
  const target = path.join(destination, relative)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content)
}

function copy(relative) {
  const source = path.join(root, relative)
  const stat = fs.lstatSync(source)
  if (stat.isSymbolicLink()) throw new Error(`Unexpected symlink: ${relative}`)
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(source)) {
      if (['node_modules', 'miniprogram_npm', '.DS_Store'].includes(name)) continue
      copy(path.join(relative, name))
    }
  } else if (!relative.endsWith('.DS_Store')) {
    write(relative, fs.readFileSync(source))
  }
}

function replaceOnce(source, oldText, nextText) {
  if (source.split(oldText).length !== 2) throw new Error('V3 source changed; review the v2.1 extraction before rebuilding.')
  return source.replace(oldText, nextText)
}

// Validate transformations before creating any output.
let form = fs.readFileSync(path.join(root, 'pkg-add/item-form/item-form.js'), 'utf8')
form = replaceOnce(form, "const captureImageService = require('../../services/captureImageService')\n", '')
form = replaceOnce(form, "const {\n  validateConfirmationForm,\n} = require('../../utils/captureConfirmation')\n", '')
form = replaceOnce(form, '    this.bindRecognitionPreset()\n', '')
form = replaceOnce(form, "    const isPhotoFallback = options.entry === 'photoFallback'\n", '')
form = replaceOnce(form, "      entryNotice: isPhotoFallback\n        ? '照片没有上传或保存，识别也没有伪装成功。请手动填写并确认食材信息。'\n        : '',\n", '')
form = replaceOnce(form, "\n    if (isPhotoFallback) {\n      wx.setNavigationBarTitle({ title: '手动补录食品' })\n    }", '')
const lifecycleStart = form.indexOf('  onUnload() {')
const lifecycleEnd = form.indexOf('  onShareAppMessage()', lifecycleStart)
if (lifecycleStart < 0 || lifecycleEnd < 0) throw new Error('Missing capture lifecycle boundaries')
form = form.slice(0, lifecycleStart) + form.slice(lifecycleEnd)
const dataEnd = form.indexOf('  onLoad(')
if (dataEnd < 0) throw new Error('Missing form data boundary')
let formData = form.slice(0, dataEnd)
for (const field of ["    entryNotice: '',\n", "    captureId: '',\n", '    retainImageRequested: false,\n', '    attachmentFinalized: false,\n']) {
  formData = replaceOnce(formData, field, '')
}
form = formData + form.slice(dataEnd)
form = replaceOnce(form, '    let itemSaved = false\n', '')
const submitStart = form.indexOf('      .then((result) => {', form.indexOf('  handleSubmit()'))
if (submitStart < 0 || !form.endsWith('  },\n})\n')) throw new Error('Missing capture save boundary')
form = form.slice(0, submitStart) + `      .then(() => {
        if (!this.data.isEdit) rememberRecentFood(formToSave)
        wx.hideLoading()
        this.setData({ saving: false })
        wx.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 400)
      })
      .catch(() => {
        wx.hideLoading()
        this.setData({ saving: false })
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
  },
})
`

let home = fs.readFileSync(path.join(root, 'pages/index/index.js'), 'utf8')
home = replaceOnce(home, "const QUICK_CAPTURE_URL = '/pkg-add/quick-capture/quick-capture'\n", '')
const addStart = home.indexOf('  handleZoneAdd(event) {')
const addEnd = home.indexOf('  handleSearchInput(event)', addStart)
if (addStart < 0 || addEnd < 0) throw new Error('Missing add-entry boundary')
home = home.slice(0, addStart) + `  handleZoneAdd(event) {
    const location = encodeURIComponent(event.currentTarget.dataset.location || '')
    wx.navigateTo({ url: \`\${ITEM_FORM_URL}?storageLocation=\${location}&smartRecommend=1\` })
  },

` + home.slice(addEnd)

let about = fs.readFileSync(path.join(root, 'pages/about/about.wxml'), 'utf8')
about = replaceOnce(about,
  '当前只提供一图一件的非生成式文字候选，所有结果都要由你确认后才能保存。暂不开放生成式视觉、AI 菜谱、条形码扫描、支付会员、登录页或社区功能；后续新增能力会先确认主体资质、微信类目和隐私边界。',
  'v2.1 提供手动录入、临期查看和私有家庭共享，重点完善库存权限、加载恢复与问题反馈。拍照识别、AI 菜谱、条形码扫描、支付会员、登录页和社区功能尚未开放。')
let template = fs.readFileSync(path.join(root, 'pkg-add/item-form/item-form.wxml'), 'utf8')
template = replaceOnce(template, '    <view wx:if="{{entryNotice}}" class="entry-notice" aria-role="alert">\n      <text class="entry-notice-title">已安全转为手动填写</text>\n      <text class="entry-notice-copy">{{entryNotice}}</text>\n    </view>\n\n', '')

const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json')))
app.subPackages = [{ root: 'pkg-add', pages: ['item-form/item-form'] }]
const config = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json')))
config.projectname = 'fridge-v2.1-release'
config.setting.packNpmManually = false
config.setting.packNpmRelationList = []
config.setting.urlCheck = true
config.packOptions = { ignore: [
  { type: 'folder', value: 'cloudfunctions' },
  { type: 'file', value: 'RELEASE_NOTES.md' },
], include: [] }

fs.mkdirSync(destination, { recursive: true })
for (const entry of ['app.js', 'app.wxss', 'sitemap.json', 'pages', 'custom-tab-bar', 'images', 'styles', 'pkg-add/item-form', 'cloudfunctions/familyInventory']) copy(entry)
for (const name of ['itemService', 'familyService', 'reminderService']) copy(`services/${name}.js`)
for (const name of ['constants', 'date', 'foodLexicon', 'inventory', 'inventoryLoadState', 'familyOutcome', 'mealRadar', 'status', 'visualAssets']) copy(`utils/${name}.js`)
write('app.json', JSON.stringify(app, null, 2) + '\n')
write('project.config.json', JSON.stringify(config, null, 2) + '\n')
write('pages/index/index.js', home)
write('pages/about/about.wxml', about)
write('pkg-add/item-form/item-form.js', form)
write('pkg-add/item-form/item-form.wxml', template)
write('RELEASE_NOTES.md', '# 冰箱小雷达 2.1.0\n\n改善库存权限确认、加载失败恢复、家庭消耗撤销和问题反馈；清空库存移至关于页的数据管理。此版本不开放拍照或OCR。\n\n该目录由 scripts/prepare-v21-release.js 从当前工作区生成；原V3候选保留。仅familyInventory需要单独部署，提醒云函数不在本次目录中。\n')
console.log(JSON.stringify({ destination, version: '2.1.0', captureEnabled: false }))
