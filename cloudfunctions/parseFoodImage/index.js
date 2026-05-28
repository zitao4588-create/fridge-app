const https = require('https')
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const CATEGORY_OPTIONS = [
  '蔬菜',
  '水果',
  '肉蛋',
  '乳制品',
  '饮料',
  '速冻',
  '调料',
  '主食',
  '其他',
]

const STORAGE_LOCATION_OPTIONS = [
  '冷藏',
  '冷冻',
  '门架',
  '果蔬抽屉',
  '变温',
  '其他',
]

const LABEL_FOOD_PRESETS = [
  {
    keywords: ['杨梅'],
    name: '杨梅',
    category: '水果',
    unit: '份',
    shelfLifeDays: 3,
    storageLocation: '冷藏',
  },
  {
    keywords: ['草莓'],
    name: '草莓',
    category: '水果',
    unit: '盒',
    shelfLifeDays: 3,
    storageLocation: '冷藏',
  },
  {
    keywords: ['蓝莓'],
    name: '蓝莓',
    category: '水果',
    unit: '盒',
    shelfLifeDays: 5,
    storageLocation: '冷藏',
  },
  {
    keywords: ['樱桃', '车厘子'],
    name: '车厘子',
    category: '水果',
    unit: '盒',
    shelfLifeDays: 5,
    storageLocation: '冷藏',
  },
  {
    keywords: ['葡萄'],
    name: '葡萄',
    category: '水果',
    unit: '份',
    shelfLifeDays: 5,
    storageLocation: '冷藏',
  },
  {
    keywords: ['酸奶'],
    name: '酸奶',
    category: '乳制品',
    unit: '盒',
    shelfLifeDays: 21,
    storageLocation: '冷藏',
  },
  {
    keywords: ['鸡蛋', '蛋'],
    name: '鸡蛋',
    category: '肉蛋',
    unit: '个',
    shelfLifeDays: 30,
    storageLocation: '冷藏',
  },
]

const GENERIC_LABEL_NAMES = [
  '食品',
  '食物',
  '水果',
  '蔬菜',
  '农产品',
  '盘子',
  '碗',
  '餐具',
  '植物',
  '室内',
]

