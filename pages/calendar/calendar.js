const itemService = require('../../services/itemService')
const reminderService = require('../../services/reminderService')
const recipeService = require('../../services/recipeService')
const {
  buildMonthDays,
  getDaysUntil,
  getMonthTitle,
  getTodayString,
} = require('../../utils/date')
const { getExpiryStatus } = require('../../utils/status')

const EMPTY_EXPIRY_USAGE = {
  todayItems: [],
  threeDayItems: [],
  sevenDayItems: [],
  overdueItems: [],
  recommendations: [],
  safetyTips: [],
  usableCount: 0,
}

const EMPTY_STATS = {
  total: 0,
  expiringSoon: 0,
  overdue: 0,
}

const EMPTY_MEAL_RADAR_REPORT = {
  score: 0,
  scoreText: '0%',
  levelLabel: '低',
  levelTitle: '先处理风险或补货',
  levelClass: 'low',
  recipeHint: '暂无可匹配菜谱',
  inventoryCount: 0,
  expiringCount: 0,
  overdueCount: 0,
  priorityItems: [],
  explanation: '基于库存匹配、临期食材和过期风险计算',
}

const EMPTY_RECIPE_DETAIL = {
  title: '',
  timeCost: '',
  difficulty: '',
  matchLabel: '',
  availableItems: [],
  missingItems: [],
  steps: [],
  safetyNote: '',
}

function buildStats(items) {
  const safeItems = Array.isArray(items) ? items : []

  return safeItems.reduce(
    (result, item) => {
      const daysUntil = getDaysUntil(item.expireDate)

      result.total += 1

      if (daysUntil < 0) {
        result.overdue += 1
      } else if (daysUntil <= 3) {
        result.expiringSoon += 1
      }

      return result
    },
    { ...EMPTY_STATS },
  )
}

function formatInventoryItem(item) {
  const status = getExpiryStatus(item.expireDate)

  return {
    ...item,
    id: item.id || item._id || item.name,
    expiryHint: item.expiryHint || status.hint,
    statusLabel: item.statusLabel || status.label,
    statusClass: item.statusClass || status.className,
  }
}

function clampScore(value) {
  return Math.max(0, Math.min(99, Math.round(value)))
}

function getRecipeMatchRate(recommendations) {
  const safeRecommendations = Array.isArray(recommendations)
    ? recommendations
    : []
  const rates = safeRecommendations
    .map((recipe) => {
      const availableCount = (recipe.availableItems || []).length
      const missingCount = (recipe.missingItems || []).length
      const totalCount = availableCount + missingCount

      return totalCount > 0 ? availableCount / totalCount : 0
    })
    .filter((rate) => rate > 0)

  if (rates.length === 0) {
    return 0
  }

  return rates.reduce((sum, rate) => sum + rate, 0) / rates.length
}

function getMealRadarLevel(score) {
  if (score >= 80) {
    return {
      levelLabel: '高',
      levelTitle: '今天很适合开饭',
      levelClass: 'high',
    }
  }

  if (score >= 50) {
    return {
      levelLabel: '中',
      levelTitle: '可以开饭，建议补 1-2 样',
      levelClass: 'medium',
    }
  }

  return {
    levelLabel: '低',
    levelTitle: '先处理风险或补货',
    levelClass: 'low',
  }
}

function getPriorityPreviewItems(expiryUsage) {
  const items = Array.isArray(expiryUsage.threeDayItems)
    ? expiryUsage.threeDayItems
    : []
  const usedKeys = new Set()

  return items
    .filter((item) => {
      const key = item.id || item._id || item.name

      if (usedKeys.has(key)) {
        return false
      }

      usedKeys.add(key)
      return true
    })
    .slice(0, 3)
}

function buildMealRadarReport(items, expiryUsage) {
  const safeItems = Array.isArray(items) ? items : []
  const safeExpiryUsage = expiryUsage || EMPTY_EXPIRY_USAGE
  const recommendations = Array.isArray(safeExpiryUsage.recommendations)
    ? safeExpiryUsage.recommendations
    : []
  const usableCount = Number(safeExpiryUsage.usableCount) || 0
  const expiringCount = (safeExpiryUsage.threeDayItems || []).length
  const overdueCount = (safeExpiryUsage.overdueItems || []).length
  const directRecipeCount = recommendations.filter(
    (recipe) => (recipe.missingItems || []).length === 0,
  ).length
  const matchScore = getRecipeMatchRate(recommendations) * 60
  const inventoryScore = Math.min(usableCount / 8, 1) * 20
  const expiryValueScore = Math.min(expiringCount * 3, 10)
  const overduePenalty = Math.min(overdueCount * 8, 25)
  const score = clampScore(
    matchScore + inventoryScore + expiryValueScore - overduePenalty,
  )
  const level = getMealRadarLevel(score)
  const recipeHint =
    directRecipeCount > 0
      ? `已有 ${directRecipeCount} 道可直接做`
      : recommendations.length > 0
        ? `推荐 ${recommendations.length} 个去化方案`
        : '暂无可匹配菜谱'

  return {
    ...EMPTY_MEAL_RADAR_REPORT,
    ...level,
    score,
    scoreText: `${score}%`,
    recipeHint,
    inventoryCount: safeItems.length,
    expiringCount,
    overdueCount,
    priorityItems: getPriorityPreviewItems(safeExpiryUsage),
  }
}

