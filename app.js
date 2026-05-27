App({
  globalData: {
    cloudReady: false,
    cloudEnvId: 'cloud1-d3g4v0ms8ee56bd94',
    openid: '',
    recipePrefillItemIds: [],
  },

  onLaunch() {
    if (!wx.cloud) {
      wx.showModal({
        title: '基础库版本过低',
        content: '当前微信版本不支持云开发，请升级微信后重试。',
        showCancel: false,
      })
      return
    }

    wx.cloud.init({
      env: this.globalData.cloudEnvId,
      traceUser: true,
    })

    this.globalData.cloudReady = true
    this.loadOpenId()
  },

  loadOpenId() {
    wx.cloud
      .callFunction({
        name: 'getOpenId',
      })
      .then((res) => {
        this.globalData.openid = res.result.openid || ''
      })
      .catch(() => {
        this.globalData.openid = ''
      })
  },
})
