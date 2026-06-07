const itemService = require('../../services/itemService')
const zoneConfigService = require('../../services/zoneConfigService')
const { CATEGORY_OPTIONS, HOME_ZONE_DEFINITIONS } = require('../../utils/constants')
const { formatDate, getDaysUntil } = require('../../utils/date')
const { getExpiryStatus } = require('../../utils/status')
const { getIngredientVisual } = require('../../utils/visualAssets')

const ITEM_FORM_URL = '/pkg-add/item-form/item-form'

function getZoneDefinition(key) {
  return HOME_ZONE_DEFINITIONS.find((zone) => zone.key === key)
}

function bucketOf(expireDate) {
  const days = getDaysUntil(expireDate)

  if (days < 0) return 'overdue'
  if (days <= 3) return 'expiring'
  return 'normal'
}

function decorateItem(item) {
  const status = getExpiryStatus(item.expireDate)
  const thumb = getIngredientVisual(item)

  return {
    ...item,
    amountText: `${item.quantity || 1}${item.unit || '份'}`,
    expireDateText: formatDate(item.expireDate),
    statusLabel: status.label,
    statusHint: status.hint,
    statusClass: status.className,
    bucket: bucketOf(item.expireDate),
    thumbImage: thumb.image,
    thumbType: thumb.type,
  }
}

function buildStats(items) {
  return {
    total: items.length,
    expiring: items.filter((item) => item.bucket === 'expiring').length,
    overdue: items.filter((item) => item.bucket === 'overdue').length,
  }
}

function buildMood(stats) {
  if (!stats || !stats.total) {
    return {
      mascot: '/images/mascot/fridge-empty.png',
      title: '冰箱还是空的',
      desc: '点分区右上角的 ＋ 号，把食材加进来吧～',
    }
  }
  if (stats.overdue > 0) {
    return {
      mascot: '/images/mascot/fridge-happy.png',
      title: `有 ${stats.overdue} 样已经过期啦`,
      desc: '记得尽快处理，别影响其他食材～',
    }
  }
  if (stats.expiring > 0) {
    return {
      mascot: '/images/mascot/fridge-happy.png',
      title: `有 ${stats.expiring} 样快到期咯`,
      desc: '趁新鲜赶紧安排吃掉吧！',
    }
  }
  return {
    mascot: '/images/mascot/fridge-happy.png',
    title: '今天冰箱状态很好～',
    desc: '继续保持，别让食材浪费啦！',
  }
}

function getZoneItems(items, zone) {
  const locations = zone.locations || [zone.location]

  return items.filter((item) => locations.includes(item.storageLocation))
}

function buildZoneConfigDraft(zones) {
  return zoneConfigService.sanitizeZones(zones).map((zone) => ({
    ...getZoneDefinition(zone.key),
    enabled: zone.enabled !== false,
  }))
}

function buildHomeZones(items, draft) {
  return draft
    .filter((zone) => zone.enabled)
    .map((zone) => {
      const zoneItems = getZoneItems(items, zone)
      const expiring = zoneItems.filter((item) => item.bucket === 'expiring').length
      const overdue = zoneItems.filter((item) => item.bucket === 'overdue').length

      return {
        ...zone,
        itemCount: zoneItems.length,
        expiring,
        overdue,
        alertClass: overdue ? 'danger' : expiring ? 'warning' : 'normal',
        alertText: overdue
          ? `${overdue} 已过期`
          : expiring
            ? `${expiring} 临期`
            : '状态正常',
        items: zoneItems,
      }
    })
}

function groupByCategory(items) {
  const groups = items.reduce((acc, item) => {
    const category = item.category || '其他'
    ;(acc[category] = acc[category] || []).push(item)
    return acc
  }, {})

  return Object.keys(groups)
    .sort((left, right) => {
      const leftIndex = CATEGORY_OPTIONS.indexOf(left)
      const rightIndex = CATEGORY_OPTIONS.indexOf(right)
      return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex)
    })
    .map((category) => ({ category, items: groups[category] }))
}

function filterByContext(items, context) {
  if (!context) return items

  if (context.kind === 'search') {
    const keyword = String(context.keyword || '').trim().toLowerCase()
    return items.filter((item) =>
      String(item.name || '').toLowerCase().includes(keyword),
    )
  }

  let pool = items
  if (context.zoneKey) {
    const zone = getZoneDefinition(context.zoneKey)
    if (zone) pool = getZoneItems(items, zone)
  }
  if (context.filter === 'expiring') {
    return pool.filter((item) => item.bucket === 'expiring')
  }
  if (context.filter === 'overdue') {
    return pool.filter((item) => item.bucket === 'overdue')
  }
  return pool
}

