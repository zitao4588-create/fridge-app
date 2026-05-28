const itemService = require('../../services/itemService')
const recipeService = require('../../services/recipeService')
const { addDays, getDaysUntil, getTodayString } = require('../../utils/date')
const { getExpiryStatus } = require('../../utils/status')

const DAY_MS = 24 * 60 * 60 * 1000
const MANUAL_INGREDIENT_PREFIX = 'manual:'
const RECIPE_PICKER_CACHE_KEY = 'fridge_recipe_picker_cache_v1'
const RECIPE_PICKER_CACHE_VERSION = 1
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

function getManualIngredientId(name) {
  return `${MANUAL_INGREDIENT_PREFIX}${normalizeIngredientName(name)}`
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

function buildBlindBoxRecipes(items, recommendations, context, refreshIndex) {
  const sourceRecipes = rotateRecipes(recommendations, refreshIndex).slice(0, 3)

  if (sourceRecipes.length >= 3) {
    return sourceRecipes
  }

  const fallbackRecipe = recipeService.getBlindBoxRecommendation(
    items,
    'blindBox',
    context,
  )

  return sourceRecipes.concat([fallbackRecipe]).slice(0, 3)
}

function decorateContext(context) {
  const nextContext = {
    ...context,
    ...getDisplaySolarTerm(),
  }

  return {
    ...nextContext,
    aiAdvicePrompt: recipeService.buildRadarDietPrompt(nextContext),
    healthTip: recipeService.buildRadarDietAdvice(nextContext),
  }
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
    activeGuideType: '',
    guideTitle: '',
    guideDesc: '',
    guideRecipes: [],
    recipeRefreshIndex: 0,
    selectedItemIds: [],
    selectedItems: [],
    manualIngredients: [],
    generatedManualIngredients: [],
    pickerQuery: '',
    pickerSelectedItems: [],
    pickerAddText: '',
    pickerCanAddManual: false,
    recommendations: [],
    expiryRecommendations: [],
    detailVisible: false,
    activeRecipe: null,
    pickerVisible: false,
  },

  onShow() {
    const app = getApp()
    const prefillItemIds = app.globalData.recipePrefillItemIds || []
    app.globalData.recipePrefillItemIds = []
    this.loadRecipes(prefillItemIds)
  },

  loadRecipes(prefillItemIds) {
    this.setData({
      loading: true,
    })

    itemService
      .getItems()
      .then((items) => {
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
    const recommendationItems = mergeRecommendationItems(
      items,
      safeManualIngredients,
    )
    const baseResult = recipeService.getAIRecipeRecommendations(recommendationItems, {
      selectedItemIds: safeSelectedIds,
    })
    const context = decorateContext(baseResult.context)
    const result = recipeService.getAIRecipeRecommendations(recommendationItems, {
      selectedItemIds: safeSelectedIds,
      context,
    })
    const expiryUsage = recipeService.getExpiryUsageRecommendations(items)
    const currentGuideType = this.data.activeGuideType
    const activeGuideType =
      safeSelectedIds.length > 0
        ? 'picker'
        : currentGuideType === 'picker'
          ? ''
          : currentGuideType
    const guideContent = this.buildGuideContent(
      activeGuideType,
      items,
      result.recommendations,
      expiryUsage.recommendations,
      context,
      this.data.recipeRefreshIndex,
    )
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
      activeGuideType,
      guideTitle: guideContent.title,
      guideDesc: guideContent.desc,
      guideRecipes: guideContent.recipes,
      selectedItemIds: safeSelectedIds,
      selectedItems: result.selectedItems,
      manualIngredients: safeManualIngredients,
      generatedManualIngredients:
        activeGuideType === 'picker' && safeSelectedIds.length > 0
          ? safeManualIngredients
          : [],
      recommendations: result.recommendations,
      expiryRecommendations: expiryUsage.recommendations,
      loading: false,
    }

    this.setData(nextData)

    this.refreshCloudRecommendations({
      items,
      recommendationItems,
      selectedItemIds: safeSelectedIds,
      context,
      expiryRecommendations: expiryUsage.recommendations,
    })

    if (options.persistPickerCache && activeGuideType === 'picker') {
      saveRecipePickerCache({
        selectedItemIds: safeSelectedIds,
        manualIngredients: safeManualIngredients,
        recipeRefreshIndex: this.data.recipeRefreshIndex,
      })
    }
  },

  refreshCloudRecommendations(payload) {
    const requestId = `${Date.now()}-${Math.random()}`
    this.cloudRecipeRequestId = requestId

    recipeService
      .getCloudAIRecipeRecommendations(payload.recommendationItems, {
        selectedItemIds: payload.selectedItemIds,
        city: payload.context.city || '',
      })
      .then((cloudResult) => {
        if (this.cloudRecipeRequestId !== requestId) {
          return
        }

        const context = decorateContext({
          ...payload.context,
          ...(cloudResult.context || {}),
        })
        const guideContent = this.buildGuideContent(
          this.data.activeGuideType,
          payload.items,
          cloudResult.recommendations,
          payload.expiryRecommendations,
          context,
          this.data.recipeRefreshIndex,
        )

        this.setData({
          context,
          recommendations: cloudResult.recommendations,
          selectedItems: cloudResult.selectedItems || this.data.selectedItems,
          guideTitle: guideContent.title,
          guideDesc: guideContent.desc,
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
        desc: '不纠结，一次抽 3 道适合今天的菜谱。',
        recipes: decorateGuideRecipes(
          buildBlindBoxRecipes(items, recommendations, context, refreshIndex),
          '菜谱',
        ),
      }
    }

    if (type === 'picker') {
      return {
        title: '我来选食材',
        desc: '根据你放进料理碗的食材生成菜谱。',
        recipes: decorateGuideRecipes(
          rotateRecipes(recommendations, refreshIndex).slice(0, 3),
          '菜谱',
        ),
      }
    }

    return emptyGuideContent()
  },

  handleSelectGuide(event) {
    const activeGuideType = event.currentTarget.dataset.type

    clearRecipePickerCache()

    if (activeGuideType === 'picker') {
      this.setData({
        activeGuideType,
        recipeRefreshIndex: 0,
        guideTitle: '',
        guideDesc: '',
        guideRecipes: [],
        selectedItemIds: [],
        selectedItems: [],
        manualIngredients: [],
        generatedManualIngredients: [],
        pickerQuery: '',
        ...buildPickerState(this.data.items, [], [], ''),
      })
      this.handleOpenPicker()
      return
    }

    const guideContent = this.buildGuideContent(
      activeGuideType,
      this.data.items,
      this.data.recommendations,
      this.data.expiryRecommendations,
      this.data.context,
      0,
    )

    this.setData({
      activeGuideType,
      recipeRefreshIndex: 0,
      guideTitle: guideContent.title,
      guideDesc: guideContent.desc,
      guideRecipes: guideContent.recipes,
      selectedItemIds: [],
      selectedItems: [],
      manualIngredients: [],
      generatedManualIngredients: [],
      pickerQuery: '',
      ...buildPickerState(this.data.items, [], [], ''),
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
    if (this.data.selectedItemIds.length === 0) {
      wx.showToast({
        title: '先选 1 个食材',
        icon: 'none',
      })
      return
    }

    this.applyRecommendations(
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

    const recipeRefreshIndex = this.data.recipeRefreshIndex + 1
    const guideContent = this.buildGuideContent(
      this.data.activeGuideType,
      this.data.items,
      this.data.recommendations,
      this.data.expiryRecommendations,
      this.data.context,
      recipeRefreshIndex,
    )

    this.setData({
      recipeRefreshIndex,
      guideTitle: guideContent.title,
      guideDesc: guideContent.desc,
      guideRecipes: guideContent.recipes,
    })

    if (this.data.activeGuideType === 'picker' && this.data.selectedItemIds.length > 0) {
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
