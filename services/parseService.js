const { addDays, getTodayString } = require('../utils/date')
const { normalizeStorageLocation } = require('../utils/constants')

const PARSE_CACHE_PREFIX = 'fridge_parse_payload'

function normalizeOptionalStorageLocation(location) {
  const value = String(location || '').trim()

  return value ? normalizeStorageLocation(value) : ''
}

function getRecommendedStorageLocation(fields = {}) {
  const category = fields.category || ''
  const name = String(fields.name || '')

  if (category === '蔬菜' || category === '水果') {
    return '果蔬抽屉'
  }

  if (
    category === '饮料' ||
    category === '调料' ||
    name.includes('茶') ||
    name.includes('可乐') ||
    name.includes('雪碧') ||
    name.includes('果汁') ||
    name.includes('饮料') ||
    name.includes('矿泉水') ||
    name.includes('汽水') ||
    name.includes('酱油') ||
    name.includes('醋')
  ) {
    return '门架'
  }

  if (
    category === '速冻' ||
    name.includes('速冻') ||
    name.includes('冻') ||
    name.includes('冰')
  ) {
    return '冷冻'
  }

  if (
    category === '肉蛋' &&
    (name.includes('牛肉') ||
      name.includes('鸡胸') ||
      name.includes('猪肉') ||
      name.includes('虾'))
  ) {
    return '冷冻'
  }

  return '冷藏'
}

function createFoodPhotoMockResult(options = {}) {
  const today = getTodayString()

  return withRecognitionContext(
    {
      source: 'photo',
      confidence: 0.78,
      recommendedStorageLocation: '冷藏',
      rawText: '拍食品 mock 识别：盒装草莓',
      fields: {
        name: '盒装草莓',
        category: '水果',
        quantity: 1,
        unit: '盒',
        productionDate: today,
        shelfLifeDays: 5,
        expireDate: addDays(today, 5),
        storageLocation: '冷藏',
        note: '第一阶段为 mock 识别，请按实物状态核对',
        imageFileId: options.imageFileId || '',
        tempFilePath: options.tempFilePath || '',
      },
    },
    options,
  )
}

function createPackageMockResult(options = {}) {
  const today = getTodayString()

  return withRecognitionContext(
    {
      source: 'package',
      confidence: 0.74,
      recommendedStorageLocation: '冷藏',
      rawText: '拍包装说明 mock 识别：冷鲜鸡胸肉，保质期 7 天',
      fields: {
        name: '冷鲜鸡胸肉',
        category: '肉蛋',
        quantity: 1,
        unit: '袋',
        productionDate: today,
        shelfLifeDays: 7,
        expireDate: addDays(today, 7),
        storageLocation: '冷藏',
        note: '请按包装生产日期和保质期核对',
        imageFileId: options.imageFileId || '',
        tempFilePath: options.tempFilePath || '',
      },
    },
    options,
  )
}

function createSmartManualResult(options = {}) {
  return withRecognitionContext(
    {
      source: 'manual',
      confidence: 0.62,
      smartRecommend: true,
      recommendedStorageLocation: '冷藏',
      rawText: '手动输入名称后进行 mock 分区推荐',
      fields: {
        name: '',
        category: '其他',
        quantity: 1,
        unit: '份',
        productionDate: '',
        shelfLifeDays: '',
        expireDate: '',
        storageLocation: '冷藏',
        note: '',
      },
    },
    options,
  )
}

