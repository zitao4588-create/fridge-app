const assert = require('assert')
const fs = require('fs')
const path = require('path')

const backendServicePath = require.resolve('../services/backendService')
const familyServicePath = require.resolve('../services/familyService')
const itemServicePath = require.resolve('../services/itemService')

function createRuntime() {
  const storage = new Map()
  const calls = []
  let familyHandler = () => Promise.reject(new Error('未配置家庭服务响应'))
  let personalItems = []
  let personalError = null

  global.wx = {
    getStorageSync(key) {
      return storage.get(key)
    },
    setStorageSync(key, value) {
      storage.set(key, value)
    },
    removeStorageSync(key) {
      storage.delete(key)
    },
  }

  delete require.cache[backendServicePath]
  delete require.cache[familyServicePath]
  delete require.cache[itemServicePath]

  require.cache[backendServicePath] = {
    id: backendServicePath,
    filename: backendServicePath,
    loaded: true,
    exports: {
      family(action, payload = {}) {
        calls.push(action)
        return familyHandler({ action, ...payload })
      },
      personal(action) {
        if (personalError) return Promise.reject(personalError)
        if (action === 'listItems') {
          return Promise.resolve({ data: personalItems, hasMore: false, revision: '' })
        }
        return Promise.resolve({ data: null })
      },
    },
  }

  const familyService = require('../services/familyService')
  const itemService = require('../services/itemService')

  return {
    calls,
    familyService,
    itemService,
    setFamilyHandler(handler) {
      familyHandler = handler
    },
    setPersonalItems(items) {
      personalItems = items
    },
    setPersonalError(error) {
      personalError = error
    },
  }
}

function familyState() {
  return {
    family: { id: 'family-a', status: 'active' },
    membership: { id: 'member-a', role: 'editor' },
  }
}

function ok(data) {
  return Promise.resolve(data)
}

function denied(code) {
  const error = new Error('没有家庭访问权限')
  error.code = code
  return Promise.reject(error)
}

