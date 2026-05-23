const parseService = require('../../services/parseService')

Page({
  handleManualAdd() {
    wx.navigateTo({
      url: '/pages/item-form/item-form',
    })
  },

  handleDairyPrefill() {
    this.runParseTask('dairy')
  },

  handleDrinkPrefill() {
    this.runParseTask('drink')
  },

  runParseTask(type) {
    wx.showLoading({
      title: '填入中',
    })

    const task =
      type === 'dairy'
        ? parseService.getDairyPrefillResult()
        : parseService.getDrinkPrefillResult()

    task
      .then((result) => {
        wx.hideLoading()
        wx.navigateTo({
          url: `/pages/parse-confirm/parse-confirm?data=${encodeURIComponent(
            JSON.stringify(result),
          )}`,
        })
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({
          title: '填入失败',
          icon: 'none',
        })
      })
  },
})