function createReceiptMockPayload(options = {}) {
  const today = getTodayString()
  const rawItems = [
    {
      name: '原味酸奶',
      category: '乳制品',
      quantity: 2,
      unit: '盒',
      productionDate: today,
      shelfLifeDays: 21,
      expireDate: addDays(today, 21),
      storageLocation: '冷藏',
      recommendedStorageLocation: '冷藏',
      note: '小票 mock 识别，请核对数量和日期',
    },
    {
      name: '速冻水饺',
      category: '速冻',
      quantity: 1,
      unit: '袋',
      productionDate: '',
      shelfLifeDays: '',
      expireDate: addDays(today, 120),
      storageLocation: '冷冻',
      recommendedStorageLocation: '冷冻',
      note: '小票 mock 识别，请按包装补充生产日期',
    },
    {
      name: '低糖乌龙茶',
      category: '饮料',
      quantity: 3,
      unit: '瓶',
      productionDate: '',
      shelfLifeDays: '',
      expireDate: addDays(today, 180),
      storageLocation: '门架',
      recommendedStorageLocation: '门架',
      note: '小票 mock 识别，请核对实际保质期',
    },
  ]

  const items = rawItems.map((item, index) => {
    const normalized = withRecognitionContext(
      {
        source: 'receipt',
        confidence: index === 0 ? 0.79 : 0.72,
        recommendedStorageLocation: item.recommendedStorageLocation,
        rawText: '购物小票 mock 识别',
        fields: item,
      },
      {},
    )

    return {
      id: `receipt-${Date.now()}-${index}`,
      checked: true,
      source: normalized.source,
      confidence: normalized.confidence,
      rawText: normalized.rawText,
      recommendedStorageLocation: normalized.recommendedStorageLocation,
      fields: normalized.fields,
    }
  })

  return {
    source: 'receipt',
    confidence: 0.74,
    rawText: '购物小票 mock 识别：酸奶、速冻水饺、乌龙茶',
    tempFilePath: options.tempFilePath || '',
    imageFileId: options.imageFileId || '',
    items,
  }
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
  const recommendedStorageLocation = normalizeOptionalStorageLocation(
    result.recommendedStorageLocation ||
      fields.recommendedStorageLocation ||
      fields.recommendedLocation,
  )

  return {
    source: result.source || result.type || 'manual',
    confidence: Number(result.confidence || 0),
    rawText: result.rawText || '',
    providerStatus: result.providerStatus || '',
    fallbackReason: result.fallbackReason || '',
    smartRecommend: Boolean(
      result.smartRecommend ||
        result.smartManual ||
        result.mode === 'smart-manual',
    ),
    recommendedStorageLocation:
      recommendedStorageLocation || getRecommendedStorageLocation(fields),
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
      storageLocation: normalizeStorageLocation(
        fields.storageLocation || recommendedStorageLocation || '冷藏',
      ),
      note: fields.note || '',
      barcode: fields.barcode || result.barcode || '',
      imageFileId: fields.imageFileId || result.imageFileId || '',
      tempFilePath: fields.tempFilePath || result.tempFilePath || '',
    },
  }
}

function createPhotoFallbackByMode(options = {}) {
  const mode = options.mode || options.source || options.type

  if (mode === 'package') {
    return createPackageMockResult(options)
  }

  return createFoodPhotoMockResult(options)
}

function withRecognitionContext(result, options = {}) {
  const normalized = normalizeParseResult(result)
  const recommendedStorageLocation = normalizeOptionalStorageLocation(
    result.recommendedStorageLocation ||
      normalized.recommendedStorageLocation ||
      getRecommendedStorageLocation(normalized.fields),
  )
  const preferredStorageLocation = normalizeOptionalStorageLocation(
    options.preferredStorageLocation || options.storageLocation,
  )

  return {
    ...normalized,
    providerStatus: normalized.providerStatus,
    fallbackReason: normalized.fallbackReason,
    recommendedStorageLocation,
    fields: {
      ...normalized.fields,
      storageLocation:
        preferredStorageLocation ||
        normalized.fields.storageLocation ||
        recommendedStorageLocation,
    },
  }
}