Page({
  data: {
    loading: false,
    homeMood: buildMood(null),
    stats: { total: 0, expiring: 0, overdue: 0 },
    allItems: [],
    homeZones: [],
    noticeMessage: '',
    searchKeyword: '',

    // 通用列表面板（合并：分区清单 / 统计清单 / 搜索结果）
    listPanelVisible: false,
    listPanelTitle: '',
    listPanelSubtitle: '',
    listPanelGroups: [],
    listPanelEmpty: '',

    // 食品详情
    foodDetailVisible: false,
    selectedFood: null,

    // 分区管理
    zoneConfigLoaded: false,
    zoneConfigId: '',
    zoneConfigDraft: [],
    zoneConfigVisible: false,
    zoneConfigSaving: false,

    // 设置 / 隐私
    settingsVisible: false,
  },

  onShow() {
    if (!this.data.zoneConfigLoaded) {
      this.loadZoneConfig().finally(() => this.loadItems())
      return
    }
    this.loadItems()
  },

  onUnload() {
    if (this.noticeTimer) clearTimeout(this.noticeTimer)
  },

  onPullDownRefresh() {
    this.loadItems().finally(() => wx.stopPullDownRefresh())
  },

  loadZoneConfig() {
    return zoneConfigService.getZoneConfig().then((config) => {
      this.setData({
        zoneConfigLoaded: true,
        zoneConfigId: config._id || '',
        zoneConfigDraft: buildZoneConfigDraft(config.zones),
        zoneConfigVisible: !config.hasSavedConfig,
      })
    })
  },

  loadItems() {
    this.setData({ loading: true })

    return itemService
      .getItems()
      .then((items) => {
        const allItems = items.map(decorateItem)
        const stats = buildStats(allItems)
        const homeZones = buildHomeZones(allItems, this.data.zoneConfigDraft)
        const patch = {
          allItems,
          stats,
          homeMood: buildMood(stats),
          homeZones,
          loading: false,
        }

        if (this.data.listPanelVisible && this.panelContext) {
          Object.assign(patch, this.buildListPanel(this.panelContext, allItems))
        }

        this.setData(patch)
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '读取失败', icon: 'none' })
      })
  },

  buildListPanel(context, items) {
    const matched = filterByContext(items || this.data.allItems, context)

    return {
      listPanelVisible: true,
      listPanelTitle: context.title,
      listPanelSubtitle: `${context.subtitle} · ${matched.length} 项`,
      listPanelGroups: groupByCategory(matched),
      listPanelEmpty: matched.length ? '' : context.emptyText || '这里暂时没有食材',
    }
  },

  openListPanel(context) {
    this.panelContext = context
    this.setData(this.buildListPanel(context, this.data.allItems))
  },

  handleCloseListPanel() {
    this.panelContext = null
    this.setData({ listPanelVisible: false })
  },

  noop() {},

  // ---- 分区交互 ----
  handleZoneAdd(event) {
    const location = event.currentTarget.dataset.location
    wx.navigateTo({
      url: `${ITEM_FORM_URL}?storageLocation=${encodeURIComponent(location)}`,
    })
  },

  handleZoneStatTap(event) {
    const { key, filter } = event.currentTarget.dataset
    const zone = getZoneDefinition(key)
    if (!zone) return

    const labels = { total: '全部', expiring: '临期', overdue: '已过期' }
    this.openListPanel({
      kind: 'zone',
      zoneKey: key,
      filter: filter || 'total',
      title: `${zone.name} · ${labels[filter] || labels.total}食品`,
      subtitle: zone.name,
      emptyText: '这个分区暂时没有对应食材',
    })
  },

  handleStatsTap(event) {
    const type = event.currentTarget.dataset.type || 'total'
    const titles = { total: '全部食品', expiring: '临期食品（3天内）', overdue: '已过期食品' }
    this.openListPanel({
      kind: 'stat',
      filter: type,
      title: titles[type] || titles.total,
      subtitle: '全部分区',
      emptyText: type === 'overdue' ? '没有已过期食材，很棒！' : '暂无对应食材',
    })
  },

  // ---- 搜索 ----
  handleSearchInput(event) {
    this.setData({ searchKeyword: event.detail.value })
  },

  handleSearchConfirm() {
    const keyword = String(this.data.searchKeyword || '').trim()
    if (!keyword) {
      wx.showToast({ title: '请输入食品名称', icon: 'none' })
      return
    }
    this.openListPanel({
      kind: 'search',
      keyword,
      title: '搜索结果',
      subtitle: `关键词「${keyword}」`,
      emptyText: '没有找到相关食材，换个名称试试',
    })
  },

  // ---- 食品详情 / 编辑 / 删除 ----
  handleFoodTap(event) {
    const food = this.data.allItems.find((item) => item._id === event.currentTarget.dataset.id)
    if (food) this.setData({ selectedFood: food, foodDetailVisible: true })
  },

  handleCloseFoodDetail() {
    this.setData({ foodDetailVisible: false, selectedFood: null })
  },

  handleEdit(event) {
    const id = event.currentTarget.dataset.id || (this.data.selectedFood && this.data.selectedFood._id)
    if (!id) return
    this.setData({ foodDetailVisible: false, selectedFood: null })
    wx.navigateTo({ url: `${ITEM_FORM_URL}?id=${id}` })
  },

  handleDelete(event) {
    const { id, name } = event.currentTarget.dataset
    this.confirmDelete(
      id || (this.data.selectedFood && this.data.selectedFood._id),
      name || (this.data.selectedFood && this.data.selectedFood.name),
    )
  },

  confirmDelete(id, name) {
    if (!id) return
    wx.showModal({
      title: '确认删除',
      content: `确定删除「${name}」吗？`,
      confirmText: '删除',
      confirmColor: '#c94238',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中' })
        itemService
          .deleteItem(id)
          .then(() => {
            wx.hideLoading()
            this.setData({ foodDetailVisible: false, selectedFood: null })
            this.showNotice(`已删除「${name}」`)
            this.loadItems()
          })
          .catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
      },
    })
  },

  // ---- 分区管理 ----
  handleOpenZoneConfig() {
    this.setData({ zoneConfigVisible: true })
  },

  handleCloseZoneConfig() {
    if (!this.data.zoneConfigId) {
      this.showNotice('请先保存一次分区配置')
      return
    }
    this.setData({ zoneConfigVisible: false })
  },

  handleZoneToggle(event) {
    const index = Number(event.currentTarget.dataset.index)
    const draft = this.data.zoneConfigDraft.slice()
    const enabledCount = draft.filter((zone) => zone.enabled).length

    if (draft[index].enabled && enabledCount <= 1) {
      wx.showToast({ title: '至少保留一个分区', icon: 'none' })
      return
    }
    draft[index] = { ...draft[index], enabled: !draft[index].enabled }
    this.setData({ zoneConfigDraft: draft })
  },

  handleZoneMove(event) {
    const index = Number(event.currentTarget.dataset.index)
    const dir = Number(event.currentTarget.dataset.dir)
    const target = index + dir
    const draft = this.data.zoneConfigDraft.slice()

    if (target < 0 || target >= draft.length) return
    const tmp = draft[index]
    draft[index] = draft[target]
    draft[target] = tmp
    this.setData({ zoneConfigDraft: draft })
  },

  handleSaveZoneConfig() {
    if (this.data.zoneConfigSaving) return
    if (!this.data.zoneConfigDraft.some((zone) => zone.enabled)) {
      wx.showToast({ title: '至少保留一个分区', icon: 'none' })
      return
    }
    this.setData({ zoneConfigSaving: true })

    zoneConfigService
      .saveZoneConfig({ _id: this.data.zoneConfigId, zones: this.data.zoneConfigDraft })
      .then((config) => {
        const zoneConfigDraft = buildZoneConfigDraft(config.zones)
        this.setData({
          zoneConfigId: config._id,
          zoneConfigDraft,
          zoneConfigVisible: false,
          zoneConfigSaving: false,
          homeZones: buildHomeZones(this.data.allItems, zoneConfigDraft),
        })
        this.showNotice('分区已更新')
      })
      .catch(() => {
        this.setData({ zoneConfigSaving: false })
        wx.showToast({ title: '保存失败，请检查云集合', icon: 'none' })
      })
  },

  // ---- 设置 / 隐私 ----
  handleOpenSettings() {
    this.setData({ settingsVisible: true })
  },

  handleCloseSettings() {
    this.setData({ settingsVisible: false })
  },

  handleOpenPrivacy() {
    if (wx.openPrivacyContract) {
      wx.openPrivacyContract({
        fail: () => wx.showToast({ title: '请在小程序后台配置隐私协议', icon: 'none' }),
      })
      return
    }
    wx.showToast({ title: '当前微信版本不支持查看', icon: 'none' })
  },

  handleClearAll() {
    wx.showModal({
      title: '清空全部数据',
      content: '确定清空当前账号下的全部食品记录吗？此操作不可恢复。',
      confirmText: '清空',
      confirmColor: '#c94238',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '清空中' })
        itemService
          .clearItems()
          .then(() => {
            wx.hideLoading()
            this.setData({ settingsVisible: false })
            this.showNotice('已清空全部数据')
            this.loadItems()
          })
          .catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '清空失败', icon: 'none' })
          })
      },
    })
  },

  showNotice(message) {
    if (this.noticeTimer) clearTimeout(this.noticeTimer)
    this.setData({ noticeMessage: message })
    this.noticeTimer = setTimeout(() => this.setData({ noticeMessage: '' }), 2400)
  },
})
