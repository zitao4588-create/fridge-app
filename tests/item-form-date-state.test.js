const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')

const { addDays, getTodayString } = require('../utils/date')

const FORM_PATH = 'pkg-add/item-form/item-form.js'

function loadForm({ items = {}, saved = [], opener } = {}) {
  const filename = path.resolve(__dirname, '..', FORM_PATH)
  const actualRequire = createRequire(filename)
  const noop = () => {}
  const toasts = []
  const replacements = {
    '../../services/itemService': {
      createItem: async (form) => { saved.push(form); return { _id: 'synthetic-item' } },
      updateItem: async (id, form) => { saved.push(form); return { _id: id } },
      getItemById: async (id) => items[id],
    },
    '../../services/reminderService': { requestAndRecordSubscribeMessage: async () => {} },
  }
  const wx = {
    getStorageSync: () => [], setStorageSync: noop, setNavigationBarTitle: noop,
    showToast: (args) => toasts.push(args.title), showLoading: noop, hideLoading: noop,
    navigateBack: noop, showModal: noop,
  }
  let definition
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    Page(page) { definition = page },
    require(name) { return replacements[name] || actualRequire(name) },
    wx, setTimeout: noop, clearTimeout: noop,
  })
  const page = {
    ...definition,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(patch, done) { Object.assign(this.data, patch); if (done) done() },
  }
  if (opener) page.getOpenerEventChannel = () => opener
  page.toasts = toasts
  return page
}

const today = getTodayString()
const nameEvent = (value) => ({ detail: { value } })
const shelfEvent = (value) => ({ detail: { value } })
const modeEvent = (mode) => ({ currentTarget: { dataset: { mode } } })
const dateEvent = (target, value) => ({ currentTarget: { dataset: { target } }, detail: { value } })
const indexEvent = (index) => ({ currentTarget: { dataset: { index } } })
const flush = async () => { for (let i = 0; i < 20; i += 1) await Promise.resolve() }

test('清空保质期后到期日失效，保存被拦截且错误落在保质期字段', async () => {
  const saved = []
  const form = loadForm({ saved })
  form.onLoad({})
  form.handleNameInput(nameEvent('牛奶'))
  assert.equal(form.data.form.expireDate, addDays(today, 7))

  form.handleShelfLifeInput(shelfEvent(''))
  assert.equal(form.data.form.expireDate, '')
  const message = form.validateForm()
  assert.equal(message, '请填写保质期天数')
  assert.equal(form.data.errors.shelfLifeDays, '请填写保质期天数')

  form.handleSubmit()
  await flush()
  assert.equal(saved.length, 0)
  assert.deepEqual(form.toasts, ['请填写保质期天数'])
})

test('保质期填 0 时界面不再显示旧到期日', () => {
  const form = loadForm()
  form.onLoad({})
  form.handleNameInput(nameEvent('牛奶'))
  form.handleShelfLifeInput(shelfEvent('0'))
  assert.equal(form.data.form.expireDate, '')
  assert.equal(form.validateForm(), '保质期天数需要是正整数')
})

test('生产日缺失时在生产日字段报错', () => {
  const form = loadForm()
  form.onLoad({})
  form.handleNameInput(nameEvent('自制酱料'))
  form.handleShelfLifeInput(shelfEvent('5'))
  assert.equal(form.data.form.expireDate, '')
  assert.equal(form.validateForm(), '请选择生产日期')
  assert.equal(form.data.errors.productionDate, '请选择生产日期')

  form.handleDateConfirm(dateEvent('production', '2026-01-01'))
  assert.equal(form.data.form.expireDate, '2026-01-06')
  assert.equal(form.validateForm(), '')
})

test('手改保质期为 15 天后再改名称，仍是 15 天', async () => {
  const saved = []
  const form = loadForm({ saved })
  form.onLoad({})
  form.handleNameInput(nameEvent('牛奶'))
  form.handleShelfLifeInput(shelfEvent('15'))
  form.handleNameInput(nameEvent('纯牛奶'))

  assert.equal(form.data.form.shelfLifeDays, '15')
  assert.equal(form.data.form.expireDate, addDays(today, 15))
  assert.match(form.data.lexiconHint, /建议7天保质期/)
  assert.doesNotMatch(form.data.lexiconHint, /预填[^；]*7天保质期/)

  form.handleSubmit()
  await flush()
  assert.equal(saved[0].shelfLifeDays, '15')
  assert.equal(saved[0].expireDate, addDays(today, 15))
})

