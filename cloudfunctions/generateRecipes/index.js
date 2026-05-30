const https = require('https')
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const DAY_MS = 24 * 60 * 60 * 1000
const CHINA_TIME_OFFSET_MS = 8 * 60 * 60 * 1000
const SOLAR_TERM_PREVIEW_THRESHOLD_DAYS = 3
const WEATHER_CONTEXT_VERSION = 2

const SOLAR_TERMS = [
  { name: '小寒', month: 1, day: 5 },
  { name: '大寒', month: 1, day: 20 },
  { name: '立春', month: 2, day: 4 },
  { name: '雨水', month: 2, day: 19 },
  { name: '惊蛰', month: 3, day: 5 },
  { name: '春分', month: 3, day: 20 },
  { name: '清明', month: 4, day: 4 },
  { name: '谷雨', month: 4, day: 20 },
  { name: '立夏', month: 5, day: 5 },
  { name: '小满', month: 5, day: 21 },
  { name: '芒种', month: 6, day: 5 },
  { name: '夏至', month: 6, day: 21 },
  { name: '小暑', month: 7, day: 7 },
  { name: '大暑', month: 7, day: 22 },
  { name: '立秋', month: 8, day: 7 },
  { name: '处暑', month: 8, day: 23 },
  { name: '白露', month: 9, day: 7 },
  { name: '秋分', month: 9, day: 23 },
  { name: '寒露', month: 10, day: 8 },
  { name: '霜降', month: 10, day: 23 },
  { name: '立冬', month: 11, day: 7 },
  { name: '小雪', month: 11, day: 22 },
  { name: '大雪', month: 12, day: 7 },
  { name: '冬至', month: 12, day: 21 },
]

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

function getChinaDateParts(date = new Date()) {
  const chinaDate = new Date(date.getTime() + CHINA_TIME_OFFSET_MS)

  return {
    year: chinaDate.getUTCFullYear(),
    month: chinaDate.getUTCMonth() + 1,
    day: chinaDate.getUTCDate(),
    hour: chinaDate.getUTCHours(),
  }
}

function getToday() {
  const today = getChinaDateParts()

  return new Date(today.year, today.month - 1, today.day)
}

function getTodayString() {
  const today = getChinaDateParts()
  const month = String(today.month).padStart(2, '0')
  const day = String(today.day).padStart(2, '0')

  return `${today.year}-${month}-${day}`
}