function isEnabled(value) {
  return String(value || '').toLowerCase() === 'true'
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + Number(days || 0))

  const year = nextDate.getFullYear()
  const month = String(nextDate.getMonth() + 1).padStart(2, '0')
  const day = String(nextDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getTodayString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeMode(event) {
  const mode = String(event.mode || event.source || event.type || 'food')

  if (mode === 'receipt') {
    return 'receipt'
  }

  if (mode === 'package') {
    return 'package'
  }

  return 'food'
}

function normalizeCategory(value) {
  return CATEGORY_OPTIONS.includes(value) ? value : '其他'
}

function inferCategoryFromName(name) {
  const value = String(name || '')

  if (
    value.includes('杨梅') ||
    value.includes('草莓') ||
    value.includes('蓝莓') ||
    value.includes('樱桃') ||
    value.includes('车厘子') ||
    value.includes('葡萄') ||
    value.includes('苹果') ||
    value.includes('香蕉') ||
    value.includes('梨')
  ) {
    return '水果'
  }

  if (
    value.includes('鸡蛋') ||
    value.includes('鸭蛋') ||
    value.includes('牛肉') ||
    value.includes('猪肉') ||
    value.includes('鸡肉') ||
    value.includes('鱼') ||
    value.includes('虾')
  ) {
    return '肉蛋'
  }

  if (value.includes('酸奶') || value.includes('牛奶') || value.includes('奶酪')) {
    return '乳制品'
  }

  if (value.includes('青菜') || value.includes('白菜') || value.includes('番茄')) {
    return '蔬菜'
  }

  return '其他'
}

function isUnknownFoodName(name) {
  const value = String(name || '').trim()

  return (
    !value ||
    value === '未知' ||
    value === '未知食品' ||
    value === '未知食物' ||
    value === '待确认食品' ||
    value.toLowerCase() === 'unknown'
  )
}

function getStorageLocation(fields = {}) {
  const category = fields.category || ''
  const name = String(fields.name || '')

  if (fields.storageLocation && STORAGE_LOCATION_OPTIONS.includes(fields.storageLocation)) {
    return fields.storageLocation
  }

  if (category === '蔬菜' || category === '水果') {
    return '果蔬抽屉'
  }

  if (
    category === '饮料' ||
    category === '调料' ||
    name.includes('茶') ||
    name.includes('可乐') ||
    name.includes('果汁') ||
    name.includes('饮料') ||
    name.includes('矿泉水') ||
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

function normalizeQuantity(value) {
  const quantity = Number(value)

  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

function normalizeShelfLifeDays(value) {
  const days = Number(value)

  return Number.isFinite(days) && days > 0 ? days : ''
}

function normalizeFields(fields = {}, fallback = {}) {
  const today = getTodayString()
  const productionDate = String(fields.productionDate || fallback.productionDate || '')
  const shelfLifeDays = normalizeShelfLifeDays(
    fields.shelfLifeDays || fallback.shelfLifeDays,
  )
  const expireDate =
    fields.expireDate ||
    fallback.expireDate ||
    (productionDate && shelfLifeDays ? addDays(productionDate, shelfLifeDays) : '')
  const normalized = {
    name: String(fields.name || fallback.name || '').trim() || '待确认食品',
    category: normalizeCategory(fields.category || fallback.category),
    quantity: normalizeQuantity(fields.quantity || fallback.quantity),
    unit: String(fields.unit || fallback.unit || '份').trim() || '份',
    productionDate,
    shelfLifeDays,
    expireDate: expireDate || addDays(today, 7),
    storageLocation: STORAGE_LOCATION_OPTIONS.includes(fields.storageLocation)
      ? fields.storageLocation
      : '',
    note: String(fields.note || fallback.note || '').trim(),
    barcode: String(fields.barcode || fallback.barcode || '').trim(),
    imageFileId: String(fields.imageFileId || fallback.imageFileId || '').trim(),
    tempFilePath: String(fields.tempFilePath || fallback.tempFilePath || '').trim(),
  }

  normalized.storageLocation = normalized.storageLocation || getStorageLocation(normalized)

  return normalized
}

function safeRequire(packageName) {
  try {
    return require(packageName)
  } catch (error) {
    return null
  }
}

function getSecretConfig() {
  return {
    secretId: process.env.FRIDGE_SECRET_ID || '',
    secretKey: process.env.FRIDGE_SECRET_KEY || '',
    region: process.env.FRIDGE_REGION || 'ap-guangzhou',
  }
}

function getProviderStatus(error, fallbackReason) {
  if (!error) {
    return {
      providerStatus: 'real',
      fallbackReason: '',
    }
  }

  return {
    providerStatus: 'mock',
    fallbackReason:
      fallbackReason ||
      error.message ||
      error.code ||
      '真实识别暂不可用，已使用 mock 结果',
  }
}

function getImageFileId(event) {
  return String(event.imageFileId || event.fileID || event.fileId || '').trim()
}

function createFoodFallback(event = {}, error = null, fallbackReason = '') {
  const today = getTodayString()
  const fields = normalizeFields(
    {
      name: '待确认食品',
      category: '其他',
      quantity: 1,
      unit: '份',
      productionDate: today,
      shelfLifeDays: 7,
      expireDate: addDays(today, 7),
      storageLocation: '冷藏',
      imageFileId: getImageFileId(event),
      tempFilePath: event.tempFilePath || '',
      note: '真实识别不可用时的待确认结果，请手动填写食品名称',
    },
    {},
  )

  return {
    source: 'photo',
    type: 'photo',
    imageFileId: fields.imageFileId,
    result: fields,
    fields,
    confidence: 0.52,
    rawText: '真实识别暂不可用',
    recommendedStorageLocation: getStorageLocation(fields),
    ...getProviderStatus(error, fallbackReason),
  }
}

function createPackageFallback(event = {}, error = null, fallbackReason = '') {
  const today = getTodayString()
  const fields = normalizeFields(
    {
      name: '冷鲜鸡胸肉',
      category: '肉蛋',
      quantity: 1,
      unit: '袋',
      productionDate: today,
      shelfLifeDays: 7,
      expireDate: addDays(today, 7),
      storageLocation: '冷藏',
      imageFileId: getImageFileId(event),
      tempFilePath: event.tempFilePath || '',
      note: '包装识别预填，请按包装日期核对',
    },
    {},
  )

  return {
    source: 'package',
    type: 'package',
    imageFileId: fields.imageFileId,
    result: fields,
    fields,
    confidence: 0.74,
    rawText: '拍包装说明预填：冷鲜鸡胸肉，保质期 7 天',
    recommendedStorageLocation: getStorageLocation(fields),
    ...getProviderStatus(error, fallbackReason),
  }
}

function createReceiptFallback(event = {}, error = null, fallbackReason = '') {
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
      note: '小票识别预填，请核对数量和日期',
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
      note: '请按包装补充生产日期',
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
      note: '请按包装核对实际保质期',
    },
  ]
  const provider = getProviderStatus(error, fallbackReason)
  const items = rawItems.map((item, index) => {
    const fields = normalizeFields(
      {
        ...item,
        imageFileId: getImageFileId(event),
        tempFilePath: event.tempFilePath || '',
      },
      {},
    )

    return {
      id: `receipt-${Date.now()}-${index}`,
      checked: true,
      source: 'receipt',
      confidence: index === 0 ? 0.79 : 0.72,
      rawText: '购物小票识别预填',
      recommendedStorageLocation: getStorageLocation(fields),
      fields,
      ...provider,
    }
  })

  return {
    source: 'receipt',
    type: 'receipt',
    imageFileId: getImageFileId(event),
    confidence: 0.74,
    rawText: '购物小票识别预填：酸奶、速冻水饺、乌龙茶',
    tempFilePath: event.tempFilePath || '',
    items,
    ...provider,
  }
}

function createFallback(mode, event, error, fallbackReason) {
  if (mode === 'receipt') {
    return createReceiptFallback(event, error, fallbackReason)
  }

  if (mode === 'package') {
    return createPackageFallback(event, error, fallbackReason)
  }

  return createFoodFallback(event, error, fallbackReason)
}

async function downloadImageBase64(imageFileId) {
  if (!imageFileId) {
    throw new Error('缺少图片文件 ID')
  }

  const file = await cloud.downloadFile({
    fileID: imageFileId,
  })
  const buffer = file.fileContent

  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('图片下载失败')
  }

  return buffer.toString('base64')
}

async function callOcr(imageBase64) {
  const { secretId, secretKey, region } = getSecretConfig()

  if (!secretId || !secretKey) {
    throw new Error('未配置 FRIDGE_SECRET_ID/FRIDGE_SECRET_KEY')
  }

  const sdk = safeRequire('tencentcloud-sdk-nodejs-ocr')

  if (!sdk || !sdk.ocr || !sdk.ocr.v20181119) {
    throw new Error('未安装 OCR SDK')
  }

  const client = new sdk.ocr.v20181119.Client({
    credential: {
      secretId,
      secretKey,
    },
    region,
    profile: {
      httpProfile: {
        endpoint: 'ocr.tencentcloudapi.com',
      },
    },
  })
  const response = await client.GeneralBasicOCR({
    ImageBase64: imageBase64,
  })
  const detections = Array.isArray(response.TextDetections)
    ? response.TextDetections
    : []

  return detections
    .map((item) => item.DetectedText)
    .filter(Boolean)
    .join('\n')
}

function isNoTextOcrError(error) {
  const message = String(
    (error && (error.message || error.code || error.Code)) || error || '',
  )

  return /未检测到文本|没有文本|no\s*text|NoText/i.test(message)
}

async function callOcrForMode(mode, imageBase64) {
  try {
    return await callOcr(imageBase64)
  } catch (error) {
    if (mode === 'food' && isNoTextOcrError(error)) {
      return ''
    }

    throw error
  }
}

async function callImageLabels(imageBase64) {
  const { secretId, secretKey, region } = getSecretConfig()

  if (!secretId || !secretKey) {
    return []
  }

  const sdk = safeRequire('tencentcloud-sdk-nodejs-tiia')

  if (!sdk || !sdk.tiia || !sdk.tiia.v20190529) {
    return []
  }

  const client = new sdk.tiia.v20190529.Client({
    credential: {
      secretId,
      secretKey,
    },
    region,
    profile: {
      httpProfile: {
        endpoint: 'tiia.tencentcloudapi.com',
      },
    },
  })

  const results = []
  const addLabel = (label = {}, source = 'label') => {
    const name = label.Name || label.FirstCategory || ''

    if (!name) {
      return
    }

    results.push({
      name,
      confidence: Number(label.Confidence || 0),
      category: label.Parents || label.FirstCategory || label.SecondCategory || '',
      source,
    })
  }
  const addLabelsFromResponse = (response = {}, source = 'label') => {
    ;[
      'Labels',
      'CameraLabels',
      'AlbumLabels',
      'WebLabels',
      'NewsLabels',
      'Products',
    ].forEach((key) => {
      const labels = Array.isArray(response[key]) ? response[key] : []
      labels.forEach((label) => addLabel(label, source))
    })
  }

  await client
    .DetectLabelPro({
      ImageBase64: imageBase64,
    })
    .then((response) => addLabelsFromResponse(response, 'label-pro'))
    .catch(() => null)

  if (typeof client.DetectLabel === 'function') {
    await client
      .DetectLabel({
        ImageBase64: imageBase64,
        Scenes: ['CAMERA', 'ALBUM', 'WEB'],
      })
      .then((response) => addLabelsFromResponse(response, 'label'))
      .catch(() => null)
  }

  if (typeof client.DetectProduct === 'function') {
    await client
      .DetectProduct({
        ImageBase64: imageBase64,
      })
      .then((response) => addLabelsFromResponse(response, 'product'))
      .catch(() => null)
  }

  const byName = new Map()

  results.forEach((label) => {
    const existed = byName.get(label.name)

    if (!existed || label.confidence > existed.confidence) {
      byName.set(label.name, label)
    }
  })

  return Array.from(byName.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 12)
}

function extractJson(text) {
  const content = String(text || '').trim()
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const jsonText = fenced ? fenced[1].trim() : content
  const objectStart = jsonText.indexOf('{')
  const arrayStart = jsonText.indexOf('[')
  const startCandidates = [objectStart, arrayStart].filter((index) => index >= 0)

  if (startCandidates.length === 0) {
    throw new Error('AI 未返回 JSON')
  }

  const start = Math.min(...startCandidates)
  const end = Math.max(jsonText.lastIndexOf('}'), jsonText.lastIndexOf(']'))

  if (end <= start) {
    throw new Error('AI JSON 不完整')
  }

  return JSON.parse(jsonText.slice(start, end + 1))
}

function getCloudBaseEnvId() {
  return (
    process.env.FRIDGE_CLOUDBASE_ENV_ID ||
    process.env.FRIDGE_ENV_ID ||
    process.env.CLOUDBASE_ENV_ID ||
    process.env.TCB_ENV ||
    process.env.SCB_ENV ||
    process.env.WX_CLOUD_ENV ||
    'cloud1-d3g4v0ms8ee56bd94'
  )
}

function getAiProvider() {
  return process.env.FRIDGE_AI_PROVIDER || 'hunyuan-v3'
}

function getAiModelName() {
  return process.env.FRIDGE_AI_MODEL || 'hy3-preview'
}

function getVisionProvider() {
  return process.env.FRIDGE_VISION_PROVIDER || 'cloudbase'
}

function getVisionModelName() {
  return process.env.FRIDGE_VISION_MODEL || 'deepseek-v4-pro'
}

function getAiText(result = {}) {
  return (
    result.text ||
    (result.choices &&
      result.choices[0] &&
      result.choices[0].message &&
      result.choices[0].message.content) ||
    ''
  )
}

function getImageDataUrl(imageBase64) {
  return `data:image/jpeg;base64,${imageBase64}`
}

function getZhipuApiKey() {
  return (
    process.env.FRIDGE_ZHIPU_API_KEY ||
    process.env.ZHIPU_API_KEY ||
    process.env.BIGMODEL_API_KEY ||
    ''
  )
}

function hasZhipuConfig() {
  return !!getZhipuApiKey()
}

function getZhipuBaseUrl() {
  return (
    process.env.FRIDGE_ZHIPU_BASE_URL ||
    process.env.ZHIPU_BASE_URL ||
    process.env.BIGMODEL_BASE_URL ||
    'https://open.bigmodel.cn/api/paas/v4'
  ).replace(/\/$/, '')
}

function getZhipuVisionModelName() {
  return process.env.FRIDGE_ZHIPU_VISION_MODEL || 'glm-4.6v-flash'
}

function getDirectDeepSeekApiKey() {
  return process.env.FRIDGE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || ''
}

function hasDirectDeepSeekConfig() {
  return !!getDirectDeepSeekApiKey()
}

function isDirectDeepSeekVisionEnabled() {
  return isEnabled(process.env.FRIDGE_DEEPSEEK_ENABLE_VISION)
}

function getDirectDeepSeekBaseUrl() {
  return (
    process.env.FRIDGE_DEEPSEEK_BASE_URL ||
    process.env.DEEPSEEK_BASE_URL ||
    'https://api.deepseek.com'
  ).replace(/\/$/, '')
}

function getDirectDeepSeekModelName() {
  return process.env.FRIDGE_DEEPSEEK_MODEL || 'deepseek-v4-flash'
}

function postJson(url, payload, headers = {}) {
  const body = JSON.stringify(payload)
  const target = new URL(url)

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method: 'POST',
        timeout: 45000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        const chunks = []

        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          let data = null

          try {
            data = text ? JSON.parse(text) : null
          } catch (error) {
            data = null
          }

          if (res.statusCode >= 400) {
            const message =
              (data && data.error && data.error.message) ||
              (data && data.message) ||
              text.slice(0, 120) ||
              `HTTP ${res.statusCode}`
            const error = new Error(message)

            error.statusCode = res.statusCode
            reject(error)
            return
          }

          resolve(data)
        })
      },
    )

    req.on('timeout', () => {
      req.destroy(new Error('DeepSeek API 请求超时'))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function callDirectDeepSeek(messages) {
  const apiKey = getDirectDeepSeekApiKey()

  if (!apiKey) {
    throw new Error('未配置 FRIDGE_DEEPSEEK_API_KEY')
  }

  const data = await postJson(
    `${getDirectDeepSeekBaseUrl()}/chat/completions`,
    {
      model: getDirectDeepSeekModelName(),
      messages,
      response_format: {
        type: 'json_object',
      },
      thinking: {
        type: 'disabled',
      },
      stream: false,
    },
    {
      Authorization: `Bearer ${apiKey}`,
    },
  )

  return extractJson(getAiText(data))
}

async function callZhipuVisionFoodAI(imageBase64, ocrText) {
  const apiKey = getZhipuApiKey()

  if (!apiKey) {
    throw new Error('未配置 FRIDGE_ZHIPU_API_KEY')
  }

  const data = await postJson(
    `${getZhipuBaseUrl()}/chat/completions`,
    {
      model: getZhipuVisionModelName(),
      messages: [
        {
          role: 'system',
          content:
            '你是冰箱库存拍照识别助手。只返回 JSON，不要解释。无法确认时也要给出最可能的食品名，并在 note 里提示用户核对。',
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: getImageDataUrl(imageBase64),
              },
            },
            {
              type: 'text',
              text: [
                '请识别图片中的主要食品，并返回 JSON。',
                '返回格式：{"name":"食品名","category":"蔬菜|水果|肉蛋|乳制品|饮料|速冻|调料|主食|其他","quantity":1,"unit":"份","productionDate":"YYYY-MM-DD或空","shelfLifeDays":数字或空,"expireDate":"YYYY-MM-DD或空","storageLocation":"冷藏|冷冻|门架|果蔬抽屉|变温|其他","note":"核对提示"}',
                '如果是杨梅、草莓、蓝莓、葡萄、车厘子等水果，请直接写具体水果名，不要写未知食品。',
                `今天日期：${getTodayString()}`,
                `OCR 文本：${ocrText || '无'}`,
              ].join('\n'),
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 600,
      stream: false,
    },
    {
      Authorization: `Bearer ${apiKey}`,
    },
  )

  return extractJson(getAiText(data))
}

async function callCloudBaseAI(mode, payload) {
  const tcb = safeRequire('@cloudbase/node-sdk')

  if (!tcb) {
    throw new Error('未安装 CloudBase Node SDK')
  }

  const app = tcb.init({
    env: getCloudBaseEnvId(),
    timeout: 60000,
  })
  const model = app.ai().createModel(getAiProvider())
  const result = await model.generateText({
    model: getAiModelName(),
    messages: [
      {
        role: 'system',
        content:
          '你是冰箱库存录入助手。只返回 JSON，不要解释。字段必须适合微信小程序保存。',
      },
      {
        role: 'user',
        content: buildAiPrompt(mode, payload),
      },
    ],
  })

  return extractJson(getAiText(result))
}

async function callVisionFoodAI(imageBase64, ocrText) {
  const tcb = safeRequire('@cloudbase/node-sdk')

  if (!tcb) {
    throw new Error('未安装 CloudBase Node SDK')
  }

  const app = tcb.init({
    env: getCloudBaseEnvId(),
    timeout: 60000,
  })
  const model = app.ai().createModel(getVisionProvider())
  const result = await model.generateText({
    model: getVisionModelName(),
    messages: [
      {
        role: 'system',
        content:
          '你是冰箱库存拍照识别助手。只返回 JSON，不要解释。无法确认时也要给出最可能的食品名，并在 note 里提示用户核对。',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              '请识别图片中的主要食品，并返回 JSON。',
              '返回格式：{"name":"食品名","category":"蔬菜|水果|肉蛋|乳制品|饮料|速冻|调料|主食|其他","quantity":1,"unit":"份","productionDate":"YYYY-MM-DD或空","shelfLifeDays":数字或空,"expireDate":"YYYY-MM-DD或空","storageLocation":"冷藏|冷冻|门架|果蔬抽屉|变温|其他","note":"核对提示"}',
              '如果是杨梅、草莓、蓝莓、葡萄、车厘子等水果，请直接写具体水果名，不要写未知食品。',
              `今天日期：${getTodayString()}`,
              `OCR 文本：${ocrText || '无'}`,
            ].join('\n'),
          },
          {
            type: 'image_url',
            image_url: {
              url: getImageDataUrl(imageBase64),
            },
          },
        ],
      },
    ],
  })

  return extractJson(getAiText(result))
}

