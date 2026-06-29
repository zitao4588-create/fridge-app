const SHARE_TITLE = '冰箱小雷达功能说明｜5 分区、临期提醒、开饭雷达'

Page({
  onShareAppMessage() {
    return {
      title: SHARE_TITLE,
      path: '/pages/features/features',
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

  handleOpenPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },
})
