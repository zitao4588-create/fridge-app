Page({
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  handleOpenPrivacy() {
    if (wx.openPrivacyContract) {
      wx.openPrivacyContract({
        fail: () => wx.showToast({ title: '请在小程序后台配置隐私协议', icon: 'none' }),
      })
      return
    }
    wx.showToast({ title: '当前微信版本不支持查看', icon: 'none' })
  },
})
