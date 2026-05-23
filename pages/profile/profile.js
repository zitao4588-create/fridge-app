const itemService = require('../../services/itemService')
const { getDaysUntil } = require('../../utils/date')
const {
  DEFAULT_FRIDGE_LAYOUT_KEY,
  FRIDGE_LAYOUTS,
} = require('../../utils/constants')

const SELECTED_FRIDGE_LAYOUT_STORAGE_KEY = 'selectedFridgeLayoutKey'

function getFridgeLayoutIndex(layoutKey) {
  const index = FRIDGE_LAYOUTS.findIndex((layout) => layout.key === layoutKey)

  return index >= 0 ? index : 0
}

Page({
  data: {
    stats: {
      total: 0,
      expiringSoon: 0,
      overdue: 0,
    },
    fridgeLayoutOptions: FRIDGE_LAYOUTS.map((layout) => layout.name),
    fridgeLayoutIndex: getFridgeLayoutIndex(DEFAULT_FRIDGE_LAYOUT_KEY),
    selectedFridgeLayout: FRIDGE_LAYOUTS[
      getFridgeLayoutIndex(DEFAULT_FRIDGE_LAYOUT_KEY)
    ],
  },

  onShow() {
    this.loadFridgeLayout()
    this.loadStats()
  },

  loadFridgeLayout() {
    const savedLayoutKey =
      wx.getStorageSync(SELECTED_FRIDGE_LAYOUT_STORAGE_KEY) ||
      DEFAULT_FRIDGE_LAYOUT_KEY
    const fridgeLayoutIndex = getFridgeLayoutIndex(savedLayoutKey)

    this.setData({
      fridgeLayoutIndex,
      selectedFridgeLayout: FRIDGE_LAYOUTS[fridgeLayoutIndex],
    })
  },

  loadStats() {
    itemService
      .getItems()
      .then((items) => {
        this.setData({
          stats: {
            total: items.length,
            expiringSoon: items.filter((item) => {
              const days = getDaysUntil(item.expireDate)
              return days >= 0 && days <= 3
            }).length,
            overdue: items.filter((item) => getDaysUntil(item.expireDate) < 0)
              .length,
          },
        })
      })
      .catch(() => {
        wx.showToast({
          title: '读取失败',
          icon: 'none',
        })
      })
  },

  handleFridgeLayoutChange(event) {
    const fridgeLayoutIndex = Number(event.detail.value)
    const selectedFridgeLayout = FRIDGE_LAYOUTS[fridgeLayoutIndex]

    if (!selectedFridgeLayout) {
      return
    }

    wx.setStorageSync(
      SELECTED_FRIDGE_LAYOUT_STORAGE_KEY,
      selectedFridgeLayout.key,
    )

    this.setData({
      fridgeLayoutIndex,
      selectedFridgeLayout,
    })

    wx.showToast({
      title: '已更新冰箱类型',
      icon: 'success',
    })
  },

  handleClearAll() {
    wx.showModal({
      title: '清空全部数据',
      content: '确定清空当前账号下的全部食品记录吗？此操作不可恢复。',
      confirmText: '清空',
      confirmColor: '#be123c',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        wx.showLoading({
          title: '清空中',
        })

        itemService
          .clearItems()
          .then(() => {
            wx.hideLoading()
            wx.showToast({
              title: '已清空',
              icon: 'success',
            })
            this.loadStats()
          })
          .catch(() => {
            wx.hideLoading()
            wx.showToast({
              title: '清空失败',
              icon: 'none',
            })
          })
      },
    })
  },
})
