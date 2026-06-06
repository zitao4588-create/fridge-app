const itemService = require('../../services/itemService')
const parseService = require('../../services/parseService')
const zoneConfigService = require('../../services/zoneConfigService')
const {
  CATEGORY_OPTIONS,
  HOME_ZONE_DEFINITIONS,
} = require('../../utils/constants')
const { formatDate, getDaysUntil } = require('../../utils/date')
const { getExpiryStatus } = require('../../utils/status')
const { getIngredientVisual } = require('../../utils/visualAssets')
const { FEATURE_FLAGS } = require('../../utils/featureFlags')

function buildHomeMood(stats) {
  if (!stats || stats.total === 0) {
    return {
      mascot: '/images/mascot/fridge-empty.png',
      title: '冰箱还是空的',
      desc: '点下面分区的 ＋ 号，把食材加进来吧～',
    }
  }

  if (stats.overdue > 0) {
    return {
      mascot: '/images/mascot/fridge-happy.png',
      title: `有 ${stats.overdue} 样已经过期啦`,
      desc: '记得尽快处理，别影响其他食材～',
    }
  }

  if (stats.expiringSoon > 0) {
    return {
      mascot: '/images/mascot/fridge-happy.png',
      title: `有 ${stats.expiringSoon} 样快到期咯`,
      desc: '趁新鲜赶紧安排吃掉吧！',
    }
  }

  return {
    mascot: '/images/mascot/fridge-happy.png',
    title: '今天冰箱状态很好～',
    desc: '继续保持，别让食材浪费啦！',
  }
}

function getZoneDefinition(key) {
  return HOME_ZONE_DEFINITIONS.find((zone) => zone.key === key)
}

function safeVibrateShort() {
  if (typeof wx !== 'undefined' && wx.vibrateShort) {
    wx.vibrateShort({
      type: 'light',
    })
  }
}

function getZoneItems(items, zone) {
  const locations = zone.locations || [zone.location]

  return items.filter((item) => locations.includes(item.storageLocation))
}

function getExpiryTone(expireDate) {
  const days = getDaysUntil(expireDate)

  if (days < 0) {
    return {
      className: 'danger',
      label: '已过期',
    }
  }

  if (days <= 3) {
    return {
      className: 'warning',
      label: days === 0 ? '今天到期' : `${days}天内到期`,
    }
  }

  return {
    className: 'normal',
    label: '正常',
  }
}

function getFoodThumb(item) {
  return getIngredientVisual(item)
}

function buildZoneCategoryGroups(items) {
  const groups = items.reduce((result, item) => {
    const category = item.category || '其他'

    if (!result[category]) {
      result[category] = []
    }

    result[category].push(item)
    return result
  }, {})

  return Object.keys(groups)
    .sort((left, right) => {
      const leftIndex = CATEGORY_OPTIONS.indexOf(left)
      const rightIndex = CATEGORY_OPTIONS.indexOf(right)
      const safeLeftIndex = leftIndex >= 0 ? leftIndex : CATEGORY_OPTIONS.length
      const safeRightIndex = rightIndex >= 0 ? rightIndex : CATEGORY_OPTIONS.length

      if (safeLeftIndex !== safeRightIndex) {
        return safeLeftIndex - safeRightIndex
      }

      return left.localeCompare(right, 'zh-CN')
    })
    .map((category) => ({
      category,
      count: groups[category].length,
      items: groups[category],
    }))
}

function getFilteredZoneItems(items, filterType) {
  if (filterType === 'expiring') {
    return items.filter((item) => {
      const days = getDaysUntil(item.expireDate)
      return days >= 0 && days <= 3
    })
  }

  if (filterType === 'overdue') {
    return items.filter((item) => getDaysUntil(item.expireDate) < 0)
  }

  return items
}

function getZoneFilterLabel(filterType) {
  const labels = {
    total: '全部食品',
    expiring: '临期食品',
    overdue: '已过期食品',
  }

  return labels[filterType] || labels.total
}

