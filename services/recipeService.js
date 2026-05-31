const { getDaysUntil, getTodayString } = require('../utils/date')
const { getRecipeVisual } = require('../utils/visualAssets')

const AI_RECIPE_LIBRARY = [
  {
    id: 'tomato-egg',
    title: '番茄炒蛋',
    ingredients: ['番茄', '鸡蛋', '大葱'],
    seasonTags: ['春季', '夏季', '晚餐'],
    timeCost: '15 分钟',
    difficulty: '简单',
    tags: ['快手菜', '家常', '高匹配'],
    steps: [
      '番茄切块，鸡蛋打散，大葱切碎。',
      '先炒鸡蛋至凝固后盛出。',
      '番茄炒软出汁，再倒回鸡蛋翻匀调味。',
    ],
  },
  {
    id: 'vegetable-tofu-soup',
    title: '蔬菜豆腐汤',
    ingredients: ['豆腐', '青菜', '香菇'],
    seasonTags: ['春季', '雨天', '晚餐'],
    timeCost: '18 分钟',
    difficulty: '简单',
    tags: ['热汤', '清淡', '低负担'],
    steps: [
      '豆腐切块，青菜洗净，香菇切片。',
      '锅中加水煮开，先放香菇和豆腐。',
      '最后加入青菜，煮软后加盐调味。',
    ],
  },
  {
    id: 'egg-fried-rice',
    title: '鸡蛋蔬菜炒饭',
    ingredients: ['鸡蛋', '米饭', '胡萝卜', '青菜'],
    seasonTags: ['午餐', '晚餐'],
    timeCost: '12 分钟',
    difficulty: '简单',
    tags: ['主食', '快手', '清库存'],
    steps: [
      '鸡蛋炒散备用，蔬菜切小粒。',
      '米饭下锅炒散，加入蔬菜翻炒。',
      '倒回鸡蛋，按口味加盐或少量生抽。',
    ],
  },
  {
    id: 'warm-noodle',
    title: '暖胃热汤面',
    ingredients: ['面条', '鸡蛋', '青菜'],
    seasonTags: ['雨天', '晚餐', '秋季', '冬季'],
    timeCost: '15 分钟',
    difficulty: '简单',
    tags: ['热食', '主食', '省心'],
    steps: [
      '锅中加水煮开，放入面条。',
      '面条快熟时加入青菜和鸡蛋。',
      '用盐、酱油或喜欢的汤底简单调味。',
    ],
  },
  {
    id: 'yogurt-fruit-bowl',
    title: '酸奶水果碗',
    ingredients: ['酸奶', '香蕉', '苹果'],
    seasonTags: ['早餐', '加餐', '夏季'],
    timeCost: '8 分钟',
    difficulty: '简单',
    tags: ['轻食', '早餐', '免开火'],
    steps: [
      '水果切成小块。',
      '倒入酸奶，按口味加入燕麦或坚果。',
      '冷藏片刻或直接食用。',
    ],
  },
  {
    id: 'milk-oat-cup',
    title: '牛奶燕麦杯',
    ingredients: ['牛奶', '燕麦', '香蕉'],
    seasonTags: ['早餐', '春季'],
    timeCost: '6 分钟',
    difficulty: '简单',
    tags: ['早餐', '免开火', '饱腹'],
    steps: [
      '燕麦倒入杯中，加入牛奶浸泡。',
      '香蕉切片铺在表面。',
      '可按口味加少量坚果或水果。',
    ],
  },
  {
    id: 'stir-fry-greens',
    title: '清炒时蔬',
    ingredients: ['青菜', '西兰花', '胡萝卜'],
    seasonTags: ['春季', '午餐', '晚餐'],
    timeCost: '10 分钟',
    difficulty: '简单',
    tags: ['素菜', '清爽', '快手'],
    steps: [
      '蔬菜洗净切成适口大小。',
      '热锅少油，先放不易熟的蔬菜。',
      '快熟时加入叶菜，出锅前简单调味。',
    ],
  },
  {
    id: 'cucumber-egg-salad',
    title: '黄瓜鸡蛋轻拌',
    ingredients: ['黄瓜', '鸡蛋', '酸奶'],
    seasonTags: ['夏季', '晴天', '晚餐'],
    timeCost: '12 分钟',
    difficulty: '简单',
    tags: ['清爽', '轻食', '少油'],
    steps: [
      '鸡蛋煮熟后切块。',
      '黄瓜切片或切丁。',
      '用酸奶、盐和少量黑胡椒拌匀。',
    ],
  },
]

