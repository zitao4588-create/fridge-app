const {
  buildManualFallbackUrl,
  classifySelectionError,
  normalizeSelectedMedia,
} = require('../../utils/quickCapture')
const captureImageService = require('../../services/captureImageService')
const recognitionService = require('../../services/recognitionService')
const {
  classifyRecognitionFailure,
} = require('../../utils/recognitionCandidate')

function decodeOptionValue(value) {
  try {
    return decodeURIComponent(value || '')
  } catch (error) {
    return ''
  }
}

Page({
  data: {
    storageLocation: '',
    state: 'empty',
    choosing: false,
    processing: false,
    previewPath: '',
    captureId: '',
    handoffCapture: false,
    cleanupPending: false,
    errorMessage: '',
    boundaryMessage: '',
    progressMessage: '',
  },

  onLoad(options) {
    this.setData({
      storageLocation: decodeOptionValue(options.storageLocation),
    })
  },

  onShow() {
    if (this.data.handoffCapture) {
      this.setData({ state: 'empty', handoffCapture: false, captureId: '', previewPath: '', processing: false })
    }
  },

  onUnload() {
    if (
      this.data.captureId &&
      !this.data.handoffCapture
    ) {
      captureImageService
        .cleanupCaptureSession(this.data.captureId, {
          reason: 'cancel',
        })
        .catch(() => null)
    }
  },

  handleTakePhoto() {
    this.chooseImage('camera')
  },

  handleChooseAlbum() {
    this.chooseImage('album')
  },

  chooseImage(sourceType) {
    if (this.data.choosing || this.data.processing) return

    this.setData({
      choosing: true,
      errorMessage: '',
      boundaryMessage: '',
      progressMessage: '',
    })

    const cleanupBeforeReplace =
      this.data.captureId && !this.data.handoffCapture
        ? this.cleanupActiveCapture('replace')
        : Promise.resolve()

    return cleanupBeforeReplace
      .then((cleanupResult) => {
        if (cleanupResult && cleanupResult.cleanupPending) return null
        return wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: [sourceType],
          sizeType: ['compressed'],
        }).then((result) => ({ result }))
      })
      .then((selection) => {
        if (!selection) return
        const media = normalizeSelectedMedia(selection.result)

        if (!media) {
          this.setData({
            state: 'error',
            errorMessage: '没有读取到可预览的图片，请重新选择',
          })
          return
        }

        this.setData({
          state: 'preview',
          previewPath: media.tempFilePath,
          captureId: '',
          handoffCapture: false,
          cleanupPending: false,
          errorMessage: '',
        })
      })
      .catch((error) => {
        const selectionError = classifySelectionError(error)
        if (selectionError.cancelled) return

        this.setData({
          state: this.data.previewPath ? 'preview' : 'error',
          errorMessage: selectionError.message,
        })
      })
      .finally(() => {
        this.setData({ choosing: false })
      })
  },

  async handleConfirmUpload() {
    if (!this.data.previewPath) return

    if (
      !captureImageService.CAPTURE_FEATURE_ENABLED ||
      !recognitionService.RECOGNITION_FEATURE_ENABLED
    ) {
      this.setData({
        state: 'blocked',
        boundaryMessage:
          '图片上传或识别服务当前不可用，不会上传这张照片。你可以稍后重试或转手动填写。',
      })
      return
    }
    if (this.data.processing) return

    if (this.data.cleanupPending && this.data.captureId) {
      const cleanupResult = await this.cleanupActiveCapture(
        'recognition_failed',
      )
      if (cleanupResult.cleanupPending) return
    }

    this.setData({
      state: 'uploading',
      processing: true,
      errorMessage: '',
      boundaryMessage: '',
      progressMessage: '正在建立安全图片会话并上传…',
    })

    let captureId = ''
    return captureImageService
      .uploadCapture(this.data.previewPath)
      .then((session) => {
        captureId = session.captureId
        this.setData({
          captureId,
          progressMessage: '上传已确认，正在提取不可信候选…',
        })
        return recognitionService.requestFoodCandidates({ captureId })
      })
      .then((candidatePayload) =>
        this.openConfirmationPage(candidatePayload, captureId),
      )
      .catch(async (error) => {
        const failure = classifyRecognitionFailure(error)
        let cleanupPending = false
        if (captureId) {
          await captureImageService
            .cleanupCaptureSession(captureId, {
              reason: 'recognition_failed',
            })
            .then(() => {
              captureId = ''
            })
            .catch(() => {
              cleanupPending = true
            })
        }
        this.setData({
          state: 'preview',
          captureId: cleanupPending ? captureId : '',
          cleanupPending,
          errorMessage:
            failure.message || '识别没有完成，请重试或使用手动填写',
          progressMessage: '',
        })
      })
      .finally(() => {
        this.setData({ processing: false })
      })
  },

  openConfirmationPage(candidatePayload, captureId) {
    return new Promise((resolve, reject) => {
      wx.navigateTo({
        url: '/pkg-add/capture-confirm/capture-confirm',
        success: (response) => {
          if (
            response &&
            response.eventChannel &&
            typeof response.eventChannel.emit === 'function'
          ) {
            response.eventChannel.emit('recognitionReady', {
              candidatePayload,
              captureId,
              previewPath: this.data.previewPath,
              storageLocation: this.data.storageLocation,
            })
          }
          this.setData({
            state: 'preview',
            handoffCapture: true,
            progressMessage: '',
          })
          resolve()
        },
        fail: reject,
      })
    })
  },

  cleanupActiveCapture(reason) {
    if (!this.data.captureId) return Promise.resolve({ skipped: true })
    const captureId = this.data.captureId
    return captureImageService
      .cleanupCaptureSession(captureId, { reason })
      .then((result) => {
        this.setData({
          captureId: '',
          cleanupPending: false,
        })
        return result
      })
      .catch((error) => {
        this.setData({
          cleanupPending: true,
          errorMessage:
            '临时图片清理尚未确认完成。请重试刚才的操作；服务端也会按到期规则继续清理。',
        })
        return {
          cleanupPending: true,
          errorCode: String(error && error.code || 'CLEANUP_FAILED'),
        }
      })
  },

  async handleManualFallback() {
    if (this.data.processing) return
    const cleanupResult = await this.cleanupActiveCapture('manual')
    if (cleanupResult.cleanupPending) return
    wx.navigateTo({
      url: buildManualFallbackUrl({
        storageLocation: this.data.storageLocation,
      }),
    })
  },

  async handleCancel() {
    if (this.data.processing) return
    const cleanupResult = await this.cleanupActiveCapture('cancel')
    if (cleanupResult.cleanupPending) return
    wx.navigateBack()
  },
})