function buildZonePanelData(zone, items, filterType = 'total') {
  const zoneItems = getZoneItems(items, zone)
  const selectedZoneItems = getFilteredZoneItems(zoneItems, filterType)

  return {
    selectedZoneFilter: filterType,
    selectedZoneFilterLabel: getZoneFilterLabel(filterType),
    selectedZone: {
      ...zone,
      itemCount: zoneItems.length,
    },
    selectedZoneItems,
    selectedZoneGroups: buildZoneCategoryGroups(selectedZoneItems),
  }
}

function buildZoneConfigDraft(configZones) {
  return zoneConfigService.sanitizeZones(configZones).map((zone) => {
    const definition = getZoneDefinition(zone.key)

    return {
      ...definition,
      enabled: zone.enabled !== false,
    }
  })
}

function getStatPanelItems(type, items) {
  if (type === 'expiring') {
    return items.filter((item) => {
      const days = getDaysUntil(item.expireDate)
      return days >= 0 && days <= 3
    })
  }

  if (type === 'overdue') {
    return items.filter((item) => getDaysUntil(item.expireDate) < 0)
  }

  return items
}

function buildStatPanelData(type, items) {
  const statPanelItems = getStatPanelItems(type, items)
  const panelConfig = {
    total: {
      title: '全部食品',
      subtitle: '全部库存',
      emptyTitle: '冰箱还是空的',
      emptyDesc: '点击冰箱图片分区，再从分区清单添加食品。',
    },
    expiring: {
      title: '临期食品',
      subtitle: '3天内到期',
      emptyTitle: '暂无临期食品',
      emptyDesc: '3天内没有需要优先处理的食品。',
    },
    overdue: {
      title: '已过期食品',
      subtitle: '已经超过到期日',
      emptyTitle: '暂无已过期食品',
      emptyDesc: '目前没有已经过期的食品。',
    },
  }
  const config = panelConfig[type] || panelConfig.total

  return {
    selectedStatType: type,
    statPanelTitle: config.title,
    statPanelSubtitle: `${config.subtitle} · ${statPanelItems.length} 项食品`,
    statPanelItems,
    statPanelEmptyTitle: config.emptyTitle,
    statPanelEmptyDesc: config.emptyDesc,
  }
}

function buildSearchPanelData(keyword, items) {
  const normalizedKeyword = String(keyword || '').trim().toLowerCase()
  const statPanelItems = normalizedKeyword
    ? items.filter((item) =>
        String(item.name || '').toLowerCase().includes(normalizedKeyword),
      )
    : []

  return {
    selectedStatType: 'search',
    statPanelTitle: '搜索结果',
    statPanelSubtitle:
      `关键词：${String(keyword || '').trim()} · ${statPanelItems.length} 项食品`,
    statPanelItems,
    statPanelEmptyTitle: '没有找到相关食品',
    statPanelEmptyDesc: '换个食品名称试试。',
  }
}

function buildHomeZones(items, configZones) {
  return buildZoneConfigDraft(configZones)
    .filter((zone) => zone.enabled)
    .map((zone) => {
      const zoneItems = getZoneItems(items, zone)
      const expiringSoon = zoneItems.filter((item) => {
        const days = getDaysUntil(item.expireDate)
        return days >= 0 && days <= 3
      }).length
      const overdue = zoneItems.filter(
        (item) => getDaysUntil(item.expireDate) < 0,
      ).length
      const alertText = overdue
        ? `${overdue} 已过期`
        : expiringSoon
          ? `${expiringSoon} 临期`
          : '状态正常'
      const alertClass = overdue
        ? 'danger'
        : expiringSoon
          ? 'warning'
          : 'normal'

      return {
        ...zone,
        itemCount: zoneItems.length,
        expiringSoon,
        overdue,
        items: zoneItems,
        alertText,
        alertClass,
      }
    })
}

