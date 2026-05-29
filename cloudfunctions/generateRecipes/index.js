const https = require('https')
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const DAY_MS = 24 * 60 * 60 * 1000

const MOCK_RECIPES = [
  {
    id: 'cloud-tomato-egg',
    title: '番茄炒蛋',
    ingredients: ['番茄', '鸡蛋', '大葱'],
    timeCost: '15 分钟',
    difficulty: '简单',
    tags: ['AI mock', '家常'],
    steps: ['番茄切块，鸡蛋打散', '先炒鸡蛋再炒番茄', '合并翻炒后调味'],
  },
  {
    id: 'cloud-warm-noodle',
    title: '暖胃热汤面',
    ingredients: ['面条', '鸡蛋', '青菜'],
    timeCost: '15 分钟',
    difficulty: '简单',
    tags: ['AI mock', '热食'],
    steps: ['煮开汤底', '放入面条', '加入鸡蛋和青菜并调味'],
  },
  {
    id: 'cloud-yogurt-fruit',
    title: '酸奶水果碗',
    ingredients: ['酸奶', '香蕉', '苹果'],
    timeCost: '8 分钟',
    difficulty: '简单',
    tags: ['AI mock', '轻食'],
    steps: ['水果切块', '倒入酸奶', '按口味加入燕麦或坚果'],
  },
]

const BASIC_PANTRY_INGREDIENTS = [
  '水',
  '清水',
  '盐',
  '食用油',
  '油',
  '白糖',
  '糖',
  '生抽',
  '酱油',
  '香油',
  '葱花',
  '葱',
  '姜',
  '蒜',
  '水淀粉',
  '黑胡椒',
  '胡椒粉',
]

const CITY_ADCODE_MAP = {
  上海: '310000',
  北京: '110000',
  天津: '120000',
  重庆: '500000',
  广州: '440100',
  深圳: '440300',
  杭州: '330100',
  南京: '320100',
  苏州: '320500',
  成都: '510100',
  武汉: '420100',
  西安: '610100',
  郑州: '410100',
  长沙: '430100',
  合肥: '340100',
  福州: '350100',
  厦门: '350200',
  青岛: '370200',
  济南: '370100',
  沈阳: '210100',
  大连: '210200',
  哈尔滨: '230100',
  长春: '220100',
  昆明: '530100',
  贵阳: '520100',
  南宁: '450100',
  海口: '460100',
  太原: '140100',
  石家庄: '130100',
  兰州: '620100',
  银川: '640100',
  西宁: '630100',
  乌鲁木齐: '650100',
  拉萨: '540100',
}

function isEnabled(value) {
  return String(value || '').toLowerCase() === 'true'
}

function parseDate(dateString) {
  const parts = String(dateString || '').split('-').map(Number)

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null
  }

  return new Date(parts[0], parts[1] - 1, parts[2])
}

