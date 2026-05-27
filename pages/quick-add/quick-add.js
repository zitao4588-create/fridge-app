const parseService = require('../../services/parseService')

Page({
  navigateToSingleConfirm(result) {
    const cacheKey = parseService.saveTempParsePayload(result, 'single')

    wx.navigateTo({
      url: `/pages/parse-confirm/parse-confirm?cacheKey=${encodeURIComponent(
        cacheKey,
      )}`,
    })
  },

  navigateToBatchConfirm(result) {
    const cacheKey = parseService.saveTempParsePayload(result, 'receipt')

    wx.navigateTo({
      url: `/pages/batch-parse-confirm/batch-parse-confirm?cacheKey=${encodeURIComponent(
        cacheKey,
      )}`,
    })
  },

  runParseTask(task, onSuccess) {
    wx.showLoading({
      title: '识别中',
    })

    task()
      .then((result) => {
        wx.hideLoading()
        onSuccess(result)
      })
      .catch((error) => {
        wx.hideLoading()

        if (parseService.isCancelError(error)) {
          return
        }

        wx.showToast({
          title: '识别失败',
          icon: 'none',
        })
      })
  },

  handleFoodPhoto() {
    this.runParseTask(
      () => parseService.parseFoodPhoto(),
      (result) => this.navigateToSingleConfirm(result),
    )
  },

  handleManualSmart() {
    this.navigateToSingleConfirm(parseService.createSmartManualResult())
  },

  handlePackageOrBarcode() {
    wx.showActionSheet({
      itemList: ['扫码条形码', '拍包装说明'],
      success: (res) => {
        const task =
          res.tapIndex === 0
            ? () => parseService.scanAndParseBarcode()
            : () => parseService.parsePackagePhoto()

        this.runParseTask(task, (result) => this.navigateToSingleConfirm(result))
      },
    })
  },

  handleReceiptPhoto() {
    this.runParseTask(
      () => parseService.parseReceiptPhoto(),
      (result) => this.navigateToBatchConfirm(result),
    )
  },
})
