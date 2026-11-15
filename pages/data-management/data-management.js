const familyService = require('../../services/familyService')
const itemService = require('../../services/itemService')

function scopeOf(state) {
  return state && state.family ? state.family.id : 'personal'
}

Page({
  data: {
    loading: true,
    clearing: false,
    canClear: false,
    inventoryLabel: '',
    message: '',
  },

  onShow() {
    return this.loadScope()
  },

  loadScope() {
    this.setData({ loading: true, canClear: false, message: '' })
    return familyService.refreshFamilyState()
      .then((state) => {
        this.inventoryScope = scopeOf(state)
        const canClear = !state || (state.membership && state.membership.role === 'owner')
        this.setData({
          loading: false,
          canClear: Boolean(canClear),
          inventoryLabel: state ? '当前家庭库存' : '当前个人库存',
          message: canClear ? '' : '只有家庭创建者可以清空家庭库存。',
        })
      })
      .catch(() => {
        this.inventoryScope = ''
        this.setData({ loading: false, inventoryLabel: '', message: '暂时无法确认库存权限，请重试。' })
      })
  },

  handleRetry() {
    return this.loadScope()
  },

  handleClearAll() {
    if (this.data.loading || this.data.clearing || !this.data.canClear) return
    const confirmedScope = this.inventoryScope
    wx.showModal({
      title: `清空${this.data.inventoryLabel}`,
      content: '将删除这份库存中的所有食材，无法撤销。确定继续？',
      confirmText: '清空',
      confirmColor: '#c94238',
      success: (result) => {
        if (!result.confirm || this.data.clearing) return
        this.setData({ clearing: true, message: '' })
        return familyService.refreshFamilyState()
          .then((state) => {
            if (scopeOf(state) !== confirmedScope || (state && state.membership.role !== 'owner')) {
              throw new Error('库存归属或权限已变化，请返回后重新确认。')
            }
            return itemService.clearItems()
          })
          .then(() => {
            this.setData({ message: '已清空当前库存。' })
            wx.showToast({ title: '已清空', icon: 'success' })
          })
          .catch((error) => {
            this.setData({ canClear: false, message: error.message || '清空未完成，请重新读取后检查库存。' })
          })
          .finally(() => this.setData({ clearing: false }))
      },
    })
  },
})
