const itemService = require('../../services/itemService')
const reminderService = require('../../services/reminderService')
const recipeService = require('../../services/recipeService')
const zoneConfigService = require('../../services/zoneConfigService')
const { HOME_ZONE_DEFINITIONS } = require('../../utils/constants')
const {
  buildMonthDays,
  getDaysUntil,
  getMonthTitle,
  getTodayString,
} = require('../../utils/date')
const { getExpiryStatus } = require('../../utils/status')

const CALENDAR_RADAR_CACHE_KEY = 'fridge_calendar_radar_recipe_cache_v1'
const CALENDAR_RADAR_CACHE_VERSION = 1

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
  recipeHint: '等待云端 AI 生成',
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

function normalizeCachedRecipes(recipes) {
  return Array.isArray(recipes)
    ? recipes.filter((recipe) => recipe && recipe.id && recipe.title)
    : []
}

function readCalendarRadarCache() {
  try {
    const cache = wx.getStorageSync(CALENDAR_RADAR_CACHE_KEY)

    if (!cache || cache.version !== CALENDAR_RADAR_CACHE_VERSION) {
      return null
    }

    if (cache.date !== getTodayString()) {
      return null
    }

    return {
      recommendations: normalizeCachedRecipes(cache.recommendations),
      statusText: cache.statusText || '',
    }
  } catch {
    return null
  }
}

function saveCalendarRadarCache(payload) {
  try {
    wx.setStorageSync(CALENDAR_RADAR_CACHE_KEY, {
      version: CALENDAR_RADAR_CACHE_VERSION,
      date: getTodayString(),
      savedAt: Date.now(),
      recommendations: normalizeCachedRecipes(payload.recommendations),
      statusText: payload.statusText || '',
    })
  } catch {
    // 日历菜谱缓存失败时不影响当前页面展示。
  }
}

function getZoneDefinition(key) {
  return HOME_ZONE_DEFINITIONS.find((zone) => zone.key === key)
}

function getEnabledZoneLocationSet(configZones) {
  const locationSet = new Set()

  zoneConfigService
    .sanitizeZones(configZones)
    .filter((zone) => zone.enabled)
    .forEach((zone) => {
      const definition = getZoneDefinition(zone.key)
      const locations = definition
        ? definition.locations || [definition.location]
        : []

      locations.forEach((location) => {
        if (location) {
          locationSet.add(location)
        }
      })
    })

  return locationSet
}

function getEnabledZoneItems(items, configZones) {
  const safeItems = Array.isArray(items) ? items : []
  const enabledLocations = getEnabledZoneLocationSet(configZones)

  if (enabledLocations.size === 0) {
    return safeItems
  }

  return safeItems.filter((item) => enabledLocations.has(item.storageLocation))
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
  const usableCount = Number(safeExpiryUsage.usableCount) || 0
  const expiringCount = (safeExpiryUsage.threeDayItems || []).length
  const overdueCount = (safeExpiryUsage.overdueItems || []).length
  const usableItems = safeItems.filter((item) => getDaysUntil(item.expireDate) >= 0)
  const categoryCount = new Set(usableItems.map((item) => item.category).filter(Boolean)).size
  const inventoryScore = Math.min(usableCount / 8, 1) * 45
  const diversityScore = Math.min(categoryCount / 4, 1) * 25
  const expiryValueScore = expiringCount > 0 ? Math.min(expiringCount * 5, 15) : 8
  const overduePenalty = Math.min(overdueCount * 10, 30)
  const score = clampScore(
    inventoryScore + diversityScore + expiryValueScore - overduePenalty,
  )
  const level = getMealRadarLevel(score)
  const recommendationCount = Array.isArray(safeExpiryUsage.recommendations)
    ? safeExpiryUsage.recommendations.length
    : 0
  const recipeHint = recommendationCount > 0
    ? `云端 AI 已生成 ${recommendationCount} 道菜`
    : '等待云端 AI 生成'

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
    explanation: `本地已扫描 ${usableCount} 个可用库存、${expiringCount} 个临期和 ${overdueCount} 个过期风险`,
  }
}

function getInitialRadarRecipeStatus(expiryUsage) {
  const safeExpiryUsage = expiryUsage || EMPTY_EXPIRY_USAGE

  if (!safeExpiryUsage.usableCount) {
    return '暂无未过期库存，先添加食材或处理过期食品。'
  }

  if ((safeExpiryUsage.threeDayItems || []).length > 0) {
    return '正在结合临期食材和全量库存调用云端 AI...'
  }

  return '正在结合当前库存调用云端 AI 生成菜谱...'
}

function formatMonthDate(year, monthIndex, day = 1) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isDateInMonth(dateString, year, monthIndex) {
  return typeof dateString === 'string' &&
    dateString.startsWith(`${year}-${String(monthIndex + 1).padStart(2, '0')}-`)
}

