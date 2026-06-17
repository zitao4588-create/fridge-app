const itemService = require('../../services/itemService')
const parseService = require('../../services/parseService')
const reminderService = require('../../services/reminderService')
const {
  CATEGORY_OPTIONS,
  normalizeStorageLocation,
  STORAGE_LOCATION_OPTIONS,
} = require('../../utils/constants')
const { getTodayString } = require('../../utils/date')
const { getFoodSuggestion } = require('../../utils/foodLexicon')

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
const SHARE_TITLE = '冰箱小雷达：记录食材，到期不忘'
const SHARE_PATH = '/pages/index/index'
const SHARE_IMAGE = '/images/mascot/fridge-happy.png'
const RECENT_FOODS_STORAGE_KEY = 'fridge_recent_foods_v1'
const RECENT_FOOD_LIMIT = 8

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

function buildLexiconState(form, options = {}) {
  const suggestion = getFoodSuggestion(form.name)

  if (!suggestion) {
    return { form, lexiconHint: '', matched: false }
  }

  const inputName = String(form.name || '').trim()
  const shouldUseSuggestionName = /^[a-z0-9]+$/i.test(inputName)
  const productionDate = form.productionDate || options.today || getTodayString()
  const shelfLifeDays = String(suggestion.shelfLifeDays)
  const expireDate = parseService.calculateExpireDate(productionDate, shelfLifeDays)
  const nextForm = {
    ...form,
    name: shouldUseSuggestionName ? suggestion.name : form.name,
    category: suggestion.category,
    productionDate,
    shelfLifeDays,
    expireDate: expireDate || form.expireDate,
  }

  if (!options.keepStorageLocation) {
    nextForm.storageLocation = suggestion.storageLocation
  }

  return {
    form: nextForm,
    lexiconHint: `已按「${suggestion.name}」预填品类、${suggestion.shelfLifeDays}天保质期和${suggestion.storageLocation}`,
    matched: true,
  }
}

function readRecentFoods() {
  try {
    const value = wx.getStorageSync(RECENT_FOODS_STORAGE_KEY)
    return Array.isArray(value) ? value : []
  } catch (error) {
    return []
  }
}

function writeRecentFoods(foods) {
  try {
    wx.setStorageSync(RECENT_FOODS_STORAGE_KEY, foods)
  } catch (error) {
    // 本地缓存失败不影响添加食品主流程。
  }
}

function getRecentFoodKey(food) {
  return [
    String(food.name || '').trim(),
    food.category || '',
    normalizeStorageLocation(food.storageLocation),
  ].join('|')
}

function getRecentFoodMeta(food) {
  const shelfLifeText = food.shelfLifeDays ? `${food.shelfLifeDays}天` : '手动到期日'
  return `${food.category || '其他'} · ${normalizeStorageLocation(food.storageLocation)} · ${shelfLifeText}`
}

function getRecentFoodList() {
  return readRecentFoods()
    .filter((food) => String(food && food.name ? food.name : '').trim())
    .slice(0, RECENT_FOOD_LIMIT)
    .map((food, index) => ({
      ...food,
      key: `${getRecentFoodKey(food)}-${index}`,
      meta: getRecentFoodMeta(food),
    }))
}

function normalizeRecentFood(form) {
  const name = String(form.name || '').trim()
  const shelfLifeDays = Number(form.shelfLifeDays)

  if (!name) return null

  return {
    name,
    category: form.category || '其他',
    quantity: Number(form.quantity) || 1,
    unit: form.unit || '份',
    shelfLifeDays:
      Number.isFinite(shelfLifeDays) && Number.isInteger(shelfLifeDays) && shelfLifeDays > 0
        ? shelfLifeDays
        : '',
    storageLocation: normalizeStorageLocation(form.storageLocation),
    note: String(form.note || '').trim(),
    source: 'manual',
    updatedAt: Date.now(),
  }
}

function rememberRecentFood(form) {
  const recentFood = normalizeRecentFood(form)

  if (!recentFood) return

  const recentKey = getRecentFoodKey(recentFood)
  const nextFoods = [recentFood]
    .concat(readRecentFoods().filter((food) => getRecentFoodKey(food) !== recentKey))
    .slice(0, RECENT_FOOD_LIMIT)

  writeRecentFoods(nextFoods)
}