function normalizeReceiptPayload(payload = {}, options = {}) {
  const sourceItems = Array.isArray(payload.items) ? payload.items : []
  const imageFileId = payload.imageFileId || options.imageFileId || ''
  const tempFilePath = payload.tempFilePath || options.tempFilePath || ''
  const items = sourceItems.map((item, index) => {
    const normalized = withRecognitionContext(
      {
        source: item.source || 'receipt',
        confidence: item.confidence || payload.confidence || 0,
        rawText: item.rawText || payload.rawText || '',
        recommendedStorageLocation: item.recommendedStorageLocation || '',
        providerStatus: item.providerStatus || payload.providerStatus || '',
        fallbackReason: item.fallbackReason || payload.fallbackReason || '',
        fields: {
          ...(item.fields || item.result || item),
          imageFileId:
            (item.fields && item.fields.imageFileId) ||
            item.imageFileId ||
            imageFileId,
          tempFilePath:
            (item.fields && item.fields.tempFilePath) ||
            item.tempFilePath ||
            tempFilePath,
        },
      },
      options,
    )

    return {
      id: item.id || `receipt-${Date.now()}-${index}`,
      checked: item.checked !== false,
      source: normalized.source,
      confidence: normalized.confidence,
      rawText: normalized.rawText,
      recommendedStorageLocation: normalized.recommendedStorageLocation,
      providerStatus: normalized.providerStatus,
      fallbackReason: normalized.fallbackReason,
      fields: normalized.fields,
    }
  })

  return {
    source: 'receipt',
    confidence: Number(payload.confidence || 0),
    rawText: payload.rawText || '',
    tempFilePath,
    imageFileId,
    providerStatus: payload.providerStatus || '',
    fallbackReason: payload.fallbackReason || '',
    items,
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
          storageLocation: fields.storageLocation,
          recommendedStorageLocation:
            normalizedResult.recommendedStorageLocation || '',
        },
        confidence: normalizedResult.confidence,
        rawText: normalizedResult.rawText,
        providerStatus: normalizedResult.providerStatus || '',
        fallbackReason: normalizedResult.fallbackReason || '',
        status: 'success',
        createdAt: Date.now(),
      },
    })
    .catch(() => null)
}

function createReceiptParseLog(payload) {
  if (!wx.cloud) {
    return Promise.resolve()
  }

  const db = wx.cloud.database()

  return db
    .collection('parseLogs')
    .add({
      data: {
        type: 'receipt',
        imageFileId: payload.imageFileId || '',
        result: payload.items.map((item) => ({
          name: item.fields.name,
          category: item.fields.category,
          expireDate: item.fields.expireDate,
          storageLocation: item.fields.storageLocation,
          recommendedStorageLocation: item.recommendedStorageLocation,
        })),
        confidence: payload.confidence,
        rawText: payload.rawText,
        providerStatus: payload.providerStatus || '',
        fallbackReason: payload.fallbackReason || '',
        status: 'success',
        createdAt: Date.now(),
      },
    })
    .catch(() => null)
}

function getMediaTempPath(res) {
  if (res.tempFiles && res.tempFiles.length > 0) {
    return res.tempFiles[0].tempFilePath || res.tempFiles[0].path || ''
  }

  if (res.tempFilePaths && res.tempFilePaths.length > 0) {
    return res.tempFilePaths[0]
  }

  return ''
}

function chooseImageForParse() {
  // 拍照 / 相册录入为后续版本（需企业主体）功能。
  // 当前版本不调用相册或摄像头隐私接口，以便声明「未采集用户隐私」。
  // 接回拍照识别时，在此恢复选择媒体的接口调用。
  return Promise.reject(new Error('当前版本未开放拍照录入'))
}

function getFileExt(filePath) {
  const matched = String(filePath || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/)

  return matched ? matched[1].toLowerCase() : 'jpg'
}

function uploadParseImage(tempFilePath) {
  if (!tempFilePath || !wx.cloud || !wx.cloud.uploadFile) {
    return Promise.resolve('')
  }

  const random = Math.random().toString(16).slice(2)
  const ext = getFileExt(tempFilePath)

  return wx.cloud
    .uploadFile({
      cloudPath: `fridge-items/${Date.now()}-${random}.${ext}`,
      filePath: tempFilePath,
    })
    .then((res) => res.fileID || '')
    .catch(() => '')
}

function notifyProcessingStart(options = {}) {
  if (typeof options.onProcessingStart === 'function') {
    options.onProcessingStart()
  }
}

function parseByPhoto(options = {}) {
  const fallback = createPhotoFallbackByMode(options)
  const mode = options.mode || options.source || 'food'

  if (!wx.cloud) {
    return Promise.resolve(fallback)
  }

  return wx.cloud
    .callFunction({
      name: 'parseFoodImage',
      data: {
        mode,
        imageFileId: options.imageFileId || '',
        tempFilePath: options.tempFilePath || '',
      },
    })
    .then((res) => ({
      result: withRecognitionContext(res.result || fallback, options),
      loggedByCloud: true,
    }))
    .catch(() => ({
      result: fallback,
      loggedByCloud: false,
    }))
    .then(({ result, loggedByCloud }) => {
      if (!loggedByCloud) {
        createParseLog(result.source || mode, result)
      }

      return result
    })
}

