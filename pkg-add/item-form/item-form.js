const itemService = require('../../services/itemService')
const parseService = require('../../services/parseService')
const zoneConfigService = require('../../services/zoneConfigService')
const {
  CATEGORY_OPTIONS,
  normalizeStorageLocation,
  STORAGE_LOCATION_OPTIONS,
} = require('../../utils/constants')
const { getTodayString } = require('../../utils/date')

const emptyForm = {
  name: '',
  category: '其他',
  quantity: 1,
  unit: '份',
  productionDate: '',
  shelfLifeDays: '',
  expireDate: '',
  storageLocation: '冷藏',
  note: '',
  source: 'manual',
}

const emptyErrors = {
  name: '',
  shelfLifeDays: '',
  expireDate: '',
}

function decodeOptionValue(value) {
  try {
    return decodeURIComponent(value || '')
  } catch (error) {
    return ''
  }
}

function getDefaultStorageLocation(options) {
  const value = decodeOptionValue(options.storageLocation || options.location)

  return value ? normalizeStorageLocation(value) : ''
}

function getDefaultCategory(options) {
  const category = decodeOptionValue(options.category)

  return CATEGORY_OPTIONS.includes(category) ? category : ''
}

function getSupportedStorageLocation(location, options) {
  const storageLocation = normalizeStorageLocation(location)

  return options.includes(storageLocation) ? storageLocation : options[0] || '冷藏'
}

