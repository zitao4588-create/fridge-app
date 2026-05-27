const itemService = require('../../services/itemService')
const recipeService = require('../../services/recipeService')
const { getDaysUntil } = require('../../utils/date')
const { getExpiryStatus } = require('../../utils/status')

const DAY_MS = 24 * 60 * 60 * 1000
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

function getLocalDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getNearestSolarTerm(date = new Date()) {
  const today = getLocalDateOnly(date)
  const year = today.getFullYear()
  const candidates = [year - 1, year, year + 1].flatMap((targetYear) =>
    SOLAR_TERMS.map((term) => ({
      name: term.name,
      date: new Date(targetYear, term.month - 1, term.day),
    })),
  )
  const nearest = candidates
    .map((term) => ({
      name: term.name,
      diffDays: Math.round((term.date.getTime() - today.getTime()) / DAY_MS),
    }))
    .sort(
      (left, right) =>
        Math.abs(left.diffDays) - Math.abs(right.diffDays) ||
        left.diffDays - right.diffDays,
    )[0]

  if (!nearest || nearest.diffDays === 0) {
    return {
      solarTermName: nearest ? nearest.name : '',
      solarTermHint: '当日',
    }
  }

  return {
    solarTermName: nearest.name,
    solarTermHint:
      nearest.diffDays > 0
        ? `还差 ${nearest.diffDays} 天`
        : `已过 ${Math.abs(nearest.diffDays)} 天`,
  }
}

function buildPickerItems(items, selectedItemIds) {
  const selectedSet = new Set(selectedItemIds)

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
    .sort((left, right) => {
      if (left.sortWeight !== right.sortWeight) {
        return left.sortWeight - right.sortWeight
      }

      return String(left.name).localeCompare(String(right.name), 'zh-Hans-CN')
    })
}

function decorateGuideRecipes(recipes, label) {
  return recipes.map((recipe, index) => ({
    ...recipe,
    sourceLabel: `${label} ${index + 1}`,
  }))
}

function decorateContext(context) {
  const nextContext = {
    ...context,
    ...getNearestSolarTerm(),
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
    selectedItemIds: [],
    selectedItems: [],
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
        const selectedItemIds = Array.isArray(prefillItemIds)
          ? prefillItemIds.filter(Boolean)
          : this.data.selectedItemIds

        this.applyRecommendations(items, selectedItemIds)
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

  applyRecommendations(items, selectedItemIds) {
    const baseResult = recipeService.getAIRecipeRecommendations(items, {
      selectedItemIds,
    })
    const context = decorateContext(baseResult.context)
    const result = recipeService.getAIRecipeRecommendations(items, {
      selectedItemIds,
      context,
    })
    const expiryUsage = recipeService.getExpiryUsageRecommendations(items)
    const currentGuideType = this.data.activeGuideType
    const activeGuideType =
      selectedItemIds.length > 0
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
    )

    this.setData({
      items,
      pickerItems: buildPickerItems(items, selectedItemIds),
      context,
      activeGuideType,
      guideTitle: guideContent.title,
      guideDesc: guideContent.desc,
      guideRecipes: guideContent.recipes,
      selectedItemIds,
      selectedItems: result.selectedItems,
      recommendations: result.recommendations,
      expiryRecommendations: expiryUsage.recommendations,
      loading: false,
    })
  },

  buildGuideContent(type, items, recommendations, expiryRecommendations, context) {
    if (type === 'blindBox') {
      return {
        title: '菜谱盲盒攻略',
        desc: '不纠结，先抽一道今日推荐应季健康菜谱。',
        recipes: decorateGuideRecipes(
          [recipeService.getBlindBoxRecommendation(items, 'blindBox', context)],
          '菜谱',
        ),
      }
    }

    if (type === 'picker') {
      return {
        title: '我来选食材攻略',
        desc: '根据你点选的冰箱食材生成菜谱。',
        recipes: decorateGuideRecipes(recommendations.slice(0, 3), '菜谱'),
      }
    }

    return emptyGuideContent()
  },

  handleSelectGuide(event) {
    const activeGuideType = event.currentTarget.dataset.type

    if (activeGuideType === 'picker') {
      this.setData({
        activeGuideType,
        guideTitle: '',
        guideDesc: '',
        guideRecipes: [],
        selectedItemIds: [],
        selectedItems: [],
        pickerItems: buildPickerItems(this.data.items, []),
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
    )

    this.setData({
      activeGuideType,
      guideTitle: guideContent.title,
      guideDesc: guideContent.desc,
      guideRecipes: guideContent.recipes,
      selectedItemIds: [],
      selectedItems: [],
      pickerItems: buildPickerItems(this.data.items, []),
    })
  },

  handleOpenPicker() {
    this.setData({
      pickerVisible: true,
      pickerItems: buildPickerItems(this.data.items, this.data.selectedItemIds),
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
    } else if (selectedSet.size >= 5) {
      wx.showToast({
        title: '最多选择 5 个',
        icon: 'none',
      })
      return
    } else {
      selectedSet.add(itemId)
    }

    const selectedItemIds = Array.from(selectedSet)

    this.setData({
      selectedItemIds,
      pickerItems: buildPickerItems(this.data.items, selectedItemIds),
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

    this.applyRecommendations(this.data.items, this.data.selectedItemIds)
    this.setData({
      pickerVisible: false,
    })
  },

  handleClearSelected() {
    this.setData({
      activeGuideType: '',
    })
    this.applyRecommendations(this.data.items, [])
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
