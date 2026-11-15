const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')

function pageRuntime(relative, replacements, wx = {}) {
  const filename = path.resolve(__dirname, '..', relative)
  const actualRequire = createRequire(filename)
  let definition
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    Page(page) { definition = page },
    require(name) { return replacements[name] || actualRequire(name) },
    wx, setTimeout, clearTimeout,
  })
  return {
    ...definition,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(patch, done) { Object.assign(this.data, patch); if (done) done() },
  }
}

async function run() {
  let rejectLoad
  const pending = new Promise((_, reject) => { rejectLoad = reject })
  const itemService = { getItemsWithFamilyAccessCheckResult: () => pending }
  const home = pageRuntime('pages/index/index.js', { '../../services/itemService': itemService })
  home.data.inventoryHasSnapshot = true
  home.inventoryItems = [{ _id: 'synthetic-item', name: '合成测试' }]
  Object.assign(home.data, {
    foodDetailVisible: true, selectedFood: home.inventoryItems[0],
    listPanelVisible: true, listPanelGroups: [{ items: home.inventoryItems }],
    draggingFood: home.inventoryItems[0], draggingFoodVisible: true,
    undoConsumeVisible: true,
  })
  home.lastConsumption = { undoToken: 'synthetic-event' }
  const loading = home.loadItems({ verifyFamilyAccess: true })
  assert.equal(home.data.inventoryHasSnapshot, false)
  assert.equal(home.data.foodDetailVisible, false)
  assert.equal(home.data.selectedFood, null)
  assert.equal(home.data.draggingFood, null)
  assert.equal(home.data.listPanelVisible, false)
  assert.equal(home.lastConsumption, null)
  const error = new Error('synthetic permission failure')
  error.inventoryAccessUnverified = true
  rejectLoad(error)
  await loading
  assert.equal(home.data.selectedFood, null)
  assert.equal(home.data.inventoryView.key, 'permission-unverified')

  let resolveConsume
  const delayedConsume = pageRuntime('pages/index/index.js', {
    '../../services/itemService': {
      consumeItem: () => new Promise(resolve => { resolveConsume = resolve }),
      getItemsWithFamilyAccessCheckResult: async () => { throw error },
    },
  })
  delayedConsume.inventoryLoadRequestId = 1
  delayedConsume.consumeFood({ _id: 'synthetic-stale', name: '不应重新显示的食材', quantity: 2 })
  await delayedConsume.loadItems({ verifyFamilyAccess: true })
  resolveConsume({ type: 'decrease', undoToken: 'synthetic-stale-event' })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(delayedConsume.data.undoConsumeVisible, false)
  assert.equal(delayedConsume.data.noticeMessage, '')
  assert.equal(delayedConsume.lastConsumption, null)
  assert.equal(delayedConsume.data.consuming, false)

  const rows = Array.from({ length: 100 }, (_, index) => ({
    _id: `synthetic-${index}`, name: '合成牛奶', category: '乳制品',
    expireDate: '2030-01-01', storageLocation: '冷藏', quantity: 3, quantityTracked: true,
  }))
  const loaded = pageRuntime('pages/index/index.js', {
    '../../services/itemService': { getItemsLoadResult: async () => ({ items: rows, source: 'cloud', permissionState: 'personal' }) },
  })
  const patches = []
  const originalSetData = loaded.setData
  loaded.setData = function (patch) { patches.push(patch); originalSetData.call(this, patch) }
  await loaded.loadItems()
  assert.equal(loaded.data.itemCount, 100)
  assert.equal(loaded.inventoryItems.length, 100)
  assert.equal(loaded.data.homeZones.reduce((n, zone) => n + zone.items.length, 0), 100)
  assert.ok(patches.every(patch => !Object.hasOwn(patch, 'allItems')))

  let state = null
  let clearCount = 0
  let dialog
  const management = pageRuntime('pages/data-management/data-management.js', {
    '../../services/familyService': { refreshFamilyState: async () => state },
    '../../services/itemService': { clearItems: async () => { clearCount++ } },
  }, { showModal(options) { dialog = options }, showToast() {} })
  await management.loadScope()
  management.handleClearAll()
  await dialog.success({ confirm: false })
  assert.equal(clearCount, 0)
  await dialog.success({ confirm: true })
  assert.equal(clearCount, 1)
  state = { family: { id: 'synthetic-family' }, membership: { role: 'editor' } }
  await management.loadScope()
  assert.equal(management.data.canClear, false)
  state.membership.role = 'owner'
  await management.loadScope()
  management.handleClearAll()
  state = null
  await dialog.success({ confirm: true })
  assert.equal(clearCount, 1, 'changed inventory scope must not clear personal inventory')
  assert.equal(management.data.canClear, false)
  console.log('v2.1 page behavior: permission lifecycle, payload and clear-scope checks passed')
}

run().catch(error => { console.error(error); process.exitCode = 1 })
