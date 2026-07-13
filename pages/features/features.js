const SHARE_TITLE = '冰箱小雷达功能说明｜6 分区、餐盘消耗、家庭共享'

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
