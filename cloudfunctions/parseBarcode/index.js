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

function normalizeCategory(value) {
  return CATEGORY_OPTIONS.includes(value) ? value : '其他'
}

function getStorageLocation(fields = {}) {
  const category = fields.category || ''
  const name = String(fields.name || '')

  if (fields.storageLocation && STORAGE_LOCATION_OPTIONS.includes(fields.storageLocation)) {
    return fields.storageLocation
  }

  if (
    category === '饮料' ||
    category === '调料' ||
    name.includes('茶') ||
    name.includes('可乐') ||
    name.includes('雪碧') ||
    name.includes('果汁') ||
    name.includes('矿泉水') ||
    name.includes('酱油') ||
    name.includes('醋')
  ) {
    return '门架'
  }

  if (category === '蔬菜' || category === '水果') {
    return '果蔬抽屉'
  }

  if (category === '速冻' || name.includes('冻') || name.includes('冰')) {
    return '冷冻'
  }

  return '冷藏'
}

function normalizeQuantity(value) {
  const quantity = Number(value)

  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

function normalizeFields(fields = {}, fallback = {}) {
  const today = getTodayString()
  const shelfLifeDays = Number(fields.shelfLifeDays || fallback.shelfLifeDays)
  const normalizedShelfLifeDays =
    Number.isFinite(shelfLifeDays) && shelfLifeDays > 0 ? shelfLifeDays : ''
  const productionDate = String(fields.productionDate || fallback.productionDate || '')
  const expireDate =
    fields.expireDate ||
    fallback.expireDate ||
    (productionDate && normalizedShelfLifeDays
      ? addDays(productionDate, normalizedShelfLifeDays)
      : addDays(today, 180))
  const normalized = {
    name: String(fields.name || fallback.name || '').trim() || '待确认商品',
    brand: String(fields.brand || fallback.brand || '').trim(),
    spec: String(fields.spec || fallback.spec || '').trim(),
    category: normalizeCategory(fields.category || fallback.category),
    quantity: normalizeQuantity(fields.quantity || fallback.quantity),
    unit: String(fields.unit || fallback.unit || '份').trim() || '份',
    productionDate,
    shelfLifeDays: normalizedShelfLifeDays,
    expireDate,
    storageLocation: STORAGE_LOCATION_OPTIONS.includes(fields.storageLocation)
      ? fields.storageLocation
      : '',
    note: String(fields.note || fallback.note || '').trim(),
    barcode: String(fields.barcode || fallback.barcode || '').trim(),
  }

  normalized.storageLocation = normalized.storageLocation || getStorageLocation(normalized)

  return normalized
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
      '真实条码检索暂不可用，已使用 mock 结果',
  }
}

function createFallback(event = {}, error = null, fallbackReason = '') {
  const barcode = String(event.barcode || '').trim()
  const fields = normalizeFields(
    {
      name: '低糖乌龙茶',
      brand: '',
      spec: '500ml',
      category: '饮料',
      quantity: 1,
      unit: '瓶',
      productionDate: '',
      shelfLifeDays: '',
      expireDate: addDays(new Date(), 180),
      storageLocation: '门架',
      note: '条码结果为预填信息，请按包装核对',
      barcode,
    },
    {},
  )

  return {
    source: 'barcode',
    type: 'barcode',
    barcode,
    result: fields,
    fields,
    confidence: 0.86,
    rawText: '常见饮品信息预填',
    recommendedStorageLocation: getStorageLocation(fields),
    ...getProviderStatus(error, fallbackReason),
  }
}

function requestJson(options, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)
    const req = https.request(
      {
        ...options,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = ''

        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`搜索接口返回 ${res.statusCode}`))
            return
          }

          try {
            resolve(JSON.parse(data))
          } catch (error) {
            reject(error)
          }
        })
      },
    )

    req.on('error', reject)
    req.setTimeout(8000, () => {
      req.destroy(new Error('搜索接口超时'))
    })
    req.write(body)
    req.end()
  })
}