function getDisplaySolarTerm() {
  const todayParts = getChinaDateParts()
  const today = new Date(todayParts.year, todayParts.month - 1, todayParts.day)
  const candidates = [todayParts.year - 1, todayParts.year, todayParts.year + 1].flatMap((targetYear) =>
    SOLAR_TERMS.map((term) => ({
      name: term.name,
      date: new Date(targetYear, term.month - 1, term.day),
    })),
  )
    .sort((left, right) => left.date.getTime() - right.date.getTime())
  let previousTerm = null
  let nextTerm = null

  candidates.forEach((term) => {
    if (term.date.getTime() <= today.getTime()) {
      previousTerm = term
      return
    }

    if (!nextTerm) {
      nextTerm = term
    }
  })

  if (!previousTerm && nextTerm) {
    return {
      solarTermName: nextTerm.name,
      solarTermHint: `还有 ${Math.round((nextTerm.date.getTime() - today.getTime()) / DAY_MS)} 天`,
    }
  }

  if (!previousTerm) {
    return {
      solarTermName: '',
      solarTermHint: '',
    }
  }

  const daysSincePrevious = Math.round((today.getTime() - previousTerm.date.getTime()) / DAY_MS)

  if (daysSincePrevious === 0) {
    return {
      solarTermName: previousTerm.name,
      solarTermHint: '当日',
    }
  }

  if (daysSincePrevious <= SOLAR_TERM_PREVIEW_THRESHOLD_DAYS || !nextTerm) {
    return {
      solarTermName: previousTerm.name,
      solarTermHint: `已过 ${daysSincePrevious} 天`,
    }
  }

  return {
    solarTermName: nextTerm.name,
    solarTermHint: `还有 ${Math.round((nextTerm.date.getTime() - today.getTime()) / DAY_MS)} 天`,
  }
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

function getCleanIngredientName(value) {
  return String(value || '')
    .replace(/[.。…]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*[0-9０-９]+(?:\.\d+)?\s*(?:g|kg|ml|l|克|千克|斤|毫升|升|个|颗|枚|根|片|块|份|袋|盒|瓶|勺|条)/gi, '')
    .replace(/\s*(?:各|约|大约|左右)\s*$/g, '')
    .replace(/[，,、:：；;]\s*$/g, '')
    .trim()
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
      const cleanIngredient = getCleanIngredientName(ingredient)

      if (cleanIngredient) {
        missingItems.push(cleanIngredient)
      }
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

function getRegionalDietProfile(city) {
  const normalizedCity = normalizeCityName(city)
  const profileGroups = [
    {
      cities: ['广州', '深圳', '南宁', '海口', '福州', '厦门'],
      profile: '岭南沿海，天气湿热或雨水偏多时更适合清爽、祛湿、少油，常用冬瓜、薏米、赤小豆、鱼虾、时蔬。',
    },
    {
      cities: ['长沙', '武汉', '重庆', '成都', '贵阳'],
      profile: '中南和川渝一带湿气较重、口味容易偏辣，今天建议把辣度收一收，用清蒸、炖汤、焖煮或清炒平衡。',
    },
    {
      cities: ['北京', '天津', '石家庄', '太原', '郑州', '西安', '兰州', '银川', '西宁', '乌鲁木齐'],
      profile: '北方内陆偏干或昼夜温差明显，适合润燥补水、少煎炸，可安排汤羹、蒸菜、菌菇、瓜果和低盐蛋白。',
    },
    {
      cities: ['上海', '杭州', '南京', '苏州', '合肥'],
      profile: '江南地区湿润，适合清鲜少油、略带汤水的家常菜，兼顾开胃和不过甜不过咸。',
    },
    {
      cities: ['青岛', '济南', '大连'],
      profile: '沿海或胶东气候受海风影响，适合搭配海鲜、菌菇和时蔬，少油低盐，避免过度辛辣。',
    },
    {
      cities: ['哈尔滨', '长春', '沈阳'],
      profile: '东北地区更重视热量和熟食口感，天气偏凉时适合热汤、炖菜和根茎类；天气偏热时减少厚重油脂。',
    },
    {
      cities: ['昆明'],
      profile: '高原气候温差明显、体感偏干，适合菌菇、鲜蔬、汤羹和温和蛋白，避免过燥过辣。',
    },
    {
      cities: ['拉萨'],
      profile: '高原地区空气偏干、温差较大，适合温热熟食、汤水和易消化搭配，避免过油过辛辣。',
    },
  ]
  const matched = profileGroups.find((group) => group.cities.includes(normalizedCity))

  return matched
    ? matched.profile
    : '按当地地域饮食习惯和今天温湿度调整，优先选择家常、少油、易执行的一餐。'
}

function getRegionalAdviceFocus(city) {
  const normalizedCity = normalizeCityName(city)
  const focusMap = {
    广州: '清润祛湿，适合蒸鱼、冬瓜汤、豆腐青菜，少油少辣',
    深圳: '清爽祛湿，适合鱼虾、冬瓜、时蔬和汤菜，少油少辣',
    南宁: '清爽祛湿，适合汤菜、鱼虾和绿叶菜，酸辣口味别太重',
    海口: '清爽补水，适合蒸煮海鲜、冬瓜和绿叶菜，少煎炸',
    长沙: '湘味可以保留香气但收辣降油，适合蒸菜、汤菜和清炒时蔬',
    武汉: '适合温润清爽，主菜选蒸煮或汤菜，热干厚味少一点',
    重庆: '麻辣要收住，适合清汤、蒸菜和豆腐青菜，减少油重锅底',
    成都: '香辣可留香不留重油，适合汤菜、蒸菜和清炒时蔬',
    北京: '润燥补水，适合汤羹、蒸菜、菌菇和低盐蛋白，少煎炸',
    天津: '润燥少盐，适合汤菜、蒸蛋、菌菇和绿叶菜，少油炸',
    上海: '清鲜少油，适合汤菜、蒸鱼、豆腐和时蔬，少甜腻',
    杭州: '清鲜带汤水，适合蒸煮、笋类、豆腐和绿叶菜，少油腻',
    南京: '清润少油，适合鸭汤、豆腐、菌菇和绿叶菜，口味别太咸',
    苏州: '清鲜少甜腻，适合蒸鱼、汤菜、豆腐和时蔬',
    青岛: '少油低盐，适合海鲜、菌菇和绿叶菜，避免重辣',
    济南: '润燥少油，适合汤羹、蒸菜和清炒时蔬',
    大连: '适合海鲜和时蔬搭配，少油低盐，避免重辣',
    昆明: '菌菇和鲜蔬很合适，搭配汤羹和温和蛋白，少燥辣',
  }

  return focusMap[normalizedCity] || '优先选择蒸煮、汤菜、豆腐、鱼虾或绿叶菜，少油少辣，避开厚重煎炸'
}

function cleanTemperatureText(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/摄氏度|°c/gi, '')
    .replace(/℃/g, '')
    .trim()
}

function getTemperatureLabel(context = {}) {
  const rangeText = cleanTemperatureText(
    context.temperatureRange || context.tempRange || '',
  )

  if (rangeText) {
    return `${rangeText
      .replace(/\s*(?:至|到|—|－|~|～)\s*/g, '~')
      .replace(/(\d)\s*-\s*(\d)/g, '$1~$2')}℃`
  }

  const minTemperature = cleanTemperatureText(
    context.minTemperature ||
      context.lowTemperature ||
      context.temperatureMin ||
      '',
  )
  const maxTemperature = cleanTemperatureText(
    context.maxTemperature ||
      context.highTemperature ||
      context.temperatureMax ||
      '',
  )

  if (minTemperature && maxTemperature) {
    return minTemperature === maxTemperature
      ? `${minTemperature}℃`
      : `${minTemperature}~${maxTemperature}℃`
  }

  const temperature = cleanTemperatureText(context.temperature)

  return temperature ? `${temperature}℃` : '--℃'
}

function buildRuleRadarAdvice(context = {}) {
  const focus = getRegionalAdviceFocus(context.city)
  const termText = context.solarTermName
    ? `${context.solarTermName}前后，`
    : ''
  const humidity = Number(context.humidity)
  const temperature = Number(context.temperature)
  let climateAction = ''

  if (humidity >= 75) {
    climateAction = '湿气偏重，'
  } else if (humidity <= 40) {
    climateAction = '体感偏干，'
  } else if (temperature >= 28) {
    climateAction = '暑热渐起，'
  }

  return `${termText}${climateAction}今日全天建议直接走${focus}的路线。`
}

function getMockContext(searchInsight = '', city = '') {
  const now = getChinaDateParts()
  const month = now.month
  const solarTerm = getDisplaySolarTerm()
  let season = '春季'

  if (month >= 6 && month <= 8) {
    season = '夏季'
  } else if (month >= 9 && month <= 11) {
    season = '秋季'
  } else if (month === 12 || month <= 2) {
    season = '冬季'
  }

  const temperature = season === '夏季' ? 31 : season === '冬季' ? 8 : 22
  const minTemperature = temperature - 3
  const maxTemperature = temperature + 3
  const temperatureRange = `${minTemperature}~${maxTemperature}`
  const context = {
    date: getTodayString(),
    city: city || process.env.FRIDGE_DEFAULT_CITY || '上海',
    season,
    weather: season === '夏季' ? '晴热' : season === '冬季' ? '阴冷' : '微风',
    temperature,
    minTemperature,
    maxTemperature,
    temperatureRange,
    humidity: season === '秋季' ? 48 : 58,
    mealTime: '全天',
    localHour: now.hour,
    ...solarTerm,
    regionalDietProfile: getRegionalDietProfile(city),
    weatherSource: 'mock',
    weatherStatus: 'fallback',
    weatherContextVersion: WEATHER_CONTEXT_VERSION,
    weatherUpdatedAt: getTodayString(),
    radarAdviceSource: 'rule',
    summary: searchInsight || '云端菜谱会结合当日气候和季节给出轻负担搭配。',
    searchInsight: searchInsight || '联网搜索未启用时，使用季节和气候规则生成建议。',
  }

  return {
    ...context,
    radarAdvice: buildRuleRadarAdvice(context),
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

function pickForecastNodes(result) {
  if (!result) {
    return []
  }

  const candidates = [
    result.forecast,
    result.forecasts,
    result.future,
    result.daily,
    result.days,
    result.list,
    result.weather,
  ]

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]

    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate
    }

    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const values = Object.values(candidate).filter(
        (item) => item && typeof item === 'object',
      )

      if (values.length > 0) {
        return values
      }
    }
  }

  return [result]
}

