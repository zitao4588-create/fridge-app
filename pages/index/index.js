const itemService = require('../../services/itemService')
const { CATEGORY_OPTIONS, HOME_ZONE_DEFINITIONS } = require('../../utils/constants')
const { addDays, formatDate, getTodayString } = require('../../utils/date')
const { getStarterFoodEntries } = require('../../utils/foodLexicon')
const { buildHomeRadar, getItemBucket } = require('../../utils/mealRadar')
const { getExpiryStatus } = require('../../utils/status')
const { getIngredientVisual } = require('../../utils/visualAssets')

const ITEM_FORM_URL = '/pkg-add/item-form/item-form'
const SHARE_TITLE = '冰箱小雷达｜微信里的冰箱食材库存管理小程序'
const SHARE_PATH = '/pages/index/index'
const SHARE_IMAGE = '/images/mascot/fridge-happy.png'
const STARTER_FOOD_LIMIT = 36

function getZoneDefinition(key) {
  return HOME_ZONE_DEFINITIONS.find((zone) => zone.key === key)
}

function bucketOf(expireDate) {
  return getItemBucket({ expireDate })
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

// Hero 直接承载开饭雷达：空冰箱时吉祥物打招呼，有库存时由它显示雷达读数并可点进报告
function buildMood(stats) {
  if (!stats || !stats.total) {
    return {
      mascot: '/images/mascot/fridge-empty.png',
      title: '冰箱还是空的',
      desc: '点分区右上角的 ＋ 号，把食材加进来吧～',
    }
  }

  return { mascot: '/images/mascot/fridge-happy.png' }
}

const ZONE_ICONS = {
  cold: '🧊',
  freeze: '❄️',
  door: '🥤',
  produce: '🥬',
  temp: '🌡️',
}

function getZoneItems(items, zone) {
  const locations = zone.locations || [zone.location]

  return items.filter((item) => locations.includes(item.storageLocation))
}

function buildHomeZones(items) {
  return HOME_ZONE_DEFINITIONS.map((zone) => {
    const zoneItems = getZoneItems(items, zone)
    const expiring = zoneItems.filter((item) => item.bucket === 'expiring').length
    const overdue = zoneItems.filter((item) => item.bucket === 'overdue').length

    return {
      ...zone,
      icon: ZONE_ICONS[zone.theme] || '🍱',
      itemCount: zoneItems.length,
      expiring,
      overdue,
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

function getStarterKey(entry, index) {
  return `${entry.name}-${index}`
}

function buildStarterFoods(selectedKeys = []) {
  const selectedMap = selectedKeys.reduce((map, key) => {
    map[key] = true
    return map
  }, {})

  return getStarterFoodEntries(STARTER_FOOD_LIMIT).map((entry, index) => {
    const key = getStarterKey(entry, index)

    return {
      ...entry,
      key,
      selected: Boolean(selectedMap[key]),
      meta: `${entry.category} · ${entry.storageLocation} · ${entry.shelfLifeDays}天`,
    }
  })
}

function buildStarterPayload(entry) {
  const productionDate = getTodayString()

  return {
    name: entry.name,
    category: entry.category,
    quantity: 1,
    unit: '份',
    productionDate,
    shelfLifeDays: entry.shelfLifeDays,
    expireDate: addDays(productionDate, entry.shelfLifeDays),
    storageLocation: entry.storageLocation,
    note: '样板冰箱快速添加，可按实际情况修改',
    source: 'manual',
  }
}

Page({
  data: {
    loading: false,
    homeMood: buildMood(null),
    homeRadar: buildHomeRadar([]),
    allItems: [],
    homeZones: [],
    starterFoods: buildStarterFoods([]),
    selectedStarterKeys: [],
    starterSaving: false,
    noticeMessage: '',
    searchKeyword: '',

    listPanelVisible: false,
    listPanelTitle: '',
    listPanelSubtitle: '',
    listPanelGroups: [],
    listPanelEmpty: '',

    foodDetailVisible: false,
    selectedFood: null,
  },

  onShow() {
    this.setTabBar({
      selected: 0,
      hidden: this.data.listPanelVisible || this.data.foodDetailVisible,
    })
    this.loadItems()
  },

  setTabBar(patch) {
    const tabBar = typeof this.getTabBar === 'function' && this.getTabBar()
    if (tabBar) {
      tabBar.setData(patch)
    }
  },

  onUnload() {
    if (this.noticeTimer) clearTimeout(this.noticeTimer)
  },

  onPullDownRefresh() {
    this.loadItems().finally(() => wx.stopPullDownRefresh())
  },

  onShareAppMessage() {
    return {
      title: SHARE_TITLE,
      path: SHARE_PATH,
      imageUrl: SHARE_IMAGE,
    }
  },

  onShareTimeline() {
    return {
      title: SHARE_TITLE,
      query: '',
      imageUrl: SHARE_IMAGE,
    }
  },

  loadItems() {
    this.setData({ loading: true })

    return itemService
      .getItems()
      .then((items) => {
        const allItems = items.map(decorateItem)
        const patch = {
          allItems,
          homeMood: buildMood(buildStats(allItems)),
          homeRadar: buildHomeRadar(allItems),
          homeZones: buildHomeZones(allItems),
          starterFoods: buildStarterFoods(this.data.selectedStarterKeys),
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
    this.setTabBar({ hidden: true })
  },

  handleCloseListPanel() {
    this.panelContext = null
    this.setData({ listPanelVisible: false })
    this.setTabBar({ hidden: false })
  },

  noop() {},

  handleRadarTap() {
    if (!this.data.allItems.length) return
    const app = getApp()
    if (app && app.globalData) app.globalData.scrollToRadar = true
    wx.switchTab({ url: '/pages/calendar/calendar' })
  },

  handleZoneAdd(event) {
    const location = event.currentTarget.dataset.location
    wx.navigateTo({
      url: `${ITEM_FORM_URL}?storageLocation=${encodeURIComponent(location)}&smartRecommend=1`,
    })
  },

  handleSearchInput(event) {
    this.setData({ searchKeyword: event.detail.value })
  },

  handleStarterTap(event) {
    const key = event.currentTarget.dataset.key
    const selectedStarterKeys = this.data.selectedStarterKeys.includes(key)
      ? this.data.selectedStarterKeys.filter((item) => item !== key)
      : this.data.selectedStarterKeys.concat(key)

    this.setData({
      selectedStarterKeys,
      starterFoods: buildStarterFoods(selectedStarterKeys),
    })
  },

  handleStarterSave() {
    const selectedFoods = this.data.starterFoods.filter((item) => item.selected)

    if (selectedFoods.length === 0) {
      wx.showToast({ title: '先选几样常吃的', icon: 'none' })
      return
    }

    this.setData({ starterSaving: true })
    wx.showLoading({ title: '添加中' })

    Promise.all(
      selectedFoods.map((food) =>
        itemService
          .createItem(buildStarterPayload(food))
          .then(() => ({ ok: true, name: food.name }))
          .catch(() => ({ ok: false, name: food.name })),
      ),
    ).then((results) => {
      const successCount = results.filter((item) => item.ok).length
      const failedCount = results.length - successCount

      wx.hideLoading()
      this.setData({
        starterSaving: false,
        selectedStarterKeys: [],
        starterFoods: buildStarterFoods([]),
      })
      this.showNotice(
        failedCount > 0
          ? `已添加 ${successCount} 样，${failedCount} 样失败`
          : `已添加 ${successCount} 样到样板冰箱`,
      )
      this.loadItems()
    })
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

  handleFoodTap(event) {
    const food = this.data.allItems.find((item) => item._id === event.currentTarget.dataset.id)
    if (food) {
      this.setData({ selectedFood: food, foodDetailVisible: true })
      this.setTabBar({ hidden: true })
    }
  },

  handleCloseFoodDetail() {
    this.setData({ foodDetailVisible: false, selectedFood: null })
    this.setTabBar({ hidden: false })
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
            this.setTabBar({ hidden: this.data.listPanelVisible })
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

  handleClearAll() {
    wx.showModal({
      title: '清空全部数据',
      content: '将删除所有食品记录，且无法恢复。确定继续？',
      confirmText: '清空',
      confirmColor: '#c94238',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '清空中' })
        itemService
          .clearItems()
          .then(() => {
            wx.hideLoading()
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