const BLIND_BOX_RECIPES = [
  {
    id: 'seasonal-mung-bean-soup',
    title: '绿豆百合清润汤',
    ingredients: ['绿豆', '百合', '冰糖'],
    seasonTags: ['夏季', '晴热', '加餐'],
    timeCost: '35 分钟',
    difficulty: '简单',
    tags: ['应季', '清爽', '少油'],
    steps: [
      '绿豆提前浸泡后冲洗干净。',
      '加清水煮至绿豆开花。',
      '加入百合和少量冰糖，煮到汤色清亮后放温食用。',
    ],
    safetyNote:
      '普通食养灵感，不替代医疗或营养治疗建议；' +
      '血糖控制人群可不放糖。',
  },
  {
    id: 'seasonal-lotus-pear-soup',
    title: '莲藕雪梨润燥汤',
    ingredients: ['莲藕', '雪梨', '红枣'],
    seasonTags: ['秋季', '干爽', '温润'],
    timeCost: '40 分钟',
    difficulty: '简单',
    tags: ['应季', '温润', '热汤'],
    steps: [
      '莲藕去皮切片，雪梨去核切块。',
      '锅中加水放入莲藕和红枣，小火煮 25 分钟。',
      '加入雪梨再煮 10 分钟，温热饮用。',
    ],
    safetyNote: '普通家常饮食建议，不替代医疗建议。',
  },
  {
    id: 'seasonal-yam-congee',
    title: '山药南瓜小米粥',
    ingredients: ['山药', '南瓜', '小米'],
    seasonTags: ['秋季', '冬季', '早餐', '温润'],
    timeCost: '30 分钟',
    difficulty: '简单',
    tags: ['应季', '暖胃', '主食'],
    steps: [
      '小米淘洗后加水煮开。',
      '山药和南瓜切小块，转小火同煮。',
      '煮到粥体绵软后关火，放温食用。',
    ],
    safetyNote: '普通食谱建议，不替代医疗或营养治疗建议。',
  },
  {
    id: 'seasonal-tomato-tofu-soup',
    title: '番茄豆腐清汤',
    ingredients: ['番茄', '豆腐', '青菜'],
    seasonTags: ['春季', '夏季', '午餐', '晚餐', '清爽'],
    timeCost: '18 分钟',
    difficulty: '简单',
    tags: ['应季', '清淡', '低负担'],
    steps: [
      '番茄切块，豆腐切小块。',
      '番茄少油炒出汁后加水煮开。',
      '放入豆腐和青菜，煮熟后少量调味。',
    ],
    safetyNote: '普通家常菜建议，不替代医疗建议。',
  },
  {
    id: 'seasonal-ginger-noodle',
    title: '姜丝青菜热汤面',
    ingredients: ['面条', '青菜', '姜丝'],
    seasonTags: ['冬季', '雨天', '阴冷', '晚餐'],
    timeCost: '15 分钟',
    difficulty: '简单',
    tags: ['应季', '热食', '暖胃'],
    steps: [
      '清水煮开后放入少量姜丝。',
      '下面条煮到八成熟，再加入青菜。',
      '用盐或少量生抽调味，趁热食用。',
    ],
    safetyNote: '普通家常热食建议，不替代医疗建议。',
  },
]

const TIPSY_BOX = [
  {
    id: 'tipsy-peach-tea',
    title: '白桃茶微醺杯',
    ingredients: ['白桃乌龙茶', '气泡水', '少量低度酒'],
    seasonTags: ['晚间', '周末'],
    timeCost: '6 分钟',
    difficulty: '简单',
    tags: ['微醺', '清爽'],
    steps: [
      '茶汤冷却',
      '加入冰块和气泡水',
      '最后加入少量低度酒并轻轻搅匀',
    ],
    safetyNote: '酒精饮品仅限成年人，适量饮用，饮酒后不要驾驶。',
  },
  {
    id: 'tipsy-citrus-soda',
    title: '柑橘气泡微醺',
    ingredients: ['橙子', '气泡水', '少量低度酒'],
    seasonTags: ['晚间', '夏季'],
    timeCost: '5 分钟',
    difficulty: '简单',
    tags: ['微醺', '果香'],
    steps: ['橙子取汁', '加入冰块和气泡水', '倒入少量低度酒后搅匀'],
    safetyNote: '酒精饮品仅限成年人，适量饮用，饮酒后不要驾驶。',
  },
]