function getToday() {
  const now = new Date()

  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getTodayString() {
  const today = getToday()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${today.getFullYear()}-${month}-${day}`
}

function getDaysUntil(dateString) {
  const target = parseDate(dateString)

  if (!target) {
    return 0
  }

  return Math.round((target.getTime() - getToday().getTime()) / DAY_MS)
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeIngredientText(value) {
  return normalizeText(value)
    .replace(/\s+/g, '')
    .replace(/临期|库存|现有|已有|新鲜|剩余/g, '')
    .replace(/[0-9０-９]+(?:g|kg|ml|l|克|千克|斤|毫升|升|个|颗|枚|根|片|块|份|袋|盒|瓶|勺)?/gi, '')
    .replace(/适量|少许|少量|半个|半颗|一份|一小把|一把/g, '')
    .replace(/[()（）【】\[\]，,、:：；;]/g, '')
}

function getItemKey(item) {
  return item && (item._id || item.id || item.name)
}

function itemMatchesIngredient(item, ingredient) {
  const itemName = normalizeIngredientText(item.name)
  const itemCategory = normalizeIngredientText(item.category)
  const target = normalizeIngredientText(ingredient)

  return (
    (itemName && (itemName.includes(target) || target.includes(itemName))) ||
    (itemCategory && (itemCategory.includes(target) || target.includes(itemCategory)))
  )
}

function isBasicPantryIngredient(ingredient) {
  const target = normalizeIngredientText(ingredient)

  return BASIC_PANTRY_INGREDIENTS.some((item) => normalizeIngredientText(item) === target)
}

function formatItem(item) {
  const daysUntil = getDaysUntil(item.expireDate)

  return {
    id: getItemKey(item),
    _id: item._id || '',
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    expireDate: item.expireDate,
    storageLocation: item.storageLocation,
    daysUntil,
    expiryHint:
      daysUntil < 0
        ? `已过期 ${Math.abs(daysUntil)} 天`
        : daysUntil === 0
          ? '今天到期'
          : `还剩 ${daysUntil} 天`,
  }
}

function getUsableItems(items) {
  return items.filter((item) => getDaysUntil(item.expireDate) >= 0)
}

function getSelectedItems(items, selectedItemIds) {
  const selectedSet = new Set(Array.isArray(selectedItemIds) ? selectedItemIds : [])

  return selectedSet.size > 0
    ? items.filter((item) => selectedSet.has(getItemKey(item)))
    : []
}

function getPriorityItems(items, maxDays) {
  return items.filter((item) => {
    const daysUntil = getDaysUntil(item.expireDate)

    return daysUntil >= 0 && daysUntil <= maxDays
  })
}

function getOverdueItems(items) {
  return items.filter((item) => getDaysUntil(item.expireDate) < 0)
}

function matchRecipe(recipe, items, sourceType = 'ai') {
  const usedKeys = new Set()
  const availableItems = []
  const missingItems = []
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []

  ingredients.forEach((ingredient) => {
    const matchedItem = items.find((item) => {
      const key = getItemKey(item)

      return !usedKeys.has(key) && itemMatchesIngredient(item, ingredient)
    })

    if (matchedItem) {
      usedKeys.add(getItemKey(matchedItem))
      availableItems.push(formatItem(matchedItem))
      return
    }

    if (!isBasicPantryIngredient(ingredient)) {
      missingItems.push(ingredient)
    }
  })

  const priorityItems = availableItems.filter(
    (item) => item.daysUntil >= 0 && item.daysUntil <= 3,
  )
  const matchScore = availableItems.length * 10 - missingItems.length * 3 + priorityItems.length * 5
  const priorityText =
    priorityItems.length > 0
      ? `优先用掉${priorityItems.map((item) => item.name).join('、')}。`
      : '适合作为今天的库存搭配。'

  return {
    id: recipe.id || `cloud-ai-${Date.now()}-${recipe.title || 'recipe'}`,
    title: recipe.title || '今日库存菜',
    sourceType,
    reason: recipe.reason || `云端 AI 根据当前库存推荐，${priorityText}`,
    availableItems,
    missingItems,
    priorityItems,
    matchScore,
    matchLabel:
      missingItems.length === 0 ? '可直接做' : `还差 ${missingItems.length} 样`,
    canCook: missingItems.length === 0,
    timeCost: recipe.timeCost || '15 分钟',
    difficulty: recipe.difficulty || '简单',
    tags: Array.isArray(recipe.tags) ? recipe.tags.slice(0, 4) : ['云端 AI'],
    steps: Array.isArray(recipe.steps) && recipe.steps.length > 0
      ? recipe.steps.slice(0, 5)
      : ['检查食材状态', '按常规方式清洗和预处理', '加热熟透后调味'],
    safetyNote: recipe.safetyNote || '',
    providerStatus: sourceType === 'ai' ? 'real' : 'mock',
  }
}

function sortRecommendations(recommendations) {
  return recommendations.sort((left, right) => {
    if (right.matchScore !== left.matchScore) {
      return right.matchScore - left.matchScore
    }

    return left.missingItems.length - right.missingItems.length
  })
}

function getMockContext(searchInsight = '', city = '') {
  const now = new Date()
  const month = now.getMonth() + 1
  const hour = now.getHours()
  let season = '春季'

  if (month >= 6 && month <= 8) {
    season = '夏季'
  } else if (month >= 9 && month <= 11) {
    season = '秋季'
  } else if (month === 12 || month <= 2) {
    season = '冬季'
  }

  return {
    date: getTodayString(),
    city: city || process.env.FRIDGE_DEFAULT_CITY || '上海',
    season,
    weather: season === '夏季' ? '晴热' : season === '冬季' ? '阴冷' : '微风',
    temperature: season === '夏季' ? 31 : season === '冬季' ? 8 : 22,
    humidity: season === '秋季' ? 48 : 58,
    mealTime: hour < 10 ? '早餐' : hour < 15 ? '午餐' : '晚餐',
    weatherSource: 'mock',
    weatherStatus: 'fallback',
    weatherUpdatedAt: getTodayString(),
    radarAdvice: '天气数据暂用季节估算，今天饮食以清淡均衡、顺应温湿度为主。',
    radarAdviceSource: 'rule',
    summary: searchInsight || '云端菜谱会结合当日气候和季节给出轻负担搭配。',
    searchInsight: searchInsight || '联网搜索未启用时，使用季节和气候规则生成建议。',
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

function buildQuery(params) {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
}

function requestGetJson(hostname, pathname, params) {
  return new Promise((resolve, reject) => {
    const query = buildQuery(params || {})
    const req = https.request(
      {
        hostname,
        path: query ? `${pathname}?${query}` : pathname,
        method: 'GET',
      },
      (res) => {
        let data = ''

        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`腾讯位置服务返回 ${res.statusCode}`))
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
      req.destroy(new Error('腾讯位置服务超时'))
    })
    req.end()
  })
}

function getTencentMapKey() {
  return (
    process.env.FRIDGE_TENCENT_MAP_KEY ||
    process.env.TENCENT_MAP_KEY ||
    process.env.QQ_MAP_KEY ||
    ''
  )
}

function normalizeCityName(city) {
  const cleanCity = String(city || '').trim() || process.env.FRIDGE_DEFAULT_CITY || '上海'

  return cleanCity.replace(/市$/, '')
}

function resolveKnownAdcode(city) {
  const normalizedCity = normalizeCityName(city)

  return CITY_ADCODE_MAP[normalizedCity] || CITY_ADCODE_MAP[`${normalizedCity}市`] || ''
}

function extractAdcode(response) {
  const result = response && response.result ? response.result : {}
  const adInfo = result.ad_info || result.address_components || result.address_component || {}

  return String(
    adInfo.adcode ||
    result.adcode ||
    (result.address_reference && result.address_reference.adcode) ||
    '',
  )
}

async function resolveCityAdcode(city, key) {
  const knownAdcode = resolveKnownAdcode(city)

  if (knownAdcode) {
    return knownAdcode
  }

  const response = await requestGetJson(
    'apis.map.qq.com',
    '/ws/geocoder/v1/',
    {
      address: city,
      key,
    },
  )

  if (response.status !== 0) {
    throw new Error(response.message || '城市解析失败')
  }

  const adcode = extractAdcode(response)

  if (!adcode) {
    throw new Error('城市解析未返回行政区划代码')
  }

  return adcode
}

function pickWeatherNode(result) {
  if (!result) {
    return {}
  }

  if (Array.isArray(result.realtime) && result.realtime[0]) {
    return result.realtime[0]
  }

  if (Array.isArray(result.weather) && result.weather[0]) {
    return result.weather[0]
  }

  if (Array.isArray(result.now) && result.now[0]) {
    return result.now[0]
  }

  if (Array.isArray(result.current) && result.current[0]) {
    return result.current[0]
  }

  return (
    result.now ||
    result.realtime ||
    result.current ||
    result.live ||
    result.weather ||
    result
  )
}

function pickFirstValue(values) {
  const matched = values.find((value) => value !== undefined && value !== null && value !== '')

  return matched === undefined ? '' : matched
}

function normalizeWeatherPayload(response, city, adcode) {
  const result = response && response.result ? response.result : {}
  const node = pickWeatherNode(result)
  const infos = node.infos || node.info || {}
  const temperature = pickFirstValue([
    infos.temperature,
    node.temperature,
    infos.temp,
    node.temp,
    node.degree,
    node.tem,
  ])
  const humidity = pickFirstValue([
    infos.humidity,
    node.humidity,
    infos.hum,
    node.hum,
    node.sd,
  ])
  const weather = pickFirstValue([
    infos.weather,
    node.weather,
    infos.text,
    node.text,
    node.condition,
    node.phenomena,
  ])
  const updatedAt =
    node.update_time ||
    node.updateTime ||
    result.update_time ||
    result.updateTime ||
    response.update_time ||
    ''

  if (!weather && temperature === '' && humidity === '') {
    throw new Error('天气接口未返回实时天气')
  }

  return {
    city,
    adcode,
    weather: String(weather || '实时天气'),
    temperature,
    humidity,
    weatherSource: 'tencent',
    weatherStatus: 'real',
    weatherUpdatedAt: updatedAt || getTodayString(),
    weatherFallbackReason: '',
  }
}

async function getTencentWeatherProfile(city) {
  if (!isEnabled(process.env.FRIDGE_ENABLE_REAL_WEATHER)) {
    throw new Error('未启用 FRIDGE_ENABLE_REAL_WEATHER')
  }

  const key = getTencentMapKey()

  if (!key) {
    throw new Error('未配置 FRIDGE_TENCENT_MAP_KEY')
  }

  const safeCity = normalizeCityName(city)
  const adcode = await resolveCityAdcode(safeCity, key)
  const response = await requestGetJson(
    'apis.map.qq.com',
    '/ws/weather/v1/',
    {
      adcode,
      type: 'now',
      key,
    },
  )

  if (response.status !== 0) {
    throw new Error(response.message || '天气查询失败')
  }

  return normalizeWeatherPayload(response, safeCity, adcode)
}

async function buildRecommendationContext(city, searchInsight, items, scene) {
  const baseContext = {
    ...getMockContext(searchInsight, city),
    city,
    scene,
    inventoryScan: scene === 'expiryRadar' ? buildInventoryScanSummary(items) : null,
  }

  try {
    const weatherProfile = await getTencentWeatherProfile(city)

    return {
      ...baseContext,
      ...weatherProfile,
      summary: `${weatherProfile.city}${weatherProfile.weather}，${weatherProfile.temperature || '--'}℃，湿度 ${weatherProfile.humidity || '--'}%，适合按气候安排低负担家常菜。`,
      radarAdvice: `${weatherProfile.city}${weatherProfile.weather}，${weatherProfile.temperature || '--'}℃、湿度 ${weatherProfile.humidity || '--'}%，今天适合按温湿度安排清淡均衡的一餐。`,
      radarAdviceSource: 'rule',
    }
  } catch (error) {
    return {
      ...baseContext,
      weatherFallbackReason: '真实天气暂不可用，已使用季节估算。',
      weatherError: error.message || '真实天气暂不可用',
    }
  }
}

async function getSearchInsight(city) {
  if (!isEnabled(process.env.FRIDGE_ENABLE_REAL_SEARCH)) {
    return ''
  }

  const apiKey = process.env.FRIDGE_WSA_API_KEY || process.env.FRIDGE_SEARCH_API_KEY || ''

  if (!apiKey) {
    return ''
  }

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
      Query: `今天${city}天气 适合吃什么 家常菜`,
      Mode: 0,
    },
  ).catch(() => null)
  const pages = response && response.Response && Array.isArray(response.Response.Pages)
    ? response.Response.Pages
    : []

  return pages
    .slice(0, 3)
    .map((page) => {
      try {
        const parsed = JSON.parse(page)

        return `${parsed.title || ''} ${parsed.passage || ''}`.trim()
      } catch (error) {
        return ''
      }
    })
    .filter(Boolean)
    .join('\n')
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

function buildInventoryScanSummary(items) {
  const usableItems = getUsableItems(items)
  const threeDayItems = getPriorityItems(items, 3)
  const sevenDayItems = getPriorityItems(items, 7)
  const overdueItems = getOverdueItems(items)

  return {
    usableCount: usableItems.length,
    threeDayCount: threeDayItems.length,
    sevenDayCount: sevenDayItems.length,
    overdueCount: overdueItems.length,
    threeDayNames: threeDayItems.map((item) => item.name).slice(0, 10),
    sevenDayNames: sevenDayItems.map((item) => item.name).slice(0, 10),
    overdueNames: overdueItems.map((item) => item.name).slice(0, 10),
  }
}

function buildRecipePrompt(items, context, selectedItems, scene = '') {
  const compactItems = items.slice(0, 30).map((item) => ({
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    expireDate: item.expireDate,
    storageLocation: item.storageLocation,
    daysUntil: getDaysUntil(item.expireDate),
  }))
  const selectedNames = selectedItems.map((item) => item.name).join('、')

  if (scene === 'expiryRadar') {
    const scanSummary = context.inventoryScan || buildInventoryScanSummary(items)

    return [
      '请为微信小程序“冰箱雷达”的“开饭雷达检测报告”生成 3 道家常菜谱。',
      '这是云端 AI 菜谱生成，必须基于本地传入的真实冰箱库存和临期扫描结果，不要编造库存里没有的“已有食材”。',
      '雷达建议要偏气候养生：只结合城市、当天真实天气或兜底天气、温度、湿度和节气，给出温和具体的家常饮食建议。',
      'radarAdvice 不要引用库存、选中食材、临期食材或菜谱结果。',
      '可以参考中医食养表达，但不要做医疗诊断、治疗承诺，不要说能治疗疾病。',
      '优先消耗 3 天内到期的食材；如果 3 天内食材不适合单独成菜，可以搭配其他未过期库存食材。',
      '绝对不要把已过期食材作为菜谱原料；已过期食材只可在 safetyNote 中提醒直接丢弃，不要写“检查是否可食用/可饮用”。',
      '可以列出 1-3 个需要补买的常见主料或关键辅料，但不要把盐、油、水、糖、酱油、葱姜蒜这类基础调味列入 ingredients。',
      'ingredients 必须包含完整主料和关键辅料，方便前端继续显示“已有 / 缺哪样”。',
      'ingredients 里的食材名请使用纯食材名，不要带“临期、库存、1份、少许、适量”等修饰；数量和状态写在 reason 或 steps 里。',
      '不要生成“葱快手小炒”这类只把葱、调料、配菜当主菜的方案；菜名需要像真实家常菜。',
      '步骤要比模板更具体，每道菜 3-5 步，说明关键处理方式和临期食材怎么用掉。',
      selectedNames ? `本轮优先处理食材：${selectedNames}` : '本轮没有明显临期食材，请根据全部未过期库存生成。',
      `库存扫描结果：${JSON.stringify(scanSummary)}`,
      '只返回 JSON，格式如下：',
      '{"recipes":[{"id":"短英文id","title":"菜名","ingredients":["食材"],"timeCost":"15 分钟","difficulty":"简单","tags":["标签"],"steps":["步骤"],"safetyNote":"安全提示","reason":"推荐原因"}],"summary":"一句话总结","radarAdvice":"一句只根据城市天气气候生成的养生雷达建议"}',
      `今日上下文：${JSON.stringify(context)}`,
      `未过期库存：${JSON.stringify(compactItems)}`,
    ].join('\n')
  }

  return [
    '请为冰箱库存生成 5 道家常菜谱。',
    '要求：优先使用 3 天内到期的食材；不要使用已过期食材；步骤简单；缺少食材可以列出。',
    '请结合今日城市、天气、温度、湿度和节气，让推荐理由更偏气候养生和家常饮食管理。',
    'radarAdvice 只能根据城市、天气、温度、湿度和节气生成，不要引用库存、选中食材、临期食材或菜谱结果。',
    '可以参考中医食养表达，但不要做医疗诊断、治疗承诺，不要说能治疗疾病。',
    selectedNames ? `用户点选的重点食材：${selectedNames}` : '用户未点选食材，请根据库存整体推荐。',
    '只返回 JSON，格式如下：',
    '{"recipes":[{"id":"短英文id","title":"菜名","ingredients":["食材"],"timeCost":"15 分钟","difficulty":"简单","tags":["标签"],"steps":["步骤"],"safetyNote":"安全提示","reason":"推荐原因"}],"summary":"一句话总结","radarAdvice":"一句只根据城市天气气候生成的养生雷达建议"}',
    `今日上下文：${JSON.stringify(context)}`,
    `库存：${JSON.stringify(compactItems)}`,
  ].join('\n')
}

async function callCloudBaseAI(items, context, selectedItems, scene = '') {
  if (!isEnabled(process.env.FRIDGE_ENABLE_REAL_AI)) {
    throw new Error('未启用 FRIDGE_ENABLE_REAL_AI')
  }

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
          '你是冰箱管家的菜谱助手。输出必须是 JSON，不要输出 Markdown。',
      },
      {
        role: 'user',
        content: buildRecipePrompt(items, context, selectedItems, scene),
      },
    ],
  })

  return extractJson(getAiText(result))
}

function buildMockRecommendations(baseItems) {
  return sortRecommendations(
    MOCK_RECIPES.map((recipe) => matchRecipe(recipe, baseItems, 'mock')),
  )
}

function normalizeAiRecommendations(aiResult, baseItems, maxCount = 5) {
  const recipes = Array.isArray(aiResult.recipes) ? aiResult.recipes : []

  if (recipes.length === 0) {
    throw new Error('AI 未返回菜谱列表')
  }

  return sortRecommendations(
    recipes.slice(0, maxCount).map((recipe) => matchRecipe(recipe, baseItems, 'ai')),
  )
}

exports.main = async (event = {}) => {
  const items = Array.isArray(event.items) ? event.items : []
  const usableItems = getUsableItems(items)
  const scene = event.scene || event.mode || ''
  const isExpiryRadar = scene === 'expiryRadar'
  const selectedItems = isExpiryRadar
    ? getSelectedItems(usableItems, event.priorityItemIds)
    : getSelectedItems(usableItems, event.selectedItemIds)
  const baseItems = isExpiryRadar
    ? usableItems
    : selectedItems.length > 0 ? selectedItems : usableItems
  const city = event.city || process.env.FRIDGE_DEFAULT_CITY || '上海'
  const searchInsight = await getSearchInsight(city)
  const context = await buildRecommendationContext(city, searchInsight, items, scene)

  if (isExpiryRadar && baseItems.length === 0) {
    return {
      context,
      selectedItems: [],
      recommendations: [],
      providerStatus: 'empty',
      fallbackReason: '暂无未过期库存，云端 AI 未生成菜谱。',
    }
  }

  try {
    const aiResult = await callCloudBaseAI(baseItems, context, selectedItems, scene)
    const recommendations = normalizeAiRecommendations(
      aiResult,
      baseItems,
      isExpiryRadar ? 3 : 5,
    )

    return {
      context: {
        ...context,
        summary: aiResult.summary || context.summary,
        radarAdvice: aiResult.radarAdvice || context.radarAdvice,
        radarAdviceSource: aiResult.radarAdvice ? 'ai' : context.radarAdviceSource || 'rule',
      },
      selectedItems: selectedItems.map(formatItem),
      recommendations,
      providerStatus: 'real',
      fallbackReason: '',
    }
  } catch (error) {
    if (isExpiryRadar) {
      return {
        context,
        selectedItems: selectedItems.map(formatItem),
        recommendations: [],
        providerStatus: 'failed',
        fallbackReason:
          error.message || error.code || '云端 AI 暂不可用，本次不使用本地菜谱兜底',
      }
    }

    return {
      context,
      selectedItems: selectedItems.map(formatItem),
      recommendations: buildMockRecommendations(baseItems),
      providerStatus: 'mock',
      fallbackReason:
        error.message || error.code || '云端 AI 暂不可用，已使用 mock 菜谱',
    }
  }
}