async function run() {
  const indexPageSource = fs.readFileSync(
    path.join(__dirname, '../pages/index/index.js'),
    'utf8',
  )
  const calendarPageSource = fs.readFileSync(
    path.join(__dirname, '../pages/calendar/calendar.js'),
    'utf8',
  )
  assert.match(indexPageSource, /loadItems\(\{ verifyFamilyAccess: true \}\)/)
  assert.match(indexPageSource, /buildInventoryErrorState\(error, hadSnapshot\)/)
  assert.match(calendarPageSource, /loadItems\(\{ verifyFamilyAccess: true \}\)/)
  assert.match(calendarPageSource, /!inventoryView\.retainSnapshot/)

  const warmRuntime = createRuntime()
  warmRuntime.familyService.writeCachedFamilyState(familyState())
  warmRuntime.setFamilyHandler((data) => {
    if (data.action === 'listItems') {
      return ok([{ _id: 'family-item', name: '家庭牛奶', expireDate: '2026-08-01' }])
    }
    return ok(null)
  })
  warmRuntime.setPersonalItems([
    { _id: 'personal-item', name: '个人苹果', expireDate: '2026-08-02' },
  ])

  const cachedFamilyItems = await warmRuntime.itemService.getItems()
  assert.deepStrictEqual(cachedFamilyItems.map((item) => item._id), ['family-item'])

  const removedLoadResult =
    await warmRuntime.itemService.getItemsWithFamilyAccessCheckResult()
  const itemsAfterRemoval = removedLoadResult.items
  assert.deepStrictEqual(itemsAfterRemoval.map((item) => item._id), ['personal-item'])
  assert.strictEqual(removedLoadResult.permissionState, 'revoked')
  assert.strictEqual(removedLoadResult.source, 'cloud')
  assert.strictEqual(warmRuntime.familyService.readCachedFamilyState(), null)
  assert.deepStrictEqual(warmRuntime.calls, ['listItems', 'getFamilyState'])
  assert.strictEqual(
    warmRuntime.familyService.isFamilyAccessRevoked({ code: 'NOT_IN_FAMILY' }),
    true,
  )
  assert.strictEqual(
    warmRuntime.familyService.isFamilyAccessRevoked({ code: 'FAMILY_UNAVAILABLE' }),
    true,
  )

  const coldRuntime = createRuntime()
  coldRuntime.familyService.writeCachedFamilyState(familyState())
  coldRuntime.setFamilyHandler(() => denied('NOT_IN_FAMILY'))
  coldRuntime.setPersonalItems([
    { _id: 'cold-personal', name: '个人面包', expireDate: '2026-08-03' },
  ])

  const coldStartResult =
    await coldRuntime.itemService.getItemsWithFamilyAccessCheckResult()
  const coldStartItems = coldStartResult.items
  assert.deepStrictEqual(coldStartItems.map((item) => item._id), ['cold-personal'])
  assert.strictEqual(coldStartResult.permissionState, 'revoked')
  assert.strictEqual(coldRuntime.familyService.readCachedFamilyState(), null)

  const timeoutRuntime = createRuntime()
  timeoutRuntime.familyService.writeCachedFamilyState(familyState())
  timeoutRuntime.setFamilyHandler((data) => {
    if (data.action === 'listItems') {
      return ok([{ _id: 'stale-family', name: '旧家庭库存', expireDate: '2026-08-04' }])
    }
    return Promise.reject(new Error('request timeout'))
  })

  await timeoutRuntime.itemService.getItems()
  await assert.rejects(
    () => timeoutRuntime.itemService.getItemsWithFamilyAccessCheck(),
    (error) => error.inventoryAccessUnverified === true,
  )
  assert.deepStrictEqual(timeoutRuntime.familyService.readCachedFamilyState(), familyState())

  timeoutRuntime.setFamilyHandler((data) =>
    data.action === 'getFamilyState'
      ? ok(familyState())
      : ok([{ _id: 'fresh-family', name: '家庭酸奶', expireDate: '2026-08-05' }]),
  )
  timeoutRuntime.setPersonalItems([
    { _id: 'should-not-load', name: '不应读取个人库存', expireDate: '2026-08-05' },
  ])
  const refreshedResult =
    await timeoutRuntime.itemService.getItemsWithFamilyAccessCheckResult()
  const refreshedItems = refreshedResult.items
  assert.deepStrictEqual(refreshedItems.map((item) => item._id), ['fresh-family'])
  assert.strictEqual(refreshedResult.permissionState, 'valid')
  assert.strictEqual(refreshedResult.source, 'cloud')
  assert.deepStrictEqual(timeoutRuntime.calls, [
    'listItems',
    'getFamilyState',
    'getFamilyState',
    'listItems',
  ])

  const orphanedCacheRuntime = createRuntime()
  orphanedCacheRuntime.familyService.writeCachedFamilyState(familyState())
  orphanedCacheRuntime.setFamilyHandler(() =>
    ok([{ _id: 'orphaned-family', name: '旧家庭鸡蛋', expireDate: '2026-08-06' }]),
  )
  await orphanedCacheRuntime.itemService.getItems()
  orphanedCacheRuntime.familyService.writeCachedFamilyState(null)
  orphanedCacheRuntime.setFamilyHandler(() => ok(null))
  orphanedCacheRuntime.setPersonalError(new Error('personal database unavailable'))

  await assert.rejects(
    () => orphanedCacheRuntime.itemService.getItemsWithFamilyAccessCheck(),
    (error) => error.inventoryAccessUnverified === true,
  )
  assert.strictEqual(orphanedCacheRuntime.familyService.readCachedFamilyState(), null)
  assert.deepStrictEqual(orphanedCacheRuntime.calls, ['listItems', 'getFamilyState'])

  const discovery = createRuntime()
  discovery.setFamilyHandler((data) => data.action === 'getFamilyState'
    ? ok(familyState())
    : ok([{ _id: 'discovered', name: '家庭库存', expireDate: '2026-09-09' }]))
  const [first, second] = await Promise.all([
    discovery.itemService.getItemsWithFamilyAccessCheckResult(),
    discovery.itemService.getItemsWithFamilyAccessCheckResult(),
  ])
  assert.strictEqual(first.items[0]._id, 'discovered')
  assert.deepStrictEqual(first, second)
  assert.deepStrictEqual(discovery.calls, ['getFamilyState', 'listItems'])
  await discovery.itemService.getItemsWithFamilyAccessCheckResult()
  assert.deepStrictEqual(discovery.calls, ['getFamilyState', 'listItems', 'getFamilyState'])

  const unknown = createRuntime()
  unknown.setFamilyHandler(() => Promise.reject(new Error('network unavailable')))
  await assert.rejects(unknown.itemService.getItemsWithFamilyAccessCheckResult(),
    (error) => error.inventoryAccessUnverified === true)

  const racing = createRuntime()
  racing.familyService.writeCachedFamilyState(familyState())
  let resolveOld
  racing.setFamilyHandler(() => new Promise((resolve) => { resolveOld = resolve }))
  const old = racing.itemService.getItemsLoadResult()
  const merged = racing.itemService.getItemsLoadResult()
  assert.strictEqual(old, merged)
  racing.itemService.invalidateItemsCache()
  racing.setFamilyHandler(() => ok([{ _id: 'new', name: '新库存', expireDate: '2026-09-09' }]))
  await racing.itemService.getItemsLoadResult()
  resolveOld([{ _id: 'old', name: '旧库存', expireDate: '2026-09-09' }])
  await assert.rejects(old, (error) => error.inventoryAccessUnverified === true)
  assert.strictEqual((await racing.itemService.getItemsLoadResult()).items[0]._id, 'new')

  const scopeRace = createRuntime()
  scopeRace.familyService.writeCachedFamilyState(familyState())
  let resolveScope
  scopeRace.setFamilyHandler(() => new Promise((resolve) => { resolveScope = resolve }))
  const beforeSwitch = scopeRace.itemService.getItemsLoadResult()
  scopeRace.familyService.writeCachedFamilyState({ ...familyState(), family: { id: 'family-b' } })
  resolveScope([])
  await assert.rejects(beforeSwitch, (error) => error.inventoryAccessUnverified === true)

  const stateRace = createRuntime()
  let resolveState
  stateRace.setFamilyHandler(() => new Promise((resolve) => { resolveState = resolve }))
  const stateRequest = stateRace.familyService.refreshFamilyState()
  stateRace.familyService.writeCachedFamilyState(familyState())
  resolveState(null)
  await assert.rejects(stateRequest, (error) => error.code === 'INVENTORY_SCOPE_CHANGED')
  assert.deepStrictEqual(stateRace.familyService.readCachedFamilyState(), familyState())

  const refreshModes = createRuntime()
  refreshModes.familyService.writeCachedFamilyState(familyState())
  const resolvers = []
  refreshModes.setFamilyHandler(() => new Promise((resolve) => resolvers.push(resolve)))
  const ordinary = refreshModes.itemService.getItemsLoadResult()
  const forced = refreshModes.itemService.getItemsLoadResult({ forceRefresh: true })
  assert.notStrictEqual(ordinary, forced)
  assert.deepStrictEqual(refreshModes.calls, ['listItems', 'listItems'])
  resolvers.forEach((resolve) => resolve([]))
  await Promise.all([ordinary, forced])

  delete require.cache[backendServicePath]
  delete require.cache[familyServicePath]
  delete require.cache[itemServicePath]
  console.log('family-cache-permission: permission, discovery and request race checks passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
