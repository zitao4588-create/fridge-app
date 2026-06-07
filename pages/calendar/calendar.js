const itemService = require('../../services/itemService')
const reminderService = require('../../services/reminderService')
const {
  buildMonthDays,
  formatDate,
  getDaysUntil,
  getMonthTitle,
  getTodayString,
} = require('../../utils/date')
const { getExpiryStatus } = require('../../utils/status')

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const ITEM_FORM_URL = '/pkg-add/item-form/item-form'

function bucketOf(expireDate) {
  const days = getDaysUntil(expireDate)

  if (days < 0) return 'overdue'
  if (days <= 3) return 'expiring'
  return 'normal'
}

function decorate(item) {
  const status = getExpiryStatus(item.expireDate)

  return {
    ...item,
    amountText: `${item.quantity || 1}${item.unit || '份'}`,
    expireDateText: formatDate(item.expireDate),
    statusLabel: status.label,
    statusHint: status.hint,
    statusClass: status.className,
    bucket: bucketOf(item.expireDate),
  }
}

function buildStats(items) {
  return {
    total: items.length,
    expiring: items.filter((item) => item.bucket === 'expiring').length,
    overdue: items.filter((item) => item.bucket === 'overdue').length,
  }
}

// 开饭雷达评分（与历史算法一致，纯本地计算）
function clampScore(value) {
  return Math.max(0, Math.min(99, Math.round(value)))
}

function getMealRadarLevel(score) {
  if (score >= 80) {
    return { levelLabel: '高', levelTitle: '今天很适合开饭', levelClass: 'high' }
  }
  if (score >= 50) {
    return { levelLabel: '中', levelTitle: '可以开饭，建议补 1-2 样', levelClass: 'medium' }
  }
  return { levelLabel: '低', levelTitle: '先处理风险或补货', levelClass: 'low' }
}

function buildRadar(items) {
  const usable = items.filter((item) => item.bucket !== 'overdue')
  const expiringItems = items.filter((item) => item.bucket === 'expiring')
  const overdueCount = items.filter((item) => item.bucket === 'overdue').length
  const usableCount = usable.length
  const expiringCount = expiringItems.length
  const categoryCount = new Set(
    usable.map((item) => item.category).filter(Boolean),
  ).size

  const inventoryScore = Math.min(usableCount / 8, 1) * 45
  const diversityScore = Math.min(categoryCount / 4, 1) * 25
  const expiryValueScore = expiringCount > 0 ? Math.min(expiringCount * 5, 15) : 8
  const overduePenalty = Math.min(overdueCount * 10, 30)
  const score = clampScore(
    inventoryScore + diversityScore + expiryValueScore - overduePenalty,
  )

  return {
    score,
    scoreText: `${score}%`,
    ...getMealRadarLevel(score),
    usableCount,
    expiringCount,
    overdueCount,
    priorityItems: expiringItems.slice(0, 3),
    explanation: `已扫描 ${usableCount} 个可用库存 · ${expiringCount} 个临期 · ${overdueCount} 个过期风险`,
  }
}

