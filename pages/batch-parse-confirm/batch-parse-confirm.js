const itemService = require('../../services/itemService')
const parseService = require('../../services/parseService')
const {
  CATEGORY_OPTIONS,
  normalizeStorageLocation,
  SOURCE_LABELS,
  STORAGE_LOCATION_OPTIONS,
  UNIT_OPTIONS,
} = require('../../utils/constants')

function decodeOptionValue(value) {
  try {
    return decodeURIComponent(value || '')
  } catch (error) {
    return ''
  }
}

function getOptionIndex(options, value) {
  return Math.max(0, options.indexOf(value))
}

function getSelectedCount(items) {
  return items.filter((item) => item.checked).length
}

function decorateBatchItem(entry, index) {
  const normalized = parseService.normalizeParseResult({
    source: 'receipt',
    confidence: entry.confidence,
    rawText: entry.rawText,
    recommendedStorageLocation: entry.recommendedStorageLocation,
    fields: entry.fields || entry,
  })
  const form = {
    ...normalized.fields,
    storageLocation: normalizeStorageLocation(normalized.fields.storageLocation),
  }
  const recommendedStorageLocation = normalizeStorageLocation(
    entry.recommendedStorageLocation || normalized.recommendedStorageLocation,
  )

  return {
    id: entry.id || `receipt-item-${index}`,
    checked: entry.checked !== false,
    source: 'receipt',
    confidence: normalized.confidence,
    rawText: normalized.rawText,
    recommendedStorageLocation,
    showLocationRecommend:
      !!recommendedStorageLocation &&
      recommendedStorageLocation !== form.storageLocation,
    form,
    categoryIndex: getOptionIndex(CATEGORY_OPTIONS, form.category),
    locationIndex: getOptionIndex(STORAGE_LOCATION_OPTIONS, form.storageLocation),
    unitIndex: getOptionIndex(UNIT_OPTIONS, form.unit),
  }
}

Page({
  data: {
    cacheKey: '',
    saving: false,
    sourceLabel: SOURCE_LABELS.receipt,
    rawText: '',
    items: [],
    selectedCount: 0,
    categoryOptions: CATEGORY_OPTIONS,
    locationOptions: STORAGE_LOCATION_OPTIONS,
    unitOptions: UNIT_OPTIONS,
  },

  onLoad(options) {
    const cacheKey = decodeOptionValue(options.cacheKey)
    const payload = parseService.readTempParsePayload(cacheKey) || {}
    const items = (payload.items || []).map(decorateBatchItem)

    this.setData({
      cacheKey,
      rawText: payload.rawText || '',
      items,
      selectedCount: getSelectedCount(items),
    })

    if (cacheKey && items.length === 0) {
      wx.showToast({
        title: '小票信息读取失败',
        icon: 'none',
      })
    }
  },

  setBatchItems(items) {
    this.setData({
      items,
      selectedCount: getSelectedCount(items),
    })
  },

  updateItem(index, updater) {
    const items = this.data.items.slice()
    const current = items[index]

    if (!current) {
      return
    }

    const nextItem = updater(current)
    const form = nextItem.form

    items[index] = {
      ...nextItem,
      categoryIndex: getOptionIndex(CATEGORY_OPTIONS, form.category),
      locationIndex: getOptionIndex(
        STORAGE_LOCATION_OPTIONS,
        form.storageLocation,
      ),
      unitIndex: getOptionIndex(UNIT_OPTIONS, form.unit),
      showLocationRecommend:
        !!nextItem.recommendedStorageLocation &&
        nextItem.recommendedStorageLocation !== form.storageLocation,
    }

    this.setBatchItems(items)
  },

  updateItemField(index, field, value) {
    this.updateItem(index, (item) => ({
      ...item,
      form: {
        ...item.form,
        [field]: value,
      },
    }))
  },

  handleToggleItem(event) {
    const index = Number(event.currentTarget.dataset.index)

    this.updateItem(index, (item) => ({
      ...item,
      checked: !item.checked,
    }))
  },

  handleInput(event) {
    const { field, index } = event.currentTarget.dataset

    this.updateItemField(Number(index), field, event.detail.value)
  },

  handleQuantityInput(event) {
    this.updateItemField(
      Number(event.currentTarget.dataset.index),
      'quantity',
      event.detail.value,
    )
  },

  handleCategoryChange(event) {
    const index = Number(event.currentTarget.dataset.index)
    const categoryIndex = Number(event.detail.value)

    this.updateItemField(index, 'category', this.data.categoryOptions[categoryIndex])
  },

  handleLocationChange(event) {
    const index = Number(event.currentTarget.dataset.index)
    const locationIndex = Number(event.detail.value)

    this.updateItemField(
      index,
      'storageLocation',
      this.data.locationOptions[locationIndex],
    )
  },

  handleUnitChange(event) {
    const index = Number(event.currentTarget.dataset.index)
    const unitIndex = Number(event.detail.value)

    this.updateItemField(index, 'unit', this.data.unitOptions[unitIndex])
  },

  handleExpireDateChange(event) {
    this.updateItemField(
      Number(event.currentTarget.dataset.index),
      'expireDate',
      event.detail.value,
    )
  },

  handleApplyRecommendedLocation(event) {
    const index = Number(event.currentTarget.dataset.index)
    const item = this.data.items[index]

    if (!item || !item.recommendedStorageLocation) {
      return
    }

    this.updateItemField(
      index,
      'storageLocation',
      item.recommendedStorageLocation,
    )
  },

  validateItems() {
    const selectedItems = this.data.items.filter((item) => item.checked)

    if (selectedItems.length === 0) {
      return '请至少选择一条食品'
    }

    for (let index = 0; index < selectedItems.length; index += 1) {
      const item = selectedItems[index]

      if (!String(item.form.name || '').trim()) {
        return `请填写第 ${index + 1} 条食品名称`
      }

      if (!item.form.expireDate) {
        return `请选择第 ${index + 1} 条过期日期`
      }
    }

    return ''
  },

  handleBatchSave() {
    const errorMessage = this.validateItems()

    if (errorMessage) {
      wx.showToast({
        title: errorMessage,
        icon: 'none',
      })
      return
    }

    const selectedItems = this.data.items.filter((item) => item.checked)

    this.setData({
      saving: true,
    })
    wx.showLoading({
      title: '保存中',
    })

    selectedItems
      .reduce((task, item) => {
        return task.then(() =>
          itemService.createItem({
            ...item.form,
            source: 'receipt',
            parseConfidence: item.confidence,
            parseRawText: item.rawText || this.data.rawText,
            parseStatus: 'manual_confirmed',
          }),
        )
      }, Promise.resolve())
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