const HEALTHY_DRINK_BOX = [
  {
    id: 'healthy-apple-yogurt',
    title: '苹果酸奶杯',
    ingredients: ['苹果', '酸奶', '燕麦'],
    seasonTags: ['早餐', '加餐'],
    timeCost: '5 分钟',
    difficulty: '简单',
    tags: ['健康饮品', '清爽'],
    steps: ['苹果切小块', '加入酸奶搅拌', '表面撒少量燕麦'],
    safetyNote: '这是普通饮品灵感，不替代任何医疗或营养治疗建议。',
  },
  {
    id: 'healthy-banana-milk',
    title: '香蕉牛奶杯',
    ingredients: ['香蕉', '牛奶', '燕麦'],
    seasonTags: ['早餐', '运动后'],
    timeCost: '5 分钟',
    difficulty: '简单',
    tags: ['健康饮品', '饱腹'],
    steps: ['香蕉切段', '加入牛奶搅打或压拌', '按口味加入少量燕麦'],
    safetyNote: '这是普通饮品灵感，不替代任何医疗或营养治疗建议。',
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

function getNearestReminderDate(items) {
  const usableItems = getUsableItems(Array.isArray(items) ? items : [])
    .map((item) => ({
      expireDate: item.expireDate,
      daysUntil: getDaysUntil(item.expireDate),
    }))
    .sort((left, right) => left.daysUntil - right.daysUntil)

  return usableItems.length > 0 ? usableItems[0].expireDate : getTodayString()
}

function formatShortDate(dateText) {
  const parts = String(dateText || '').split('-')

  if (parts.length !== 3) {
    return dateText || ''
  }

  return `${Number(parts[1])}月${Number(parts[2])}日`
}

function getWeatherProfile(season) {
  const profileMap = {
    春季: {
      weather: '微风',
      temperature: 22,
      humidity: 58,
      healthTip: '今天适合吃得清爽一点，安排一顿轻负担的家常菜。',
      searchInsight: '搜索趋势偏向快手家常、清爽热菜和少油搭配。',
    },
    夏季: {
      weather: '晴热',
      temperature: 31,
      humidity: 66,
      healthTip:
        '气温偏高，饮食可以清爽些，优先选择少油、补水感强的搭配。',
      searchInsight: '搜索趋势偏向凉拌、清炒、酸奶水果和气泡饮品。',
    },
    秋季: {
      weather: '干爽',
      temperature: 20,
      humidity: 48,
      healthTip: '天气偏干，适合安排热汤、蒸煮和带一点水分的家常菜。',
      searchInsight: '搜索趋势偏向热汤、焖饭、炖煮和温润饮品。',
    },
    冬季: {
      weather: '阴冷',
      temperature: 8,
      humidity: 54,
      healthTip: '天冷时先照顾胃口，适合安排一碗温热熟食。',
      searchInsight: '搜索趋势偏向热汤面、锅物、焖煮和暖饮。',
    },
  }

  return profileMap[season] || profileMap.春季
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

function buildRadarDietPrompt(context) {
  return [
    '你是冰箱小雷达的饮食建议助手。',
    '请结合中医饮食理论，但不要做医疗诊断或治疗承诺。',
    `所在城市：${context.city || '未知'}。`,
    `今日节气：${context.solarTermName || '未知'}（${
      context.solarTermHint || '节气信息未知'
    }）。`,
    `今日季节：${context.season || '未知'}。`,
    `气候信息：${context.weather || '未知'}，` +
      `今日温度 ${getTemperatureLabel(context)}，湿度 ${context.humidity || '--'}%。`,
    '请给出一句适合今日全天气候和地域特点的家常饮食建议，' +
      '要求温和、具体，不要引用库存或选中食材。',
  ].join('\n')
}

function buildRadarDietAdvice(context) {
  if (context && context.radarAdvice && context.radarAdviceSource === 'ai') {
    return context.radarAdvice
  }

  const temperature = Number(context.temperature)
  const humidity = Number(context.humidity)
  const termText = context.solarTermName
    ? `${context.solarTermName}前后，`
    : ''

  if (humidity >= 70) {
    return (
      `${termText}今日全天建议走健脾祛湿路线，` +
      '优先蒸煮、汤菜、豆腐和绿叶菜，少油少辣，避开厚重煎炸。'
    )
  }

  if (humidity <= 45) {
    return (
      `${termText}今日全天建议多一点汤水和润燥食材，` +
      '选菌菇、瓜果、蒸菜或低盐蛋白，少煎烤辛辣。'
    )
  }

  if (temperature >= 28) {
    return (
      `${termText}今日全天建议清热生津，` +
      '主菜选蒸煮或快炒时蔬，搭配豆腐鱼虾，少放辣油和甜腻饮品。'
    )
  }

  return (
    `${termText}今日全天建议做轻负担家常菜，` +
    '主菜选蒸煮或清炒，搭配绿叶菜和温和蛋白，口味别太重。'
  )
}

function getContextLabel(context) {
  if (!context) {
    return ''
  }

  const cityText = context.city ? `${context.city} · ` : ''

  return (
    `${cityText}${context.solarTermName || context.season || '今日'} · ` +
    `${context.weather || '天气'} · ${getTemperatureLabel(context)} · ` +
    `湿度 ${context.humidity || '--'}%`
  )
}

function getClimateRecipeScore(recipe, context) {
  if (!context) {
    return 0
  }

  let score = 0
  const tags = new Set([...(recipe.tags || []), ...(recipe.seasonTags || [])])
  const temperature = Number(context.temperature)
  const humidity = Number(context.humidity)

  if (tags.has(context.season)) {
    score += 5
  }

  if (tags.has(context.weather)) {
    score += 3
  }

  if (
    temperature >= 28 &&
    (tags.has('清爽') || tags.has('轻食') || tags.has('免开火'))
  ) {
    score += 4
  }

  if (temperature <= 12 && (tags.has('热汤') || tags.has('热食'))) {
    score += 4
  }

  if (
    humidity >= 65 &&
    (tags.has('清爽') || tags.has('少油') || tags.has('低负担'))
  ) {
    score += 3
  }

  if (humidity <= 45 && (tags.has('热汤') || tags.has('温润'))) {
    score += 3
  }

  return score
}

function buildContextRecipeReason(recipe, context) {
  if (!context) {
    return recipe.reason || ''
  }

  const availableNames = (recipe.availableItems || []).map((item) => item.name)
  const inventoryText =
    availableNames.length > 0
      ? `冰箱里已有${availableNames.join('、')}，`
      : '当前库存匹配度不高，'
  const missingText =
    recipe.missingItems && recipe.missingItems.length > 0
      ? `还差${recipe.missingItems.length}样，`
      : '食材基本齐，'
  const priorityText =
    recipe.priorityItems && recipe.priorityItems.length > 0
      ? `还能顺手用掉${recipe.priorityItems.map((item) => item.name).join('、')}。`
      : '适合作为今天的轻负担备选。'

  return (
    `结合${getContextLabel(context)}和雷达建议，` +
    `${inventoryText}${missingText}推荐这道${recipe.title}，${priorityText}`
  )
}

function buildSeasonalRecipeReason(recipe, context) {
  if (!context) {
    return recipe.reason || '根据今日气候推荐的应季家常食谱。'
  }

  return (
    `结合${getContextLabel(context)}，推荐这道${recipe.title}，` +
    '适合作为今天的应季养生家常备选。'
  )
}

function buildSeasonalRecipeRecommendation(recipe, sourceType, context) {
  const ingredients = (recipe.ingredients || []).filter(
    (ingredient) => !isBasicPantryIngredient(ingredient),
  )

  return {
    id: recipe.id,
    title: recipe.title,
    image: getRecipeVisual(recipe),
    sourceType,
    reason: buildSeasonalRecipeReason(recipe, context),
    availableItems: [],
    missingItems: ingredients,
    priorityItems: [],
    matchScore: getClimateRecipeScore(recipe, context),
    matchLabel: '应季推荐',
    canCook: false,
    timeCost: recipe.timeCost,
    difficulty: recipe.difficulty,
    tags: recipe.tags || [],
    seasonTags: recipe.seasonTags || [],
    steps: recipe.steps,
    safetyNote: recipe.safetyNote || '普通饮食建议，不替代医疗或营养治疗建议。',
    aiPrompt: buildRadarDietPrompt(context || {}),
  }
}

function applyRecommendationContext(recommendations, context) {
  return recommendations.map((recipe) => ({
    ...recipe,
    reason: buildContextRecipeReason(recipe, context),
    aiPrompt: buildRadarDietPrompt(context || {}),
  }))
}

function getMockRecommendationContext(items) {
  const now = new Date()
  const month = now.getMonth() + 1
  let season = '春季'

  if (month >= 6 && month <= 8) {
    season = '夏季'
  } else if (month >= 9 && month <= 11) {
    season = '秋季'
  } else if (month === 12 || month <= 2) {
    season = '冬季'
  }

  const weatherProfile = getWeatherProfile(season)
  const reminderDate = getNearestReminderDate(items)
  const temperature = weatherProfile.temperature
  const minTemperature = temperature - 3
  const maxTemperature = temperature + 3
  const temperatureRange = `${minTemperature}~${maxTemperature}`

  return {
    date: getTodayString(),
    reminderDate,
    reminderDateDisplay: formatShortDate(reminderDate),
    season,
    weather: weatherProfile.weather,
    temperature,
    minTemperature,
    maxTemperature,
    temperatureRange,
    humidity: weatherProfile.humidity,
    mealTime: '全天',
    healthTip: weatherProfile.healthTip,
    searchInsight: weatherProfile.searchInsight,
    summary:
      `${season}全天，${getTemperatureLabel({ temperatureRange })}，` +
      `湿度 ${weatherProfile.humidity}%，适合做轻负担、步骤少的家常菜。`,
  }
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeIngredientText(value) {
  return normalizeText(value)
    .replace(/\s+/g, '')
    .replace(/临期|库存|现有|已有|新鲜|剩余/g, '')
    .replace(
      /[0-9０-９]+(?:g|kg|ml|l|克|千克|斤|毫升|升|个|颗|枚|根|片|块|份|袋|盒|瓶|勺)?/gi,
      '',
    )
    .replace(/适量|少许|少量|半个|半颗|一份|一小把|一把/g, '')
    .replace(/[()（）【】\[\]，,、:：；;]/g, '')
}

function getCleanIngredientName(value) {
  return String(value || '')
    .replace(/[.。…]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(
      /\s*[0-9０-９]+(?:\.\d+)?\s*(?:g|kg|ml|l|克|千克|斤|毫升|升|个|颗|枚|根|片|块|份|袋|盒|瓶|勺|条)/gi,
      '',
    )
    .replace(/\s*(?:各|约|大约|左右)\s*$/g, '')
    .replace(/[，,、:：；;]\s*$/g, '')
    .trim()
}

function getRecipeImage(recipe, id) {
  return getRecipeVisual({
    ...recipe,
    id: id || (recipe && recipe.id),
  })
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

function findMatchingItem(items, ingredient, usedKeys) {
  return items.find((item) => {
    const key = getItemKey(item)

    return !usedKeys.has(key) && itemMatchesIngredient(item, ingredient)
  })
}

function formatItemForRecipe(item) {
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

function getPriorityItems(items, maxDays) {
  return items.filter((item) => {
    const daysUntil = getDaysUntil(item.expireDate)

    return daysUntil >= 0 && daysUntil <= maxDays
  })
}

function getOverdueItems(items) {
  return items.filter((item) => getDaysUntil(item.expireDate) < 0)
}

function matchRecipeToItems(recipe, items, sourceType, context) {
  const usedKeys = new Set()
  const availableItems = []
  const missingItems = []

  recipe.ingredients.forEach((ingredient) => {
    const matchedItem = findMatchingItem(items, ingredient, usedKeys)

    if (matchedItem) {
      usedKeys.add(getItemKey(matchedItem))
      availableItems.push(formatItemForRecipe(matchedItem))
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
  const matchLabel =
    missingItems.length === 0 ? '可直接做' : `还差 ${missingItems.length} 样`
  const priorityText =
    priorityItems.length > 0
      ? `建议优先用掉${priorityItems.map((item) => item.name).join('、')}。`
      : '库存里没有明显临期匹配食材。'
  let reason = ''

  if (!context && sourceType === 'expiry') {
    reason = `这道菜能消耗临期食材，${priorityText}`
  } else if (!context) {
    reason = `AI 根据库存匹配度和当前场景推荐，${priorityText}`
  }

  return {
    id: recipe.id,
    title: recipe.title,
    image: getRecipeVisual(recipe),
    sourceType,
    reason,
    availableItems,
    missingItems,
    priorityItems,
    matchScore,
    matchLabel,
    canCook: missingItems.length === 0,
    timeCost: recipe.timeCost,
    difficulty: recipe.difficulty,
    tags: recipe.tags || [],
    seasonTags: recipe.seasonTags || [],
    steps: recipe.steps,
    safetyNote: recipe.safetyNote || '',
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

function getAIRecipeRecommendations(items, options) {
  const safeItems = Array.isArray(items) ? items : []
  const selectedItemIds = new Set((options && options.selectedItemIds) || [])
  const selectedItems = safeItems.filter((item) => selectedItemIds.has(getItemKey(item)))
  const usableItems = getUsableItems(safeItems)
  const baseItems = selectedItems.length > 0 ? selectedItems : usableItems
  const context =
    options && options.context
      ? options.context
      : getMockRecommendationContext(baseItems)
  const matchedRecommendations = sortRecommendations(
    AI_RECIPE_LIBRARY.map((recipe) =>
      matchRecipeToItems(recipe, baseItems, 'ai', context),
    ),
  ).slice(0, 5)
  const recommendations = applyRecommendationContext(matchedRecommendations, context)

  return {
    context,
    selectedItems: selectedItems.map(formatItemForRecipe),
    recommendations,
  }
}

function normalizeCloudRecipe(recipe, index) {
  const id = recipe.id || `cloud-recipe-${index}`
  const missingItems = Array.isArray(recipe.missingItems)
    ? recipe.missingItems.map(getCleanIngredientName).filter(Boolean)
    : []

  return {
    ...recipe,
    id,
    image: getRecipeImage(recipe, id),
    sourceType: recipe.sourceType || 'ai',
    reason: recipe.reason || '云端 AI 根据当前库存生成。',
    availableItems: Array.isArray(recipe.availableItems)
      ? recipe.availableItems
      : [],
    missingItems,
    priorityItems: Array.isArray(recipe.priorityItems)
      ? recipe.priorityItems
      : [],
    matchScore: Number(recipe.matchScore) || 0,
    matchLabel: recipe.matchLabel || '',
    canCook: Boolean(recipe.canCook),
    timeCost: recipe.timeCost || '15 分钟',
    difficulty: recipe.difficulty || '简单',
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    seasonTags: Array.isArray(recipe.seasonTags) ? recipe.seasonTags : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    safetyNote: recipe.safetyNote || '',
    providerStatus: recipe.providerStatus || '',
  }
}

function getCloudAIRecipeRecommendations(items, options = {}) {
  if (typeof wx === 'undefined' || !wx.cloud) {
    return Promise.reject(new Error('当前环境不支持云端菜谱生成'))
  }

  const scene = options.scene || 'picker'

  return wx.cloud
    .callFunction({
      name: 'generateRecipes',
      data: {
        scene,
        items: Array.isArray(items) ? items : [],
        selectedItemIds: Array.isArray(options.selectedItemIds)
          ? options.selectedItemIds
          : [],
        city: options.city || '',
        context: options.context || {},
      },
    })
    .then((res) => {
      const payload = res.result || {}
      const isRealProvider = payload.providerStatus === 'real'
      const recommendations = isRealProvider && Array.isArray(payload.recommendations)
        ? payload.recommendations.map(normalizeCloudRecipe)
        : []

      return {
        context: {
          ...(payload.context || {}),
        },
        selectedItems: Array.isArray(payload.selectedItems)
          ? payload.selectedItems
          : [],
        recommendations,
        providerStatus: payload.providerStatus || '',
        fallbackReason: recommendations.length > 0
          ? ''
          : payload.fallbackReason || '云端 AI 暂未生成可用菜谱。',
      }
    })
}

function getCloudClimateContext(city, items = []) {
  if (typeof wx === 'undefined' || !wx.cloud) {
    return Promise.reject(new Error('当前环境不支持云端天气和雷达建议'))
  }

  return wx.cloud
    .callFunction({
      name: 'generateRecipes',
      data: {
        scene: 'climateRadar',
        items: Array.isArray(items) ? items : [],
        city: city || '',
      },
    })
    .then((res) => {
      const payload = res.result || {}

      return {
        context: {
          ...(payload.context || {}),
        },
        providerStatus: payload.providerStatus || '',
        fallbackReason: payload.fallbackReason || '',
      }
    })
}

function getExpiryUsageRecommendations(items) {
  const safeItems = Array.isArray(items) ? items : []
  const usableItems = getUsableItems(safeItems)
  const todayItems = getPriorityItems(safeItems, 0)
  const threeDayItems = getPriorityItems(safeItems, 3)
  const sevenDayItems = getPriorityItems(safeItems, 7)
  const overdueItems = getOverdueItems(safeItems)

  return {
    todayItems: todayItems.map(formatItemForRecipe),
    threeDayItems: threeDayItems.map(formatItemForRecipe),
    sevenDayItems: sevenDayItems.map(formatItemForRecipe),
    overdueItems: overdueItems.map(formatItemForRecipe),
    usableCount: usableItems.length,
    recommendations: [],
    safetyTips: overdueItems.map((item) => ({
      id: getItemKey(item),
      name: item.name,
      text:
        `${item.name}已过期，先检查气味、颜色、包装和保存状态；` +
        '如有异常请直接丢弃，不建议作为菜谱原料。',
    })),
  }
}

function getPriorityRecipeItemIds(expiryUsage) {
  const safeExpiryUsage = expiryUsage || {}
  const priorityItems = Array.isArray(safeExpiryUsage.threeDayItems)
    && safeExpiryUsage.threeDayItems.length > 0
    ? safeExpiryUsage.threeDayItems
    : safeExpiryUsage.sevenDayItems || []

  return priorityItems
    .map((item) => item.id || item._id || item.name)
    .filter(Boolean)
}

function getCloudExpiryRecipeRecommendations(items, expiryUsage, options = {}) {
  const safeItems = Array.isArray(items) ? items : []
  const safeExpiryUsage = expiryUsage || getExpiryUsageRecommendations(safeItems)

  if (typeof wx === 'undefined' || !wx.cloud) {
    return Promise.reject(new Error('当前环境不支持云端菜谱生成'))
  }

  if (!safeExpiryUsage.usableCount) {
    return Promise.resolve({
      context: {},
      selectedItems: [],
      recommendations: [],
      providerStatus: 'empty',
      fallbackReason: '暂无可用库存，先添加食材或处理过期食品。',
    })
  }

  return wx.cloud
    .callFunction({
      name: 'generateRecipes',
      data: {
        scene: 'expiryRadar',
        items: safeItems,
        priorityItemIds: getPriorityRecipeItemIds(safeExpiryUsage),
        city: options.city || '',
      },
    })
    .then((res) => {
      const payload = res.result || {}
      const isRealProvider = payload.providerStatus === 'real'
      const recommendations = isRealProvider && Array.isArray(payload.recommendations)
        ? payload.recommendations.map(normalizeCloudRecipe)
        : []

      return {
        context: payload.context || {},
        selectedItems: Array.isArray(payload.selectedItems)
          ? payload.selectedItems
          : [],
        recommendations,
        providerStatus: payload.providerStatus || '',
        fallbackReason: recommendations.length > 0
          ? ''
          : payload.fallbackReason || '云端 AI 暂未生成可用菜谱。',
      }
    })
}

function getDailyIndex(list, type) {
  const seed = `${getTodayString()}-${type}`
  let hash = 0

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }

  return hash % list.length
}

function getBlindBoxRecommendation(items, type, context) {
  const sourceMap = {
    tipsy: {
      list: TIPSY_BOX,
      sourceType: 'tipsy',
    },
    healthyDrink: {
      list: HEALTHY_DRINK_BOX,
      sourceType: 'healthyDrink',
    },
    blindBox: {
      list: BLIND_BOX_RECIPES,
      sourceType: 'blindBox',
    },
  }
  const config = sourceMap[type] || sourceMap.blindBox
  if (config.sourceType === 'blindBox') {
    const matchedRecipes = config.list.map((recipe) =>
      buildSeasonalRecipeRecommendation(recipe, config.sourceType, context),
    )
    const sortedRecipes = matchedRecipes.sort((left, right) => right.matchScore - left.matchScore)
    const topRecipes = sortedRecipes.slice(0, Math.min(2, sortedRecipes.length))

    return topRecipes[
      getDailyIndex(topRecipes, `${type || 'blindBox'}-${context ? context.solarTermName : ''}`)
    ] || sortedRecipes[0]
  }

  const usableItems = getUsableItems(Array.isArray(items) ? items : [])
  const matchedRecipes = config.list.map((recipe) => {
    const matchedRecipe = matchRecipeToItems(recipe, usableItems, config.sourceType, context)

    return {
      ...matchedRecipe,
      matchScore: matchedRecipe.matchScore + getClimateRecipeScore(recipe, context),
    }
  })
  const sortedRecipes = sortRecommendations(matchedRecipes)
  const topRecipes = sortedRecipes.slice(0, Math.min(2, sortedRecipes.length))
  const recipe =
    topRecipes[
      getDailyIndex(
        topRecipes,
        `${type || 'blindBox'}-${context ? context.solarTermName : ''}`,
      )
    ] || sortedRecipes[0]

  return applyRecommendationContext([recipe], context)[0]
}

function getBlindBoxRecommendations(items, type, context, count = 3, offset = 0) {
  const sourceMap = {
    tipsy: {
      list: TIPSY_BOX,
      sourceType: 'tipsy',
    },
    healthyDrink: {
      list: HEALTHY_DRINK_BOX,
      sourceType: 'healthyDrink',
    },
    blindBox: {
      list: BLIND_BOX_RECIPES,
      sourceType: 'blindBox',
    },
  }
  const config = sourceMap[type] || sourceMap.blindBox
  if (config.sourceType === 'blindBox') {
    const matchedRecipes = config.list.map((recipe) =>
      buildSeasonalRecipeRecommendation(recipe, config.sourceType, context),
    )
    const sortedRecipes = matchedRecipes.sort((left, right) => right.matchScore - left.matchScore)
    const dailyOffset = getDailyIndex(
      sortedRecipes.length > 0 ? sortedRecipes : config.list,
      `${type || 'blindBox'}-${context ? context.solarTermName : ''}`,
    )
    const rotateOffset = sortedRecipes.length > 0
      ? (dailyOffset + Number(offset || 0)) % sortedRecipes.length
      : 0
    const rotatedRecipes = sortedRecipes
      .slice(rotateOffset)
      .concat(sortedRecipes.slice(0, rotateOffset))

    return rotatedRecipes.slice(0, Math.max(1, Number(count) || 3))
  }

  const usableItems = getUsableItems(Array.isArray(items) ? items : [])
  const matchedRecipes = config.list.map((recipe) => {
    const matchedRecipe = matchRecipeToItems(recipe, usableItems, config.sourceType, context)

    return {
      ...matchedRecipe,
      matchScore: matchedRecipe.matchScore + getClimateRecipeScore(recipe, context),
    }
  })
  const sortedRecipes = sortRecommendations(matchedRecipes)
  const dailyOffset = getDailyIndex(
    sortedRecipes.length > 0 ? sortedRecipes : config.list,
    `${type || 'blindBox'}-${context ? context.solarTermName : ''}`,
  )
  const rotateOffset = sortedRecipes.length > 0
    ? (dailyOffset + Number(offset || 0)) % sortedRecipes.length
    : 0
  const rotatedRecipes = sortedRecipes
    .slice(rotateOffset)
    .concat(sortedRecipes.slice(0, rotateOffset))

  return applyRecommendationContext(
    rotatedRecipes.slice(0, Math.max(1, Number(count) || 3)),
    context,
  )
}

function ruleBasedRecipes(items) {
  return getAIRecipeRecommendations(items).recommendations.slice(0, 3)
}

function fallbackAIRecipes(items) {
  return ruleBasedRecipes(items)
}

function getRecipeRecommendations(items) {
  return ruleBasedRecipes(items)
}

module.exports = {
  applyRecommendationContext,
  buildRadarDietAdvice,
  buildRadarDietPrompt,
  fallbackAIRecipes,
  getAIRecipeRecommendations,
  getCloudAIRecipeRecommendations,
  getCloudClimateContext,
  getCloudExpiryRecipeRecommendations,
  getBlindBoxRecommendation,
  getBlindBoxRecommendations,
  getExpiryUsageRecommendations,
  getMockRecommendationContext,
  getRecipeRecommendations,
  ruleBasedRecipes,
}
