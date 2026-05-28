const itemService = require('../../services/itemService')
const parseService = require('../../services/parseService')
const zoneConfigService = require('../../services/zoneConfigService')
const {
  CATEGORY_OPTIONS,
  normalizeStorageLocation,
  STORAGE_LOCATION_OPTIONS,
  SOURCE_LABELS,
} = require('../../utils/constants')

const defaultResult = parseService.normalizeParseResult({
  source: 'manual',
  confidence: 0,
  fields: {},
})

function getOptionIndex(options, value) {
  return Math.max(0, options.indexOf(value))
}

function getSupportedStorageLocation(location, options) {
  const storageLocation = normalizeStorageLocation(location)

  return options.includes(storageLocation) ? storageLocation : options[0] || '冷藏'
}

function buildRecommendationState(form, source, enabled, locationOptions) {
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

  const recommendedStorageLocation = getSupportedStorageLocation(
    parseService.getRecommendedStorageLocation(form),
    locationOptions,
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

function buildRecognitionAlert(result) {
  const source = result.source || 'manual'
  const providerStatus = result.providerStatus || ''
  const fallbackReason = parseService.formatFallbackReason(result.fallbackReason)

  if (source === 'manual' && !result.smartRecommend) {
    return {
      showRecognitionAlert: false,
      recognitionAlertType: '',
      recognitionAlertTitle: '',
      recognitionAlertDesc: '',
    }
  }

  if (source === 'manual' && result.smartRecommend) {
    return {
      showRecognitionAlert: true,
      recognitionAlertType: 'local',
      recognitionAlertTitle: '本地分区推荐',
      recognitionAlertDesc:
        '这是根据食品名称和品类给出的本地分区建议，请按实际存放位置核对后保存。',
    }
  }

  if (providerStatus === 'real') {
    return {
      showRecognitionAlert: true,
      recognitionAlertType: 'real',
      recognitionAlertTitle: '已使用真实识别',
      recognitionAlertDesc:
        '已调用云端 OCR / AI 识别。机器识别仍可能不准，请核对名称、日期和分区后保存。',
    }
  }

  if (providerStatus === 'partial') {
    return {
      showRecognitionAlert: true,
      recognitionAlertType: 'partial',
      recognitionAlertTitle: '已使用图片识别',
      recognitionAlertDesc: fallbackReason
        ? `云端 AI 暂不可用，已先用图片识别结果预填。原因：${fallbackReason}`
        : '云端 AI 暂不可用，已先用图片识别结果预填。请按实物核对后保存。',
    }
  }

  if (providerStatus === 'mock' || fallbackReason) {
    return {
      showRecognitionAlert: true,
      recognitionAlertType: 'fallback',
      recognitionAlertTitle: '已使用备用识别',
      recognitionAlertDesc: fallbackReason
        ? `${fallbackReason}。请按实物状态核对后保存。`
        : '真实识别暂不可用，已使用预填结果。请按实物状态核对后保存。',
    }
  }

  return {
    showRecognitionAlert: true,
    recognitionAlertType: 'unknown',
    recognitionAlertTitle: '识别状态待确认',
    recognitionAlertDesc:
      '云端没有返回识别来源，请按实物状态核对名称、日期和分区后保存。',
  }
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
    providerStatus: '',
    fallbackReason: '',
    showRecognitionAlert: false,
    recognitionAlertType: '',
    recognitionAlertTitle: '',
    recognitionAlertDesc: '',
    smartRecommendEnabled: false,
    recommendedStorageLocation: '',
    showLocationRecommend: false,
    categoryOptions: CATEGORY_OPTIONS,
    categoryIndex: 0,
    locationOptions: STORAGE_LOCATION_OPTIONS,
    locationIndex: 0,
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
    this.setData({
      cacheKey,
      form,
      source: normalized.source,
      rawText: normalized.rawText,
      confidence: normalized.confidence,
      providerStatus: normalized.providerStatus,
      fallbackReason: normalized.fallbackReason,
      ...buildRecognitionAlert(normalized),
      smartRecommendEnabled,
      sourceLabel:
        normalized.source === 'manual' && normalized.smartRecommend
          ? '手动智能录入'
          : SOURCE_LABELS[normalized.source] || '快捷录入',
      confidenceText:
        normalized.confidence >= 0.8 ? '信息较完整' : '请重点核对',
      lowConfidence: normalized.confidence < 0.8,
      categoryIndex: getOptionIndex(CATEGORY_OPTIONS, form.category),
    })
    this.loadLocationOptions(form, normalized.source, smartRecommendEnabled)
  },

  loadLocationOptions(form, source, smartRecommendEnabled) {
    return zoneConfigService.getZoneConfig().then((config) => {
      const locationOptions = zoneConfigService.getEnabledStorageLocationOptions(
        config.zones,
      )
      const storageLocation = getSupportedStorageLocation(
        form.storageLocation,
        locationOptions,
      )
      const nextForm = {
        ...form,
        storageLocation,
      }

      this.setData({
        form: nextForm,
        locationOptions,
        locationIndex: getOptionIndex(locationOptions, storageLocation),
        ...buildRecommendationState(
          nextForm,
          source,
          smartRecommendEnabled,
          locationOptions,
        ),
      })
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
        this.data.locationOptions,
      ),
    })
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset
    this.updateFormField(field, event.detail.value)
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
        this.data.locationOptions,
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
        this.data.locationOptions,
      ),
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
      locationIndex: getOptionIndex(this.data.locationOptions, storageLocation),
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
