const { getDaysUntil, getTodayString } = require('../utils/date')

const DEFAULT_RECIPE_IMAGE = '/images/recipe/default.png'

const RECIPE_IMAGE_MAP = {
  'tomato-egg': '/images/recipe/tomato-egg.png',
  'vegetable-tofu-soup': '/images/recipe/vegetable-tofu-soup.png',
  'egg-fried-rice': '/images/recipe/egg-fried-rice.png',
  'warm-noodle': '/images/recipe/warm-noodle.png',
  'yogurt-fruit-bowl': '/images/recipe/yogurt-fruit-bowl.png',
  'milk-oat-cup': '/images/recipe/milk-oat-cup.png',
  'stir-fry-greens': '/images/recipe/stir-fry-greens.png',
  'cucumber-egg-salad': '/images/recipe/cucumber-egg-salad.png',
  'blind-rice-bowl': '/images/recipe/blind-rice-bowl.png',
  'blind-soup': '/images/recipe/blind-soup.png',
  'blind-sandwich': '/images/recipe/blind-sandwich.png',
  'tipsy-peach-tea': '/images/recipe/tipsy-peach-tea.png',
  'tipsy-citrus-soda': '/images/recipe/tipsy-citrus-soda.png',
  'healthy-apple-yogurt': '/images/recipe/healthy-apple-yogurt.png',
  'healthy-banana-milk': '/images/recipe/healthy-banana-milk.png',
}

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
    id: 'blind-rice-bowl',
    title: '今日随手拌饭',
    ingredients: ['米饭', '鸡蛋', '青菜'],
    seasonTags: ['午餐', '晚餐'],
    timeCost: '12 分钟',
    difficulty: '简单',
    tags: ['盲盒', '主食'],
    steps: ['处理一种蔬菜', '煎一个鸡蛋', '和米饭拌在一起调味'],
  },
  {
    id: 'blind-soup',
    title: '今日温暖汤碗',
    ingredients: ['豆腐', '青菜', '鸡蛋'],
    seasonTags: ['雨天', '晚餐'],
    timeCost: '16 分钟',
    difficulty: '简单',
    tags: ['盲盒', '热汤'],
    steps: ['锅中烧水', '加入豆腐和蔬菜', '最后打入鸡蛋并调味'],
  },
  {
    id: 'blind-sandwich',
    title: '今日快手三明治',
    ingredients: ['面包', '鸡蛋', '生菜'],
    seasonTags: ['早餐', '午餐'],
    timeCost: '10 分钟',
    difficulty: '简单',
    tags: ['盲盒', '快手'],
    steps: ['煎好鸡蛋', '处理蔬菜', '夹入面包后压紧'],
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
    steps: ['茶汤冷却', '加入冰块和气泡水', '最后加入少量低度酒并轻轻搅匀'],
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
      healthTip: '今天适合吃得清爽一点，先把临期食材安排进一顿轻负担的家常菜。',
      searchInsight: '搜索趋势偏向快手家常、清爽热菜和少油搭配。',
    },
    夏季: {
      weather: '晴热',
      temperature: 31,
      humidity: 66,
      healthTip: '气温偏高，饮食可以清爽些，优先选择少油、补水感强的搭配。',
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
      healthTip: '天冷时先照顾胃口，安排一碗热食，再顺手消耗快到期食材。',
      searchInsight: '搜索趋势偏向热汤面、锅物、焖煮和暖饮。',
    },
  }

  return profileMap[season] || profileMap.春季
}

function buildRadarDietPrompt(context) {
  return [
    '你是冰箱雷达的饮食建议助手。',
    '请结合中医饮食理论，但不要做医疗诊断或治疗承诺。',
    `今日节气：${context.solarTermName || '未知'}（${context.solarTermHint || '节气信息未知'}）。`,
    `今日季节：${context.season || '未知'}。`,
    `气候信息：${context.weather || '未知'}，${context.temperature || '--'}℃，湿度 ${context.humidity || '--'}%。`,
    '请给出一句适合今天的家常饮食建议，要求温和、具体、适合库存食材管理。',
  ].join('\n')
}

