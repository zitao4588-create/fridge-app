const backend = require('./backendService')
const { normalizeStorageLocation } = require('../utils/constants')
const { normalizeQuantityState } = require('../utils/inventory')
const familyService = require('./familyService')

const PAGE_SIZE = 100
// 库存轻缓存：覆盖首页/日历等多页 onShow 的重复全量读取，降低云数据库读次数。
// 所有写操作（增/改/删/清空）都会立即失效缓存，TTL 仅用于兜底跨设备改动。
const ITEMS_CACHE_TTL = 10 * 1000

let itemsCache = null
let itemsCacheAt = 0
let itemsCacheScope = ''
let cacheRevision = 0
const pendingLoads = new Map()
const pendingAccessChecks = new Map()

function invalidateItemsCache() {
  cacheRevision += 1
  pendingLoads.clear()
  pendingAccessChecks.clear()
  itemsCache = null
  itemsCacheAt = 0
  itemsCacheScope = ''
}

function writePersonal(action, payload) {
  return backend.personal(action, payload).then((result) => {
    invalidateItemsCache()
    return result
  })
}

function isFamilyMode() {
  return Boolean(familyService.readCachedFamilyState())
}

function getInventoryScope() {
  const state = familyService.readCachedFamilyState()
  return state && state.family ? `family:${state.family.id}` : 'personal'
}

function callFamilyInventory(action, payload) {
  const scope = getInventoryScope()
  return familyService.callFamilyFunction(action, payload).catch((error) => {
    if (scope === getInventoryScope() && (error.code === 'NOT_IN_FAMILY' || error.code === 'FAMILY_UNAVAILABLE')) {
      familyService.writeCachedFamilyState(null)
    }
    throw error
  })
}

function cleanItemPayload(payload) {
  const quantityState = normalizeQuantityState(payload)
  const shelfLifeDays =
    payload.shelfLifeDays === '' || payload.shelfLifeDays === undefined
      ? undefined
      : Number(payload.shelfLifeDays)

  return {
    name: String(payload.name || '').trim(),
    category: payload.category || '其他',
    quantityTracked: quantityState.quantityTracked,
    quantity: quantityState.quantity,
    // 保留旧字段以兼容历史代码；v2.0 不再让用户填写或展示单位。
    unit: '',
    productionDate: payload.productionDate || '',
    shelfLifeDays:
      Number.isFinite(shelfLifeDays) && shelfLifeDays > 0
        ? shelfLifeDays
        : undefined,
    expireDate: payload.expireDate || '',
    storageLocation: normalizeStorageLocation(payload.storageLocation),
    note: String(payload.note || '').trim(),
    source: payload.source || 'manual',
    barcode: payload.barcode || '',
    parseConfidence:
      typeof payload.parseConfidence === 'number'
        ? payload.parseConfidence
        : undefined,
    parseStatus: payload.parseStatus || '',
  }
}

function stripSensitiveLegacyFields(item = {}) {
  const safeItem = { ...item }
  delete safeItem.parseRawText
  delete safeItem.imageCaptureId
  return safeItem
}

function decorateItems(items) {
  return items.map((item) => {
    const safeItem = stripSensitiveLegacyFields(item)
    const quantityState = normalizeQuantityState(safeItem)
    return {
      ...safeItem,
      ...quantityState,
      storageLocation: normalizeStorageLocation(safeItem.storageLocation),
    }
  }).sort((left, right) => {
    if (left.expireDate !== right.expireDate) {
      return left.expireDate.localeCompare(right.expireDate)
    }

    return (right.createdAt || 0) - (left.createdAt || 0)
  })
}

function createItem(payload) {
  const now = Date.now()
  const data = {
    ...cleanItemPayload(payload),
    accessMode: 'personal',
    createdAt: now,
    updatedAt: now,
  }

  if (!data.name || !data.expireDate) {
    return Promise.reject(new Error('食品名称和过期日期不能为空'))
  }

  if (isFamilyMode()) {
    return callFamilyInventory('createItem', { item: data }).then((res) => {
      invalidateItemsCache()
      return res
    })
  }

  return writePersonal('createItem', { item: data })
}

function updateItem(id, payload) {
  const data = {
    ...cleanItemPayload(payload),
    updatedAt: Date.now(),
  }

  if (!data.name || !data.expireDate) {
    return Promise.reject(new Error('食品名称和过期日期不能为空'))
  }

  if (isFamilyMode()) {
    return callFamilyInventory('updateItem', { itemId: id, item: data, expectedUpdatedAt: payload.updatedAt ?? null }).then((res) => {
      invalidateItemsCache()
      return res
    })
  }

  return writePersonal('updateItem', { id, item: data, expectedUpdatedAt: payload.updatedAt ?? null })
}

function deleteItem(id) {
  if (isFamilyMode()) {
    return callFamilyInventory('deleteItem', { itemId: id }).then((res) => {
      invalidateItemsCache()
      return res
    })
  }

  return writePersonal('deleteItem', { id })
}

function consumeItem(id) {
  if (!isFamilyMode()) return writePersonal('consumeItem', { id })
  return callFamilyInventory('consumeItem', { itemId: id }).then((res) => {
    invalidateItemsCache()
    return res
  })
}

function undoConsume(consumption) {
  if (consumption && consumption.undoToken) {
    return callFamilyInventory('undoConsume', {
      undoToken: consumption.undoToken,
    }).then((res) => {
      invalidateItemsCache()
      return res
    })
  }
  if (consumption && consumption.personalUndoToken) {
    return writePersonal('undoConsume', { token: consumption.personalUndoToken })
  }
  return Promise.reject(new Error('没有可撤销的库存操作'))
}

