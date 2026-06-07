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
    this.loadItems()
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
    this.setData({
      monthTitle: getMonthTitle(this.data.year, this.data.monthIndex),
      days: buildMonthDays(this.data.year, this.data.monthIndex, events, this.data.selectedDate),
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
  },

  handleCloseListPanel() {
    this.panelType = null
    this.setData({ listPanelVisible: false })
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