function buildRecommendationState(form, smartRecommendEnabled, locationOptions) {
  const hasInput = String(form.name || '').trim() || form.category !== '其他'

  if (!smartRecommendEnabled || !hasInput) {
    return { recommendedStorageLocation: '', showLocationRecommend: false }
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

Page({
  data: {
    id: '',
    isEdit: false,
    saving: false,
    form: { ...emptyForm },
    errors: { ...emptyErrors },
    categoryOptions: CATEGORY_OPTIONS,
    locationOptions: STORAGE_LOCATION_OPTIONS,
    smartRecommendEnabled: false,
    recommendedStorageLocation: '',
    showLocationRecommend: false,
    dateMode: 'production',
    datePickerVisible: false,
    datePickerTarget: 'production',
    datePickerValue: getTodayString(),
    today: getTodayString(),
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id, isEdit: true, smartRecommendEnabled: false })
      wx.setNavigationBarTitle({ title: '编辑食品' })
      this.loadItem(options.id)
      return
    }

    const storageLocation = getDefaultStorageLocation(options)
    const name = decodeOptionValue(options.name)
    const category = getDefaultCategory(options)
    const form = {
      ...this.data.form,
      ...(storageLocation ? { storageLocation } : {}),
      ...(name ? { name } : {}),
      ...(category ? { category } : {}),
    }

    this.setData({ form, smartRecommendEnabled: options.smartRecommend === '1' })
    this.loadLocationOptions(form)
  },

  loadLocationOptions(form = this.data.form) {
    return zoneConfigService.getZoneConfig().then((config) => {
      const locationOptions = zoneConfigService.getEnabledStorageLocationOptions(
        config.zones,
      )
      const storageLocation = getSupportedStorageLocation(
        form.storageLocation,
        locationOptions,
      )
      const nextForm = { ...form, storageLocation }

      this.setData({
        form: nextForm,
        locationOptions,
        ...buildRecommendationState(
          nextForm,
          this.data.smartRecommendEnabled,
          locationOptions,
        ),
      })
    })
  },

  loadItem(id) {
    wx.showLoading({ title: '读取中' })

    itemService
      .getItemById(id)
      .then((item) => {
        wx.hideLoading()
        const form = {
          ...emptyForm,
          ...item,
          storageLocation: normalizeStorageLocation(item.storageLocation),
          shelfLifeDays: item.shelfLifeDays || '',
        }
        const dateMode =
          form.productionDate && form.shelfLifeDays ? 'production' : 'expire'

        this.setData({ form, dateMode, datePickerTarget: dateMode })
        this.loadLocationOptions(form)
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '读取失败', icon: 'none' })
      })
  },

  updateFormField(field, value) {
    const errors = this.data.errors[field]
      ? { ...this.data.errors, [field]: '' }
      : this.data.errors
    const form = { ...this.data.form, [field]: value }

    this.setData({
      form,
      errors,
      ...buildRecommendationState(
        form,
        this.data.smartRecommendEnabled,
        this.data.locationOptions,
      ),
    })
  },

  handleNameInput(event) {
    this.updateFormField('name', event.detail.value)
  },

  handleNoteInput(event) {
    this.updateFormField('note', event.detail.value)
  },

  handleCategoryTap(event) {
    const category = this.data.categoryOptions[Number(event.currentTarget.dataset.index)]
    const form = { ...this.data.form, category }

    this.setData({
      form,
      ...buildRecommendationState(
        form,
        this.data.smartRecommendEnabled,
        this.data.locationOptions,
      ),
    })
  },

  handleLocationTap(event) {
    const storageLocation = this.data.locationOptions[Number(event.currentTarget.dataset.index)]
    const form = { ...this.data.form, storageLocation }

    this.setData({
      form,
      ...buildRecommendationState(
        form,
        this.data.smartRecommendEnabled,
        this.data.locationOptions,
      ),
    })
  },

  handleApplyRecommendedLocation() {
    const storageLocation = this.data.recommendedStorageLocation

    if (!storageLocation) {
      return
    }

    this.setData({
      form: { ...this.data.form, storageLocation },
      showLocationRecommend: false,
    })
  },

  handleDateModeTap(event) {
    this.setData({ dateMode: event.currentTarget.dataset.mode })
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
      errors: {
        ...this.data.errors,
        shelfLifeDays: '',
        expireDate: expireDate ? '' : this.data.errors.expireDate,
      },
    })
  },

  openDatePicker(event) {
    const datePickerTarget = event.currentTarget.dataset.target
    const current =
      datePickerTarget === 'production'
        ? this.data.form.productionDate
        : this.data.form.expireDate

    this.setData({
      datePickerTarget,
      datePickerValue: current || this.data.today,
      datePickerVisible: true,
    })
  },

  handleDateConfirm(event) {
    const value = event.detail.value

    if (this.data.datePickerTarget === 'production') {
      const expireDate = parseService.calculateExpireDate(
        value,
        this.data.form.shelfLifeDays,
      )

      this.setData({
        form: {
          ...this.data.form,
          productionDate: value,
          expireDate: expireDate || this.data.form.expireDate,
        },
        datePickerVisible: false,
      })
      return
    }

    this.setData({
      form: { ...this.data.form, expireDate: value },
      errors: { ...this.data.errors, expireDate: '' },
      datePickerVisible: false,
    })
  },

  handleDateCancel() {
    this.setData({ datePickerVisible: false })
  },

  validateForm() {
    const form = this.data.form
    const errors = { ...emptyErrors }
    const name = String(form.name || '').trim()

    if (!name) {
      errors.name = '请填写食品名称'
    } else if (name.length > 30) {
      errors.name = '食品名称不要超过30个字'
    }

    if (form.shelfLifeDays !== '') {
      const shelfLifeDays = Number(form.shelfLifeDays)

      if (
        !Number.isFinite(shelfLifeDays) ||
        !Number.isInteger(shelfLifeDays) ||
        shelfLifeDays <= 0
      ) {
        errors.shelfLifeDays = '保质期天数需要是正整数'
      }
    }

    if (!form.expireDate) {
      errors.expireDate = '请选择过期日期'
    }

    this.setData({ errors })

    return Object.values(errors).find(Boolean) || ''
  },

  handleSubmit() {
    const errorMessage = this.validateForm()

    if (errorMessage) {
      wx.showToast({ title: errorMessage, icon: 'none' })
      return
    }

    this.setData({ saving: true })
    wx.showLoading({ title: '保存中' })

    const task = this.data.isEdit
      ? itemService.updateItem(this.data.id, this.data.form)
      : itemService.createItem(this.data.form)

    task
      .then(() => {
        wx.hideLoading()
        this.setData({ saving: false })
        wx.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 400)
      })
      .catch(() => {
        wx.hideLoading()
        this.setData({ saving: false })
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
  },
})
