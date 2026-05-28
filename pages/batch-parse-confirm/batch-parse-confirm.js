const itemService = require('../../services/itemService')
const parseService = require('../../services/parseService')
const zoneConfigService = require('../../services/zoneConfigService')
const {
  CATEGORY_OPTIONS,
  normalizeStorageLocation,
  SOURCE_LABELS,
  STORAGE_LOCATION_OPTIONS,
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

function getSupportedStorageLocation(location, options) {
  const storageLocation = normalizeStorageLocation(location)

  return options.includes(storageLocation) ? storageLocation : options[0] || '冷藏'
}

function getSelectedCount(items) {
  return items.filter((item) => item.checked).length
}

function decorateBatchItem(entry, index, locationOptions = STORAGE_LOCATION_OPTIONS) {
  const normalized = parseService.normalizeParseResult({
    source: 'receipt',
    confidence: entry.confidence,
    rawText: entry.rawText,
    recommendedStorageLocation: entry.recommendedStorageLocation,
    providerStatus: entry.providerStatus,
    fallbackReason: entry.fallbackReason,
    fields: entry.fields || entry.form || entry,
  })
  const form = {
    ...normalized.fields,
    storageLocation: getSupportedStorageLocation(
      normalized.fields.storageLocation,
      locationOptions,
    ),
  }
  const recommendedStorageLocation = getSupportedStorageLocation(
    entry.recommendedStorageLocation || normalized.recommendedStorageLocation,
    locationOptions,
  )

  return {
    id: entry.id || `receipt-item-${index}`,
    checked: entry.checked !== false,
    source: 'receipt',
    confidence: normalized.confidence,
    rawText: normalized.rawText,
    providerStatus: normalized.providerStatus,
    fallbackReason: normalized.fallbackReason,
    recommendedStorageLocation,
    showLocationRecommend:
      !!recommendedStorageLocation &&
      recommendedStorageLocation !== form.storageLocation,
    form,
    categoryIndex: getOptionIndex(CATEGORY_OPTIONS, form.category),
    locationIndex: getOptionIndex(locationOptions, form.storageLocation),
  }
}

function createManualBatchItem(index, locationOptions) {
  return decorateBatchItem(
    {
      id: `manual-receipt-${Date.now()}-${index}`,
      checked: true,
      providerStatus: 'manual',
      confidence: 1,
      rawText: '手动补充',
      fields: {
        name: '',
        category: '其他',
        quantity: 1,
        unit: '份',
        productionDate: '',
        shelfLifeDays: '',
        expireDate: '',
        storageLocation: locationOptions[0] || '冷藏',
        note: '',
      },
    },
    index,
    locationOptions,
  )
}

function buildBatchRecognitionAlert(payload = {}, items = []) {
  const firstFallbackItem = items.find(
    (item) => item.providerStatus === 'mock' || item.fallbackReason,
  )
  const firstRealItem = items.find((item) => item.providerStatus === 'real')
  const providerStatus =
    payload.providerStatus ||
    (firstFallbackItem && firstFallbackItem.providerStatus) ||
    (firstRealItem && firstRealItem.providerStatus) ||
    ''
  const fallbackReason = parseService.formatFallbackReason(
    payload.fallbackReason ||
      (firstFallbackItem && firstFallbackItem.fallbackReason) ||
      '',
  )

  if (providerStatus === 'real' && !fallbackReason) {
    return {
      recognitionAlertType: 'real',
      recognitionAlertTitle: '已使用真实小票识别',
      recognitionAlertDesc:
        '已调用云端 OCR / AI 识别。小票和包装日期仍需要逐条核对后再保存。',
    }
  }

  if (providerStatus === 'mock' || fallbackReason) {
    return {
      recognitionAlertType: 'fallback',
      recognitionAlertTitle: '已使用备用小票识别',
      recognitionAlertDesc: fallbackReason
        ? `${fallbackReason}。请按购物小票和包装信息核对。`
        : '真实识别暂不可用，已使用预填结果。请按购物小票和包装信息核对。',
    }
  }

  return {
    recognitionAlertType: 'unknown',
    recognitionAlertTitle: '小票识别状态待确认',
    recognitionAlertDesc:
      '云端没有返回识别来源，请逐条核对名称、日期和分区后保存。',
  }
}

Page({
  data: {
    cacheKey: '',
    saving: false,
    sourceLabel: SOURCE_LABELS.receipt,
    rawText: '',
    recognitionAlertType: '',
    recognitionAlertTitle: '',
    recognitionAlertDesc: '',
    items: [],
    selectedCount: 0,
    categoryOptions: CATEGORY_OPTIONS,
    locationOptions: STORAGE_LOCATION_OPTIONS,
  },

  onLoad(options) {
    const cacheKey = decodeOptionValue(options.cacheKey)
    const payload = parseService.readTempParsePayload(cacheKey) || {}
    const items = (payload.items || []).map(decorateBatchItem)
    const recognitionAlert = buildBatchRecognitionAlert(payload, items)

    this.setData({
      cacheKey,
      rawText: payload.rawText || '',
      ...recognitionAlert,
      items,
      selectedCount: getSelectedCount(items),
    })

    if (cacheKey && items.length === 0) {
      wx.showToast({
        title: '小票信息读取失败',
        icon: 'none',
      })
    }

    this.loadLocationOptions()
  },

  loadLocationOptions() {
    return zoneConfigService.getZoneConfig().then((config) => {
      const locationOptions = zoneConfigService.getEnabledStorageLocationOptions(
        config.zones,
      )
      const items = this.data.items.map((item, index) =>
        decorateBatchItem(item, index, locationOptions),
      )

      this.setData({
        locationOptions,
        items,
        selectedCount: getSelectedCount(items),
      })
    })
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
        this.data.locationOptions,
        form.storageLocation,
      ),
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

  handleAddManualItem() {
    const items = this.data.items.concat(
      createManualBatchItem(this.data.items.length, this.data.locationOptions),
    )

    this.setBatchItems(items)
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
