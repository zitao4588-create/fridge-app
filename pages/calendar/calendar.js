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

        this.setData({
          events,
          items,
          stats: buildStats(items),
          expiryUsage,
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
