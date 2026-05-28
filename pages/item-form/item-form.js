const itemService = require('../../services/itemService')
const parseService = require('../../services/parseService')
const {
  CATEGORY_OPTIONS,
  normalizeStorageLocation,
} = require('../../utils/constants')
const {
  buildMonthDays,
  getMonthTitle,
  getTodayString,
  parseDate,
} = require('../../utils/date')

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const initialCalendarDate = parseDate(getTodayString())

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

function getCalendarAnchor(dateString) {
  const date = parseDate(dateString) || initialCalendarDate

  return {
    year: date.getFullYear(),
    monthIndex: date.getMonth(),
  }
}

function getSelectedDate(form, dateMode) {
  return dateMode === 'production' ? form.productionDate : form.expireDate
}

function decodeOptionValue(value) {
  try {
    return decodeURIComponent(value || '')
  } catch (error) {
    return ''
  }
}

function getDefaultStorageLocation(options) {
  const storageLocation = decodeOptionValue(
    options.storageLocation || options.location,
  )

  return storageLocation ? normalizeStorageLocation(storageLocation) : ''
}

function getDefaultCategory(options) {
  const category = decodeOptionValue(options.category)

  return CATEGORY_OPTIONS.includes(category) ? category : ''
}

Page({
  data: {
    id: '',
    isEdit: false,
    saving: false,
    form: { ...emptyForm },
    errors: { ...emptyErrors },
    categoryOptions: CATEGORY_OPTIONS,
    categoryIndex: CATEGORY_OPTIONS.indexOf(emptyForm.category),
    dateMode: 'production',
    datePickerVisible: false,
    datePickerTarget: 'production',
    weekLabels: WEEK_LABELS,
    calendarYear: initialCalendarDate.getFullYear(),
    calendarMonthIndex: initialCalendarDate.getMonth(),
    calendarTitle: getMonthTitle(
      initialCalendarDate.getFullYear(),
      initialCalendarDate.getMonth(),
    ),
    calendarDays: buildMonthDays(
      initialCalendarDate.getFullYear(),
      initialCalendarDate.getMonth(),
      {},
      '',
    ),
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        id: options.id,
        isEdit: true,
      })
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

    if (storageLocation || name || category) {
      this.setData({
        form,
        categoryIndex: Math.max(0, CATEGORY_OPTIONS.indexOf(form.category)),
      })
    }
  },

  loadItem(id) {
    wx.showLoading({
      title: '读取中',
    })

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

        this.setData({
          form,
          categoryIndex: Math.max(0, CATEGORY_OPTIONS.indexOf(form.category)),
          dateMode,
          datePickerTarget: dateMode,
        })
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({
          title: '读取失败',
          icon: 'none',
        })
      })
  },

  updateFormField(field, value) {
    const errors = this.data.errors[field]
      ? {
          ...this.data.errors,
          [field]: '',
        }
      : this.data.errors

    this.setData({
      form: {
        ...this.data.form,
        [field]: value,
      },
      errors,
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
    const errors = this.data.errors.shelfLifeDays
      ? {
          ...this.data.errors,
          shelfLifeDays: '',
        }
      : this.data.errors
    const nextErrors = expireDate
      ? {
          ...errors,
          expireDate: '',
        }
      : errors

    this.setData({
      form: {
        ...this.data.form,
        shelfLifeDays,
        expireDate: expireDate || this.data.form.expireDate,
      },
      errors: nextErrors,
    })
  },

  handleCategoryChange(event) {
    const categoryIndex = Number(event.detail.value)
    this.selectCategory(categoryIndex)
  },

  selectCategory(categoryIndex) {
    this.setData({
      categoryIndex,
      form: {
        ...this.data.form,
        category: this.data.categoryOptions[categoryIndex],
      },
    })
  },

  handleCategoryTap(event) {
    this.selectCategory(Number(event.currentTarget.dataset.index))
  },

  renderDateCalendar() {
    this.setData({
      calendarTitle: getMonthTitle(
        this.data.calendarYear,
        this.data.calendarMonthIndex,
      ),
      calendarDays: buildMonthDays(
        this.data.calendarYear,
        this.data.calendarMonthIndex,
        {},
        getSelectedDate(this.data.form, this.data.datePickerTarget),
      ),
    })
  },

  moveCalendarToSelectedDate(form = this.data.form, dateMode = this.data.dateMode) {
    const { year, monthIndex } = getCalendarAnchor(
      getSelectedDate(form, dateMode),
    )

    this.setData(
      {
        calendarYear: year,
        calendarMonthIndex: monthIndex,
      },
      () => {
        this.renderDateCalendar()
      },
    )
  },

  handleDateModeTap(event) {
    const dateMode = event.currentTarget.dataset.mode

    this.setData({
      dateMode,
      datePickerTarget: dateMode,
    })
  },

  openDatePicker(event) {
    const datePickerTarget = event.currentTarget.dataset.target

    this.setData(
      {
        datePickerVisible: true,
        datePickerTarget,
      },
      () => {
        this.moveCalendarToSelectedDate(this.data.form, datePickerTarget)
      },
    )
  },

  closeDatePicker() {
    this.setData({
      datePickerVisible: false,
    })
  },

  stopDatePickerClose() {},

  handleTodayTap() {
    const selectedDate = getTodayString()
    const { year, monthIndex } = getCalendarAnchor(selectedDate)

    this.setData(
      {
        calendarYear: year,
        calendarMonthIndex: monthIndex,
      },
      () => {
        this.renderDateCalendar()
      },
    )
  },

  handlePrevCalendarMonth() {
    const date = new Date(
      this.data.calendarYear,
      this.data.calendarMonthIndex - 1,
      1,
    )

    this.setData(
      {
        calendarYear: date.getFullYear(),
        calendarMonthIndex: date.getMonth(),
      },
      () => {
        this.renderDateCalendar()
      },
    )
  },

  handleNextCalendarMonth() {
    const date = new Date(
      this.data.calendarYear,
      this.data.calendarMonthIndex + 1,
      1,
    )

    this.setData(
      {
        calendarYear: date.getFullYear(),
        calendarMonthIndex: date.getMonth(),
      },
      () => {
        this.renderDateCalendar()
      },
    )
  },

  handleSelectCalendarDate(event) {
    const selectedDate = event.currentTarget.dataset.date
    const { year, monthIndex } = getCalendarAnchor(selectedDate)

    if (this.data.datePickerTarget === 'production') {
      const expireDate = parseService.calculateExpireDate(
        selectedDate,
        this.data.form.shelfLifeDays,
      )
      const errors = expireDate
        ? {
            ...this.data.errors,
            expireDate: '',
          }
        : this.data.errors

      this.setData(
        {
          form: {
            ...this.data.form,
            productionDate: selectedDate,
            expireDate: expireDate || this.data.form.expireDate,
          },
          errors,
          calendarYear: year,
          calendarMonthIndex: monthIndex,
          datePickerVisible: false,
        },
      )
      return
    }

    this.setData(
      {
        form: {
          ...this.data.form,
          expireDate: selectedDate,
        },
        errors: {
          ...this.data.errors,
          expireDate: '',
        },
        calendarYear: year,
        calendarMonthIndex: monthIndex,
        datePickerVisible: false,
      },
    )
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

    this.setData({
      errors,
    })

    return Object.values(errors).find(Boolean) || ''
  },

  handleSubmit() {
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

    const task = this.data.isEdit
      ? itemService.updateItem(this.data.id, this.data.form)
      : itemService.createItem(this.data.form)

    task
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
          wx.navigateBack()
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