async function searchBarcode(barcode) {
  if (!isEnabled(process.env.FRIDGE_ENABLE_REAL_SEARCH)) {
    throw new Error('未启用 FRIDGE_ENABLE_REAL_SEARCH')
  }

  const apiKey = process.env.FRIDGE_WSA_API_KEY || process.env.FRIDGE_SEARCH_API_KEY || ''

  if (!apiKey) {
    throw new Error('未配置 FRIDGE_WSA_API_KEY')
  }

  const query = `${barcode} 条形码 商品 名称 保质期 规格`
  const response = await requestJson(
    {
      hostname: 'api.wsa.cloud.tencent.com',
      path: '/SearchPro',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
    {
      Query: query,
      Mode: 0,
    },
  )
  const pages = response.Response && Array.isArray(response.Response.Pages)
    ? response.Response.Pages
    : []

  return pages
    .map((page) => {
      try {
        return JSON.parse(page)
      } catch (error) {
        return null
      }
    })
    .filter(Boolean)
    .slice(0, 5)
}

function safeRequire(packageName) {
  try {
    return require(packageName)
  } catch (error) {
    return null
  }
}

function extractJson(text) {
  const content = String(text || '').trim()
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const jsonText = fenced ? fenced[1].trim() : content
  const start = jsonText.indexOf('{')
  const end = jsonText.lastIndexOf('}')

  if (start < 0 || end <= start) {
    throw new Error('AI 未返回 JSON')
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

async function structureSearchResult(barcode, searchPages) {
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
          '你是冰箱条码识别助手。只返回 JSON，不要解释。不能确认的字段留空或给保守默认值。',
      },
      {
        role: 'user',
        content: [
          `条形码：${barcode}`,
          '请根据搜索结果提取商品信息，返回 JSON：',
          '{"name":"商品名","brand":"品牌或空","spec":"规格或空","category":"蔬菜|水果|肉蛋|乳制品|饮料|速冻|调料|主食|其他","quantity":1,"unit":"瓶|袋|盒|份等","productionDate":"","shelfLifeDays":数字或空,"expireDate":"","storageLocation":"冷藏|冷冻|门架|果蔬抽屉|变温|其他","note":"核对提示"}',
          `搜索结果：${JSON.stringify(searchPages)}`,
        ].join('\n'),
      },
    ],
  })

  return extractJson(getAiText(result))
}

async function createRealResponse(event) {
  if (!isEnabled(process.env.FRIDGE_ENABLE_REAL_BARCODE)) {
    throw new Error('未启用 FRIDGE_ENABLE_REAL_BARCODE')
  }

  const barcode = String(event.barcode || '').trim()

  if (!barcode) {
    throw new Error('缺少条形码')
  }

  const searchPages = await searchBarcode(barcode)
  const aiResult = await structureSearchResult(barcode, searchPages)
  const fallbackFields = createFallback(event).fields
  const fields = normalizeFields(
    {
      ...aiResult,
      barcode,
    },
    fallbackFields,
  )
  const rawText = searchPages
    .map((page) => `${page.title || ''} ${page.passage || ''}`)
    .join('\n')
    .trim()

  return {
    source: 'barcode',
    type: 'barcode',
    barcode,
    result: fields,
    fields,
    confidence: searchPages.length > 0 ? 0.9 : 0.72,
    rawText,
    recommendedStorageLocation: getStorageLocation(fields),
    providerStatus: 'real',
    fallbackReason: '',
  }
}

async function writeParseLog(db, wxContext, response) {
  const fields = response.fields || response.result || {}

  await db
    .collection('parseLogs')
    .add({
      data: {
        _openid: wxContext.OPENID,
        type: 'barcode',
        barcode: response.barcode || fields.barcode || '',
        result: fields,
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
  if (!isEnabled(process.env.FRIDGE_ENABLE_BARCODE_FUNCTION)) {
    return {
      ok: false,
      code: 'FEATURE_DISABLED',
      type: 'barcode',
      barcode: String(event.barcode || '').trim(),
      fields: {},
      result: {},
      confidence: 0,
      rawText: '',
      providerStatus: 'disabled',
      fallbackReason: '条形码识别能力当前未开放。',
    }
  }

  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  let response

  try {
    response = await createRealResponse(event)
  } catch (error) {
    response = createFallback(event, error)
  }

  await writeParseLog(db, wxContext, response)

  return response
}