function isTodayForecastNode(node = {}) {
  const dateText = String(
    pickFirstValue([
      node.date,
      node.time,
      node.day,
      node.forecastDate,
      node.fxDate,
      node.ymd,
    ]),
  )
  const dateDigits = dateText.replace(/\D/g, '')
  const todayDigits = getTodayString().replace(/\D/g, '')

  return (
    !dateDigits ||
    dateDigits.includes(todayDigits) ||
    dateDigits.includes(todayDigits.slice(4))
  )
}

function pickTodayForecastInfo(result) {
  const nodes = pickForecastNodes(result)
  const infoNodes = []

  nodes.forEach((node = {}) => {
    const infos = Array.isArray(node.infos)
      ? node.infos
      : Array.isArray(node.info)
        ? node.info
        : []

    if (infos.length > 0) {
      infos.forEach((info) => {
        infoNodes.push({
          ...info,
          update_time: info.update_time || node.update_time || node.updateTime,
        })
      })
      return
    }

    infoNodes.push(node)
  })

  return infoNodes.find(isTodayForecastNode) || infoNodes[0] || {}
}

function parseTemperatureRangeText(value) {
  const text = cleanTemperatureText(value)
  const match = text.match(/(-?\d+(?:\.\d+)?)\D+(-?\d+(?:\.\d+)?)/)

  if (!match) {
    return null
  }

  const firstTemperature = Number(match[1])
  const secondTemperature = Number(match[2])
  const minTemperature =
    !Number.isNaN(firstTemperature) && !Number.isNaN(secondTemperature)
      ? String(Math.min(firstTemperature, secondTemperature))
      : match[1]
  const maxTemperature =
    !Number.isNaN(firstTemperature) && !Number.isNaN(secondTemperature)
      ? String(Math.max(firstTemperature, secondTemperature))
      : match[2]

  return {
    minTemperature,
    maxTemperature,
    temperatureRange: `${minTemperature}~${maxTemperature}`,
  }
}