Page({
  data: {
    loading: false,
    photoParseEnabled: FEATURE_FLAGS.photoParse,
    homeMood: buildHomeMood(null),
    zoneConfigLoaded: false,
    zoneConfigId: '',
    zoneConfigDraft: buildZoneConfigDraft([]),
    zoneConfigPanelVisible: false,
    zoneConfigDraggingIndex: -1,
    zoneConfigSaving: false,
    allItems: [],
    homeZones: buildHomeZones([], []),
    stats: {
      total: 0,
      expiringSoon: 0,
      overdue: 0,
    },
    noticeMessage: '',
    searchKeyword: '',
    zonePanelVisible: false,
    selectedZone: null,
    selectedZoneFilter: 'total',
    selectedZoneFilterLabel: '全部食品',
    selectedZoneItems: [],
    selectedZoneGroups: [],
    statPanelVisible: false,
    selectedStatType: 'total',
    statPanelTitle: '',
    statPanelSubtitle: '',
    statPanelItems: [],
    statPanelEmptyTitle: '',
    statPanelEmptyDesc: '',
    zoneAddPanelVisible: false,
    selectedAddZone: null,
    foodDetailVisible: false,
    selectedFood: null,
  },

  onShow() {
    if (!this.data.zoneConfigLoaded) {
      this.loadZoneConfig().finally(() => {
        this.loadItems()
      })
      return
    }

    this.loadItems()
  },

  onUnload() {
    if (this.noticeTimer) {
      clearTimeout(this.noticeTimer)
    }
  },

  onPullDownRefresh() {
    this.loadItems({ forceRefresh: true }).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  loadZoneConfig() {
    return zoneConfigService.getZoneConfig().then((config) => {
      const zoneConfigDraft = buildZoneConfigDraft(config.zones)

      this.setData({
        zoneConfigLoaded: true,
        zoneConfigId: config._id || '',
        zoneConfigDraft,
        zoneConfigPanelVisible: !config.hasSavedConfig,
        homeZones: buildHomeZones(this.data.allItems, zoneConfigDraft),
      })
    })
  },

  loadItems(options = {}) {
    this.setData({
      loading: true,
    })

    return itemService
      .getItems(options)
      .then((items) => {
        const decoratedItems = items.map((item) => this.decorateItem(item))
        const stats = this.buildStats(decoratedItems)
        const homeZones = buildHomeZones(
          decoratedItems,
          this.data.zoneConfigDraft,
        )
        const selectedZone = this.data.selectedZone
          ? homeZones.find((zone) => zone.key === this.data.selectedZone.key)
          : null
        const zonePanelData = selectedZone
          ? buildZonePanelData(
              selectedZone,
              decoratedItems,
              this.data.selectedZoneFilter,
            )
          : {}
        const statPanelData = this.data.statPanelVisible
          ? this.data.selectedStatType === 'search'
            ? buildSearchPanelData(this.data.searchKeyword, decoratedItems)
            : buildStatPanelData(this.data.selectedStatType, decoratedItems)
          : {}

        this.setData({
          allItems: decoratedItems,
          stats,
          homeMood: buildHomeMood(stats),
          homeZones,
          loading: false,
          ...zonePanelData,
          ...statPanelData,
        })
      })
      .catch(() => {
        this.setData({
          loading: false,
        })
        wx.showToast({
          title: '读取失败',
          icon: 'none',
        })
      })
  },

  decorateItem(item) {
    const status = getExpiryStatus(item.expireDate)
    const tone = getExpiryTone(item.expireDate)
    const thumb = getFoodThumb(item)

    return {
      ...item,
      amountText: `${item.quantity || 1}${item.unit || '份'}`,
      expireDateText: formatDate(item.expireDate),
      statusKey: status.key,
      statusLabel: status.label,
      statusHint: status.hint,
      statusClass: status.className,
      visualStatusLabel: tone.label,
      visualStatusClass: tone.className,
      thumbType: thumb.type,
      thumbImage: thumb.image,
      thumbClass: thumb.className,
      categoryIcon:
        thumb.image || getIngredientVisual({ category: '其他' }).image,
    }
  },

  buildStats(items) {
    return {
      total: items.length,
      expiringSoon: items.filter((item) => {
        const days = getDaysUntil(item.expireDate)
        return days >= 0 && days <= 3
      }).length,
      overdue: items.filter((item) => getDaysUntil(item.expireDate) < 0).length,
    }
  },

  handleZoneView(event) {
    const { key } = event.currentTarget.dataset
    const zone = this.data.homeZones.find((item) => item.key === key)

    if (!zone) {
      return
    }

    this.openZoneAddPanel(zone)
  },

  handleZoneStatTap(event) {
    const { key, filter } = event.currentTarget.dataset
    const zone = this.data.homeZones.find((item) => item.key === key)

    if (!zone) {
      return
    }

    this.setData({
      zonePanelVisible: true,
      zoneAddPanelVisible: false,
      statPanelVisible: false,
      ...buildZonePanelData(zone, this.data.allItems, filter || 'total'),
    })
  },

  handleCloseZonePanel() {
    this.setData({
      zonePanelVisible: false,
    })
  },

  handlePanelTap() {
    return true
  },

  handleZoneFilterTap(event) {
    const { filter } = event.currentTarget.dataset

    if (!this.data.selectedZone) {
      return
    }

    this.setData({
      ...buildZonePanelData(
        this.data.selectedZone,
        this.data.allItems,
        filter || 'total',
      ),
    })
  },

  handleStatsTap(event) {
    const { type } = event.currentTarget.dataset

    this.setData({
      statPanelVisible: true,
      zonePanelVisible: false,
      zoneAddPanelVisible: false,
      ...buildStatPanelData(type || 'total', this.data.allItems),
    })
  },

  handleCloseStatPanel() {
    this.setData({
      statPanelVisible: false,
    })
  },

  handleStatPanelTap() {
    return true
  },

  handleSearchInput(event) {
    this.setData({
      searchKeyword: event.detail.value,
    })
  },

  handleSearchConfirm() {
    const keyword = String(this.data.searchKeyword || '').trim()

    if (!keyword) {
      wx.showToast({
        title: '请输入食品名称',
        icon: 'none',
      })
      return
    }

    this.setData({
      statPanelVisible: true,
      zonePanelVisible: false,
      zoneAddPanelVisible: false,
      searchKeyword: keyword,
      ...buildSearchPanelData(keyword, this.data.allItems),
    })
  },

  handleSmartAdd() {
    wx.navigateTo({
      url: '/pages/quick-add/quick-add',
    })
  },

  handleOpenProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile',
    })
  },

  handleKnownHint() {
    this.showNotice('点分区右上角的加号，就能添加到指定位置')
  },

  handleOpenZoneConfig() {
    this.setData({
      zoneConfigPanelVisible: true,
    })
  },

  handleCloseZoneConfig() {
    if (!this.data.zoneConfigId) {
      this.showNotice('请先保存一次分区配置')
      return
    }

    this.setData({
      zoneConfigPanelVisible: false,
      zoneConfigDraggingIndex: -1,
    })
    this.zoneConfigDragState = null
  },

  handleShowZoneConfig(event) {
    const index = Number(event.currentTarget.dataset.index)
    const zoneConfigDraft = this.data.zoneConfigDraft.map((zone, zoneIndex) =>
      zoneIndex === index
        ? {
            ...zone,
            enabled: true,
          }
        : zone,
    )

    this.setData({
      zoneConfigDraft,
    })
  },

  handleDeleteZoneConfig(event) {
    const index = Number(event.currentTarget.dataset.index)
    const targetZone = this.data.zoneConfigDraft[index]

    if (!targetZone || !targetZone.enabled) {
      return
    }

    const enabledCount = this.data.zoneConfigDraft.filter(
      (zone) => zone.enabled,
    ).length

    if (enabledCount <= 1) {
      wx.showToast({
        title: '至少保留一个分区',
        icon: 'none',
      })
      return
    }

    const zoneConfigDraft = this.data.zoneConfigDraft.map((zone, zoneIndex) =>
      zoneIndex === index
        ? {
            ...zone,
            enabled: false,
          }
        : zone,
    )

    this.setData({
      zoneConfigDraft,
    })
  },

  handleZoneConfigDragStart(event) {
    const index = Number(event.currentTarget.dataset.index)
    const touch = event.touches && event.touches[0]

    if (
      !touch ||
      event.touches.length !== 1 ||
      index < 0 ||
      index >= this.data.zoneConfigDraft.length
    ) {
      return
    }

    this.zoneConfigDragState = {
      index,
      startIndex: index,
      startY: touch.clientY,
      rowStep: 62,
    }

    this.setData({
      zoneConfigDraggingIndex: index,
    })
    safeVibrateShort()
  },

  handleZoneConfigDragMove(event) {
    const dragState = this.zoneConfigDragState
    const touch = event.touches && event.touches[0]

    if (!dragState || !touch) {
      return
    }

    const offset = Math.round((touch.clientY - dragState.startY) / dragState.rowStep)
    const targetIndex = Math.max(
      0,
      Math.min(
        this.data.zoneConfigDraft.length - 1,
        dragState.startIndex + offset,
      ),
    )
    const zoneConfigDraft = this.data.zoneConfigDraft.slice()

    if (targetIndex === dragState.index) {
      return
    }

    const current = zoneConfigDraft.splice(dragState.index, 1)[0]

    zoneConfigDraft.splice(targetIndex, 0, current)

    dragState.index = targetIndex

    this.setData({
      zoneConfigDraft,
      zoneConfigDraggingIndex: targetIndex,
    })
    safeVibrateShort()
  },

  handleZoneConfigDragEnd() {
    this.zoneConfigDragState = null
    this.setData({
      zoneConfigDraggingIndex: -1,
    })
  },

  handleSaveZoneConfig() {
    if (this.data.zoneConfigSaving) {
      return
    }

    const enabledCount = this.data.zoneConfigDraft.filter(
      (zone) => zone.enabled,
    ).length

    if (enabledCount === 0) {
      wx.showToast({
        title: '至少保留一个分区',
        icon: 'none',
      })
      return
    }

    this.setData({
      zoneConfigSaving: true,
    })

    zoneConfigService
      .saveZoneConfig({
        _id: this.data.zoneConfigId,
        zones: this.data.zoneConfigDraft,
      })
      .then((config) => {
        const zoneConfigDraft = buildZoneConfigDraft(config.zones)

        this.setData({
          zoneConfigId: config._id,
          zoneConfigDraft,
          zoneConfigPanelVisible: false,
          zoneConfigSaving: false,
          homeZones: buildHomeZones(this.data.allItems, zoneConfigDraft),
        })
      })
      .catch(() => {
        this.setData({
          zoneConfigSaving: false,
        })
        wx.showToast({
          title: '保存失败，请检查云集合',
          icon: 'none',
        })
      })
  },

  openZoneAddPanel(zone) {
    this.setData({
      selectedAddZone: zone,
      zoneAddPanelVisible: true,
      zonePanelVisible: false,
      statPanelVisible: false,
    })
  },

  handleCloseZoneAddPanel() {
    this.setData({
      zoneAddPanelVisible: false,
    })
  },

  navigateToSingleConfirm(result) {
    const cacheKey = parseService.saveTempParsePayload(result, 'single')

    wx.navigateTo({
      url: `/pages/parse-confirm/parse-confirm?cacheKey=${encodeURIComponent(
        cacheKey,
      )}`,
    })
  },

  runZoneParseTask(task) {
    let loadingVisible = false
    const showRecognizing = () => {
      if (loadingVisible) {
        return
      }

      loadingVisible = true
      wx.showLoading({
        title: '识别中',
        mask: true,
      })
    }

    task(showRecognizing)
      .then((result) => {
        if (loadingVisible) {
          wx.hideLoading()
        }

        this.setData({
          zonePanelVisible: false,
          zoneAddPanelVisible: false,
        })
        this.navigateToSingleConfirm(result)
      })
      .catch((error) => {
        if (loadingVisible) {
          wx.hideLoading()
        }

        if (parseService.isCancelError(error)) {
          return
        }

        wx.showToast({
          title: '识别失败',
          icon: 'none',
        })
      })
  },

  handleZoneAdd(event) {
    const { location } = event.currentTarget.dataset

    this.setData({
      zonePanelVisible: false,
      zoneAddPanelVisible: false,
    })

    wx.navigateTo({
      url: `/pages/item-form/item-form?storageLocation=${encodeURIComponent(
        location,
      )}`,
    })
  },

  handleZonePhotoAdd(event) {
    const { location } = event.currentTarget.dataset

    this.runZoneParseTask((showRecognizing) =>
      parseService.parseFoodPhoto({
        preferredStorageLocation: location,
        onProcessingStart: showRecognizing,
      }),
    )
  },

  handleZonePackageAdd(event) {
    const { location } = event.currentTarget.dataset

    this.runZoneParseTask((showRecognizing) =>
      parseService.parsePackagePhoto({
        preferredStorageLocation: location,
        onProcessingStart: showRecognizing,
      }),
    )
  },

  handleZoneItemEdit(event) {
    const { id } = event.currentTarget.dataset

    this.setData({
      zonePanelVisible: false,
    })

    wx.navigateTo({
      url: `/pages/item-form/item-form?id=${id}`,
    })
  },

  handleFoodImageTap(event) {
    const { id } = event.currentTarget.dataset
    const selectedFood = this.data.allItems.find((item) => item._id === id)

    if (!selectedFood) {
      return
    }

    this.setData({
      selectedFood,
      foodDetailVisible: true,
    })
  },

  handleCloseFoodDetail() {
    this.setData({
      foodDetailVisible: false,
      selectedFood: null,
    })
  },

  handleFoodDetailEdit() {
    const food = this.data.selectedFood

    if (!food) {
      return
    }

    this.setData({
      foodDetailVisible: false,
      selectedFood: null,
    })

    wx.navigateTo({
      url: `/pages/item-form/item-form?id=${food._id}`,
    })
  },

  showNotice(message) {
    if (this.noticeTimer) {
      clearTimeout(this.noticeTimer)
    }

    this.setData({
      noticeMessage: message,
    })

    this.noticeTimer = setTimeout(() => {
      this.setData({
        noticeMessage: '',
      })
    }, 2600)
  },

  handleStatItemEdit(event) {
    const { id } = event.currentTarget.dataset

    this.setData({
      statPanelVisible: false,
    })

    wx.navigateTo({
      url: `/pages/item-form/item-form?id=${id}`,
    })
  },

  handleDelete(event) {
    const { id, name } = event.currentTarget.dataset

    this.confirmDeleteFood(id, name)
  },

  handleFoodDetailDelete() {
    const food = this.data.selectedFood

    if (!food) {
      return
    }

    this.confirmDeleteFood(food._id, food.name)
  },

  confirmDeleteFood(id, name) {
    wx.showModal({
      title: '确认删除',
      content: `确定删除「${name}」吗？`,
      confirmText: '删除',
      confirmColor: '#d95d55',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        wx.showLoading({
          title: '删除中',
        })

        itemService
          .deleteItem(id)
          .then(() => {
            wx.hideLoading()
            this.showNotice(`已删除「${name}」`)
            this.setData({
              foodDetailVisible: false,
              selectedFood: null,
            })
            this.loadItems()
          })
          .catch(() => {
            wx.hideLoading()
            wx.showToast({
              title: '删除失败',
              icon: 'none',
            })
          })
      },
    })
  },
})
