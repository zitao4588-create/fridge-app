const PUBLIC_PRIVACY_URL = 'https://fridge.playgamelab.cn/privacy/'
const SHARE_TITLE = '冰箱小雷达隐私说明｜食材数据按微信账号隔离'

Page({
  data: {
    publicPrivacyUrl: PUBLIC_PRIVACY_URL,
  },

  onShareAppMessage() {
    return {
      title: SHARE_TITLE,
      path: '/pages/privacy/privacy',
      imageUrl: '/images/mascot/fridge-happy.png',
    }
  },

  onShareTimeline() {
    return {
      title: SHARE_TITLE,
      query: '',
      imageUrl: '/images/mascot/fridge-happy.png',
    }
  },

  handleOpenWechatPrivacy() {
    if (wx.openPrivacyContract) {
      wx.openPrivacyContract({
        fail: () => wx.showToast({ title: '请在小程序后台配置隐私协议', icon: 'none' }),
      })
      return
    }
    wx.showToast({ title: '当前微信版本不支持查看', icon: 'none' })
  },

  handleCopyPublicPath() {
    if (!this.data.publicPrivacyUrl) {
      wx.showToast({ title: '公开隐私页暂未配置', icon: 'none' })
      return
    }
    wx.setClipboardData({ data: this.data.publicPrivacyUrl })
  },
})