function buildTemperatureRangeProfile(minValue, maxValue, rangeValue) {
  let minTemperature = cleanTemperatureText(minValue)
  let maxTemperature = cleanTemperatureText(maxValue)
  const parsedRange = parseTemperatureRangeText(rangeValue)

  if ((!minTemperature || !maxTemperature) && parsedRange) {
    minTemperature = minTemperature || parsedRange.minTemperature
    maxTemperature = maxTemperature || parsedRange.maxTemperature
  }

  if (!minTemperature || !maxTemperature) {
    return {}
  }

  const minNumber = Number(minTemperature)
  const maxNumber = Number(maxTemperature)

  if (!Number.isNaN(minNumber) && !Number.isNaN(maxNumber) && minNumber > maxNumber) {
    const nextMinTemperature = maxTemperature
    maxTemperature = minTemperature
    minTemperature = nextMinTemperature
  }

  return {
    minTemperature,
    maxTemperature,
    temperatureRange:
      minTemperature === maxTemperature
        ? minTemperature
        : `${minTemperature}~${maxTemperature}`,
  }
}

function getOfficialForecastTemperatureRange(dayInfo = {}, nightInfo = {}) {
  const dayTemperature = pickFirstValue([
    dayInfo.temperature,
    dayInfo.temp,
    dayInfo.tem,
  ])
  const nightTemperature = pickFirstValue([
    nightInfo.temperature,
    nightInfo.temp,
    nightInfo.tem,
  ])
  const forecastProfile = buildTemperatureRangeProfile(
    nightTemperature,
    dayTemperature,
    '',
  )

  return hasTemperatureRangeProfile(forecastProfile)
    ? {
      ...forecastProfile,
      temperatureRangeSource: 'tencent_forecast_day_night',
    }
    : {}
}

