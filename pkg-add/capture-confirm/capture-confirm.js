const captureImageService = require('../../services/captureImageService')
const {
  buildManualFallbackUrl,
} = require('../../utils/quickCapture')
const {
  CATEGORY_OPTIONS,
  STORAGE_LOCATION_OPTIONS,
} = require('../../utils/constants')
const {
  buildDateCandidateViews,
  normalizeCandidateForm,
  validateConfirmationForm,
} = require('../../utils/captureConfirmation')

function updateForm(page, patch) {
  page.setData({
    form: {
      ...page.data.form,
      ...patch,
    },
    errorMessage: '',
  })
}

Page({
  data: {
    loaded: false,
    previewPath: '',
    captureId: '',
    retainImage: false,
    cleaning: false,
    leaving: false,
    cleanupPending: false,
    attentionLevel: 'warning',
    warnings: [],
    dateCandidates: [],
    categoryOptions: CATEGORY_OPTIONS,
    locationOptions: STORAGE_LOCATION_OPTIONS,
    form: {
      name: '',
      category: '其他',
      quantityTracked: false,
      quantity: 1,
      productionDate: '',
      expireDate: '',
      storageLocation: '冷藏',
    },
    errorMessage: '',
  },

  onLoad() {
    const channel =
      typeof this.getOpenerEventChannel === 'function'
        ? this.getOpenerEventChannel()
        : null
    if (!channel || typeof channel.on !== 'function') {
      this.setData({
        loaded: true,
        errorMessage: '没有收到识别候选，请返回并改用手动填写',
      })
      return
    }
    channel.on('recognitionReady', (payload = {}) => {
      const state = normalizeCandidateForm(
        payload.candidatePayload,
        payload.storageLocation,
      )
      this.setData({
        loaded: true,
        previewPath: String(payload.previewPath || ''),
        captureId: String(payload.captureId || ''),
        attentionLevel: state.review.attentionLevel,
        warnings: state.review.warnings,
        dateCandidates: buildDateCandidateViews(state.review),
        form: state.form,
        errorMessage: '',
      })
    })
  },

  onUnload() {
    if (
      !this.data.leaving &&
      this.data.captureId &&
      !this.data.cleaning
    ) {
      captureImageService
        .cleanupCaptureSession(this.data.captureId, {
          reason: 'cancel',
        })
        .catch(() => null)
    }
  },

  handleNameInput(event) {
    updateForm(this, { name: event.detail.value })
  },

  handleQuantityTracked(event) {
    updateForm(this, {
      quantityTracked: event.detail.value === true,
    })
  },

  handleQuantityInput(event) {
    updateForm(this, { quantity: event.detail.value })
  },

  handleCategoryChange(event) {
    const category =
      this.data.categoryOptions[Number(event.detail.value)] || '其他'
    updateForm(this, { category })
  },

  handleLocationChange(event) {
    const storageLocation =
      this.data.locationOptions[Number(event.detail.value)] || '冷藏'
    updateForm(this, { storageLocation })
  },

  handleProductionDateChange(event) {
    updateForm(this, { productionDate: event.detail.value })
  },

  handleExpireDateChange(event) {
    updateForm(this, { expireDate: event.detail.value })
  },

  handleRetainImage(event) {
    this.setData({ retainImage: event.detail.value === true })
  },

  cleanupCapture(reason) {
    if (!this.data.captureId || this.data.cleaning) {
      return Promise.resolve({ skipped: true })
    }
    this.setData({ cleaning: true })
    return captureImageService
      .cleanupCaptureSession(this.data.captureId, { reason })
      .then((result) => {
        this.setData({
          captureId: '',
          cleaning: false,
          cleanupPending: false,
        })
        return result
      })
      .catch((error) => {
        this.setData({
          cleaning: false,
          cleanupPending: true,
          errorMessage:
            '临时图片清理尚未完成。请重试刚才的操作；也可先转手动填写，服务端会按到期规则继续清理。',
        })
        return {
          cleanupPending: true,
          errorCode: String(error && error.code || 'CLEANUP_FAILED'),
        }
      })
  },

  navigateToManualFallback() {
    this.setData({ leaving: true })
    wx.navigateTo({
      url: buildManualFallbackUrl({
        storageLocation: this.data.form.storageLocation,
      }),
      fail: () => {
        this.setData({
          leaving: false,
          errorMessage: '打开手动表单失败，请返回后重试',
        })
      },
    })
  },

  async navigateToItemForm(preset, retainImage) {
    const captureId = retainImage ? this.data.captureId : ''
    this.setData({ leaving: true })
    return new Promise((resolve, reject) => {
      wx.navigateTo({
        url: '/pkg-add/item-form/item-form?entry=recognizedPhoto',
        success: (response) => {
          if (
            response &&
            response.eventChannel &&
            typeof response.eventChannel.emit === 'function'
          ) {
            response.eventChannel.emit('recognizedPreset', {
              preset,
              captureId,
              retainImage,
            })
          }
          resolve()
        },
        fail: (error) => {
          this.setData({ leaving: false })
          reject(error)
        },
      })
    })
  },

  async handleContinue() {
    if (this.data.leaving) return
    const validation = validateConfirmationForm(this.data.form)
    if (!validation.valid) {
      this.setData({ errorMessage: validation.errors[0] })
      return
    }

    if (!this.data.retainImage) {
      const cleanupResult = await this.cleanupCapture('not_retained')
      if (cleanupResult.cleanupPending) return
    }

    try {
      await this.navigateToItemForm(
        validation.preset,
        this.data.retainImage,
      )
    } catch (error) {
      this.setData({
        errorMessage: '打开确认表单失败，请重试或改用手动填写',
      })
    }
  },

  async handleManualFallback() {
    if (this.data.leaving) return
    const cleanupResult = await this.cleanupCapture('manual')
    if (cleanupResult.cleanupPending) return
    this.navigateToManualFallback()
  },

  handleManualWithPendingCleanup() {
    if (this.data.leaving || !this.data.cleanupPending) return
    this.navigateToManualFallback()
  },

  async handleCancel() {
    if (this.data.leaving) return
    const cleanupResult = await this.cleanupCapture('cancel')
    if (cleanupResult.cleanupPending) return
    this.setData({ leaving: true })
    wx.navigateBack()
  },
})
