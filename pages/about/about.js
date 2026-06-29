const SHARE_TITLE = '冰箱小雷达｜微信里的冰箱食材库存管理小程序'

Page({
  onShareAppMessage() {
    return {
      title: SHARE_TITLE,
      path: '/pages/index/index',
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

  handleOpenFeatures() {
    wx.navigateTo({ url: '/pages/features/features' })
  },

  handleOpenPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },
})
