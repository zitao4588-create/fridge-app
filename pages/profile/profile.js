const itemService = require('../../services/itemService')
const { getDaysUntil } = require('../../utils/date')

Page({
  data: {
    stats: {
      total: 0,
      expiringSoon: 0,
      overdue: 0,
    },
  },

  onShow() {
    this.loadStats()
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

  handleOpenPrivacy() {
    if (wx.openPrivacyContract) {
      wx.openPrivacyContract({
        fail: () => {
          wx.showToast({
            title: '请在小程序后台配置隐私协议',
            icon: 'none',
          })
        },
      })
      return
    }

    wx.showToast({
      title: '当前微信版本不支持查看',
      icon: 'none',
    })
  },

  handleClearAll() {
    wx.showModal({
      title: '清空全部数据',
      content: '确定清空当前账号下的全部食品记录吗？此操作不可恢复。',
      confirmText: '清空',
      confirmColor: '#d95d55',
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
