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
    steps: ['煮开汤底', '放入面条和鸡蛋', '加入青菜并调味'],
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

function getMockContext() {
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
    season,
    weather: season === '夏季' ? '晴热' : season === '冬季' ? '阴冷' : '微风',
    mealTime: hour < 10 ? '早餐' : hour < 15 ? '午餐' : '晚餐',
    summary: '云函数当前返回 mock AI 菜谱结构，后续可在这里接真实 AI、天气和搜索。',
  }
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function itemMatchesIngredient(item, ingredient) {
  const itemText = normalizeText(`${item.name} ${item.category}`)
  const target = normalizeText(ingredient)

  return itemText.includes(target) || target.includes(itemText)
}

function formatItem(item) {
  const daysUntil = getDaysUntil(item.expireDate)

  return {
    id: item._id || item.name,
    _id: item._id || '',
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    expireDate: item.expireDate,
    storageLocation: item.storageLocation,
    daysUntil,
  }
}

function matchRecipe(recipe, items) {
  const usedIds = new Set()
  const availableItems = []
  const missingItems = []

  recipe.ingredients.forEach((ingredient) => {
    const matchedItem = items.find((item) => {
      const id = item._id || item.name

      return !usedIds.has(id) && itemMatchesIngredient(item, ingredient)
    })

    if (matchedItem) {
      usedIds.add(matchedItem._id || matchedItem.name)
      availableItems.push(formatItem(matchedItem))
      return
    }

    missingItems.push(ingredient)
  })

  const priorityItems = availableItems.filter(
    (item) => item.daysUntil >= 0 && item.daysUntil <= 3,
  )

  return {
    id: recipe.id,
    title: recipe.title,
    sourceType: 'ai',
    reason:
      priorityItems.length > 0
        ? `AI mock 推荐优先用掉${priorityItems.map((item) => item.name).join('、')}。`
        : 'AI mock 根据库存匹配度给出这道菜。',
    availableItems,
    missingItems,
    priorityItems,
    matchLabel:
      missingItems.length === 0 ? '可直接做' : `还差 ${missingItems.length} 样`,
    canCook: missingItems.length === 0,
    timeCost: recipe.timeCost,
    difficulty: recipe.difficulty,
    tags: recipe.tags,
    steps: recipe.steps,
    safetyNote: '',
  }
}

exports.main = async (event) => {
  const items = Array.isArray(event.items) ? event.items : []
  const usableItems = items.filter((item) => getDaysUntil(item.expireDate) >= 0)
  const recommendations = MOCK_RECIPES.map((recipe) =>
    matchRecipe(recipe, usableItems),
  ).sort((left, right) => {
    if (right.availableItems.length !== left.availableItems.length) {
      return right.availableItems.length - left.availableItems.length
    }

    return left.missingItems.length - right.missingItems.length
  })

  return {
    context: getMockContext(),
    recommendations,
  }
}