async function callDirectDeepSeekVisionFoodAI(imageBase64, ocrText) {
  return callDirectDeepSeek([
    {
      role: 'system',
      content:
        '你是冰箱库存拍照识别助手。只返回 JSON，不要解释。无法确认时也要给出最可能的食品名，并在 note 里提示用户核对。',
    },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: getImageDataUrl(imageBase64),
          },
        },
        {
          type: 'text',
          text: [
            '请识别图片中的主要食品，并返回 JSON。',
            '返回格式：{"name":"食品名","category":"蔬菜|水果|肉蛋|乳制品|饮料|速冻|调料|主食|其他","quantity":1,"unit":"份","productionDate":"YYYY-MM-DD或空","shelfLifeDays":数字或空,"expireDate":"YYYY-MM-DD或空","storageLocation":"冷藏|冷冻|门架|果蔬抽屉|变温|其他","note":"核对提示"}',
            '如果是杨梅、草莓、蓝莓、葡萄、车厘子等水果，请直接写具体水果名，不要写未知食品。',
            `今天日期：${getTodayString()}`,
            `OCR 文本：${ocrText || '无'}`,
          ].join('\n'),
        },
      ],
    },
  ])
}

async function callDirectDeepSeekTextAI(mode, payload) {
  return callDirectDeepSeek([
    {
      role: 'system',
      content:
        '你是冰箱库存录入助手。只返回 JSON，不要解释。字段必须适合微信小程序保存。',
    },
    {
      role: 'user',
      content: buildAiPrompt(mode, payload),
    },
  ])
}