test('手选的品类、分区不被词库覆盖，未动过的字段仍会补全', () => {
  const form = loadForm()
  form.onLoad({})
  form.handleCategoryTap(indexEvent(form.data.categoryOptions.indexOf('其他')))
  form.handleLocationTap(indexEvent(form.data.locationOptions.indexOf('冷冻')))
  form.handleNameInput(nameEvent('番茄'))

  assert.equal(form.data.form.category, '其他')
  assert.equal(form.data.form.storageLocation, '冷冻')
  assert.equal(form.data.form.shelfLifeDays, '7')
  assert.match(form.data.lexiconHint, /^已按「番茄」预填今天为生产日和7天保质期；建议品类「蔬菜」、放果蔬抽屉$/)
})

test('expire 模式下手选的到期日不被保质期或改名清掉', async () => {
  const saved = []
  const form = loadForm({ saved })
  form.onLoad({})
  form.handleNameInput(nameEvent('牛奶'))
  form.handleDateModeTap(modeEvent('expire'))
  form.handleDateConfirm(dateEvent('expire', '2026-12-25'))
  assert.equal(form.data.form.expireDate, '2026-12-25')

  form.handleShelfLifeInput(shelfEvent(''))
  assert.equal(form.data.form.expireDate, '2026-12-25')

  form.handleNameInput(nameEvent('纯牛奶'))
  assert.equal(form.data.dateMode, 'expire')
  assert.equal(form.data.form.expireDate, '2026-12-25')
  assert.equal(form.validateForm(), '')

  form.handleSubmit()
  await flush()
  assert.equal(saved[0].expireDate, '2026-12-25')
})

test('两种模式来回切换各自保留有效内容', () => {
  const form = loadForm()
  form.onLoad({})
  form.handleNameInput(nameEvent('牛奶'))
  const computed = addDays(today, 7)

  form.handleDateModeTap(modeEvent('expire'))
  assert.equal(form.data.form.expireDate, computed, '首次切到 expire 时带上已算好的日期作为起点')
  form.handleDateConfirm(dateEvent('expire', '2026-12-25'))

  form.handleDateModeTap(modeEvent('production'))
  assert.equal(form.data.form.shelfLifeDays, '7')
  assert.equal(form.data.form.expireDate, computed)

  form.handleShelfLifeInput(shelfEvent(''))
  assert.equal(form.data.form.expireDate, '')

  form.handleDateModeTap(modeEvent('expire'))
  assert.equal(form.data.form.expireDate, '2026-12-25')
  assert.equal(form.validateForm(), '')
})

test('expire 模式保存时丢弃与到期日对不上的隐藏保质期', async () => {
  const saved = []
  const form = loadForm({ saved })
  form.onLoad({})
  form.handleNameInput(nameEvent('牛奶'))
  form.handleDateModeTap(modeEvent('expire'))
  form.handleDateConfirm(dateEvent('expire', '2026-12-25'))
  form.handleSubmit()
  await flush()
  assert.equal(saved[0].shelfLifeDays, '')
  assert.equal(saved[0].expireDate, '2026-12-25')
})

test('入口一：从冷藏分区进入新增，提示与实际选中一致', () => {
  const form = loadForm()
  form.onLoad({ storageLocation: encodeURIComponent('冷藏'), smartRecommend: '1' })
  form.handleNameInput(nameEvent('番茄'))

  assert.equal(form.data.form.storageLocation, '冷藏')
  assert.equal(form.data.form.category, '蔬菜')
  assert.doesNotMatch(form.data.lexiconHint, /预填[^；]*果蔬抽屉/)
  // 推荐行已显示「推荐放果蔬抽屉［采纳］」，提示里不重复
  assert.equal(form.data.showLocationRecommend, true)
  assert.equal(form.data.recommendedStorageLocation, '果蔬抽屉')
  assert.equal(form.data.lexiconHint, '已按「番茄」预填品类、今天为生产日和7天保质期')

  form.handleApplyRecommendedLocation()
  assert.equal(form.data.form.storageLocation, '果蔬抽屉')
  form.handleNameInput(nameEvent('西红柿'))
  assert.equal(form.data.form.storageLocation, '果蔬抽屉')
})

