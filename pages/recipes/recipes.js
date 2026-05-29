const itemService = require('../../services/itemService')
const recipeRecordService = require('../../services/recipeRecordService')
const recipeService = require('../../services/recipeService')
const { addDays, getDaysUntil, getTodayString } = require('../../utils/date')
const { getExpiryStatus } = require('../../utils/status')

const DAY_MS = 24 * 60 * 60 * 1000
const MANUAL_INGREDIENT_PREFIX = 'manual:'
const RECIPE_PICKER_CACHE_KEY = 'fridge_recipe_picker_cache_v1'
const RECIPE_PICKER_CACHE_VERSION = 1
const RECIPE_CITY_CACHE_KEY = 'fridge_recipe_city_v1'
const RECIPE_CITY_CACHE_VERSION = 1
const DEFAULT_CITY = '上海'
const SOLAR_TERM_PREVIEW_THRESHOLD_DAYS = 3
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

function getItemId(item) {
  return item && (item._id || item.id || item.name)
}

function normalizeIngredientName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeForCompare(value) {
  return normalizeIngredientName(value).toLowerCase()
}

function normalizeCityName(value) {
  return String(value || '').replace(/\s+/g, '').trim()
}

function getManualIngredientId(name) {
  return `${MANUAL_INGREDIENT_PREFIX}${normalizeIngredientName(name)}`
}

function readRecipeCity() {
  try {
    const cache = wx.getStorageSync(RECIPE_CITY_CACHE_KEY)

    if (!cache || cache.version !== RECIPE_CITY_CACHE_VERSION) {
      return DEFAULT_CITY
    }

    return normalizeCityName(cache.city) || DEFAULT_CITY
  } catch {
    return DEFAULT_CITY
  }
}

function saveRecipeCity(city) {
  try {
    wx.setStorageSync(RECIPE_CITY_CACHE_KEY, {
      version: RECIPE_CITY_CACHE_VERSION,
      city,
      savedAt: Date.now(),
    })
  } catch {
    // 城市缓存失败时不影响当次天气和菜谱生成。
  }
}

function isManualIngredientId(id) {
  return String(id || '').startsWith(MANUAL_INGREDIENT_PREFIX)
}

function createManualIngredient(name) {
  const safeName = normalizeIngredientName(name)

  return {
    id: getManualIngredientId(safeName),
    name: safeName,
    category: '其他',
    quantity: 1,
    unit: '份',
    expireDate: addDays(getTodayString(), 30),
    storageLocation: '临时食材',
    isManual: true,
  }
}

function clearRecipePickerCache() {
  try {
    wx.removeStorageSync(RECIPE_PICKER_CACHE_KEY)
  } catch {
    // 本地缓存失败不影响菜谱生成主流程。
  }
}

function readRecipePickerCache() {
  try {
    const cache = wx.getStorageSync(RECIPE_PICKER_CACHE_KEY)

    if (!cache || cache.version !== RECIPE_PICKER_CACHE_VERSION) {
      return null
    }

    if (cache.date !== getTodayString()) {
      clearRecipePickerCache()
      return null
    }

    const selectedItemIds = Array.isArray(cache.selectedItemIds)
      ? cache.selectedItemIds.filter(Boolean)
      : []

    if (selectedItemIds.length === 0) {
      return null
    }

    return {
      selectedItemIds,
      manualIngredients: Array.isArray(cache.manualIngredients)
        ? cache.manualIngredients
        : [],
      recipeRefreshIndex: Number(cache.recipeRefreshIndex) || 0,
    }
  } catch {
    return null
  }
}

function saveRecipePickerCache(payload) {
  try {
    wx.setStorageSync(RECIPE_PICKER_CACHE_KEY, {
      version: RECIPE_PICKER_CACHE_VERSION,
      date: getTodayString(),
      savedAt: Date.now(),
      selectedItemIds: payload.selectedItemIds,
      manualIngredients: payload.manualIngredients,
      recipeRefreshIndex: payload.recipeRefreshIndex,
    })
  } catch {
    // 本地缓存写入失败时，继续保留页面内生成结果。
  }
}

function getLocalDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getDisplaySolarTerm(date = new Date()) {
  const today = getLocalDateOnly(date)
  const year = today.getFullYear()
  const candidates = [year - 1, year, year + 1].flatMap((targetYear) =>
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

function buildPickerItems(items, selectedItemIds, query = '') {
  const selectedSet = new Set(selectedItemIds)
  const keyword = normalizeForCompare(query)

  return items
    .map((item) => {
      const status = getExpiryStatus(item.expireDate)
      const daysUntil = getDaysUntil(item.expireDate)

      return {
        ...item,
        id: getItemId(item),
        selected: selectedSet.has(getItemId(item)),
        disabled: daysUntil < 0,
        statusLabel: status.label,
        statusClass: status.className,
        expiryHint: status.hint,
        sortWeight: daysUntil < 0 ? 9999 : daysUntil,
      }
    })
    .filter((item) => {
      if (!keyword) {
        return true
      }

      return normalizeForCompare(
        `${item.name} ${item.category} ${item.storageLocation}`,
      ).includes(keyword)
    })
    .sort((left, right) => {
      if (left.sortWeight !== right.sortWeight) {
        return left.sortWeight - right.sortWeight
      }

      return String(left.name).localeCompare(String(right.name), 'zh-Hans-CN')
    })
}

function mergeRecommendationItems(items, manualIngredients) {
  return (Array.isArray(items) ? items : []).concat(
    Array.isArray(manualIngredients) ? manualIngredients : [],
  )
}

function buildSelectedPreviewItems(items, manualIngredients, selectedItemIds) {
  const itemMap = new Map()
  const manualMap = new Map()

  items.forEach((item) => {
    itemMap.set(getItemId(item), {
      id: getItemId(item),
      name: item.name,
      meta: `${item.category} · ${item.storageLocation}`,
      isManual: false,
    })
  })

  manualIngredients.forEach((item) => {
    manualMap.set(item.id, {
      id: item.id,
      name: item.name,
      meta: '临时食材',
      isManual: true,
    })
  })

  return selectedItemIds
    .map((id) => manualMap.get(id) || itemMap.get(id))
    .filter(Boolean)
}

function buildPickerState(items, selectedItemIds, manualIngredients, query) {
  const safeItems = Array.isArray(items) ? items : []
  const safeSelectedIds = Array.isArray(selectedItemIds) ? selectedItemIds : []
  const safeManualIngredients = Array.isArray(manualIngredients)
    ? manualIngredients
    : []
  const addText = normalizeIngredientName(query)
  const addTextKey = normalizeForCompare(addText)
  const hasInventoryMatch = safeItems.some(
    (item) => normalizeForCompare(item.name) === addTextKey,
  )
  const hasManualMatch = safeManualIngredients.some(
    (item) => normalizeForCompare(item.name) === addTextKey,
  )

  return {
    pickerItems: buildPickerItems(safeItems, safeSelectedIds, query),
    pickerSelectedItems: buildSelectedPreviewItems(
      safeItems,
      safeManualIngredients,
      safeSelectedIds,
    ),
    pickerAddText: addText,
    pickerCanAddManual: Boolean(addText && !hasInventoryMatch && !hasManualMatch),
  }
}

function rotateRecipes(recipes, offset) {
  if (!recipes.length) {
    return []
  }

  const safeOffset = offset % recipes.length

  return recipes.slice(safeOffset).concat(recipes.slice(0, safeOffset))
}

function decorateGuideRecipes(recipes, label) {
  return recipes.map((recipe, index) => ({
    ...recipe,
    sourceLabel: `${label} ${index + 1}`,
  }))
}

function getRecipeDisplayTags(recipe) {
  const hiddenTags = new Set(['简单', '应季', '盲盒'])

  return (Array.isArray(recipe.tags) ? recipe.tags : [])
    .filter((tag) => tag && !hiddenTags.has(tag))
    .slice(0, 2)
}

function buildRecipeRecordMap(records) {
  const recordMap = {}
  const safeRecords = Array.isArray(records) ? records : []

  safeRecords.forEach((record) => {
    if (record && record.recipeKey) {
      recordMap[record.recipeKey] = record
    }
  })

  return recordMap
}

function decorateRecipesWithRecords(recipes, records) {
  const recordMap = buildRecipeRecordMap(records)

  return (Array.isArray(recipes) ? recipes : []).map((recipe) => {
    const recipeKey = recipeRecordService.buildRecipeKey(recipe)
    const record = recordMap[recipeKey]

    return {
      ...recipe,
      recipeKey,
      recordId: record ? record._id : '',
      isSaved: Boolean(record),
      displayTags: getRecipeDisplayTags(recipe),
    }
  })
}

function recordToRecipe(record) {
  const recipe = {
    id: record.recipeId || record.recipeKey,
    recipeKey: record.recipeKey,
    recordId: record._id,
    isSaved: true,
    title: record.title,
    image: record.image,
    reason: record.reason,
    sourceType: record.sourceType,
    availableItems: Array.isArray(record.availableItems) ? record.availableItems : [],
    missingItems: Array.isArray(record.missingItems) ? record.missingItems : [],
    priorityItems: Array.isArray(record.priorityItems) ? record.priorityItems : [],
    matchLabel: record.matchLabel || '',
    canCook: Boolean(record.canCook),
    timeCost: record.timeCost || '',
    difficulty: record.difficulty || '',
    tags: Array.isArray(record.tags) ? record.tags : [],
    seasonTags: Array.isArray(record.seasonTags) ? record.seasonTags : [],
    steps: Array.isArray(record.steps) ? record.steps : [],
    safetyNote: record.safetyNote || '',
  }

  return {
    ...recipe,
    displayTags: getRecipeDisplayTags(recipe),
  }
}

function buildBlindBoxRecipes(items, context, refreshIndex) {
  return recipeService.getBlindBoxRecommendations(
    [],
    'blindBox',
    context,
    3,
    refreshIndex,
  )
}

function decorateContext(context) {
  const nextContext = {
    ...context,
    ...getDisplaySolarTerm(),
  }
  const weatherStatusLabel =
    nextContext.weatherStatus === 'real' ? '腾讯实时天气' : '天气暂用估算'
  const weatherUpdatedLabel = nextContext.weatherFallbackReason ||
    (nextContext.weatherUpdatedAt
      ? `更新 ${nextContext.weatherUpdatedAt}`
      : '根据当天气候生成建议')
  const weatherTimeMatch = String(nextContext.weatherUpdatedAt || '').match(/\d{1,2}:\d{2}/)
  const compactUpdatedLabel = nextContext.weatherFallbackReason ||
    (weatherTimeMatch
      ? `更新 ${weatherTimeMatch[0]}`
      : nextContext.weatherUpdatedAt
        ? `更新 ${nextContext.weatherUpdatedAt}`
        : '根据当天气候生成')
  const weatherSummary = `${nextContext.weather || '天气'} · ${nextContext.temperature || '--'}℃ · 湿度 ${nextContext.humidity || '--'}%`
  const solarTermSummary = nextContext.solarTermName
    ? `${nextContext.solarTermName}${nextContext.solarTermHint || ''}`
    : '节气'
  const climateSummary = `${nextContext.season || '季节'} · ${solarTermSummary} · ${compactUpdatedLabel}`

  return {
    ...nextContext,
    weatherStatusLabel,
    weatherUpdatedLabel,
    weatherSummary,
    climateSummary,
    aiAdvicePrompt: recipeService.buildRadarDietPrompt(nextContext),
    healthTip: recipeService.buildRadarDietAdvice(nextContext),
  }
}

function shouldKeepRadarContext(currentContext, city) {
  return currentContext &&
    currentContext.city === city &&
    (currentContext.weatherStatus === 'real' || currentContext.weatherStatus === 'fallback')
}

function buildRadarContext(city, currentContext = {}) {
  const baseContext = shouldKeepRadarContext(currentContext, city)
    ? currentContext
    : recipeService.getMockRecommendationContext([])

  return decorateContext({
    ...baseContext,
    city,
  })
}

function mergeCloudContext(baseContext, cloudContext, allowRadarContextUpdate) {
  const safeBaseContext = baseContext || {}
  const safeCloudContext = cloudContext || {}
  const preservedRadar = allowRadarContextUpdate
    ? {}
    : {
      radarAdvice: safeBaseContext.radarAdvice,
      radarAdviceSource: safeBaseContext.radarAdviceSource,
    }

  return decorateContext({
    ...safeBaseContext,
    ...safeCloudContext,
    ...preservedRadar,
  })
}

function emptyGuideContent() {
  return {
    title: '',
    desc: '',
    recipes: [],
  }
}

Page({
  data: {
    loading: false,
    items: [],
    pickerItems: [],
    context: {},
    city: DEFAULT_CITY,
    cityInput: DEFAULT_CITY,
    cityModalVisible: false,
    activeGuideType: '',
    guideTitle: '',
    guideDesc: '',
    guideAlgorithm: '',
    guideRecipes: [],
    recipeRefreshIndex: 0,
    blindBoxRefreshIndex: 0,
    selectedItemIds: [],
    selectedItems: [],
    manualIngredients: [],
    generatedManualIngredients: [],
    pickerQuery: '',
    pickerSelectedItems: [],
    pickerAddText: '',
    pickerCanAddManual: false,
    recommendations: [],
    blindBoxRecipes: [],
    pickerRecipes: [],
    expiryRecommendations: [],
    recipeRecords: [],
    recordListVisible: false,
    recordSaving: false,
    detailVisible: false,
    activeRecipe: null,
    pickerVisible: false,
    pickerGenerating: false,
  },

  onShow() {
    const app = getApp()
    const prefillItemIds = app.globalData.recipePrefillItemIds || []
    const city = readRecipeCity()
    app.globalData.recipePrefillItemIds = []
    this.setData({
      city,
      cityInput: city,
    })
    this.loadRecipes(prefillItemIds)
  },

  loadRecipes(prefillItemIds) {
    this.setData({
      loading: true,
    })

    Promise.all([
      itemService.getItems(),
      recipeRecordService.getRecipeRecords(),
    ])
      .then(([items, recipeRecords]) => {
        const safePrefillItemIds = Array.isArray(prefillItemIds)
          ? prefillItemIds.filter(Boolean)
          : []
        const cachedPicker = safePrefillItemIds.length > 0
          ? null
          : readRecipePickerCache()

        if (safePrefillItemIds.length > 0) {
          clearRecipePickerCache()
        }

        this.setData({
          recipeRecords,
          recipeRefreshIndex: cachedPicker
            ? cachedPicker.recipeRefreshIndex
            : this.data.recipeRefreshIndex,
        })
        const selectedItemIds = cachedPicker
          ? cachedPicker.selectedItemIds
          : safePrefillItemIds.length > 0
            ? safePrefillItemIds
            : this.data.selectedItemIds

        this.applyRecommendations(
          items,
          selectedItemIds,
          cachedPicker ? cachedPicker.manualIngredients : this.data.manualIngredients,
          {
            recipeRecords,
          },
        )
      })
      .catch(() => {
        this.setData({
          loading: false,
        })
        wx.showToast({
          title: '读取失败',
          icon: 'none',
        })
      })
  },

  applyRecommendations(
    items,
    selectedItemIds,
    manualIngredients = this.data.manualIngredients,
    options = {},
  ) {
    const safeSelectedIds = Array.isArray(selectedItemIds) ? selectedItemIds : []
    const safeManualIngredients = Array.isArray(manualIngredients)
      ? manualIngredients
      : []
    const recipeRecords = Array.isArray(options.recipeRecords)
      ? options.recipeRecords
      : this.data.recipeRecords
    const city = normalizeCityName(options.city || this.data.city || readRecipeCity())
    const recommendationItems = mergeRecommendationItems(
      items,
      safeManualIngredients,
    )
    const context = buildRadarContext(city, this.data.context)
    const result = recipeService.getAIRecipeRecommendations(recommendationItems, {
      selectedItemIds: safeSelectedIds,
      context,
    })
    const expiryUsage = recipeService.getExpiryUsageRecommendations(items)
    const currentGuideType = this.data.activeGuideType
    const activeGuideType =
      currentGuideType === 'blindBox'
        ? 'blindBox'
        : safeSelectedIds.length > 0
        ? 'picker'
        : currentGuideType === 'picker'
          ? ''
          : currentGuideType
    const pickerRecipes = safeSelectedIds.length > 0 ? result.recommendations : []
    const decoratedPickerRecipes = decorateRecipesWithRecords(
      pickerRecipes,
      recipeRecords,
    )
    const blindBoxContent = this.buildGuideContent(
      'blindBox',
      items,
      [],
      expiryUsage.recommendations,
      context,
      activeGuideType === 'blindBox' ? this.data.blindBoxRefreshIndex : 0,
    )
    const decoratedBlindBoxRecipes = decorateRecipesWithRecords(
      blindBoxContent.recipes,
      recipeRecords,
    )
    const guideContent =
      activeGuideType === 'blindBox'
        ? {
          ...blindBoxContent,
          recipes: decoratedBlindBoxRecipes,
        }
        : activeGuideType === 'picker'
          ? this.buildGuideContent(
            'picker',
            items,
            decoratedPickerRecipes,
            expiryUsage.recommendations,
            context,
            this.data.recipeRefreshIndex,
          )
          : emptyGuideContent()
    const pickerState = buildPickerState(
      items,
      safeSelectedIds,
      safeManualIngredients,
      this.data.pickerQuery,
    )

    const nextData = {
      items,
      ...pickerState,
      context,
      city,
      cityInput: city,
      activeGuideType,
      guideTitle: guideContent.title,
      guideDesc: guideContent.desc,
      guideAlgorithm: guideContent.algorithm,
      guideRecipes: guideContent.recipes,
      selectedItemIds: safeSelectedIds,
      selectedItems: result.selectedItems,
      manualIngredients: safeManualIngredients,
      generatedManualIngredients:
        safeSelectedIds.length > 0
          ? safeManualIngredients
          : [],
      recommendations: decoratedPickerRecipes,
      blindBoxRecipes: decoratedBlindBoxRecipes,
      pickerRecipes: decoratedPickerRecipes,
      expiryRecommendations: expiryUsage.recommendations,
      recipeRecords,
      loading: false,
    }

    this.setData(nextData)

    const cloudRefreshPromise = this.refreshCloudRecommendations({
      items,
      recommendationItems,
      selectedItemIds: safeSelectedIds,
      context,
      expiryRecommendations: expiryUsage.recommendations,
      allowRadarContextUpdate: Boolean(options.refreshRadarContext || safeSelectedIds.length === 0),
    })

    if (options.persistPickerCache && activeGuideType === 'picker') {
      saveRecipePickerCache({
        selectedItemIds: safeSelectedIds,
        manualIngredients: safeManualIngredients,
        recipeRefreshIndex: this.data.recipeRefreshIndex,
      })
    }

    return cloudRefreshPromise
  },

  refreshCloudRecommendations(payload) {
    const requestId = `${Date.now()}-${Math.random()}`
    this.cloudRecipeRequestId = requestId

    return recipeService
      .getCloudAIRecipeRecommendations(payload.recommendationItems, {
        selectedItemIds: payload.selectedItemIds,
        city: payload.context.city || '',
      })
      .then((cloudResult) => {
        if (this.cloudRecipeRequestId !== requestId) {
          return
        }

        const context = mergeCloudContext(
          payload.context,
          cloudResult.context,
          payload.allowRadarContextUpdate,
        )
        const pickerRecipes = Array.isArray(payload.selectedItemIds) && payload.selectedItemIds.length > 0
          ? cloudResult.recommendations
          : []
        const decoratedPickerRecipes = decorateRecipesWithRecords(
          pickerRecipes,
          this.data.recipeRecords,
        )
        const blindBoxContent = this.buildGuideContent(
          'blindBox',
          payload.items,
          [],
          payload.expiryRecommendations,
          context,
          this.data.activeGuideType === 'blindBox' ? this.data.blindBoxRefreshIndex : 0,
        )
        const decoratedBlindBoxRecipes = decorateRecipesWithRecords(
          blindBoxContent.recipes,
          this.data.recipeRecords,
        )
        const guideContent =
          this.data.activeGuideType === 'blindBox'
            ? {
              ...blindBoxContent,
              recipes: decoratedBlindBoxRecipes,
            }
            : this.data.activeGuideType === 'picker'
              ? this.buildGuideContent(
                'picker',
                payload.items,
                decoratedPickerRecipes,
                payload.expiryRecommendations,
                context,
                this.data.recipeRefreshIndex,
              )
              : emptyGuideContent()

        this.setData({
          context,
          city: context.city || this.data.city,
          cityInput: context.city || this.data.city,
          recommendations: decoratedPickerRecipes,
          blindBoxRecipes: decoratedBlindBoxRecipes,
          pickerRecipes: decoratedPickerRecipes,
          selectedItems: cloudResult.selectedItems || this.data.selectedItems,
          guideTitle: guideContent.title,
          guideDesc: guideContent.desc,
          guideAlgorithm: guideContent.algorithm,
          guideRecipes: guideContent.recipes,
        })
      })
      .catch(() => {
        // 云端 AI 失败时保留本地推荐，避免用户当前操作被打断。
      })
  },

  buildGuideContent(type, items, recommendations, expiryRecommendations, context, refreshIndex = 0) {
    if (type === 'blindBox') {
      return {
        title: '菜谱盲盒',
        desc: '不知道吃什么时，按今日气候推荐 3 道应季家常菜。',
        algorithm: '',
        recipes: decorateGuideRecipes(
          buildBlindBoxRecipes(items, context, refreshIndex),
          '菜谱',
        ),
      }
    }

    if (type === 'picker') {
      return {
        title: '我来选食材',
        desc: '只围绕料理碗里的食材生成，适合定向消耗。',
        algorithm: '',
        recipes: decorateGuideRecipes(
          rotateRecipes(recommendations, refreshIndex).slice(0, 3),
          '菜谱',
        ),
      }
    }

    return emptyGuideContent()
  },

  refreshRecipeRecordState(recipeRecords) {
    const records = Array.isArray(recipeRecords) ? recipeRecords : []
    const activeRecipe = this.data.activeRecipe
      ? decorateRecipesWithRecords([this.data.activeRecipe], records)[0]
      : null

    this.setData({
      recipeRecords: records,
      recommendations: decorateRecipesWithRecords(this.data.recommendations, records),
      blindBoxRecipes: decorateRecipesWithRecords(this.data.blindBoxRecipes, records),
      pickerRecipes: decorateRecipesWithRecords(this.data.pickerRecipes, records),
      guideRecipes: decorateRecipesWithRecords(this.data.guideRecipes, records),
      activeRecipe,
    })
  },

  findRecipeForRecord(recipeId, recipeKey) {
    const candidates = []

    if (this.data.activeRecipe) {
      candidates.push(this.data.activeRecipe)
    }

    return candidates
      .concat(this.data.guideRecipes)
      .concat(this.data.recommendations)
      .concat(this.data.blindBoxRecipes)
      .concat(this.data.pickerRecipes)
      .find((recipe) =>
        (recipeId && recipe.id === recipeId) ||
        (recipeKey && recipe.recipeKey === recipeKey),
      )
  },

  handleOpenCityEditor() {
    this.setData({
      cityInput: this.data.context.city || this.data.city || DEFAULT_CITY,
      cityModalVisible: true,
    })
  },

  handleCityInput(event) {
    this.setData({
      cityInput: event.detail.value,
    })
  },

  handleCloseCityEditor() {
    this.setData({
      cityInput: this.data.city,
      cityModalVisible: false,
    })
  },

  handleSaveCity() {
    const city = normalizeCityName(this.data.cityInput)

    if (!city) {
      wx.showToast({
        title: '请输入城市',
        icon: 'none',
      })
      return
    }

    saveRecipeCity(city)
    this.setData({
      city,
      cityInput: city,
      cityModalVisible: false,
      context: {
        ...this.data.context,
        city,
      },
    })
    this.applyRecommendations(
      this.data.items,
      this.data.selectedItemIds,
      this.data.manualIngredients,
      {
        city,
        refreshRadarContext: true,
      },
    )
  },

  handleOpenRecords() {
    this.setData({
      recordListVisible: true,
    })
  },

  handleCloseRecords() {
    this.setData({
      recordListVisible: false,
    })
  },

  handleOpenRecordDetail(event) {
    const recordId = event.currentTarget.dataset.id
    const record = this.data.recipeRecords.find((item) => item._id === recordId)

    if (!record) {
      return
    }

    this.setData({
      recordListVisible: false,
      detailVisible: true,
      activeRecipe: recordToRecipe(record),
    })
  },

  handleToggleRecipeRecord(event) {
    const recipeId = event.currentTarget.dataset.id
    const recipeKey = event.currentTarget.dataset.key
    const recipe = this.findRecipeForRecord(recipeId, recipeKey)

    if (!recipe || this.data.recordSaving) {
      return
    }

    this.setData({
      recordSaving: true,
    })

    if (recipe.isSaved) {
      const recordId = recipe.recordId ||
        (buildRecipeRecordMap(this.data.recipeRecords)[recipe.recipeKey] || {})._id

      recipeRecordService
        .deleteRecipeRecord(recordId)
        .then(() => {
          const recipeRecords = this.data.recipeRecords.filter(
            (record) => record._id !== recordId,
          )

          this.refreshRecipeRecordState(recipeRecords)
          wx.showToast({
            title: '已取消收藏',
            icon: 'none',
          })
        })
        .catch(() => {
          wx.showToast({
            title: '取消失败',
            icon: 'none',
          })
        })
        .finally(() => {
          this.setData({
            recordSaving: false,
          })
        })
      return
    }

    recipeRecordService
      .saveRecipeRecord({
        recipe,
        recipeKey: recipe.recipeKey,
        context: this.data.context,
      })
      .then((record) => {
        const recipeRecords = [record].concat(
          this.data.recipeRecords.filter(
            (item) => item._id !== record._id && item.recipeKey !== record.recipeKey,
          ),
        )

        this.refreshRecipeRecordState(recipeRecords)
        wx.showToast({
          title: '已收藏',
          icon: 'none',
        })
      })
      .catch(() => {
        wx.showToast({
          title: '收藏失败',
          icon: 'none',
        })
      })
      .finally(() => {
        this.setData({
          recordSaving: false,
        })
      })
  },

  handleSelectGuide(event) {
    const activeGuideType = event.currentTarget.dataset.type

    if (activeGuideType === 'picker') {
      if (this.data.selectedItemIds.length > 0 && this.data.pickerRecipes.length > 0) {
        const guideContent = this.buildGuideContent(
          activeGuideType,
          this.data.items,
          this.data.pickerRecipes,
          this.data.expiryRecommendations,
          this.data.context,
          this.data.recipeRefreshIndex,
        )

        this.setData({
          activeGuideType,
          guideTitle: guideContent.title,
          guideDesc: guideContent.desc,
          guideAlgorithm: guideContent.algorithm,
          guideRecipes: guideContent.recipes,
          pickerVisible: false,
          ...buildPickerState(
            this.data.items,
            this.data.selectedItemIds,
            this.data.manualIngredients,
            this.data.pickerQuery,
          ),
        })
        return
      }

      const selectedItemIds = this.data.selectedItemIds
      const manualIngredients = this.data.manualIngredients
      const pickerQuery = this.data.pickerQuery

      this.setData({
        activeGuideType,
        recipeRefreshIndex: selectedItemIds.length > 0
          ? this.data.recipeRefreshIndex
          : 0,
        guideTitle: '',
        guideDesc: '',
        guideAlgorithm: '',
        guideRecipes: [],
        selectedItemIds,
        manualIngredients,
        generatedManualIngredients: manualIngredients,
        pickerQuery,
        ...buildPickerState(
          this.data.items,
          selectedItemIds,
          manualIngredients,
          pickerQuery,
        ),
      })
      this.handleOpenPicker()
      return
    }

    const guideContent = this.buildGuideContent(
      activeGuideType,
      this.data.items,
      this.data.pickerRecipes,
      this.data.expiryRecommendations,
      this.data.context,
      this.data.blindBoxRefreshIndex,
    )
    const guideRecipes = activeGuideType === 'blindBox'
      ? decorateRecipesWithRecords(guideContent.recipes, this.data.recipeRecords)
      : guideContent.recipes

    this.setData({
      activeGuideType,
      guideTitle: guideContent.title,
      guideDesc: guideContent.desc,
      guideAlgorithm: guideContent.algorithm,
      guideRecipes,
      ...buildPickerState(
        this.data.items,
        this.data.selectedItemIds,
        this.data.manualIngredients,
        this.data.pickerQuery,
      ),
    })
  },

  handleOpenPicker() {
    this.setData({
      pickerVisible: true,
      ...buildPickerState(
        this.data.items,
        this.data.selectedItemIds,
        this.data.manualIngredients,
        this.data.pickerQuery,
      ),
    })
  },

  handleClosePicker() {
    const nextData = {
      pickerVisible: false,
    }

    if (this.data.selectedItemIds.length === 0) {
      nextData.activeGuideType = ''
    }

    this.setData(nextData)
  },

  handlePickerQueryInput(event) {
    const pickerQuery = event.detail.value

    this.setData({
      pickerQuery,
      ...buildPickerState(
        this.data.items,
        this.data.selectedItemIds,
        this.data.manualIngredients,
        pickerQuery,
      ),
    })
  },

  handleToggleIngredient(event) {
    const itemId = event.currentTarget.dataset.id
    const targetItem = this.data.pickerItems.find((item) => item.id === itemId)

    if (!targetItem || targetItem.disabled) {
      wx.showToast({
        title: '已过期食品不参与生成',
        icon: 'none',
      })
      return
    }

    const selectedSet = new Set(this.data.selectedItemIds)

    if (selectedSet.has(itemId)) {
      selectedSet.delete(itemId)
    } else {
      selectedSet.add(itemId)
    }

    const selectedItemIds = Array.from(selectedSet)

    this.setData({
      selectedItemIds,
      ...buildPickerState(
        this.data.items,
        selectedItemIds,
        this.data.manualIngredients,
        this.data.pickerQuery,
      ),
    })
  },

  handleAddManualIngredient(event) {
    const inputValue = event && event.detail ? event.detail.value : ''
    const ingredientName = normalizeIngredientName(
      this.data.pickerAddText || inputValue,
    )

    if (!ingredientName) {
      wx.showToast({
        title: '先输入食材名',
        icon: 'none',
      })
      return
    }

    const ingredientKey = normalizeForCompare(ingredientName)
    const existsInInventory = this.data.items.some(
      (item) => normalizeForCompare(item.name) === ingredientKey,
    )

    if (existsInInventory) {
      wx.showToast({
        title: '冰箱已有，直接点选它',
        icon: 'none',
      })
      return
    }

    const existsInManual = this.data.manualIngredients.some(
      (item) => normalizeForCompare(item.name) === ingredientKey,
    )

    if (existsInManual) {
      wx.showToast({
        title: '已经在料理碗里了',
        icon: 'none',
      })
      return
    }

    const manualIngredient = createManualIngredient(ingredientName)
    const manualIngredients = this.data.manualIngredients.concat(manualIngredient)
    const selectedItemIds = this.data.selectedItemIds.concat(manualIngredient.id)

    this.setData({
      manualIngredients,
      selectedItemIds,
      pickerQuery: '',
      ...buildPickerState(this.data.items, selectedItemIds, manualIngredients, ''),
    })
  },

  handleRemoveSelectedIngredient(event) {
    const itemId = event.currentTarget.dataset.id
    const selectedItemIds = this.data.selectedItemIds.filter((id) => id !== itemId)
    const manualIngredients = isManualIngredientId(itemId)
      ? this.data.manualIngredients.filter((item) => item.id !== itemId)
      : this.data.manualIngredients

    this.setData({
      selectedItemIds,
      manualIngredients,
      ...buildPickerState(
        this.data.items,
        selectedItemIds,
        manualIngredients,
        this.data.pickerQuery,
      ),
    })
  },

  handleGenerateFromSelected() {
    if (this.data.pickerGenerating) {
      return
    }

    if (this.data.selectedItemIds.length === 0) {
      wx.showToast({
        title: '先选 1 个食材',
        icon: 'none',
      })
      return
    }

    this.setData({
      pickerGenerating: true,
    })
    wx.showLoading({
      title: '正在生成菜谱',
      mask: true,
    })

    try {
      const cloudRefreshPromise = this.applyRecommendations(
        this.data.items,
        this.data.selectedItemIds,
        this.data.manualIngredients,
        {
          persistPickerCache: true,
        },
      )
      this.setData({
        pickerVisible: false,
        pickerQuery: '',
      })
      Promise.resolve(cloudRefreshPromise)
        .finally(() => {
          wx.hideLoading()
          this.setData({
            pickerGenerating: false,
          })
        })
    } catch {
      wx.hideLoading()
      this.setData({
        pickerGenerating: false,
      })
      wx.showToast({
        title: '生成失败，请重试',
        icon: 'none',
      })
      return
    }
  },

  handleClearSelected() {
    clearRecipePickerCache()
    this.setData({
      activeGuideType: '',
      recipeRefreshIndex: 0,
      manualIngredients: [],
      generatedManualIngredients: [],
      pickerQuery: '',
    })
    this.applyRecommendations(this.data.items, [], [])
  },

  handleAddManualToInventory(event) {
    const name = normalizeIngredientName(event.currentTarget.dataset.name)
    const category = event.currentTarget.dataset.category || '其他'

    if (!name) {
      return
    }

    wx.navigateTo({
      url: `/pages/item-form/item-form?name=${encodeURIComponent(name)}&category=${encodeURIComponent(category)}`,
    })
  },

  handleRefreshGuide() {
    if (!this.data.activeGuideType) {
      return
    }

    const isPickerGuide = this.data.activeGuideType === 'picker'
    const recipeRefreshIndex = isPickerGuide
      ? this.data.recipeRefreshIndex + 1
      : this.data.blindBoxRefreshIndex + 1
    const guideContent = this.buildGuideContent(
      this.data.activeGuideType,
      this.data.items,
      this.data.pickerRecipes,
      this.data.expiryRecommendations,
      this.data.context,
      recipeRefreshIndex,
    )
    const guideRecipes = this.data.activeGuideType === 'blindBox'
      ? decorateRecipesWithRecords(guideContent.recipes, this.data.recipeRecords)
      : guideContent.recipes

    const nextData = {
      guideTitle: guideContent.title,
      guideDesc: guideContent.desc,
      guideAlgorithm: guideContent.algorithm,
      guideRecipes,
    }

    if (isPickerGuide) {
      nextData.recipeRefreshIndex = recipeRefreshIndex
    } else {
      nextData.blindBoxRefreshIndex = recipeRefreshIndex
    }

    this.setData(nextData)

    if (isPickerGuide && this.data.selectedItemIds.length > 0) {
      saveRecipePickerCache({
        selectedItemIds: this.data.selectedItemIds,
        manualIngredients: this.data.manualIngredients,
        recipeRefreshIndex,
      })
    }
  },

  handleOpenDetail(event) {
    const recipeId = event.currentTarget.dataset.id
    const activeRecipe = this.data.guideRecipes
      .concat(this.data.recommendations)
      .concat(this.data.blindBoxRecipes)
      .concat(this.data.pickerRecipes)
      .find((recipe) => recipe.id === recipeId)

    if (!activeRecipe) {
      return
    }

    this.setData({
      detailVisible: true,
      activeRecipe,
    })
  },

  handleCloseDetail() {
    this.setData({
      detailVisible: false,
      activeRecipe: null,
    })
  },

  noop() {},
})
