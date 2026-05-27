const itemService = require('../../services/itemService')
const parseService = require('../../services/parseService')
const {
  CATEGORY_OPTIONS,
  normalizeStorageLocation,
  STORAGE_LOCATION_OPTIONS,
  UNIT_OPTIONS,
  SOURCE_LABELS,
} = require('../../utils/constants')

const defaultResult = parseService.normalizeParseResult({
  source: 'manual',
  confidence: 0,
  fields: {},
})

function buildRecommendationState(form, source, enabled) {
  const hasManualInput =
    String(form.name || '').trim() || form.category !== '其他'
  const shouldShow =
    enabled && (source !== 'manual' || hasManualInput)

  if (!shouldShow) {
    return {
      recommendedStorageLocation: '',
      showLocationRecommend: false,
    }
  }

  const recommendedStorageLocation = normalizeStorageLocation(
    parseService.getRecommendedStorageLocation(form),
  )

  return {
    recommendedStorageLocation,
    showLocationRecommend:
      !!recommendedStorageLocation &&
      recommendedStorageLocation !== form.storageLocation,
  }
}

function decodeOptionValue(value) {
  try {
    return decodeURIComponent(value || '')
  } catch (error) {
    return ''
  }
}

function getOptionStorageLocation(options) {
  const storageLocation = decodeOptionValue(
    options.storageLocation || options.location,
  )

  return storageLocation ? normalizeStorageLocation(storageLocation) : ''
}

Page({
  data: {
    cacheKey: '',
    saving: false,
    sourceLabel: '',
    confidenceText: '',
    lowConfidence: false,
    form: { ...defaultResult.fields },
    source: defaultResult.source,
    rawText: '',
    confidence: 0,
    smartRecommendEnabled: false,
    recommendedStorageLocation: '',
    showLocationRecommend: false,
    categoryOptions: CATEGORY_OPTIONS,
    categoryIndex: 0,
    locationOptions: STORAGE_LOCATION_OPTIONS,
    locationIndex: 0,
    unitOptions: UNIT_OPTIONS,
    unitIndex: 0,
  },

  onLoad(options) {
    let parsed = defaultResult
    const cacheKey = decodeOptionValue(options.cacheKey)

    if (cacheKey) {
      parsed = parseService.readTempParsePayload(cacheKey) || defaultResult
    } else if (options.data) {
      try {
        parsed = JSON.parse(decodeURIComponent(options.data))
      } catch (error) {
        wx.showToast({
          title: '信息读取失败',
          icon: 'none',
        })
      }
    }

    const normalized = parseService.normalizeParseResult(parsed)
    const optionStorageLocation = getOptionStorageLocation(options)
    const smartRecommendEnabled =
      normalized.source !== 'manual' || normalized.smartRecommend
    const form = {
      ...normalized.fields,
      storageLocation:
        optionStorageLocation ||
        normalizeStorageLocation(normalized.fields.storageLocation),
    }
    const recommendationState = buildRecommendationState(
      form,
      normalized.source,
      smartRecommendEnabled,
    )

    this.setData({
      cacheKey,
      form,
      source: normalized.source,
      rawText: normalized.rawText,
      confidence: normalized.confidence,
      smartRecommendEnabled,
      ...recommendationState,
      sourceLabel:
        normalized.source === 'manual' && normalized.smartRecommend
          ? '手动智能录入'
          : SOURCE_LABELS[normalized.source] || '快捷录入',
      confidenceText:
        normalized.confidence >= 0.8 ? '信息较完整' : '请重点核对',
      lowConfidence: normalized.confidence < 0.8,
      categoryIndex: Math.max(0, CATEGORY_OPTIONS.indexOf(form.category)),
      locationIndex: Math.max(0, STORAGE_LOCATION_OPTIONS.indexOf(form.storageLocation)),
      unitIndex: Math.max(0, UNIT_OPTIONS.indexOf(form.unit)),
    })
  },

  updateFormField(field, value) {
    const form = {
      ...this.data.form,
      [field]: value,
    }

    this.setData({
      form,
      ...buildRecommendationState(
        form,
        this.data.source,
        this.data.smartRecommendEnabled,
      ),
    })
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset
    this.updateFormField(field, event.detail.value)
  },

  handleQuantityInput(event) {
    this.updateFormField('quantity', event.detail.value)
  },

  handleShelfLifeInput(event) {
    const shelfLifeDays = event.detail.value
    const expireDate = parseService.calculateExpireDate(
      this.data.form.productionDate,
      shelfLifeDays,
    )

    this.setData({
      form: {
        ...this.data.form,
        shelfLifeDays,
        expireDate: expireDate || this.data.form.expireDate,
      },
    })
  },

  handleCategoryChange(event) {
    const categoryIndex = Number(event.detail.value)
    const form = {
      ...this.data.form,
      category: this.data.categoryOptions[categoryIndex],
    }

    this.setData({
      categoryIndex,
      form,
      ...buildRecommendationState(
        form,
        this.data.source,
        this.data.smartRecommendEnabled,
      ),
    })
  },

  handleLocationChange(event) {
    const locationIndex = Number(event.detail.value)
    const storageLocation = this.data.locationOptions[locationIndex]
    const form = {
      ...this.data.form,
      storageLocation,
    }

    this.setData({
      locationIndex,
      form,
      ...buildRecommendationState(
        form,
        this.data.source,
        this.data.smartRecommendEnabled,
      ),
    })
  },

  handleUnitChange(event) {
    const unitIndex = Number(event.detail.value)
    this.setData({
      unitIndex,
      form: {
        ...this.data.form,
        unit: this.data.unitOptions[unitIndex],
      },
    })
  },

  handleProductionDateChange(event) {
    const productionDate = event.detail.value
    const expireDate = parseService.calculateExpireDate(
      productionDate,
      this.data.form.shelfLifeDays,
    )

    this.setData({
      form: {
        ...this.data.form,
        productionDate,
        expireDate: expireDate || this.data.form.expireDate,
      },
    })
  },

  handleExpireDateChange(event) {
    this.updateFormField('expireDate', event.detail.value)
  },

  handleApplyRecommendedLocation() {
    const storageLocation = this.data.recommendedStorageLocation

    if (!storageLocation) {
      return
    }

    this.setData({
      form: {
        ...this.data.form,
        storageLocation,
      },
      locationIndex: Math.max(0, STORAGE_LOCATION_OPTIONS.indexOf(storageLocation)),
      showLocationRecommend: false,
    })
  },

  validateForm() {
    if (!this.data.form.name.trim()) {
      return '请填写食品名称'
    }

    if (!this.data.form.expireDate) {
      return '请填写过期日期'
    }

    return ''
  },

  handleConfirmSave() {
    const errorMessage = this.validateForm()

    if (errorMessage) {
      wx.showToast({
        title: errorMessage,
        icon: 'none',
      })
      return
    }

    this.setData({
      saving: true,
    })
    wx.showLoading({
      title: '保存中',
    })

    itemService
      .createItem({
        ...this.data.form,
        source: this.data.source,
        parseConfidence: this.data.confidence,
        parseRawText: this.data.rawText,
        parseStatus: 'manual_confirmed',
      })
      .then(() => {
        parseService.removeTempParsePayload(this.data.cacheKey)
        wx.hideLoading()
        this.setData({
          saving: false,
        })
        wx.showToast({
          title: '已保存',
          icon: 'success',
        })
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index',
          })
        }, 400)
      })
      .catch(() => {
        wx.hideLoading()
        this.setData({
          saving: false,
        })
        wx.showToast({
          title: '保存失败',
          icon: 'none',
        })
      })
  },
})