function buildAiPrompt(mode, payload) {
  const baseSchema =
    '{"name":"食品名","category":"蔬菜|水果|肉蛋|乳制品|饮料|速冻|调料|主食|其他","quantity":1,"unit":"份","productionDate":"YYYY-MM-DD或空","shelfLifeDays":数字或空,"expireDate":"YYYY-MM-DD或空","storageLocation":"冷藏|冷冻|门架|果蔬抽屉|变温|其他","note":"核对提示"}'

  if (mode === 'receipt') {
    return [
      '请从购物小票 OCR 文本中抽取 1 到 8 个可能需要放进冰箱的食品。',
      '返回格式：{"items":[字段对象数组],"summary":"一句话摘要"}。',
      `字段对象结构：${baseSchema}`,
      `今天日期：${getTodayString()}`,
      `OCR 文本：${payload.ocrText || '无'}`,
    ].join('\n')
  }

  return [
    mode === 'package'
      ? '请从食品包装 OCR 文本中识别食品信息。'
      : '请结合图片标签和 OCR 文本识别食品信息。',
    `返回格式：${baseSchema}`,
    `今天日期：${getTodayString()}`,
    `图片标签：${JSON.stringify(payload.labels || [])}`,
    `OCR 文本：${payload.ocrText || '无'}`,
  ].join('\n')
}