function hasTemperatureRangeProfile(profile = {}) {
  const minTemperature = cleanTemperatureText(profile.minTemperature)
  const maxTemperature = cleanTemperatureText(profile.maxTemperature)

  return Boolean(profile.temperatureRange || (minTemperature && maxTemperature))
}

function normalizeForecastPayload(response) {
  const result = response && response.result ? response.result : {}
  const node = pickTodayForecastInfo(result)
  const infos = node.infos || node.info || {}
  const dayInfo = node.day || node.daytime || node.day_weather || {}
  const nightInfo = node.night || node.nighttime || node.night_weather || {}
  const officialForecastProfile = getOfficialForecastTemperatureRange(dayInfo, nightInfo)

  if (hasTemperatureRangeProfile(officialForecastProfile)) {
    return {
      ...officialForecastProfile,
      forecastDate: node.date || node.forecastDate || node.fxDate || '',
    }
  }

  const minTemperature = pickFirstValue([
    infos.min_temperature,
    infos.minTemperature,
    infos.temperature_min,
    infos.temp_min,
    infos.tempMin,
    infos.low,
    infos.min,
    infos.night_temperature,
    infos.nightTemp,
    infos.lowest,
    node.min_temperature,
    node.minTemperature,
    node.temperature_min,
    node.temp_min,
    node.tempMin,
    node.low,
    node.min,
    node.night_temperature,
    node.nightTemp,
    node.lowest,
  ])
  const maxTemperature = pickFirstValue([
    infos.max_temperature,
    infos.maxTemperature,
    infos.temperature_max,
    infos.temp_max,
    infos.tempMax,
    infos.high,
    infos.max,
    infos.day_temperature,
    infos.dayTemp,
    infos.highest,
    node.max_temperature,
    node.maxTemperature,
    node.temperature_max,
    node.temp_max,
    node.tempMax,
    node.high,
    node.max,
    node.day_temperature,
    node.dayTemp,
    node.highest,
  ])
  const temperatureRange = pickFirstValue([
    infos.temperatureRange,
    infos.tempRange,
    infos.temperature,
    infos.temp,
    infos.range,
    node.temperatureRange,
    node.tempRange,
    node.temperature,
    node.temp,
    node.range,
  ])

  return {
    ...buildTemperatureRangeProfile(minTemperature, maxTemperature, temperatureRange),
    forecastDate: node.date || node.forecastDate || node.fxDate || '',
  }
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

  const nowProfile = normalizeWeatherPayload(response, safeCity, adcode)
  const futureResponse = await requestGetJson(
    'apis.map.qq.com',
    '/ws/weather/v1/',
    {
      adcode,
      type: 'future',
      get_md: 0,
      key,
    },
  )

  if (futureResponse.status !== 0) {
    throw new Error(futureResponse.message || '天气预报查询失败')
  }

  const forecastProfile = normalizeForecastPayload(futureResponse)

  if (!hasTemperatureRangeProfile(forecastProfile)) {
    throw new Error('天气预报未返回今日温度区间')
  }

  return {
    ...nowProfile,
    ...forecastProfile,
  }
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
      summary:
        `${weatherProfile.city}${weatherProfile.weather}，` +
        `${getTemperatureLabel(weatherProfile)}，湿度 ${weatherProfile.humidity || '--'}%，` +
        '适合按气候安排低负担家常菜。',
      radarAdvice: buildRuleRadarAdvice({
        ...baseContext,
        ...weatherProfile,
      }),
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

function getProvidedRecommendationContext(context, city, scene, items) {
  if (!context || typeof context !== 'object') {
    return null
  }

  const safeCity = normalizeCityName(city)
  const contextCity = normalizeCityName(context.city || safeCity)

  if (safeCity && contextCity && safeCity !== contextCity) {
    return null
  }

  if (!isTrustedProvidedWeatherContext(context)) {
    return null
  }

  const nextContext = {
    ...context,
    city: contextCity || safeCity,
    scene,
    ...(!context.solarTermName ? getDisplaySolarTerm() : {}),
    regionalDietProfile: context.regionalDietProfile || getRegionalDietProfile(contextCity || safeCity),
    inventoryScan: scene === 'expiryRadar'
      ? buildInventoryScanSummary(items)
      : context.inventoryScan || null,
  }

  if (!nextContext.weather || nextContext.temperature === undefined || nextContext.humidity === undefined) {
    return null
  }

  return nextContext
}

function isTodayContextDate(context = {}) {
  const contextDate = String(context.date || '').replace(/\D/g, '')
  const todayDate = getTodayString().replace(/\D/g, '')

  return Boolean(contextDate) && contextDate === todayDate
}

function isTrustedProvidedWeatherContext(context = {}) {
  const weatherStatus = String(context.weatherStatus || '')
  const weatherSource = String(context.weatherSource || '')
  const weatherContextVersion = Number(context.weatherContextVersion || 0)

  if (weatherContextVersion !== WEATHER_CONTEXT_VERSION || !isTodayContextDate(context)) {
    return false
  }

  if (weatherStatus === 'real') {
    return weatherSource === 'tencent'
  }

  if (weatherStatus === 'fallback') {
    return weatherSource === 'mock'
  }

  return false
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

  if (scene === 'blindBox') {
    return [
      '请为微信小程序“冰箱雷达”的“菜谱盲盒”生成 3 道应季养生家常菜。',
      '这是用户不知道吃什么时的灵感入口，不要读取或假设用户冰箱库存，不要写“已有食材”。',
      '必须综合城市、当天真实天气或兜底天气、今日温度区间、湿度、季节和节气来设计适合全天的菜谱。',
      '菜谱不要过于简单，要像可以真正照着做的家常菜：说明备菜、切配、火候、时间、判断熟度、出锅状态和可替代做法。',
      '每道菜写 5-7 个步骤，每一步都要具体，避免“炒熟即可”“简单调味”这类空话。',
      '可以参考中医食养表达，但不要做医疗诊断、治疗承诺，不要说能治疗疾病。',
      'ingredients 只写主料和关键辅料的纯食材名，不要写数量、单位、状态或省略号，例如写“鲫鱼”不要写“鲜活鲫鱼 1 条”。',
      '不要把盐、油、水、糖、酱油、葱姜蒜这类基础调味列入 ingredients。',
      '菜名要像真实家常菜，不要生成纯调料菜、标题党菜或难以执行的菜。',
      '只返回 JSON，格式如下：',
      '{"recipes":[{"id":"短英文id","title":"菜名","ingredients":["食材"],"timeCost":"25 分钟","difficulty":"中等","tags":["标签"],"steps":["步骤"],"safetyNote":"安全提示","reason":"推荐原因"}],"summary":"一句话总结","radarAdvice":"一句只根据城市天气气候生成的养生雷达建议"}',
      `今日上下文：${JSON.stringify(context)}`,
    ].join('\n')
  }

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
      '步骤要比模板更具体，每道菜 5-7 步，说明备菜、切配、火候、时间、判断熟度、临期食材怎么优先用掉和出锅状态。',
      selectedNames ? `本轮优先处理食材：${selectedNames}` : '本轮没有明显临期食材，请根据全部未过期库存生成。',
      `库存扫描结果：${JSON.stringify(scanSummary)}`,
      '只返回 JSON，格式如下：',
      '{"recipes":[{"id":"短英文id","title":"菜名","ingredients":["食材"],"timeCost":"15 分钟","difficulty":"简单","tags":["标签"],"steps":["步骤"],"safetyNote":"安全提示","reason":"推荐原因"}],"summary":"一句话总结","radarAdvice":"一句只根据城市天气气候生成的养生雷达建议"}',
      `今日上下文：${JSON.stringify(context)}`,
      `未过期库存：${JSON.stringify(compactItems)}`,
    ].join('\n')
  }

  return [
    '请为微信小程序“冰箱雷达”的“我来选食材”生成 3 道家常菜谱。',
    '用户已经明确选择料理碗里的食材，必须围绕这些食材设计菜谱，不要偏离主题。',
    '要求：优先使用用户点选食材；不要使用已过期食材；缺少食材可以列出，但不要列基础调味品。',
    '请结合今日城市、天气、温度、湿度、季节和节气，让推荐理由更偏气候养生和家常饮食管理。',
    'radarAdvice 只能根据城市、天气、温度、湿度和节气生成，不要引用库存、选中食材、临期食材或菜谱结果。',
    '可以参考中医食养表达，但不要做医疗诊断、治疗承诺，不要说能治疗疾病。',
    '菜谱不要过于简单，要写成新手能照着做的版本。',
    '每道菜写 5-7 个步骤，每一步都要包含具体操作，例如切多大、先后顺序、火候、约几分钟、看到什么状态再进入下一步。',
    '步骤里可以给出低成本替代方案和口味调整建议，但不要把步骤写成大段散文。',
    'ingredients 里的食材名请使用纯食材名，不要带“临期、库存、1份、少许、适量”等修饰。',
    selectedNames ? `用户点选的重点食材：${selectedNames}` : '用户未点选食材，请根据库存整体推荐。',
    '只返回 JSON，格式如下：',
    '{"recipes":[{"id":"短英文id","title":"菜名","ingredients":["食材"],"timeCost":"25 分钟","difficulty":"中等","tags":["标签"],"steps":["步骤"],"safetyNote":"安全提示","reason":"推荐原因"}],"summary":"一句话总结","radarAdvice":"一句只根据城市天气气候生成的养生雷达建议"}',
    `今日上下文：${JSON.stringify(context)}`,
    `库存：${JSON.stringify(compactItems)}`,
  ].join('\n')
}