test('入口一（无推荐行）：分区未采用时写成建议', () => {
  const form = loadForm()
  form.onLoad({ storageLocation: encodeURIComponent('冷藏'), name: encodeURIComponent('番茄') })
  assert.equal(form.data.form.storageLocation, '冷藏')
  assert.equal(form.data.showLocationRecommend, false)
  assert.equal(form.data.lexiconHint, '已按「番茄」预填品类、今天为生产日和7天保质期；建议放果蔬抽屉')
})

test('入口二：通用新增，提示里的分区确实被选中', () => {
  const form = loadForm()
  form.onLoad({})
  form.handleNameInput(nameEvent('番茄'))
  assert.equal(form.data.form.storageLocation, '果蔬抽屉')
  assert.equal(form.data.form.category, '蔬菜')
  assert.equal(form.data.form.shelfLifeDays, '7')
  assert.equal(form.data.lexiconHint, '已按「番茄」预填品类、今天为生产日、7天保质期和果蔬抽屉')
})

test('入口三：编辑已有食材，回填原值，改名不触发词库', async () => {
  const form = loadForm({
    items: {
      a: {
        _id: 'a', name: '番茄', category: '其他', storageLocation: '冷藏',
        productionDate: '2026-11-01', shelfLifeDays: 10, expireDate: '2026-11-11',
        quantityTracked: false, quantity: 1, source: 'manual',
      },
    },
  })
  form.onLoad({ id: 'a' })
  await flush()
  assert.equal(form.data.dateMode, 'production')
  assert.equal(form.data.form.expireDate, '2026-11-11')
  assert.equal(form.data.form.storageLocation, '冷藏')
  form.handleNameInput(nameEvent('西红柿'))
  assert.equal(form.data.lexiconHint, '')
  assert.equal(form.data.form.category, '其他')
  assert.equal(form.data.form.storageLocation, '冷藏')
  assert.equal(form.data.form.shelfLifeDays, 10)
})

test('编辑旧数据：已存到期日与生产日+保质期对不上时，原样以 expire 模式展示', async () => {
  const form = loadForm({
    items: {
      b: {
        _id: 'b', name: '酸奶', category: '乳制品', storageLocation: '冷藏',
        productionDate: '2026-11-01', shelfLifeDays: 10, expireDate: '2026-11-20',
      },
      c: { _id: 'c', name: '旧数据', category: '其他', storageLocation: '保鲜', expireDate: '' },
    },
  })
  form.onLoad({ id: 'b' })
  await flush()
  assert.equal(form.data.dateMode, 'expire')
  assert.equal(form.data.form.expireDate, '2026-11-20')

  const legacy = loadForm({
    items: { c: { _id: 'c', name: '旧数据', category: '其他', storageLocation: '保鲜', expireDate: '2026-02-31' } },
  })
  legacy.onLoad({ id: 'c' })
  await flush()
  assert.equal(legacy.data.dateMode, 'expire')
  assert.equal(legacy.validateForm(), '过期日期无效，请重新选择')
})

test('品类默认展示常用 6 项，展开或词库命中次要品类时自动展示全部 12 项', () => {
  const form = loadForm()
  form.onLoad({})
  assert.equal(form.data.showAllCategories, false)
  assert.equal(form.data.visibleCategories.length, 6)

  form.handleToggleCategories()
  assert.equal(form.data.showAllCategories, true)
  assert.equal(form.data.visibleCategories.length, 12)

  form.handleToggleCategories()
  assert.equal(form.data.showAllCategories, false)
  assert.equal(form.data.visibleCategories.length, 6)

  form.handleNameInput(nameEvent('速冻水饺'))
  assert.equal(form.data.form.category, '速冻')
  assert.equal(form.data.showAllCategories, true)
  assert.equal(form.data.visibleCategories.length, 12)

  form.handleCategoryTap({ currentTarget: { dataset: { category: '蔬菜' } } })
  assert.equal(form.data.form.category, '蔬菜')
})