function normalizeSingleAiResult(mode, aiResult, event, ocrText, labels) {
  const fallback = createFallback(mode, event).fields
  const fields = normalizeFields(
    {
      ...aiResult,
      imageFileId: getImageFileId(event),
      tempFilePath: event.tempFilePath || '',
    },
    fallback,
  )

  if (mode === 'food' && isUnknownFoodName(fields.name)) {
    throw new Error('AI 未识别到具体食品')
  }

  return {
    source: mode === 'package' ? 'package' : 'photo',
    type: mode === 'package' ? 'package' : 'photo',
    imageFileId: fields.imageFileId,
    result: fields,
    fields,
    confidence: labels.length > 0 || ocrText ? 0.88 : 0.72,
    rawText: ocrText || labels.map((label) => label.name).join('、'),
    recommendedStorageLocation: getStorageLocation(fields),
    providerStatus: 'real',
    fallbackReason: '',
  }
}

function findLabelPreset(labels = []) {
  const labelText = labels
    .flatMap((label) => [label.name, label.category])
    .filter(Boolean)
    .join(' ')
  const matchedPreset = LABEL_FOOD_PRESETS.find((preset) =>
    preset.keywords.some((keyword) => labelText.includes(keyword)),
  )

  if (matchedPreset) {
    return matchedPreset
  }

  const specificLabel = labels.find(
    (label) =>
      label.name &&
      !GENERIC_LABEL_NAMES.some((name) => label.name.includes(name)),
  )

  if (!specificLabel) {
    return null
  }

  return {
    keywords: [specificLabel.name],
    name: specificLabel.name,
    category: inferCategoryFromName(specificLabel.name),
    unit: '份',
    shelfLifeDays: '',
    storageLocation: '',
  }
}