function getItemById(id) {
  if (isFamilyMode()) {
    return callFamilyInventory('getItem', { itemId: id })
      .then((item) => (item ? stripSensitiveLegacyFields(item) : item))
  }
  return backend.personal('getItem', { id })
    .then((result) => (result.data ? stripSensitiveLegacyFields(result.data) : result.data))
}

function fetchItemsPage(offset, collected, revision, canRetry = true) {
  return backend.personal('listItems', { offset, pageSize: PAGE_SIZE, revision })
    .then((res) => {
      const items = res.data || []
      const nextItems = collected.concat(items)

      if (res.hasMore === false || items.length < PAGE_SIZE) {
        return nextItems
      }

      return fetchItemsPage(offset + PAGE_SIZE, nextItems, res.revision, false)
    })
    .catch(error => {
      if (canRetry && error.code === 'LIST_CHANGED') return fetchItemsPage(0, [], undefined, false)
      throw error
    })
}

function createItemsLoadResult(items, source, permissionState) {
  return {
    items,
    source,
    permissionState,
    cachedAt: source === 'cache' ? itemsCacheAt : Date.now(),
  }
}

function writeItemsCache(items, scope) {
  itemsCache = items
  itemsCacheAt = Date.now()
  itemsCacheScope = scope
  return items
}

function getItemsLoadResult(options = {}) {
  const scope = getInventoryScope()
  const revision = cacheRevision
  const key = `${scope}:${options.forceRefresh === true}:${revision}`
  if (pendingLoads.has(key)) return pendingLoads.get(key)
  const request = loadItemsResult(options, scope, revision).finally(() => {
    if (pendingLoads.get(key) === request) pendingLoads.delete(key)
  })
  pendingLoads.set(key, request)
  return request
}

function loadItemsResult(options, inventoryScope, revision) {
  const forceRefresh = options.forceRefresh === true
  const familyMode = isFamilyMode()
  const isFresh =
    itemsCache &&
    itemsCacheScope === inventoryScope &&
    Date.now() - itemsCacheAt < ITEMS_CACHE_TTL

  if (!forceRefresh && isFresh) {
    return Promise.resolve(
      createItemsLoadResult(
        itemsCache,
        'cache',
        familyMode ? 'valid' : 'personal',
      ),
    )
  }

  if (familyMode) {
    return callFamilyInventory('listItems')
      .then(decorateItems)
      .then((items) => {
        if (revision !== cacheRevision || inventoryScope !== getInventoryScope()) {
          const error = new Error('库存状态已变化，请重试')
          error.inventoryAccessUnverified = true
          throw error
        }
        writeItemsCache(items, inventoryScope)
        return createItemsLoadResult(items, 'cloud', 'valid')
      })
      .catch((error) => {
        if (error.code !== 'NOT_IN_FAMILY' && error.code !== 'FAMILY_UNAVAILABLE') {
          throw error
        }
        return fetchItemsPage(0, [])
          .then((items) =>
            items.filter((item) => !item.familyId && item.accessMode !== 'family'),
          )
          .then(decorateItems)
          .then((items) => {
            if (revision !== cacheRevision || getInventoryScope() !== 'personal') {
              const error = new Error('库存状态已变化，请重试')
              error.inventoryAccessUnverified = true
              throw error
            }
            writeItemsCache(items, getInventoryScope())
            return createItemsLoadResult(items, 'cloud', 'revoked')
          })
      })
  }

  return fetchItemsPage(0, [])
    .then((items) =>
      items.filter((item) => !item.familyId && item.accessMode !== 'family'),
    )
    .then(decorateItems)
    .then((items) => {
      if (revision !== cacheRevision || inventoryScope !== getInventoryScope()) {
        const error = new Error('库存状态已变化，请重试')
        error.inventoryAccessUnverified = true
        throw error
      }
      writeItemsCache(items, inventoryScope)
      return createItemsLoadResult(items, 'cloud', 'personal')
    })
}

function getItems(options = {}) {
  return getItemsLoadResult(options).then((result) => result.items)
}

function getItemsWithFamilyAccessCheckResult(options = {}) {
  const key = `${getInventoryScope()}:${options.forceRefresh === true}:${cacheRevision}`
  if (pendingAccessChecks.has(key)) return pendingAccessChecks.get(key)
  const hadFamily = isFamilyMode() || Boolean(itemsCache && itemsCacheScope.startsWith('family:'))
  const request = familyService.refreshFamilyState()
    .then((state) => getItemsLoadResult(options).then((result) => ({
      ...result,
      permissionState: !state && hadFamily ? 'revoked' : result.permissionState,
    })))
    .catch((error) => {
      invalidateItemsCache()
      if (familyService.isFamilyAccessRevoked(error)) {
        return getItemsLoadResult({ ...options, forceRefresh: true }).then(
          (result) => ({ ...result, permissionState: 'revoked' }),
        )
      }
      error.inventoryAccessUnverified = true
      throw error
    })
    .finally(() => {
      if (pendingAccessChecks.get(key) === request) pendingAccessChecks.delete(key)
    })
  pendingAccessChecks.set(key, request)
  return request
}

function getItemsWithFamilyAccessCheck(options = {}) {
  return getItemsWithFamilyAccessCheckResult(options).then(
    (result) => result.items,
  )
}

function clearItems() {
  if (isFamilyMode()) {
    return callFamilyInventory('clearItems').then((res) => {
      invalidateItemsCache()
      return res
    })
  }

  return writePersonal('clearItems')
}

module.exports = {
  clearItems,
  consumeItem,
  createItem,
  deleteItem,
  getItemById,
  getItems,
  getItemsLoadResult,
  getItemsWithFamilyAccessCheck,
  getItemsWithFamilyAccessCheckResult,
  invalidateItemsCache,
  undoConsume,
  updateItem,
}