Page({
  data: {
    loading: false,
    year: 0,
    monthIndex: 0,
    monthTitle: '',
    weekLabels: ['日', '一', '二', '三', '四', '五', '六'],
    days: [],
    events: {},
    items: [],
    stats: EMPTY_STATS,
    expiryUsage: EMPTY_EXPIRY_USAGE,
    mealRadarReport: EMPTY_MEAL_RADAR_REPORT,
    selectedDate: '',
    selectedItems: [],
    inventoryPanelVisible: false,
    inventoryPanelTitle: '',
    inventoryPanelItems: [],
    recipeDetailVisible: false,
    recipeDetail: EMPTY_RECIPE_DETAIL,
  },

  onLoad() {
    const now = new Date()
    const selectedDate = getTodayString()

    this.setData({
      year: now.getFullYear(),
      monthIndex: now.getMonth(),
      selectedDate,
    })
  },

  onShow() {
    this.loadItems()
  },

  loadItems() {
    this.setData({
      loading: true,
    })

    itemService
      .getItems()
      .then((items) => {
        const events = reminderService.getCalendarEvents(items)
        const expiryUsage = recipeService.getExpiryUsageRecommendations(items)
        const stats = buildStats(items)
        const mealRadarReport = buildMealRadarReport(items, expiryUsage)

        this.setData({
          events,
          items,
          stats,
          expiryUsage,
          mealRadarReport,
          loading: false,
        })
        this.renderCalendar()
      })
      .catch(() => {
        this.setData({
          loading: false,
        })
        wx.showToast({
          title: '读取失败',
          icon: 'none',
        })
        this.renderCalendar()
      })
  },

  renderCalendar() {
    const days = buildMonthDays(
      this.data.year,
      this.data.monthIndex,
      this.data.events,
      this.data.selectedDate,
    )
    const selectedItems = (this.data.events[this.data.selectedDate] || []).map(
      formatInventoryItem,
    )

    this.setData({
      days,
      selectedItems,
      monthTitle: getMonthTitle(this.data.year, this.data.monthIndex),
    })
  },

  handlePrevMonth() {
    const date = new Date(this.data.year, this.data.monthIndex - 1, 1)

    this.setData({
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
      selectedDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`,
    })
    this.renderCalendar()
  },

  handleNextMonth() {
    const date = new Date(this.data.year, this.data.monthIndex + 1, 1)

    this.setData({
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
      selectedDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`,
    })
    this.renderCalendar()
  },

  handleSelectDay(event) {
    this.setData({
      selectedDate: event.currentTarget.dataset.date,
    })
    this.renderCalendar()
  },

  handleOpenCalendarStats(event) {
    const type = event.currentTarget.dataset.type
    const items = Array.isArray(this.data.items) ? this.data.items : []
    const titleMap = {
      total: '全部库存清单',
      expiring: '临期食品清单',
      overdue: '已过期食品清单',
    }
    const listMap = {
      total: items,
      expiring: items.filter((item) => {
        const daysUntil = getDaysUntil(item.expireDate)

        return daysUntil >= 0 && daysUntil <= 3
      }),
      overdue: items.filter((item) => getDaysUntil(item.expireDate) < 0),
    }

    this.setData({
      inventoryPanelVisible: true,
      inventoryPanelTitle: titleMap[type] || '库存清单',
      inventoryPanelItems: (listMap[type] || []).map(formatInventoryItem),
    })
  },

  handleOpenExpiryList(event) {
    const type = event.currentTarget.dataset.type
    const titleMap = {
      today: '今日到期清单',
      threeDay: '3 天内到期清单',
      sevenDay: '7 天内到期清单',
      overdue: '已过期清单',
    }
    const listMap = {
      today: this.data.expiryUsage.todayItems,
      threeDay: this.data.expiryUsage.threeDayItems,
      sevenDay: this.data.expiryUsage.sevenDayItems,
      overdue: this.data.expiryUsage.overdueItems,
    }
    const inventoryPanelItems = (listMap[type] || []).map(formatInventoryItem)

    this.setData({
      inventoryPanelVisible: true,
      inventoryPanelTitle: titleMap[type] || '库存清单',
      inventoryPanelItems,
    })
  },

  handleCloseInventoryPanel() {
    this.setData({
      inventoryPanelVisible: false,
      inventoryPanelTitle: '',
      inventoryPanelItems: [],
    })
  },

  handleOpenRecipeDetail(event) {
    const { id } = event.currentTarget.dataset
    const recipe = (this.data.expiryUsage.recommendations || []).find(
      (item) => item.id === id,
    )

    if (!recipe) {
      return
    }

    this.setData({
      recipeDetailVisible: true,
      recipeDetail: {
        ...EMPTY_RECIPE_DETAIL,
        ...recipe,
        availableItems: recipe.availableItems || [],
        missingItems: recipe.missingItems || [],
        steps: recipe.steps || [],
      },
    })
  },

  handleCloseRecipeDetail() {
    this.setData({
      recipeDetailVisible: false,
      recipeDetail: EMPTY_RECIPE_DETAIL,
    })
  },

  noop() {},
})
