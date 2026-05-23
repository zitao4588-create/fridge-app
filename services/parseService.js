const { addDays, getTodayString } = require('../utils/date')

const DAIRY_PREFILL_RESULT = {
  source: 'photo',
  confidence: 0.76,
  rawText: '常用乳制品信息预填',
  fields: {
    name: '原味酸奶',
    category: '乳制品',
    quantity: 1,
    unit: '盒',
    productionDate: getTodayString(),
    shelfLifeDays: 21,
    expireDate: addDays(getTodayString(), 21),
    storageLocation: '冷藏',
    note: '请按包装信息核对后保存',
    imageFileId: '',
  },
}

const DRINK_PREFILL_RESULT = {
  source: 'barcode',
  confidence: 0.86,
  rawText: '常见饮品信息预填',
  fields: {
    name: '低糖乌龙茶',
    category: '饮料',
    quantity: 1,
    unit: '瓶',
    productionDate: '',
    shelfLifeDays: '',
    expireDate: addDays(getTodayString(), 180),
    storageLocation: '门架',
    note: '实际过期日期请按包装信息确认',
    barcode: '',
  },
}

function calculateExpireDate(productionDate, shelfLifeDays) {
  const days = Number(shelfLifeDays)

  if (!productionDate || !Number.isFinite(days) || days <= 0) {
    return ''
  }

  return addDays(productionDate, days)
}

function normalizeParseResult(result) {
  const fields = result.fields || result.result || {}

  return {
    source: result.source || result.type || 'manual',
    confidence: Number(result.confidence || 0),
    rawText: result.rawText || '',
    fields: {
      name: fields.name || '',
      category: fields.category || '其他',
      quantity: fields.quantity || 1,
      unit: fields.unit || '份',
      productionDate: fields.productionDate || '',
      shelfLifeDays: fields.shelfLifeDays || '',
      expireDate:
        fields.expireDate ||
        calculateExpireDate(fields.productionDate, fields.shelfLifeDays),
      storageLocation: fields.storageLocation || '冷藏',
      note: fields.note || '',
      barcode: fields.barcode || result.barcode || '',
      imageFileId: fields.imageFileId || result.imageFileId || '',
    },
  }
}

function createParseLog(type, normalizedResult) {
  if (!wx.cloud) {
    return Promise.resolve()
  }

  const db = wx.cloud.database()
  const fields = normalizedResult.fields

  return db
    .collection('parseLogs')
    .add({
      data: {
        type,
        imageFileId: fields.imageFileId || '',
        barcode: fields.barcode || '',
        result: {
          name: fields.name,
          category: fields.category,
          productionDate: fields.productionDate,
          shelfLifeDays: fields.shelfLifeDays,
          expireDate: fields.expireDate,
        },
        confidence: normalizedResult.confidence,
        rawText: normalizedResult.rawText,
        status: 'success',
        createdAt: Date.now(),
      },
    })
    .catch(() => null)
}

function parseByPhoto() {
  const fallback = normalizeParseResult(DAIRY_PREFILL_RESULT)

  if (!wx.cloud) {
    return Promise.resolve(fallback)
  }

  return wx.cloud
    .callFunction({
      name: 'parseFoodImage',
      data: {
        imageFileId: '',
      },
    })
    .then((res) => ({
      result: normalizeParseResult(res.result || DAIRY_PREFILL_RESULT),
      loggedByCloud: true,
    }))
    .catch(() => ({
      result: fallback,
      loggedByCloud: false,
    }))
    .then(({ result, loggedByCloud }) => {
      if (!loggedByCloud) {
        createParseLog('photo', result)
      }

      return result
    })
}

function parseByBarcode() {
  const fallback = normalizeParseResult(DRINK_PREFILL_RESULT)

  if (!wx.cloud) {
    return Promise.resolve(fallback)
  }

  return wx.cloud
    .callFunction({
      name: 'parseBarcode',
      data: {
        barcode: '',
      },
    })
    .then((res) => ({
      result: normalizeParseResult(res.result || DRINK_PREFILL_RESULT),
      loggedByCloud: true,
    }))
    .catch(() => ({
      result: fallback,
      loggedByCloud: false,
    }))
    .then(({ result, loggedByCloud }) => {
      if (!loggedByCloud) {
        createParseLog('barcode', result)
      }

      return result
    })
}

function getDairyPrefillResult() {
  return Promise.resolve(normalizeParseResult(DAIRY_PREFILL_RESULT))
}

function getDrinkPrefillResult() {
  return Promise.resolve(normalizeParseResult(DRINK_PREFILL_RESULT))
}

module.exports = {
  calculateExpireDate,
  getDairyPrefillResult,
  getDrinkPrefillResult,
  normalizeParseResult,
  parseByBarcode,
  parseByPhoto,
}
