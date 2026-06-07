const itemService = require('../../services/itemService')

Page({
  handleOpenPrivacy() {
    if (wx.openPrivacyContract) {
      wx.openPrivacyContract({
        fail: () => wx.showToast({ title: '请在小程序后台配置隐私协议', icon: 'none' }),
      })
      return
    }
    wx.showToast({ title: '当前微信版本不支持查看', icon: 'none' })
  },

  handleClearAll() {
    wx.showModal({
      title: '清空全部数据',
      content: '确定清空当前账号下的全部食品记录吗？此操作不可恢复。',
      confirmText: '清空',
      confirmColor: '#c94238',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '清空中' })
        itemService
          .clearItems()
          .then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已清空', icon: 'success' })
          })
          .catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '清空失败', icon: 'none' })
          })
      },
    })
  },
})
