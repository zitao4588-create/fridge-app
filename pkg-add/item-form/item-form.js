const itemService = require('../../services/itemService')
const reminderService = require('../../services/reminderService')
const captureImageService = require('../../services/captureImageService')
const {
  CATEGORY_OPTIONS,
  normalizeStorageLocation,
  STORAGE_LOCATION_OPTIONS,
} = require('../../utils/constants')
const { calculateExpireDate, getTodayString } = require('../../utils/date')
const { getFoodSuggestion, getRecommendedStorageLocation } = require('../../utils/foodLexicon')
const {
  validateConfirmationForm,
} = require('../../utils/captureConfirmation')

const emptyForm = {
  name: '',
  category: '其他',
  quantityTracked: false,
  quantity: 1,
  productionDate: '',
  shelfLifeDays: '',
  expireDate: '',
  storageLocation: '冷藏',
  note: '',
  source: 'manual',
}

const emptyErrors = {
  name: '',
  quantity: '',
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
    getRecommendedStorageLocation(form),
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
  const expireDate = calculateExpireDate(productionDate, shelfLifeDays)
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
    quantityTracked: form.quantityTracked === true,
    quantity: form.quantityTracked === true ? Number(form.quantity) || 1 : 1,
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
    ? calculateExpireDate(productionDate, shelfLifeDays)
    : ''

  return {
    ...emptyForm,
    name: food.name || '',
    category: food.category || '其他',
    quantityTracked: food.quantityTracked === true,
    quantity: food.quantity || 1,
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
    entryNotice: '',
    captureId: '',
    retainImageRequested: false,
    attachmentFinalized: false,
  },

  onLoad(options) {
    this.bindRecognitionPreset()
    if (options.id) {
      this.setData({ id: options.id, isEdit: true, smartRecommendEnabled: false })
      wx.setNavigationBarTitle({ title: '编辑食品' })
      this.loadItem(options.id)
      return
    }

    const storageLocation = getDefaultStorageLocation(options)
    const name = decodeOptionValue(options.name)
    const category = getDefaultCategory(options)
    const isPhotoFallback = options.entry === 'photoFallback'
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
      entryNotice: isPhotoFallback
        ? '照片没有上传或保存，识别也没有伪装成功。请手动填写并确认食材信息。'
        : '',
      lexiconHint: lexiconState.lexiconHint,
      recentFoods: getRecentFoodList(),
      ...(lexiconState.matched ? { dateMode: 'production' } : {}),
      ...buildRecommendationState(form, smartRecommendEnabled, this.data.locationOptions),
    })

    if (isPhotoFallback) {
      wx.setNavigationBarTitle({ title: '手动补录食品' })
    }
  },

  onUnload() {
    if (
      this.data.captureId &&
      this.data.retainImageRequested &&
      !this.data.attachmentFinalized
    ) {
      captureImageService
        .cleanupCaptureSession(this.data.captureId, {
          reason: 'cancel',
        })
        .catch(() => null)
    }
  },

  bindRecognitionPreset() {
    const channel =
      typeof this.getOpenerEventChannel === 'function'
        ? this.getOpenerEventChannel()
        : null
    if (!channel || typeof channel.on !== 'function') return
    channel.on('recognizedPreset', (payload = {}) => {
      const validation = validateConfirmationForm(payload.preset)
      if (!validation.valid) {
        this.setData({
          entryNotice:
            '识别候选已失效，请继续手动填写并确认所有字段。',
        })
        return
      }
      const form = {
        ...this.data.form,
        ...validation.preset,
        source: 'photo',
      }
      this.setData({
        form,
        smartRecommendEnabled: false,
        captureId: String(payload.captureId || ''),
        retainImageRequested:
          payload.retainImage === true &&
          Boolean(String(payload.captureId || '')),
        entryNotice:
          '以下内容来自不可信识别候选。请再次确认，保存前不会自动写入库存。',
        ...buildRecommendationState(
          form,
          false,
          this.data.locationOptions,
        ),
      })
      wx.setNavigationBarTitle({ title: '确认并保存食品' })
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

  handleQuantityTrackedChange(event) {
    const quantityTracked = event.detail.value === true
    const form = {
      ...this.data.form,
      quantityTracked,
      quantity: quantityTracked ? this.data.form.quantity || 1 : 1,
    }

    this.setData({
      form,
      errors: { ...this.data.errors, quantity: '' },
    })
  },

  handleQuantityInput(event) {
    this.updateFormField('quantity', event.detail.value)
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
    const expireDate = calculateExpireDate(
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
    const datePickerTarget =
      event.currentTarget.dataset.target || this.data.datePickerTarget

    if (datePickerTarget === 'production') {
      const expireDate = calculateExpireDate(
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

    if (form.quantityTracked === true) {
      const quantity = Number(form.quantity)

      if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
        errors.quantity = '数量需要是正整数'
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
    let itemSaved = false

    this.setData({ saving: true })

    reminderService
      .requestAndRecordSubscribeMessage()
      .then(() => {
        wx.showLoading({ title: '保存中' })

        return this.data.isEdit
          ? itemService.updateItem(this.data.id, formToSave)
          : itemService.createItem(formToSave)
      })
      .then((result) => {
        itemSaved = true
        if (!this.data.isEdit) {
          rememberRecentFood(formToSave)
        }

        const itemId = String(
          result && (result._id || result.id || result.itemId) || '',
        )
        if (
          !this.data.isEdit &&
          this.data.retainImageRequested &&
          this.data.captureId
        ) {
          if (!itemId) {
            return captureImageService
              .cleanupCaptureSession(this.data.captureId, {
                reason: 'save_failed',
              })
              .then(() => ({ imageDiscarded: true }))
              .catch(() => ({ imageStatusUncertain: true }))
          }
          return captureImageService
            .attachCaptureToItem(this.data.captureId, itemId)
            .then(() => ({ imageAttached: true }))
            .catch(() =>
              captureImageService
                .cleanupCaptureSession(this.data.captureId, {
                  reason: 'save_failed',
                })
                .then(() => ({ imageDiscarded: true }))
                .catch(() => ({ imageStatusUncertain: true })),
            )
        }
        return { imageAttached: false }
      })
      .then((outcome) => {
        wx.hideLoading()
        this.setData({
          saving: false,
          attachmentFinalized: true,
          captureId: '',
        })

        if (outcome.imageStatusUncertain) {
          wx.showModal({
            title: '食材已保存',
            content:
              '照片保留状态暂时无法确认，服务端会话仍可继续核对和清理。',
            showCancel: false,
            complete: () => wx.navigateBack(),
          })
          return
        }

        wx.showToast({
          title: outcome.imageDiscarded
            ? '已保存，照片未保留'
            : '已保存',
          icon: 'success',
        })
        setTimeout(() => wx.navigateBack(), 400)
      })
      .catch(() => {
        if (!itemSaved && this.data.captureId) {
          captureImageService
            .cleanupCaptureSession(this.data.captureId, {
              reason: 'save_failed',
            })
            .catch(() => null)
        }
        wx.hideLoading()
        this.setData({ saving: false })
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
  },
})