function buildClimateAdvicePrompt(context) {
  return [
    '请为微信小程序“冰箱雷达”的 AI 菜谱页生成一句“雷达建议”。',
    '上方天气卡已经展示城市、天气、温度和湿度，雷达建议里不要重复这些数字和天气词。',
    '不要以城市名开头，不要写“广州今日雨”“长沙多云”“29℃湿度63%”这类复述天气的信息。',
    '直接给用户今日全天怎么吃：推荐烹饪方式、食材方向、口味控制，以及需要避开的做法。',
    '必须体现地域饮食特征，但表达要自然，例如长沙可以提“湘味收辣降油”，广州可以提“清润祛湿”。',
    '必须结合气候体感、节气阶段和中医食养逻辑，用“祛湿、健脾、润燥、清热、生津、温养”等食养方向之一组织建议。',
    '可以提节气判断，例如“小满后芒种前湿热渐重”“春末夏初宜清润”，但不要堆术语。',
    `当前节气：${context.solarTermName || '未知'}（${context.solarTermHint || '未知'}）。`,
    `地域饮食画像：${context.regionalDietProfile || getRegionalDietProfile(context.city)}。`,
    '不要引用库存、选中食材、临期食材或菜谱结果。',
    '可以参考中医食养表达，但不要做医疗诊断、治疗承诺，不要说能治疗疾病。',
    '不要说“天气暂用估算”“真实天气不可用”“兜底天气”等技术状态。',
    '建议控制在 55-85 个中文字符，不要太短，不要像模板标语。',
    '只返回 JSON，格式如下：',
    '{"radarAdvice":"一句气候养生建议"}',
    `今日上下文：${JSON.stringify(context)}`,
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

async function callCloudBaseClimateAdvice(context) {
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
          '你是冰箱管家的气候食养建议助手。输出必须是 JSON，不要输出 Markdown。',
      },
      {
        role: 'user',
        content: buildClimateAdvicePrompt(context),
      },
    ],
  })
  const parsed = extractJson(getAiText(result))

  return String(parsed.radarAdvice || '').trim()
}

