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

Page({
  data: {
    saving: false,
    sourceLabel: '',
    confidenceText: '',
    lowConfidence: false,
    form: { ...defaultResult.fields },
    source: defaultResult.source,
    rawText: '',
    confidence: 0,
    categoryOptions: CATEGORY_OPTIONS,
    categoryIndex: 0,
    locationOptions: STORAGE_LOCATION_OPTIONS,
    locationIndex: 0,
    unitOptions: UNIT_OPTIONS,
    unitIndex: 0,
  },

  onLoad(options) {
    let parsed = defaultResult

    if (options.data) {
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
    const form = {
      ...normalized.fields,
      storageLocation: normalizeStorageLocation(
        normalized.fields.storageLocation,
      ),
    }

    this.setData({
      form,
      source: normalized.source,
      rawText: normalized.rawText,
      confidence: normalized.confidence,
      sourceLabel: SOURCE_LABELS[normalized.source] || '快捷录入',
      confidenceText:
        normalized.confidence >= 0.8 ? '信息较完整' : '请重点核对',
      lowConfidence: normalized.confidence < 0.8,
      categoryIndex: Math.max(0, CATEGORY_OPTIONS.indexOf(form.category)),
      locationIndex: Math.max(0, STORAGE_LOCATION_OPTIONS.indexOf(form.storageLocation)),
      unitIndex: Math.max(0, UNIT_OPTIONS.indexOf(form.unit)),
    })
  },

  updateFormField(field, value) {
    this.setData({
      form: {
        ...this.data.form,
        [field]: value,
      },
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
    this.setData({
      categoryIndex,
      form: {
        ...this.data.form,
        category: this.data.categoryOptions[categoryIndex],
      },
    })
  },

  handleLocationChange(event) {
    const locationIndex = Number(event.detail.value)
    this.setData({
      locationIndex,
      form: {
        ...this.data.form,
        storageLocation: this.data.locationOptions[locationIndex],
      },
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
