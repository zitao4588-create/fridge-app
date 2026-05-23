const itemService = require('../../services/itemService')
const reminderService = require('../../services/reminderService')
const { buildMonthDays, getMonthTitle, getTodayString } = require('../../utils/date')
const { getExpiryStatus } = require('../../utils/status')

Page({
  data: {
    loading: false,
    year: 0,
    monthIndex: 0,
    monthTitle: '',
    weekLabels: ['日', '一', '二', '三', '四', '五', '六'],
    days: [],
    events: {},
    selectedDate: '',
    selectedItems: [],
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

        this.setData({
          events,
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
      (item) => {
        const status = getExpiryStatus(item.expireDate)

        return {
          ...item,
          statusLabel: status.label,
          statusClass: status.className,
        }
      },
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
})