function normalizeLabelBasedFoodResult(event, ocrText, labels, error) {
  const preset = findLabelPreset(labels)

  if (!preset) {
    throw error
  }

  const today = getTodayString()
  const fields = normalizeFields(
    {
      name: preset.name,
      category: preset.category,
      quantity: 1,
      unit: preset.unit,
      productionDate: today,
      shelfLifeDays: preset.shelfLifeDays,
      expireDate: preset.shelfLifeDays ? addDays(today, preset.shelfLifeDays) : '',
      storageLocation: preset.storageLocation,
      imageFileId: getImageFileId(event),
      tempFilePath: event.tempFilePath || '',
      note: 'AI 暂不可用，已根据图片标签预填，请按实物核对',
    },
    {},
  )

  return {
    source: 'photo',
    type: 'photo',
    imageFileId: fields.imageFileId,
    result: fields,
    fields,
    confidence: 0.68,
    rawText: ocrText || labels.map((label) => label.name).join('、'),
    recommendedStorageLocation: getStorageLocation(fields),
    providerStatus: 'partial',
    fallbackReason:
      (error && (error.message || error.code)) ||
      '云端 AI 暂不可用，已使用图片标签结果',
  }
}

function normalizeReceiptAiResult(aiResult, event, ocrText) {
  const sourceItems = Array.isArray(aiResult.items) ? aiResult.items : []

  if (sourceItems.length === 0) {
    throw new Error('AI 未抽取到小票食品')
  }

  const items = sourceItems.slice(0, 8).map((item, index) => {
    const fields = normalizeFields(
      {
        ...item,
        imageFileId: getImageFileId(event),
        tempFilePath: event.tempFilePath || '',
      },
      {},
    )

    return {
      id: `receipt-${Date.now()}-${index}`,
      checked: true,
      source: 'receipt',
      confidence: 0.82,
      rawText: ocrText,
      recommendedStorageLocation: getStorageLocation(fields),
      fields,
      providerStatus: 'real',
      fallbackReason: '',
    }
  })

  return {
    source: 'receipt',
    type: 'receipt',
    imageFileId: getImageFileId(event),
    confidence: 0.82,
    rawText: ocrText,
    tempFilePath: event.tempFilePath || '',
    items,
    providerStatus: 'real',
    fallbackReason: '',
  }
}