Page({
  data: {
    weekLabels: WEEK_LABELS,
    year: 0,
    monthIndex: 0,
    monthTitle: '',
    days: [],
    selectedDate: '',
    selectedDateText: '',
    selectedItems: [],
    stats: { total: 0, expiring: 0, overdue: 0 },
    radar: {
      score: 0,
      scoreText: '0%',
      levelTitle: '先处理风险或补货',
      levelClass: 'low',
      explanation: '基于库存、临期和过期风险计算',
      priorityItems: [],
    },
    allItems: [],
    events: {},
    listPanelVisible: false,
    listPanelTitle: '',
    listPanelSubtitle: '',
    listPanelItems: [],
    listPanelEmpty: '',
  },

  onLoad() {
    const now = new Date()
    this.setData({
      year: now.getFullYear(),
      monthIndex: now.getMonth(),
      selectedDate: getTodayString(),
    })
  },

  onShow() {
    this.setTabBar({ selected: 1, hidden: this.data.listPanelVisible })
    this.loadItems()
  },

  setTabBar(patch) {
    const tabBar = typeof this.getTabBar === 'function' && this.getTabBar()
    if (tabBar) {
      tabBar.setData(patch)
    }
  },

  onPullDownRefresh() {
    this.loadItems().finally(() => wx.stopPullDownRefresh())
  },

  loadItems() {
    this.setData({ loading: true })

    return itemService
      .getItems()
      .then((items) => {
        const allItems = items.map(decorate)
        const events = reminderService.getCalendarEvents(allItems)
        const patch = {
          allItems,
          events,
          stats: buildStats(allItems),
          radar: buildRadar(allItems),
          loading: false,
        }

        if (this.data.listPanelVisible && this.panelType) {
          Object.assign(patch, this.buildListPanel(this.panelType, allItems))
        }

        this.setData(patch)
        this.renderCalendar(events)
        this.updateSelectedItems(this.data.selectedDate, events)
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '读取失败', icon: 'none' })
      })
  },

  renderCalendar(events = this.data.events) {
    const today = getTodayString()
    const days = buildMonthDays(
      this.data.year,
      this.data.monthIndex,
      events,
      this.data.selectedDate,
    ).map((day) => ({ ...day, isToday: day.date === today }))

    this.setData({
      monthTitle: getMonthTitle(this.data.year, this.data.monthIndex),
      days,
    })
  },

  updateSelectedItems(date, events = this.data.events) {
    this.setData({
      selectedDate: date,
      selectedDateText: formatDate(date),
      selectedItems: events[date] || [],
    })
  },

  handlePrevMonth() {
    const date = new Date(this.data.year, this.data.monthIndex - 1, 1)
    this.setData({ year: date.getFullYear(), monthIndex: date.getMonth() }, () => this.renderCalendar())
  },

  handleNextMonth() {
    const date = new Date(this.data.year, this.data.monthIndex + 1, 1)
    this.setData({ year: date.getFullYear(), monthIndex: date.getMonth() }, () => this.renderCalendar())
  },

  handleToday() {
    const now = new Date()
    const today = getTodayString()
    this.setData({ year: now.getFullYear(), monthIndex: now.getMonth() }, () => {
      this.renderCalendar()
      this.updateSelectedItems(today)
    })
  },

  handleSelectDay(event) {
    const date = event.currentTarget.dataset.date
    this.updateSelectedItems(date)
    this.renderCalendar()
  },

  buildListPanel(type, items) {
    const source = items || this.data.allItems
    const matched =
      type === 'expiring'
        ? source.filter((item) => item.bucket === 'expiring')
        : type === 'overdue'
          ? source.filter((item) => item.bucket === 'overdue')
          : source
    const titles = { total: '全部库存', expiring: '临期食品（3天内）', overdue: '已过期食品' }

    return {
      listPanelVisible: true,
      listPanelTitle: titles[type] || titles.total,
      listPanelSubtitle: `${matched.length} 项`,
      listPanelItems: matched,
      listPanelEmpty: matched.length ? '' : '暂无对应食材',
    }
  },

  handleStatsTap(event) {
    const type = event.currentTarget.dataset.type || 'total'
    this.panelType = type
    this.setData(this.buildListPanel(type, this.data.allItems))
    this.setTabBar({ hidden: true })
  },

  handleCloseListPanel() {
    this.panelType = null
    this.setData({ listPanelVisible: false })
    this.setTabBar({ hidden: false })
  },

  noop() {},

  handleEdit(event) {
    const id = event.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `${ITEM_FORM_URL}?id=${id}` })
  },

  handleDelete(event) {
    const { id, name } = event.currentTarget.dataset
    if (!id) return
    wx.showModal({
      title: '确认删除',
      content: `确定删除「${name}」吗？`,
      confirmText: '删除',
      confirmColor: '#c94238',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中' })
        itemService
          .deleteItem(id)
          .then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已删除', icon: 'none' })
            this.loadItems()
          })
          .catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
      },
    })
  },
})