function buildRadarDietAdvice(context) {
  const seasonAdviceMap = {
    春季: '春季饮食宜清爽舒展',
    夏季: '夏季饮食宜清淡生津',
    秋季: '秋季饮食宜润燥少辛',
    冬季: '冬季饮食宜温热护胃',
  }
  const termText = context.solarTermName
    ? `临近${context.solarTermName}，`
    : ''
  const seasonText = seasonAdviceMap[context.season] || '今天饮食宜清淡均衡'
  const temperature = Number(context.temperature)
  const humidity = Number(context.humidity)
  const tempText =
    temperature >= 28
      ? '气温偏高，少油少辣，适合补水感强的菜。'
      : temperature <= 12
        ? '气温偏低，适合安排温热熟食。'
        : '气温适中，适合做一顿轻负担家常菜。'
  const humidityText =
    humidity >= 65
      ? '湿度较高，可优先选择清爽、少油、容易消化的搭配。'
      : humidity <= 45
        ? '空气偏干，可安排汤羹、蒸煮或带水分的食材。'
        : '湿度适中，注意荤素搭配和不过量。'

  return `${termText}${seasonText}；${tempText}${humidityText}先用掉临期食材，避免浪费。`
}

function getContextLabel(context) {
  if (!context) {
    return ''
  }

  return `${context.solarTermName || context.season || '今日'} · ${context.weather || '天气'} · ${context.temperature || '--'}℃ · 湿度 ${context.humidity || '--'}%`
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

  if (tags.has(context.mealTime)) {
    score += 4
  }

  if (tags.has(context.weather)) {
    score += 3
  }

  if (temperature >= 28 && (tags.has('清爽') || tags.has('轻食') || tags.has('免开火'))) {
    score += 4
  }

  if (temperature <= 12 && (tags.has('热汤') || tags.has('热食'))) {
    score += 4
  }

  if (humidity >= 65 && (tags.has('清爽') || tags.has('少油') || tags.has('低负担'))) {
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

  return `结合${getContextLabel(context)}和雷达建议，${inventoryText}${missingText}推荐这道${recipe.title}，${priorityText}`
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
  const hour = now.getHours()
  let season = '春季'

  if (month >= 6 && month <= 8) {
    season = '夏季'
  } else if (month >= 9 && month <= 11) {
    season = '秋季'
  } else if (month === 12 || month <= 2) {
    season = '冬季'
  }

  let mealTime = '晚餐'

  if (hour < 10) {
    mealTime = '早餐'
  } else if (hour < 15) {
    mealTime = '午餐'
  } else if (hour < 17) {
    mealTime = '加餐'
  }

  const weatherProfile = getWeatherProfile(season)
  const reminderDate = getNearestReminderDate(items)

  return {
    date: getTodayString(),
    reminderDate,
    reminderDateDisplay: formatShortDate(reminderDate),
    season,
    weather: weatherProfile.weather,
    temperature: weatherProfile.temperature,
    humidity: weatherProfile.humidity,
    mealTime,
    healthTip: weatherProfile.healthTip,
    searchInsight: weatherProfile.searchInsight,
    summary: `${season}${mealTime}，${weatherProfile.temperature}℃，湿度 ${weatherProfile.humidity}%，适合做轻负担、步骤少的家常菜。`,
  }
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function getItemKey(item) {
  return item && (item._id || item.id || item.name)
}

function itemMatchesIngredient(item, ingredient) {
  const itemText = normalizeText(`${item.name} ${item.category}`)
  const target = normalizeText(ingredient)

  return itemText.includes(target) || target.includes(itemText)
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

    missingItems.push(ingredient)
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
    image: recipe.image || RECIPE_IMAGE_MAP[recipe.id] || DEFAULT_RECIPE_IMAGE,
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

function buildExpiryFallbackRecipe(item, index) {
  const templates = [
    {
      id: 'expiry-fast-plate',
      title: `${item.name}快手小炒`,
      timeCost: '12 分钟',
      difficulty: '简单',
      tags: ['AI mock', '临期去化', '快手'],
      steps: [
        `先检查${item.name}状态，确认无异味、变色或包装异常。`,
        `将${item.name}按适合方式清洗、切块或预处理。`,
        '热锅少油快速翻炒，出锅前简单调味。',
      ],
    },
    {
      id: 'expiry-warm-bowl',
      title: `${item.name}热汤碗`,
      timeCost: '15 分钟',
      difficulty: '简单',
      tags: ['AI mock', '临期去化', '热食'],
      steps: [
        `先检查${item.name}是否仍适合食用。`,
        `把${item.name}切成适口大小。`,
        '加水煮成热汤，可搭配鸡蛋、豆腐或主食。',
      ],
    },
    {
      id: 'expiry-rice-bowl',
      title: `${item.name}拌饭`,
      timeCost: '10 分钟',
      difficulty: '简单',
      tags: ['AI mock', '临期去化', '主食'],
      steps: [
        `确认${item.name}状态正常后加热或焯熟。`,
        '铺在米饭或主食上。',
        '按口味加入少量酱汁，拌匀后食用。',
      ],
    },
  ]
  const template = templates[index % templates.length]
  const formattedItem = formatItemForRecipe(item)

  return {
    id: `${template.id}-${getItemKey(item)}-${index}`,
    title: template.title,
    image: DEFAULT_RECIPE_IMAGE,
    sourceType: 'expiry',
    reason: `AI 根据临期食材${item.name}生成，建议优先用掉。`,
    availableItems: [formattedItem],
    missingItems: [],
    priorityItems: [formattedItem],
    matchScore: 8 - index,
    matchLabel: '可直接做',
    canCook: true,
    timeCost: template.timeCost,
    difficulty: template.difficulty,
    tags: template.tags,
    seasonTags: [],
    steps: template.steps,
    safetyNote: '临期食品食用前请先检查气味、颜色、包装和保存状态；如有异常请直接丢弃。',
  }
}

function fillExpiryRecommendations(recommendations, baseItems) {
  const result = recommendations.slice(0, 3)
  let fallbackIndex = 0

  while (result.length < 3 && baseItems.length > 0 && fallbackIndex < 9) {
    const item = baseItems[fallbackIndex % baseItems.length]
    const fallbackRecipe = buildExpiryFallbackRecipe(item, fallbackIndex)
    const duplicated = result.some((recipe) => recipe.title === fallbackRecipe.title)

    if (!duplicated) {
      result.push(fallbackRecipe)
    }

    fallbackIndex += 1
  }

  return result
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

  return {
    ...recipe,
    id,
    image: recipe.image || RECIPE_IMAGE_MAP[id] || DEFAULT_RECIPE_IMAGE,
    sourceType: recipe.sourceType || 'ai',
    reason: recipe.reason || '云端 AI 根据当前库存生成。',
    availableItems: Array.isArray(recipe.availableItems)
      ? recipe.availableItems
      : [],
    missingItems: Array.isArray(recipe.missingItems) ? recipe.missingItems : [],
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
  const fallback = getAIRecipeRecommendations(items, options)

  if (typeof wx === 'undefined' || !wx.cloud) {
    return Promise.reject(new Error('当前环境不支持云端菜谱生成'))
  }

  return wx.cloud
    .callFunction({
      name: 'generateRecipes',
      data: {
        items: Array.isArray(items) ? items : [],
        selectedItemIds: Array.isArray(options.selectedItemIds)
          ? options.selectedItemIds
          : [],
        city: options.city || '',
      },
    })
    .then((res) => {
      const payload = res.result || {}
      const recommendations = Array.isArray(payload.recommendations)
        ? payload.recommendations.map(normalizeCloudRecipe)
        : fallback.recommendations

      return {
        context: {
          ...fallback.context,
          ...(payload.context || {}),
        },
        selectedItems: Array.isArray(payload.selectedItems)
          ? payload.selectedItems
          : fallback.selectedItems,
        recommendations,
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
  const recommendationBaseItems =
    threeDayItems.length > 0 ? threeDayItems : sevenDayItems
  const matchedRecommendations = sortRecommendations(
    AI_RECIPE_LIBRARY.map((recipe) =>
      matchRecipeToItems(recipe, recommendationBaseItems, 'expiry'),
    ),
  )
    .filter((recipe) => recipe.availableItems.length > 0)
  const recommendations = fillExpiryRecommendations(
    matchedRecommendations,
    recommendationBaseItems,
  )

  return {
    todayItems: todayItems.map(formatItemForRecipe),
    threeDayItems: threeDayItems.map(formatItemForRecipe),
    sevenDayItems: sevenDayItems.map(formatItemForRecipe),
    overdueItems: overdueItems.map(formatItemForRecipe),
    usableCount: usableItems.length,
    recommendations,
    safetyTips: overdueItems.map((item) => ({
      id: getItemKey(item),
      name: item.name,
      text: `${item.name}已过期，先检查气味、颜色、包装和保存状态；如有异常请直接丢弃，不建议作为菜谱原料。`,
    })),
  }
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
    topRecipes[getDailyIndex(topRecipes, `${type || 'blindBox'}-${context ? context.solarTermName : ''}`)]
    || sortedRecipes[0]

  return applyRecommendationContext([recipe], context)[0]
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
  getBlindBoxRecommendation,
  getExpiryUsageRecommendations,
  getMockRecommendationContext,
  getRecipeRecommendations,
  ruleBasedRecipes,
}
