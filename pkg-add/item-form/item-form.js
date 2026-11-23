const itemService = require('../../services/itemService')
const reminderService = require('../../services/reminderService')
const captureImageService = require('../../services/captureImageService')
const {
  CATEGORY_OPTIONS,
  normalizeStorageLocation,
  STORAGE_LOCATION_OPTIONS,
} = require('../../utils/constants')
const {
  calculateExpireDate,
  getTodayString,
  isValidDateString,
} = require('../../utils/date')
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
  productionDate: '',
  shelfLifeDays: '',
  expireDate: '',
}

// 记录用户亲手改过（或从入口/最近常加/识别候选明确带入）的字段：
// 词库只补这里为 false 的字段，不再静默覆盖用户的输入。
const emptyManualFields = {
  category: false,
  storageLocation: false,
  productionDate: false,
  shelfLifeDays: false,
  expireDate: false,
}
const allManualFields = {
  category: true,
  storageLocation: true,
  productionDate: true,
  shelfLifeDays: true,
  expireDate: true,
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

// production 模式的到期日是「算出来的」：生产日或保质期任一为空 / 无效时返回空串，
// 绝不沿用旧值，避免界面显示一个用户没确认过的日期。
function getComputedExpireDate(form) {
  return calculateExpireDate(form.productionDate, form.shelfLifeDays)
}

// expire 模式的到期日是用户自己选的，单独存在 expireModeDate 里，切模式不会互相覆盖。
function resolveExpireDate(form, dateMode, expireModeDate) {
  return dateMode === 'expire' ? expireModeDate || '' : getComputedExpireDate(form)
}

// 已有的生产日 + 保质期能精确算出已存的到期日时才进 production 模式，
// 否则（历史数据、识别候选只给了到期日）用 expire 模式原样展示已存到期日。
function getInitialDateMode(form) {
  const computed = getComputedExpireDate(form)

  return computed && computed === form.expireDate ? 'production' : 'expire'
}

function joinHintParts(parts) {
  if (parts.length <= 1) return parts.join('')

  return `${parts.slice(0, -1).join('、')}和${parts[parts.length - 1]}`
}

function buildLexiconState(form, options = {}) {
  const suggestion = getFoodSuggestion(form.name)
  const dateMode = options.dateMode || 'production'

  if (!suggestion) {
    return { form, lexiconHint: '', matched: false, dateMode }
  }

  const manual = options.manualFields || emptyManualFields
  const inputName = String(form.name || '').trim()
  const shouldUseSuggestionName = /^[a-z0-9]+$/i.test(inputName)
  const suggestedDays = String(suggestion.shelfLifeDays)
  // 用户已在「直接选过期日」里手选了到期日：日期相关字段一律不动，只给建议。
  const keepDateFields = dateMode === 'expire' && manual.expireDate
  const nextForm = {
    ...form,
    name: shouldUseSuggestionName ? suggestion.name : form.name,
  }
  const applied = []
  const suggested = []
  let nextDateMode = dateMode

  if (!manual.category) {
    nextForm.category = suggestion.category
    applied.push('品类')
  } else if (form.category !== suggestion.category) {
    suggested.push(`品类「${suggestion.category}」`)
  }

  if (keepDateFields) {
    if (String(form.shelfLifeDays) !== suggestedDays) {
      suggested.push(`${suggestedDays}天保质期`)
    }
  } else {
    if (!nextForm.productionDate && !manual.productionDate) {
      nextForm.productionDate = options.today || getTodayString()
      applied.push('今天为生产日')
    }

    if (!manual.shelfLifeDays) {
      nextForm.shelfLifeDays = suggestedDays
      applied.push(`${suggestedDays}天保质期`)
    } else if (String(form.shelfLifeDays) !== suggestedDays) {
      suggested.push(`${suggestedDays}天保质期`)
    }

    nextDateMode = 'production'
  }

  if (!manual.storageLocation) {
    nextForm.storageLocation = suggestion.storageLocation
    applied.push(suggestion.storageLocation)
  } else if (
    form.storageLocation !== suggestion.storageLocation &&
    !buildRecommendationState(
      nextForm,
      options.smartRecommendEnabled,
      options.locationOptions || STORAGE_LOCATION_OPTIONS,
    ).showLocationRecommend
  ) {
    // 若页面已显示「推荐放…［采纳］」，这里不再重复。
    suggested.push(`放${suggestion.storageLocation}`)
  }

  nextForm.expireDate = resolveExpireDate(nextForm, nextDateMode, options.expireModeDate)

  let lexiconHint = applied.length
    ? `已按「${suggestion.name}」预填${joinHintParts(applied)}`
    : ''

  if (suggested.length) {
    lexiconHint += `${lexiconHint ? '；' : `「${suggestion.name}」`}建议${suggested.join('、')}`
  }

  return {
    form: nextForm,
    lexiconHint,
    matched: true,
    dateMode: nextDateMode,
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

// 保存前按当前模式收口：production 用重新算出的到期日；expire 用用户选的到期日，
// 若隐藏的生产日 + 保质期与它对不上，就不保存那个保质期，避免下次编辑时被算回别的日期。
function buildFormToSave(form, dateMode) {
  if (dateMode !== 'expire') {
    return { ...form, expireDate: getComputedExpireDate(form) }
  }

  return getComputedExpireDate(form) === form.expireDate
    ? { ...form }
    : { ...form, shelfLifeDays: '' }
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
    expireModeDate: '',
    manualFields: { ...emptyManualFields },
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
    this.recognizedEntry = options.entry === 'recognizedPhoto'
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
    // 从分区 / 品类入口带进来的值算作用户已选，词库不覆盖，只给建议。
    const manualFields = {
      ...emptyManualFields,
      storageLocation: Boolean(storageLocation),
      category: Boolean(category),
    }
    const lexiconState = buildLexiconState(form, {
      today: this.data.today,
      manualFields,
      dateMode: this.data.dateMode,
      expireModeDate: this.data.expireModeDate,
      smartRecommendEnabled,
      locationOptions: this.data.locationOptions,
    })

    form = lexiconState.form
    this.setData({
      form,
      manualFields,
      dateMode: lexiconState.dateMode,
      smartRecommendEnabled,
      hasPresetStorageLocation: Boolean(storageLocation),
      entryNotice: isPhotoFallback
        ? '照片没有上传或保存，识别也没有伪装成功。请手动填写并确认食材信息。'
        : '',
      lexiconHint: lexiconState.lexiconHint,
      recentFoods: getRecentFoodList(),
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
      this.recognizedEntry = true
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
      // 识别候选通常只给到期日：能由生产日 + 保质期精确算出时才用 production 模式，
      // 否则切到「直接选过期日」，确保候选到期日原样可见、可保存。
      const dateMode = getInitialDateMode(form)
      this.setData({
        form,
        dateMode,
        expireModeDate: form.expireDate || '',
        manualFields: {
          ...allManualFields,
          category: form.category !== '其他',
          productionDate: Boolean(form.productionDate),
          shelfLifeDays: Boolean(form.shelfLifeDays),
        },
        lexiconHint: '',
        errors: { ...emptyErrors },
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
        const dateMode = getInitialDateMode(form)

        this.setData({
          form,
          dateMode,
          datePickerTarget: dateMode,
          expireModeDate: form.expireDate || '',
          manualFields: { ...allManualFields },
        })
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
          manualFields: this.data.manualFields,
          dateMode: this.data.dateMode,
          expireModeDate: this.data.expireModeDate,
          smartRecommendEnabled: this.data.smartRecommendEnabled,
          locationOptions: this.data.locationOptions,
        })
    const nextForm = lexiconState.form

    this.setData({
      form: nextForm,
      errors,
      lexiconHint: lexiconState.lexiconHint,
      ...(lexiconState.matched ? { dateMode: lexiconState.dateMode } : {}),
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
      dateMode: form.shelfLifeDays ? 'production' : 'expire',
      expireModeDate: form.expireDate || '',
      manualFields: {
        ...this.data.manualFields,
        category: true,
        storageLocation: true,
        shelfLifeDays: Boolean(form.shelfLifeDays),
      },
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
      manualFields: { ...this.data.manualFields, category: true },
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
      manualFields: { ...this.data.manualFields, storageLocation: true },
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
      manualFields: { ...this.data.manualFields, storageLocation: true },
      showLocationRecommend: false,
    })
  },

  handleDateModeTap(event) {
    const dateMode = event.currentTarget.dataset.mode

    if (!dateMode || dateMode === this.data.dateMode) {
      return
    }

    const form = this.data.form
    let expireModeDate = this.data.expireModeDate

    // 第一次切到「直接选过期日」时，把已算好的有效到期日带过去当起点（界面上可见、可改）。
    if (dateMode === 'expire' && !expireModeDate) {
      expireModeDate = getComputedExpireDate(form)
    }

    this.setData({
      dateMode,
      expireModeDate,
      form: { ...form, expireDate: resolveExpireDate(form, dateMode, expireModeDate) },
      errors: {
        ...this.data.errors,
        productionDate: '',
        shelfLifeDays: '',
        expireDate: '',
      },
    })
  },

  handleShelfLifeInput(event) {
    const shelfLifeDays = event.detail.value
    const form = { ...this.data.form, shelfLifeDays }

    // 只有 production 模式的到期日跟随保质期；算不出就清空，不再沿用旧日期。
    if (this.data.dateMode !== 'expire') {
      form.expireDate = getComputedExpireDate(form)
    }

    this.setData({
      form,
      manualFields: { ...this.data.manualFields, shelfLifeDays: true },
      errors: {
        ...this.data.errors,
        shelfLifeDays: '',
        expireDate: form.expireDate ? '' : this.data.errors.expireDate,
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
      const form = { ...this.data.form, productionDate: value }

      if (this.data.dateMode !== 'expire') {
        form.expireDate = getComputedExpireDate(form)
      }

      this.setData({
        form,
        manualFields: { ...this.data.manualFields, productionDate: true },
        errors: {
          ...this.data.errors,
          productionDate: '',
          expireDate: form.expireDate ? '' : this.data.errors.expireDate,
        },
        datePickerVisible: false,
      })
      return
    }

    this.setData({
      form: { ...this.data.form, expireDate: value },
      expireModeDate: value,
      manualFields: { ...this.data.manualFields, expireDate: true },
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

    if (form.quantityTracked === true) {
      const quantity = Number(form.quantity)

      if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
        errors.quantity = '数量需要是正整数'
      }
    }

    if (this.data.dateMode === 'expire') {
      // 到期日由用户自己选，保质期字段在此模式下隐藏，不参与校验。
      if (!form.expireDate) {
        errors.expireDate = '请选择过期日期'
      } else if (!isValidDateString(form.expireDate)) {
        errors.expireDate = '过期日期无效，请重新选择'
      }
    } else {
      if (!form.productionDate) {
        errors.productionDate = '请选择生产日期'
      } else if (!isValidDateString(form.productionDate)) {
        errors.productionDate = '生产日期无效，请重新选择'
      }

      const shelfLifeText = String(
        form.shelfLifeDays === undefined || form.shelfLifeDays === null
          ? ''
          : form.shelfLifeDays,
      ).trim()
      const shelfLifeDays = Number(shelfLifeText)

      if (!shelfLifeText) {
        errors.shelfLifeDays = '请填写保质期天数'
      } else if (!Number.isInteger(shelfLifeDays) || shelfLifeDays <= 0) {
        errors.shelfLifeDays = '保质期天数需要是正整数'
      }

      if (!errors.productionDate && !errors.shelfLifeDays && !getComputedExpireDate(form)) {
        errors.expireDate = '请选择过期日期'
      }
    }

    this.setData({ errors })

    return Object.values(errors).find(Boolean) || ''
  },

  handleSubmit() {
    if (this.data.saving || this.saved) return
    const errorMessage = this.validateForm()

    if (errorMessage) {
      wx.showToast({ title: errorMessage, icon: 'none' })
      return
    }

    const formToSave = buildFormToSave(this.data.form, this.data.dateMode)
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
        this.saved = true
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
        const afterSave = this.recognizedEntry ? () => wx.switchTab({ url: '/pages/index/index' }) : () => wx.navigateBack()
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
            complete: afterSave,
          })
          return
        }

        wx.showToast({
          title: outcome.imageDiscarded
            ? '已保存，照片未保留'
            : '已保存',
          icon: 'success',
        })
        setTimeout(afterSave, 400)
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