function getMonthSelectedDate(year, monthIndex, currentSelectedDate) {
  if (isDateInMonth(currentSelectedDate, year, monthIndex)) {
    return currentSelectedDate
  }

  const today = getTodayString()

  if (isDateInMonth(today, year, monthIndex)) {
    return today
  }

  return formatMonthDate(year, monthIndex)
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
    statItems: [],
    stats: EMPTY_STATS,
    expiryUsage: EMPTY_EXPIRY_USAGE,
    mealRadarReport: EMPTY_MEAL_RADAR_REPORT,
    radarRecipeLoading: false,
    radarRecipeStatusText: '',
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

    Promise.all([itemService.getItems(), zoneConfigService.getZoneConfig()])
      .then(([items, zoneConfig]) => {
        const statItems = getEnabledZoneItems(items, zoneConfig && zoneConfig.zones)
        const events = reminderService.getCalendarEvents(items)
        const expiryUsage = recipeService.getExpiryUsageRecommendations(items)
        const stats = buildStats(statItems)
        const cachedRadar = readCalendarRadarCache()
        const nextExpiryUsage = cachedRadar
          ? {
            ...expiryUsage,
            recommendations: cachedRadar.recommendations,
          }
          : expiryUsage
        const mealRadarReport = buildMealRadarReport(items, nextExpiryUsage)
        const hasPendingRadarRequest = Boolean(this.mealRadarRecipeRequestId)
        const shouldLoadRecipes =
          !cachedRadar && !hasPendingRadarRequest && expiryUsage.usableCount > 0
        const shouldShowPendingRecipes =
          !cachedRadar && hasPendingRadarRequest && expiryUsage.usableCount > 0

        this.setData({
          events,
          items,
          statItems,
          stats,
          expiryUsage: nextExpiryUsage,
          mealRadarReport,
          radarRecipeLoading: shouldLoadRecipes || shouldShowPendingRecipes,
          radarRecipeStatusText: cachedRadar
            ? cachedRadar.statusText || (
              cachedRadar.recommendations.length > 0
                ? '今日开饭雷达菜谱已生成。'
                : '今日开饭雷达暂未生成可用菜谱。'
            )
            : getInitialRadarRecipeStatus(expiryUsage),
          loading: false,
        })
        this.renderCalendar()
        if (shouldLoadRecipes) {
          this.loadMealRadarRecipes(items, expiryUsage)
        }
      })
      .catch(() => {
        this.mealRadarRecipeRequestId = ''
        this.setData({
          loading: false,
          radarRecipeLoading: false,
          radarRecipeStatusText: '',
        })
        wx.showToast({
          title: '读取失败',
          icon: 'none',
        })
        this.renderCalendar()
      })
  },

  loadMealRadarRecipes(items, expiryUsage) {
    const safeExpiryUsage = expiryUsage || EMPTY_EXPIRY_USAGE

    if (!safeExpiryUsage.usableCount) {
      this.mealRadarRecipeRequestId = ''
      this.setData({
        radarRecipeLoading: false,
        radarRecipeStatusText: getInitialRadarRecipeStatus(safeExpiryUsage),
      })
      return
    }

    const requestId = `${Date.now()}-${Math.random()}`
    this.mealRadarRecipeRequestId = requestId

    recipeService
      .getCloudExpiryRecipeRecommendations(items, safeExpiryUsage)
      .then((result) => {
        if (this.mealRadarRecipeRequestId !== requestId) {
          return
        }

        const recommendations = Array.isArray(result.recommendations)
          ? result.recommendations
          : []
        const nextExpiryUsage = {
          ...this.data.expiryUsage,
          recommendations,
        }
        const statusText = recommendations.length > 0
          ? '云端 AI 已结合临期食材和库存生成菜谱。'
          : result.fallbackReason || '云端 AI 暂未生成可用菜谱，请稍后再试。'

        saveCalendarRadarCache({
          recommendations,
          statusText,
        })
        this.mealRadarRecipeRequestId = ''

        this.setData({
          expiryUsage: nextExpiryUsage,
          mealRadarReport: buildMealRadarReport(this.data.items, nextExpiryUsage),
          radarRecipeLoading: false,
          radarRecipeStatusText: statusText,
        })
      })
      .catch((error) => {
        if (this.mealRadarRecipeRequestId !== requestId) {
          return
        }

        this.setData({
          radarRecipeLoading: false,
          radarRecipeStatusText:
            (error && error.message) || '云端 AI 暂不可用，本次不使用本地菜谱兜底。',
        })
        this.mealRadarRecipeRequestId = ''
        saveCalendarRadarCache({
          recommendations: [],
          statusText:
            (error && error.message) || '云端 AI 暂不可用，本次不使用本地菜谱兜底。',
        })
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
    const year = date.getFullYear()
    const monthIndex = date.getMonth()

    this.setData({
      year,
      monthIndex,
      selectedDate: getMonthSelectedDate(
        year,
        monthIndex,
        this.data.selectedDate,
      ),
    })
    this.renderCalendar()
  },

  handleNextMonth() {
    const date = new Date(this.data.year, this.data.monthIndex + 1, 1)
    const year = date.getFullYear()
    const monthIndex = date.getMonth()

    this.setData({
      year,
      monthIndex,
      selectedDate: getMonthSelectedDate(
        year,
        monthIndex,
        this.data.selectedDate,
      ),
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
    const items = Array.isArray(this.data.statItems) ? this.data.statItems : []
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

  handleDeleteInventoryItem(event) {
    const { id, name } = event.currentTarget.dataset

    if (!id) {
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `确定删除「${name}」吗？`,
      confirmText: '删除',
      confirmColor: '#d95d55',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        wx.showLoading({
          title: '删除中',
        })
        itemService
          .deleteItem(id)
          .then(() => {
            wx.hideLoading()
            this.setData({
              inventoryPanelVisible: false,
              inventoryPanelTitle: '',
              inventoryPanelItems: [],
            })
            wx.showToast({
              title: '已删除',
              icon: 'success',
            })
            this.loadItems()
          })
          .catch(() => {
            wx.hideLoading()
            wx.showToast({
              title: '删除失败',
              icon: 'none',
            })
          })
      },
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
