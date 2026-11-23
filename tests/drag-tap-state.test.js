const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')

const ROOT = path.resolve(__dirname, '..')
const TRAY = { left: 100, right: 200, top: 600, bottom: 700 }

function loadHomePage(itemService = {}) {
  const filename = path.join(ROOT, 'pages/index/index.js')
  const actualRequire = createRequire(filename)
  let definition
  const wx = {
    showToast() {},
    createSelectorQuery() {
      const query = {
        select() { return query },
        boundingClientRect(callback) { query.callback = callback; return query },
        exec() { query.callback(TRAY) },
      }
      return query
    },
  }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    Page(page) { definition = page },
    require(name) {
      return name === '../../services/itemService' ? itemService : actualRequire(name)
    },
    wx,
    setTimeout() { return 0 },
    clearTimeout() {},
  })
  const page = {
    ...definition,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(patch, done) { Object.assign(this.data, patch); if (done) done() },
  }
  page.inventoryLoadRequestId = 1
  page.inventoryItems = [{ _id: 'milk', name: '牛奶' }]
  return page
}

const target = { currentTarget: { dataset: { id: 'milk' } } }
const at = (x, y) => [{ clientX: x, clientY: y }]

function touchStart(page) { page.handleFoodTouchStart({ ...target, touches: at(10, 10) }) }
function longPress(page) { page.handleFoodLongPress({ ...target, touches: at(10, 10) }) }
function touchEnd(page, x = 10, y = 10) { page.handleFoodTouchEnd({ ...target, changedTouches: at(x, y) }) }
function tap(page) { page.handleFoodTap(target) }
function closeDetail(page) { page.handleCloseFoodDetail() }

test('长按拖动结束后没有跟随 tap：下一次正常点击第一次就能打开详情', () => {
  const page = loadHomePage()
  touchStart(page)
  longPress(page)
  assert.equal(page.data.draggingFoodVisible, true)
  touchEnd(page) // 松手在餐盘外，微信不派发 tap
  assert.equal(page.data.draggingFoodVisible, false)

  touchStart(page) // 用户的下一次点击
  tap(page)
  assert.equal(page.data.foodDetailVisible, true)
})

test('同一次手势里紧跟的 tap 仍会被吞掉，不会在拖动后误开详情', () => {
  const page = loadHomePage()
  touchStart(page)
  longPress(page)
  touchEnd(page)
  tap(page) // 部分基础库会在长按后补发 tap
  assert.equal(page.data.foodDetailVisible, false)

  touchStart(page)
  tap(page)
  assert.equal(page.data.foodDetailVisible, true)
  closeDetail(page)
})

test('touchcancel 结束的拖动同样不会影响下一次点击', () => {
  const page = loadHomePage()
  touchStart(page)
  longPress(page)
  page.handleFoodTouchEnd({ ...target, changedTouches: [] }) // touchcancel 也绑定到这个处理函数
  assert.equal(page.data.draggingFoodVisible, false)

  touchStart(page)
  tap(page)
  assert.equal(page.data.foodDetailVisible, true)
})

test('拖到餐盘仍触发消耗，之后的点击也正常', async () => {
  const consumed = []
  const page = loadHomePage({
    consumeItem: async (id) => { consumed.push(id); return { type: 'remove', undoToken: 'e' } },
    getItemsLoadResult: async () => ({ items: page.inventoryItems, source: 'cloud', permissionState: 'personal' }),
  })
  touchStart(page)
  longPress(page)
  page.handleFoodTouchMove({ touches: at(150, 650) })
  assert.equal(page.data.dragOverTray, true)
  touchEnd(page, 150, 650)
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(consumed, ['milk'])

  touchStart(page)
  tap(page)
  assert.equal(page.data.foodDetailVisible, true)
})

test('普通点击不受影响；模板绑定了 touchstart 以按手势生命周期复位', () => {
  const page = loadHomePage()
  touchStart(page)
  tap(page)
  assert.equal(page.data.foodDetailVisible, true)

  const wxml = fs.readFileSync(path.join(ROOT, 'pages/index/index.wxml'), 'utf8')
  const chip = wxml.slice(wxml.indexOf('class="food-chip"'), wxml.indexOf('aria-role="button"', wxml.indexOf('class="food-chip"')))
  assert.match(chip, /bindtouchstart="handleFoodTouchStart"/)
  assert.match(chip, /bindlongpress="handleFoodLongPress"/)
  assert.match(chip, /bindtouchend="handleFoodTouchEnd"/)
  assert.match(chip, /bindtouchcancel="handleFoodTouchEnd"/)

  const js = fs.readFileSync(path.join(ROOT, 'pages/index/index.js'), 'utf8')
  const guardBlock = js.slice(js.indexOf('handleFoodTouchStart()'), js.indexOf('handleFoodLongPress('))
  assert.doesNotMatch(guardBlock, /setTimeout/, '不能用固定延时复位点击抑制')
})
