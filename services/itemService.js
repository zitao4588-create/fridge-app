const { getTodayString, addDays } = require('../utils/date')
const { normalizeStorageLocation } = require('../utils/constants')

const COLLECTION_NAME = 'items'
const PAGE_SIZE = 20

function getDb() {
  if (!wx.cloud) {
    throw new Error('当前环境不支持云开发')
  }

  return wx.cloud.database()
}

function cleanItemPayload(payload) {
  const quantity = Number(payload.quantity)
  const shelfLifeDays =
    payload.shelfLifeDays === '' || payload.shelfLifeDays === undefined
      ? undefined
      : Number(payload.shelfLifeDays)

  return {
    name: String(payload.name || '').trim(),
    category: payload.category || '其他',
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unit: String(payload.unit || '').trim() || '份',
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
    imageFileId: payload.imageFileId || '',
    parseConfidence:
      typeof payload.parseConfidence === 'number'
        ? payload.parseConfidence
        : undefined,
    parseRawText: payload.parseRawText || '',
    parseStatus: payload.parseStatus || '',
  }
}

function decorateItems(items) {
  return items.map((item) => ({
    ...item,
    storageLocation: normalizeStorageLocation(item.storageLocation),
  })).sort((left, right) => {
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
    createdAt: now,
    updatedAt: now,
  }

  if (!data.name || !data.expireDate) {
    return Promise.reject(new Error('食品名称和过期日期不能为空'))
  }

  return getDb().collection(COLLECTION_NAME).add({
    data,
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

  return getDb().collection(COLLECTION_NAME).doc(id).update({
    data,
  })
}

function deleteItem(id) {
  return getDb().collection(COLLECTION_NAME).doc(id).remove()
}

function getItemById(id) {
  return getDb()
    .collection(COLLECTION_NAME)
    .doc(id)
    .get()
    .then((res) => res.data)
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

function getItems() {
  return fetchItemsPage(0, []).then(decorateItems)
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
  return getItems().then((items) => {
    return items.reduce((task, item) => {
      return task.then(() => deleteItem(item._id))
    }, Promise.resolve())
  })
}

module.exports = {
  clearItems,
  createItem,
  deleteItem,
  getExpiringItems,
  getItemById,
  getItems,
  searchItems,
  updateItem,
}
