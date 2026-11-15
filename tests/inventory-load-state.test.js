const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  INVENTORY_VIEW_KEYS,
  buildInventoryErrorState,
  buildInventoryLoadingState,
  buildInventoryResultState,
} = require('../utils/inventoryLoadState')

const loading = buildInventoryLoadingState(false)
assert.strictEqual(loading.key, INVENTORY_VIEW_KEYS.LOADING)
assert.strictEqual(loading.retainSnapshot, false)

const refreshing = buildInventoryLoadingState(true)
assert.strictEqual(refreshing.key, INVENTORY_VIEW_KEYS.REFRESHING)
assert.strictEqual(refreshing.retainSnapshot, true)

const cache = buildInventoryResultState({
  items: [{ _id: 'cached-item' }],
  source: 'cache',
  permissionState: 'personal',
})
assert.strictEqual(cache.key, INVENTORY_VIEW_KEYS.CACHE)
assert.strictEqual(cache.canRetry, true)

const success = buildInventoryResultState({
  items: [{ _id: 'cloud-item' }],
  source: 'cloud',
  permissionState: 'valid',
})
assert.strictEqual(success.key, INVENTORY_VIEW_KEYS.SUCCESS)
assert.strictEqual(success.showCard, false)

const empty = buildInventoryResultState({
  items: [],
  source: 'cloud',
  permissionState: 'personal',
})
assert.strictEqual(empty.key, INVENTORY_VIEW_KEYS.EMPTY)

const revoked = buildInventoryResultState({
  items: [],
  source: 'cloud',
  permissionState: 'revoked',
})
assert.strictEqual(revoked.key, INVENTORY_VIEW_KEYS.PERMISSION_REVOKED)
assert.match(revoked.title, /家庭权限已失效/)

const permissionError = new Error('request timeout')
permissionError.inventoryAccessUnverified = true
const permissionUnverified = buildInventoryErrorState(permissionError, true)
assert.strictEqual(
  permissionUnverified.key,
  INVENTORY_VIEW_KEYS.PERMISSION_UNVERIFIED,
)
assert.strictEqual(permissionUnverified.retainSnapshot, false)

const stale = buildInventoryErrorState(new Error('network failed'), true)
assert.strictEqual(stale.key, INVENTORY_VIEW_KEYS.ERROR_STALE)
assert.strictEqual(stale.retainSnapshot, true)

const error = buildInventoryErrorState(new Error('network failed'), false)
assert.strictEqual(error.key, INVENTORY_VIEW_KEYS.ERROR)

const root = path.join(__dirname, '..')
const indexPage = fs.readFileSync(path.join(root, 'pages/index/index.js'), 'utf8')
const calendarPage = fs.readFileSync(
  path.join(root, 'pages/calendar/calendar.js'),
  'utf8',
)
const indexTemplate = fs.readFileSync(
  path.join(root, 'pages/index/index.wxml'),
  'utf8',
)
const calendarTemplate = fs.readFileSync(
  path.join(root, 'pages/calendar/calendar.wxml'),
  'utf8',
)

assert.match(indexPage, /getItemsWithFamilyAccessCheckResult\(options\)/)
assert.match(calendarPage, /getItemsWithFamilyAccessCheckResult\(options\)/)
assert.match(indexPage, /handleInventoryRetry\(\)/)
assert.match(calendarPage, /handleInventoryRetry\(\)/)
assert.match(indexTemplate, /wx:if="{{inventoryHasSnapshot}}"/)
assert.match(calendarTemplate, /<block wx:if="{{inventoryHasSnapshot}}">/)
assert.match(indexTemplate, /bindtap="handleInventoryRetry"/)
assert.match(calendarTemplate, /bindtap="handleInventoryRetry"/)

console.log('inventory-load-state: 24 assertions passed')
