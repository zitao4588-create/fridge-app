const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')

const ROOT = path.resolve(__dirname, '..')

// 用替身加载首页：替换 itemService，计时器只记录不真正等待。
function loadHomePage(itemService, wx = {}) {
  const filename = path.join(ROOT, 'pages/index/index.js')
  const actualRequire = createRequire(filename)
  let definition
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    Page(page) { definition = page },
    require(name) {
      return name === '../../services/itemService' ? itemService : actualRequire(name)
    },
    wx: { showToast() {}, ...wx },
    setTimeout() { return 0 },
    clearTimeout() {},
  })
  return {
    ...definition,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(patch, done) { Object.assign(this.data, patch); if (done) done() },
  }
}

const flush = () => new Promise((resolve) => setImmediate(resolve))

function createService(consumption) {
  const calls = { consume: [], undo: [] }
  return {
    calls,
    consumeItem: async (id) => { calls.consume.push(id); return consumption },
    undoConsume: async (record) => { calls.undo.push(record) },
    getItemsLoadResult: async () => ({ items: [], source: 'cloud', permissionState: 'personal' }),
  }
}

function openDetail(page, food) {
  page.inventoryLoadRequestId = 1
  page.inventoryItems = [food]
  page.handleFoodTap({ currentTarget: { dataset: { id: food._id } } })
}

test('记了数量：按钮语义是数量减 1，剩余数量取自服务返回值而不是本地旧值', async () => {
  // 本地看到 3，但别人已经改成 5：服务事务内读到 quantityBefore = 5。
  const service = createService({ type: 'decrease', undoToken: 'event-1', quantityBefore: 5 })
  const page = loadHomePage(service)
  const food = { _id: 'milk', name: '牛奶', quantityTracked: true, quantity: 3 }
  openDetail(page, food)

  assert.equal(page.data.foodDetailVisible, true)
  assert.match(page.data.selectedFood.consumeActionText, /数量减 1/)
  assert.doesNotMatch(page.data.selectedFood.consumeActionText, /[个盒瓶份]/)

  let sharedPathUsed = 0
  const originalConsume = page.consumeFood
  page.consumeFood = function (target) { sharedPathUsed++; return originalConsume.call(this, target) }

  page.handleDetailConsume()
  assert.equal(sharedPathUsed, 1, '详情按钮必须走与拖到餐盘相同的 consumeFood')
  assert.equal(page.data.foodDetailVisible, false)
  assert.equal(page.data.selectedFood, null)
  await flush()

  assert.deepEqual(service.calls.consume, ['milk'])
  assert.equal(page.data.noticeMessage, '已用掉「牛奶」1，剩余 4')
  assert.equal(page.data.undoConsumeVisible, true)

  page.handleUndoConsume()
  await flush()
  assert.equal(service.calls.undo.length, 1)
  assert.equal(service.calls.undo[0].undoToken, 'event-1')
  assert.equal(page.data.noticeMessage, '已撤销本次库存变更')
})

test('个人库存：剩余数量来自服务扣减前刚读到的 item', async () => {
  const service = createService({
    type: 'decrease',
    item: { _id: 'egg', quantityTracked: true, quantity: 7 },
  })
  const page = loadHomePage(service)
  openDetail(page, { _id: 'egg', name: '鸡蛋', quantityTracked: true, quantity: 2 })
  page.handleDetailConsume()
  await flush()
  assert.equal(page.data.noticeMessage, '已用掉「鸡蛋」1，剩余 6')
})

test('服务没返回可用数量时，不显示可能错误的剩余数字', async () => {
  const service = createService({ type: 'decrease', undoToken: 'event-2' })
  const page = loadHomePage(service)
  openDetail(page, { _id: 'yogurt', name: '酸奶', quantityTracked: true, quantity: 4 })
  page.handleDetailConsume()
  await flush()
  assert.equal(page.data.noticeMessage, '已用掉「酸奶」，数量减 1')
  assert.doesNotMatch(page.data.noticeMessage, /剩余/)
})

test('没记数量或只剩 1：按钮明确是用完移出', async () => {
  const service = createService({ type: 'remove', undoToken: 'event-3' })
  const page = loadHomePage(service)
  openDetail(page, { _id: 'tofu', name: '豆腐', quantityTracked: false, quantity: 1 })
  assert.match(page.data.selectedFood.consumeActionText, /用完/)
  assert.match(page.data.selectedFood.consumeActionText, /移出/)

  page.handleDetailConsume()
  await flush()
  assert.equal(page.data.noticeMessage, '已将「豆腐」移出库存')

  const last = loadHomePage(createService({ type: 'remove' }))
  openDetail(last, { _id: 'one', name: '最后一份', quantityTracked: true, quantity: 1 })
  assert.match(last.data.selectedFood.consumeActionText, /移出/)
})

test('消耗进行中或食材已不在当前库存时，详情按钮不重复提交', async () => {
  const service = createService({ type: 'remove' })
  const page = loadHomePage(service)
  openDetail(page, { _id: 'a', name: 'A' })
  page.data.consuming = true
  page.handleDetailConsume()
  assert.equal(page.data.foodDetailVisible, true)

  page.data.consuming = false
  page.inventoryItems = []
  page.handleDetailConsume()
  await flush()
  assert.equal(service.calls.consume.length, 0)
})

test('详情模板：用掉为主按钮，有可读屏的关闭入口，拖到餐盘手势仍保留', () => {
  const wxml = fs.readFileSync(path.join(ROOT, 'pages/index/index.wxml'), 'utf8')
  const detail = wxml.slice(wxml.indexOf('<!-- 食品详情 -->'))
  assert.match(detail, /class="detail-btn primary[^"]*"[\s\S]*?bindtap="handleDetailConsume"/)
  assert.ok(
    detail.indexOf('handleDetailConsume') < detail.indexOf('handleEdit'),
    '用掉应排在编辑之前',
  )
  assert.match(detail, /class="detail-btn danger" bindtap="handleDelete"/)
  assert.match(detail, /bindtap="handleCloseFoodDetail" aria-role="button" aria-label="关闭详情"/)
  assert.match(wxml, /bindlongpress="handleFoodLongPress"/)
  assert.match(wxml, /class="consume-tray/)
})
