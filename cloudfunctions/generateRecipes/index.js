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

function getItemKey(item) {
  return item && (item._id || item.id || item.name)
}

function itemMatchesIngredient(item, ingredient) {
  const itemText = normalizeText(`${item.name} ${item.category}`)
  const target = normalizeText(ingredient)

  return itemText.includes(target) || target.includes(itemText)
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

    missingItems.push(ingredient)
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

function getMockContext(searchInsight = '') {
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
    city: process.env.FRIDGE_DEFAULT_CITY || '上海',
    season,
    weather: season === '夏季' ? '晴热' : season === '冬季' ? '阴冷' : '微风',
    temperature: season === '夏季' ? 31 : season === '冬季' ? 8 : 22,
    humidity: season === '秋季' ? 48 : 58,
    mealTime: hour < 10 ? '早餐' : hour < 15 ? '午餐' : '晚餐',
    summary: searchInsight || '云端菜谱会优先消耗临期食材，并按当前季节给出轻负担搭配。',
    searchInsight: searchInsight || '联网搜索未启用时，使用季节和库存规则生成建议。',
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

function buildRecipePrompt(items, context, selectedItems) {
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

  return [
    '请为冰箱库存生成 5 道家常菜谱。',
    '要求：优先使用 3 天内到期的食材；不要使用已过期食材；步骤简单；缺少食材可以列出。',
    selectedNames ? `用户点选的重点食材：${selectedNames}` : '用户未点选食材，请根据库存整体推荐。',
    '只返回 JSON，格式如下：',
    '{"recipes":[{"id":"短英文id","title":"菜名","ingredients":["食材"],"timeCost":"15 分钟","difficulty":"简单","tags":["标签"],"steps":["步骤"],"safetyNote":"安全提示","reason":"推荐原因"}],"summary":"一句话总结"}',
    `今日上下文：${JSON.stringify(context)}`,
    `库存：${JSON.stringify(compactItems)}`,
  ].join('\n')
}

async function callCloudBaseAI(items, context, selectedItems) {
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
        content: buildRecipePrompt(items, context, selectedItems),
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

function normalizeAiRecommendations(aiResult, baseItems) {
  const recipes = Array.isArray(aiResult.recipes) ? aiResult.recipes : []

  if (recipes.length === 0) {
    throw new Error('AI 未返回菜谱列表')
  }

  return sortRecommendations(
    recipes.slice(0, 5).map((recipe) => matchRecipe(recipe, baseItems, 'ai')),
  )
}

exports.main = async (event = {}) => {
  const items = Array.isArray(event.items) ? event.items : []
  const usableItems = getUsableItems(items)
  const selectedItems = getSelectedItems(usableItems, event.selectedItemIds)
  const baseItems = selectedItems.length > 0 ? selectedItems : usableItems
  const city = event.city || process.env.FRIDGE_DEFAULT_CITY || '上海'
  const searchInsight = await getSearchInsight(city)
  const context = {
    ...getMockContext(searchInsight),
    city,
  }

  try {
    const aiResult = await callCloudBaseAI(baseItems, context, selectedItems)
    const recommendations = normalizeAiRecommendations(aiResult, baseItems)

    return {
      context: {
        ...context,
        summary: aiResult.summary || context.summary,
      },
      selectedItems: selectedItems.map(formatItem),
      recommendations,
      providerStatus: 'real',
      fallbackReason: '',
    }
  } catch (error) {
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