function buildFormFromRecentFood(food, today) {
  const productionDate = today || getTodayString()
  const shelfLifeDays = food.shelfLifeDays ? String(food.shelfLifeDays) : ''
  const expireDate = shelfLifeDays
    ? parseService.calculateExpireDate(productionDate, shelfLifeDays)
    : ''

  return {
    ...emptyForm,
    name: food.name || '',
    category: food.category || '其他',
    quantity: food.quantity || 1,
    unit: food.unit || '份',
    productionDate,
    shelfLifeDays,
    expireDate,
    storageLocation: normalizeStorageLocation(food.storageLocation),
    note: food.note || '',
    source: 'manual',
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
    hasPresetStorageLocation: false,
    recommendedStorageLocation: '',
    showLocationRecommend: false,
    lexiconHint: '',
    recentFoods: [],
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
    let form = {
      ...this.data.form,
      ...(storageLocation ? { storageLocation } : {}),
      ...(name ? { name } : {}),
      ...(category ? { category } : {}),
    }
    const smartRecommendEnabled = options.smartRecommend === '1'
    const lexiconState = buildLexiconState(form, {
      today: this.data.today,
      keepStorageLocation: Boolean(storageLocation),
    })

    form = lexiconState.form
    this.setData({
      form,
      smartRecommendEnabled,
      hasPresetStorageLocation: Boolean(storageLocation),
      lexiconHint: lexiconState.lexiconHint,
      recentFoods: getRecentFoodList(),
      ...(lexiconState.matched ? { dateMode: 'production' } : {}),
      ...buildRecommendationState(form, smartRecommendEnabled, this.data.locationOptions),
    })
  },

  onShareAppMessage() {
    return {
      title: SHARE_TITLE,
      path: SHARE_PATH,
      imageUrl: SHARE_IMAGE,
    }
  },

  applyRecommendation(form = this.data.form) {
    const locationOptions = STORAGE_LOCATION_OPTIONS
    const storageLocation = getSupportedStorageLocation(form.storageLocation, locationOptions)
    const nextForm = { ...form, storageLocation }

    this.setData({
      form: nextForm,
      ...buildRecommendationState(nextForm, this.data.smartRecommendEnabled, locationOptions),
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
        this.applyRecommendation(form)
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
    const errors = this.data.errors.name
      ? { ...this.data.errors, name: '' }
      : this.data.errors
    const form = { ...this.data.form, name: event.detail.value }
    const lexiconState = this.data.isEdit
      ? { form, lexiconHint: '', matched: false }
      : buildLexiconState(form, {
          today: this.data.today,
          keepStorageLocation: this.data.hasPresetStorageLocation,
        })
    const nextForm = lexiconState.form

    this.setData({
      form: nextForm,
      errors,
      lexiconHint: lexiconState.lexiconHint,
      ...(lexiconState.matched ? { dateMode: 'production' } : {}),
      ...buildRecommendationState(
        nextForm,
        this.data.smartRecommendEnabled,
        this.data.locationOptions,
      ),
    })
  },

  handleRecentTap(event) {
    const recentFood = this.data.recentFoods[Number(event.currentTarget.dataset.index)]

    if (!recentFood) return

    const recentForm = buildFormFromRecentFood(recentFood, this.data.today)
    const form = this.data.hasPresetStorageLocation
      ? { ...recentForm, storageLocation: this.data.form.storageLocation }
      : recentForm

    this.setData({
      form,
      errors: { ...emptyErrors },
      lexiconHint: `已按最近常加「${recentFood.name}」预填，可继续修改`,
      dateMode: 'production',
      ...buildRecommendationState(
        form,
        this.data.smartRecommendEnabled,
        this.data.locationOptions,
      ),
    })
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

    const formToSave = { ...this.data.form }

    this.setData({ saving: true })

    reminderService
      .requestSubscribeMessage()
      .then(() => {
        wx.showLoading({ title: '保存中' })

        return this.data.isEdit
          ? itemService.updateItem(this.data.id, formToSave)
          : itemService.createItem(formToSave)
      })
      .then(() => {
        if (!this.data.isEdit) {
          rememberRecentFood(formToSave)
        }

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
