const parseService = require('../../services/parseService')
const { FEATURE_FLAGS } = require('../../utils/featureFlags')

Page({
  data: {
    photoParseEnabled: FEATURE_FLAGS.photoParse,
  },

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
    let loadingVisible = false
    const showRecognizing = () => {
      if (loadingVisible) {
        return
      }

      loadingVisible = true
      wx.showLoading({
        title: '识别中',
        mask: true,
      })
    }

    task(showRecognizing)
      .then((result) => {
        if (loadingVisible) {
          wx.hideLoading()
        }

        onSuccess(result)
      })
      .catch((error) => {
        if (loadingVisible) {
          wx.hideLoading()
        }

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
      (showRecognizing) =>
        parseService.parseFoodPhoto({
          onProcessingStart: showRecognizing,
        }),
      (result) => this.navigateToSingleConfirm(result),
    )
  },

  handleManualSmart() {
    wx.navigateTo({
      url: '/pkg-add/item-form/item-form?smartRecommend=1',
    })
  },

  handlePackagePhoto() {
    this.runParseTask(
      (showRecognizing) =>
        parseService.parsePackagePhoto({
          onProcessingStart: showRecognizing,
        }),
      (result) => this.navigateToSingleConfirm(result),
    )
  },

  handleReceiptPhoto() {
    this.runParseTask(
      (showRecognizing) =>
        parseService.parseReceiptPhoto({
          onProcessingStart: showRecognizing,
        }),
      (result) => this.navigateToBatchConfirm(result),
    )
  },
})
