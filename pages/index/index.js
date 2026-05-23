const itemService = require('../../services/itemService')
const {
  CATEGORY_OPTIONS,
  DEFAULT_FRIDGE_LAYOUT_KEY,
  FRIDGE_LAYOUTS,
} = require('../../utils/constants')
const { formatDate, getDaysUntil } = require('../../utils/date')
const { getExpiryStatus } = require('../../utils/status')

const SELECTED_FRIDGE_LAYOUT_STORAGE_KEY = 'selectedFridgeLayoutKey'

function getFridgeLayoutIndex(layoutKey) {
  const index = FRIDGE_LAYOUTS.findIndex((layout) => layout.key === layoutKey)

  return index >= 0 ? index : 0
}

function getSelectedFridgeLayout() {
  const savedLayoutKey =
    wx.getStorageSync(SELECTED_FRIDGE_LAYOUT_STORAGE_KEY) ||
    DEFAULT_FRIDGE_LAYOUT_KEY
  const currentLayoutIndex = getFridgeLayoutIndex(savedLayoutKey)

  return FRIDGE_LAYOUTS[currentLayoutIndex]
}

function getHotAreaStyle(hotArea) {
  return [
    `left:${hotArea.left}%`,
    `top:${hotArea.top}%`,
    `width:${hotArea.width}%`,
    `height:${hotArea.height}%`,
  ].join(';')
}

function getMarkerStyle(zone) {
  const shouldKeepCustomPoint = zone.location === '门架' && zone.markerPoint
  const markerPoint = shouldKeepCustomPoint
    ? zone.markerPoint
    : {
        left: zone.hotArea.left + zone.hotArea.width / 2,
        top: zone.hotArea.top + zone.hotArea.height / 2,
      }

  return [`left:${markerPoint.left}%`, `top:${markerPoint.top}%`].join(';')
}

function getZoneItems(items, zone) {
  const locations = zone.locations || [zone.location]

  return items.filter((item) => locations.includes(item.storageLocation))
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
    statPanelSubtitle: `关键词：${String(keyword || '').trim()} · ${statPanelItems.length} 项食品`,
    statPanelItems,
    statPanelEmptyTitle: '没有找到相关食品',
    statPanelEmptyDesc: '换个食品名称试试。',
  }
}

function buildFridgeZones(items, layout) {
  return layout.zones.map((zone) => {
    const zoneItems = getZoneItems(items, zone)
    const previewItems = zoneItems.slice(0, 4).map((item, index) => ({
      id: item._id || `${zone.key}-${index}`,
      name: item.name,
      amountText: item.amountText || `${item.quantity || 1}${item.unit || '份'}`,
    }))
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
    const alertClass = overdue ? 'danger' : expiringSoon ? 'warning' : 'normal'

    return {
      ...zone,
      hotAreaStyle: getHotAreaStyle(zone.hotArea),
      markerStyle: getMarkerStyle(zone),
      showMarker: true,
      itemCount: zoneItems.length,
      expiringSoon,
      overdue,
      previewItems,
      alertText,
      alertClass,
    }
  })
}

Page({
  data: {
    loading: false,
    allItems: [],
    fridgeLayout: FRIDGE_LAYOUTS[getFridgeLayoutIndex(DEFAULT_FRIDGE_LAYOUT_KEY)],
    fridgeZones: buildFridgeZones(
      [],
      FRIDGE_LAYOUTS[getFridgeLayoutIndex(DEFAULT_FRIDGE_LAYOUT_KEY)],
    ),
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
  },

  onLoad() {
    this.syncFridgeLayout()
  },

  onShow() {
    this.syncFridgeLayout()
    this.loadItems()
  },

  onUnload() {
    if (this.noticeTimer) {
      clearTimeout(this.noticeTimer)
    }
  },

  onPullDownRefresh() {
    this.loadItems().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  loadItems() {
    this.setData({
      loading: true,
    })

    return itemService
      .getItems()
      .then((items) => {
        const decoratedItems = items.map((item) => this.decorateItem(item))
        const stats = this.buildStats(decoratedItems)
        const fridgeZones = buildFridgeZones(
          decoratedItems,
          this.data.fridgeLayout,
        )
        const selectedZone = this.data.selectedZone
          ? fridgeZones.find((zone) => zone.key === this.data.selectedZone.key)
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
          fridgeZones,
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

  syncFridgeLayout() {
    const fridgeLayout = getSelectedFridgeLayout()

    if (this.data.fridgeLayout.key === fridgeLayout.key) {
      return
    }

    this.setData({
      fridgeLayout,
      fridgeZones: buildFridgeZones(this.data.allItems, fridgeLayout),
      zonePanelVisible: false,
      selectedZone: null,
      selectedZoneFilter: 'total',
      selectedZoneFilterLabel: '全部食品',
      selectedZoneItems: [],
      selectedZoneGroups: [],
    })
  },

  decorateItem(item) {
    const status = getExpiryStatus(item.expireDate)

    return {
      ...item,
      amountText: `${item.quantity || 1}${item.unit || '份'}`,
      expireDateText: formatDate(item.expireDate),
      statusKey: status.key,
      statusLabel: status.label,
      statusHint: status.hint,
      statusClass: status.className,
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
    const zone = this.data.fridgeZones.find((item) => item.key === key)

    if (!zone) {
      return
    }

    this.setData({
      zonePanelVisible: true,
      statPanelVisible: false,
      ...buildZonePanelData(zone, this.data.allItems, 'total'),
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
      searchKeyword: keyword,
      ...buildSearchPanelData(keyword, this.data.allItems),
    })
  },

  handleZoneAdd(event) {
    const { location } = event.currentTarget.dataset

    this.setData({
      zonePanelVisible: false,
    })

    wx.navigateTo({
      url: `/pages/item-form/item-form?storageLocation=${encodeURIComponent(
        location,
      )}`,
    })
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

    wx.showModal({
      title: '确认删除',
      content: `确定删除「${name}」吗？`,
      confirmText: '删除',
      confirmColor: '#be123c',
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
