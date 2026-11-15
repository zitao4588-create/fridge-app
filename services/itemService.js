const { getTodayString, addDays } = require('../utils/date')
const { normalizeStorageLocation } = require('../utils/constants')
const { getConsumptionType, normalizeQuantityState } = require('../utils/inventory')
const familyService = require('./familyService')

const COLLECTION_NAME = 'items'
const PAGE_SIZE = 20
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

function getDb() {
  if (!wx.cloud) {
    throw new Error('当前环境不支持云开发')
  }

  return wx.cloud.database()
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

  return getDb()
    .collection(COLLECTION_NAME)
    .add({
      data,
    })
    .then((res) => {
      invalidateItemsCache()
      return res
    })
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
    return callFamilyInventory('updateItem', { itemId: id, item: data }).then((res) => {
      invalidateItemsCache()
      return res
    })
  }

  return getDb()
    .collection(COLLECTION_NAME)
    .doc(id)
    .update({
      data,
    })
    .then((res) => {
      invalidateItemsCache()
      return res
    })
}

function deleteItem(id) {
  if (isFamilyMode()) {
    return callFamilyInventory('deleteItem', { itemId: id }).then((res) => {
      invalidateItemsCache()
      return res
    })
  }

  return getDb()
    .collection(COLLECTION_NAME)
    .doc(id)
    .remove()
    .then((res) => {
      invalidateItemsCache()
      return res
    })
}

function consumeItem(id) {
  if (isFamilyMode()) {
    return callFamilyInventory('consumeItem', { itemId: id }).then((res) => {
      invalidateItemsCache()
      return res
    })
  }

  return getItemById(id).then((item) => {
    if (!item) {
      throw new Error('食材不存在或已被移出库存')
    }

    const quantity = normalizeQuantityState(item).quantity
    const shouldDecrease = getConsumptionType(item) === 'decrease'

    if (shouldDecrease) {
      return getDb()
        .collection(COLLECTION_NAME)
        .doc(id)
        .update({
          data: {
            quantity: quantity - 1,
            updatedAt: Date.now(),
          },
        })
        .then(() => {
          invalidateItemsCache()
          return { type: 'decrease', item }
        })
    }

    return deleteItem(id).then(() => ({ type: 'remove', item }))
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

  const item = consumption && consumption.item

  if (!item || !item._id) {
    return Promise.reject(new Error('没有可撤销的库存操作'))
  }

  if (consumption.type === 'decrease') {
    return getDb()
      .collection(COLLECTION_NAME)
      .doc(item._id)
      .update({
        data: {
          quantity: item.quantity,
          updatedAt: Date.now(),
        },
      })
      .then((res) => {
        invalidateItemsCache()
        return res
      })
  }

  const restored = { ...item }
  delete restored._id
  delete restored._openid
  restored.updatedAt = Date.now()

  return getDb()
    .collection(COLLECTION_NAME)
    .doc(item._id)
    .set({ data: restored })
    .then((res) => {
      invalidateItemsCache()
      return res
    })
}

function getItemById(id) {
  if (isFamilyMode()) {
    return callFamilyInventory('getItem', { itemId: id })
      .then((item) => (item ? stripSensitiveLegacyFields(item) : item))
  }

  return getDb()
    .collection(COLLECTION_NAME)
    .doc(id)
    .get()
    .then((res) => {
      if (res.data && (res.data.familyId || res.data.accessMode === 'family')) {
        throw new Error('没有访问该家庭食材的权限')
      }
      return res.data ? stripSensitiveLegacyFields(res.data) : res.data
    })
}

function fetchItemsPage(offset, collected) {
  return getDb()
    .collection(COLLECTION_NAME)
    .skip(offset)
    .limit(PAGE_SIZE)
    .get()
    .then((res) => {
      const items = res.data || []
      const nextItems = collected.concat(items)

      if (items.length < PAGE_SIZE) {
        return nextItems
      }

      return fetchItemsPage(offset + PAGE_SIZE, nextItems)
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

function getExpiringItems(days) {
  const today = getTodayString()
  const endDate = addDays(today, days)

  return getItems().then((items) =>
    items.filter(
      (item) => item.expireDate >= today && item.expireDate <= endDate,
    ),
  )
}

function searchItems(keyword, filters) {
  return getItems().then((items) => {
    const safeKeyword = String(keyword || '').trim().toLowerCase()
    const category = filters && filters.category
    const storageLocation = filters && filters.storageLocation

    return items.filter((item) => {
      const matchedKeyword =
        !safeKeyword || item.name.toLowerCase().includes(safeKeyword)
      const matchedCategory = !category || item.category === category
      const matchedLocation =
        !storageLocation || item.storageLocation === storageLocation

      return matchedKeyword && matchedCategory && matchedLocation
    })
  })
}

function clearItems() {
  if (isFamilyMode()) {
    return callFamilyInventory('clearItems').then((res) => {
      invalidateItemsCache()
      return res
    })
  }

  return getItems({ forceRefresh: true })
    .then((items) => {
      return items.reduce((task, item) => {
        return task.then(() => deleteItem(item._id))
      }, Promise.resolve())
    })
    .then((res) => {
      invalidateItemsCache()
      return res
    })
}

module.exports = {
  clearItems,
  consumeItem,
  createItem,
  deleteItem,
  getExpiringItems,
  getItemById,
  getItems,
  getItemsLoadResult,
  getItemsWithFamilyAccessCheck,
  getItemsWithFamilyAccessCheckResult,
  invalidateItemsCache,
  searchItems,
  undoConsume,
  updateItem,
}