async function createRealResponse(mode, event) {
  if (!isEnabled(process.env.FRIDGE_ENABLE_REAL_PARSE)) {
    throw new Error('未启用 FRIDGE_ENABLE_REAL_PARSE')
  }

  const imageBase64 = await downloadImageBase64(getImageFileId(event))
  const ocrText = await callOcrForMode(mode, imageBase64)
  const labels =
    mode === 'food' ? await callImageLabels(imageBase64).catch(() => []) : []

  if (mode === 'food') {
    if (hasZhipuConfig()) {
      try {
        const zhipuVisionResult = await callZhipuVisionFoodAI(
          imageBase64,
          ocrText,
        )

        return normalizeSingleAiResult(
          mode,
          zhipuVisionResult,
          event,
          ocrText,
          labels,
        )
      } catch (error) {
        if (!ocrText && labels.length === 0) {
          throw error
        }
      }
    }

    if (!ocrText && labels.length === 0) {
      throw new Error('OCR 和图片标签均未识别到食品信息')
    }

    if (hasDirectDeepSeekConfig()) {
      if (isDirectDeepSeekVisionEnabled()) {
        try {
          const directVisionResult = await callDirectDeepSeekVisionFoodAI(
            imageBase64,
            ocrText,
          )

          return normalizeSingleAiResult(
            mode,
            directVisionResult,
            event,
            ocrText,
            labels,
          )
        } catch (error) {
          if (labels.length === 0) {
            throw error
          }
        }
      }
    } else if (process.env.FRIDGE_REQUIRE_DIRECT_DEEPSEEK === 'true') {
      throw new Error('未配置 FRIDGE_DEEPSEEK_API_KEY')
    } else {
      try {
        const visionResult = await callVisionFoodAI(imageBase64, ocrText)

        return normalizeSingleAiResult(mode, visionResult, event, ocrText, labels)
      } catch (error) {
        if (labels.length === 0) {
          throw error
        }
      }
    }
  }

  let aiResult

  try {
    aiResult =
      mode === 'food' && hasDirectDeepSeekConfig()
        ? await callDirectDeepSeekTextAI(mode, {
            ocrText,
            labels,
          })
        : await callCloudBaseAI(mode, {
            ocrText,
            labels,
          })
  } catch (error) {
    if (mode === 'food' && labels.length > 0) {
      return normalizeLabelBasedFoodResult(event, ocrText, labels, error)
    }

    throw error
  }

  if (mode === 'receipt') {
    return normalizeReceiptAiResult(aiResult, event, ocrText)
  }

  return normalizeSingleAiResult(mode, aiResult, event, ocrText, labels)
}

async function writeParseLog(db, wxContext, mode, response) {
  const fields = response.fields || response.result || {}

  await db
    .collection('parseLogs')
    .add({
      data: {
        _openid: wxContext.OPENID,
        type: response.type || mode,
        imageFileId: response.imageFileId || fields.imageFileId || '',
        result:
          mode === 'receipt'
            ? (response.items || []).map((item) => item.fields)
            : fields,
        confidence: response.confidence,
        rawText: response.rawText,
        providerStatus: response.providerStatus || 'mock',
        fallbackReason: response.fallbackReason || '',
        status: 'success',
        createdAt: Date.now(),
      },
    })
    .catch(() => null)
}

exports.main = async (event = {}) => {
  const mode = normalizeMode(event)
  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  let response

  try {
    response = await createRealResponse(mode, event)
  } catch (error) {
    response = createFallback(mode, event, error)
  }

  await writeParseLog(db, wxContext, mode, response)

  return response
}