function parseFoodPhoto(options = {}) {
  return chooseImageForParse().then((tempFilePath) => {
    notifyProcessingStart(options)

    return uploadParseImage(tempFilePath).then((imageFileId) =>
      parseByPhoto({
        ...options,
        imageFileId,
        tempFilePath,
      }),
    )
  })
}

function parsePackagePhoto(options = {}) {
  return chooseImageForParse().then((tempFilePath) => {
    notifyProcessingStart(options)

    return uploadParseImage(tempFilePath).then((imageFileId) =>
      parseByPhoto({
        ...options,
        mode: 'package',
        imageFileId,
        tempFilePath,
      }),
    )
  })
}

function parseReceiptPhoto(options = {}) {
  return chooseImageForParse().then((tempFilePath) => {
    notifyProcessingStart(options)

    return uploadParseImage(tempFilePath).then((imageFileId) => {
      const payload = createReceiptMockPayload({
        ...options,
        imageFileId,
        tempFilePath,
      })

      if (!wx.cloud) {
        createReceiptParseLog(payload)
        return payload
      }

      return wx.cloud
        .callFunction({
          name: 'parseFoodImage',
          data: {
            mode: 'receipt',
            imageFileId,
            tempFilePath,
          },
        })
        .then((res) => ({
          payload: normalizeReceiptPayload(res.result || payload, {
            ...options,
            imageFileId,
            tempFilePath,
          }),
          loggedByCloud: true,
        }))
        .catch(() => ({
          payload,
          loggedByCloud: false,
        }))
        .then(({ payload: nextPayload, loggedByCloud }) => {
          if (!loggedByCloud) {
            createReceiptParseLog(nextPayload)
          }

          return nextPayload
        })
    })
  })
}

function createCacheKey(type = 'single') {
  const random = Math.random().toString(16).slice(2)

  return `${PARSE_CACHE_PREFIX}_${type}_${Date.now()}_${random}`
}

function saveTempParsePayload(payload, type = 'single') {
  const cacheKey = createCacheKey(type)

  wx.setStorageSync(cacheKey, payload)

  return cacheKey
}

function readTempParsePayload(cacheKey) {
  if (!cacheKey) {
    return null
  }

  return wx.getStorageSync(cacheKey) || null
}

function removeTempParsePayload(cacheKey) {
  if (cacheKey) {
    wx.removeStorageSync(cacheKey)
  }
}

function isCancelError(error) {
  const message = String(
    (error && (error.errMsg || error.message)) || error || '',
  ).toLowerCase()

  return message.includes('cancel') || message.includes('取消')
}

function formatFallbackReason(reason) {
  const message = String(reason || '').trim()

  if (!message) {
    return ''
  }

  if (message.includes('FRIDGE_ENABLE_REAL_SEARCH')) {
    return '联网搜索暂未启用，已使用预填结果'
  }

  if (
    message.includes('FRIDGE_WSA_API_KEY') ||
    message.includes('FRIDGE_SEARCH_API_KEY')
  ) {
    return '联网搜索密钥未配置，已使用预填结果'
  }

  if (/FRIDGE_[A-Z0-9_]+|[A-Z0-9_]+_API_KEY/.test(message)) {
    return '真实服务暂不可用，已使用预填结果'
  }

  return message
}

function getDairyPrefillResult() {
  return Promise.resolve(createFoodPhotoMockResult())
}

module.exports = {
  calculateExpireDate,
  getDairyPrefillResult,
  getRecommendedStorageLocation,
  formatFallbackReason,
  createSmartManualResult,
  isCancelError,
  normalizeParseResult,
  parseByPhoto,
  parseFoodPhoto,
  parsePackagePhoto,
  parseReceiptPhoto,
  readTempParsePayload,
  removeTempParsePayload,
  saveTempParsePayload,
}