function buildMockRecommendations(baseItems) {
  return sortRecommendations(
    MOCK_RECIPES.map((recipe) => matchRecipe(recipe, baseItems, 'mock')),
  )
}

function normalizeAiRecommendations(aiResult, baseItems, maxCount = 5, sourceType = 'ai') {
  const recipes = Array.isArray(aiResult.recipes) ? aiResult.recipes : []

  if (recipes.length === 0) {
    throw new Error('AI 未返回菜谱列表')
  }

  return sortRecommendations(
    recipes.slice(0, maxCount).map((recipe) => ({
      ...matchRecipe(recipe, baseItems, sourceType),
      providerStatus: 'real',
    })),
  )
}

exports.main = async (event = {}) => {
  const items = Array.isArray(event.items) ? event.items : []
  const usableItems = getUsableItems(items)
  const scene = event.scene || event.mode || ''
  const isExpiryRadar = scene === 'expiryRadar'
  const isBlindBox = scene === 'blindBox'
  const isPicker = scene === 'picker'
  const isClimateRadar = scene === 'climateRadar'
  const selectedItems = isExpiryRadar
    ? getSelectedItems(usableItems, event.priorityItemIds)
    : isBlindBox
      ? []
      : getSelectedItems(usableItems, event.selectedItemIds)
  const baseItems = isBlindBox
    ? []
    : isExpiryRadar
    ? usableItems
    : selectedItems.length > 0 ? selectedItems : usableItems
  const city = event.city || process.env.FRIDGE_DEFAULT_CITY || '上海'
  const providedContext = getProvidedRecommendationContext(event.context, city, scene, items)
  const searchInsight = providedContext ? '' : await getSearchInsight(city)
  const context = providedContext || await buildRecommendationContext(city, searchInsight, items, scene)

  if (isClimateRadar) {
    try {
      const radarAdvice = await callCloudBaseClimateAdvice(context)

      return {
        context: {
          ...context,
          radarAdvice: radarAdvice || context.radarAdvice,
          radarAdviceSource: radarAdvice ? 'ai' : context.radarAdviceSource || 'rule',
        },
        selectedItems: [],
        recommendations: [],
        providerStatus: radarAdvice ? 'real' : 'context',
        fallbackReason: '',
      }
    } catch (error) {
      return {
        context,
        selectedItems: [],
        recommendations: [],
        providerStatus: 'context',
        fallbackReason:
          error.message || error.code || '云端 AI 雷达建议暂不可用，已保留天气上下文。',
      }
    }
  }

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
      isExpiryRadar || isBlindBox || isPicker ? 3 : 5,
      isBlindBox ? 'blindBox' : 'ai',
    )

    return {
      context: {
        ...context,
        summary: aiResult.summary || context.summary,
        radarAdvice: context.radarAdvice,
        radarAdviceSource: context.radarAdviceSource || 'rule',
      },
      selectedItems: selectedItems.map(formatItem),
      recommendations,
      providerStatus: 'real',
      fallbackReason: '',
    }
  } catch (error) {
    if (isExpiryRadar || isBlindBox || isPicker) {
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
