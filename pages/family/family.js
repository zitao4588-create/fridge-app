const familyService = require('../../services/familyService')
const itemService = require('../../services/itemService')

const SHARE_IMAGE = '/images/mascot/fridge-happy.png'

function formatExpireTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const pad = (value) => String(value).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

Page({
  data: {
    loading: true,
    operating: false,
    state: null,
    familyName: '我的家庭',
    inviteCode: '',
    inviteExpiresText: '',
    pendingInviteCode: '',
    invitePreview: null,
    pageError: '',
    serviceUnavailable: false,
  },

  onLoad(options) {
    const inviteCode = String(options.invite || '').trim()
    if (inviteCode) {
      this.setData({ pendingInviteCode: inviteCode })
      this.loadInvitePreview(inviteCode)
    }
  },

  onShow() {
    this.loadState()
  },

  onPullDownRefresh() {
    this.loadState().finally(() => wx.stopPullDownRefresh())
  },

  loadState() {
    this.setData({ loading: true, pageError: '', serviceUnavailable: false })
    return familyService
      .refreshFamilyState()
      .then((state) => {
        this.setData({ state, loading: false })
      })
      .catch((error) => {
        const unavailable = error.code === 'NOT_IN_FAMILY'
        this.setData({
          state: null,
          loading: false,
          pageError: unavailable ? '' : error.message || '家庭服务读取失败',
          serviceUnavailable: error.code === 'FAMILY_FUNCTION_UNAVAILABLE',
        })
      })
  },

  loadInvitePreview(inviteCode) {
    familyService
      .getInvitePreview(inviteCode)
      .then((preview) => {
        this.setData({
          invitePreview: {
            ...preview,
            expiresText: formatExpireTime(preview.expiresAt),
          },
        })
      })
      .catch((error) => {
        this.setData({ pageError: error.message || '邀请已失效' })
      })
  },

  handleFamilyNameInput(event) {
    this.setData({ familyName: event.detail.value })
  },

  handleCreateFamily() {
    if (this.data.operating || this.data.serviceUnavailable) return
    this.setData({ operating: true, pageError: '' })
    familyService
      .createFamily(this.data.familyName)
      .then((state) => {
        itemService.invalidateItemsCache()
        this.setData({ state })
        wx.showToast({ title: '家庭已创建', icon: 'success' })
      })
      .catch((error) => {
        this.setData({ pageError: error.message || '创建失败' })
      })
      .finally(() => this.setData({ operating: false, loading: false }))
  },

  handleJoinFamily() {
    if (!this.data.pendingInviteCode || this.data.operating) return
    this.setData({ operating: true, pageError: '' })
    familyService
      .joinFamily(this.data.pendingInviteCode)
      .then((state) => {
        itemService.invalidateItemsCache()
        this.setData({ state, invitePreview: null, pendingInviteCode: '' })
        wx.showToast({ title: '已加入家庭', icon: 'success' })
      })
      .catch((error) => {
        this.setData({ pageError: error.message || '加入失败' })
      })
      .finally(() => this.setData({ operating: false, loading: false }))
  },

  handleRetryMigration() {
    if (this.data.operating) return
    this.setData({ operating: true, pageError: '' })
    familyService
      .retryMigration()
      .then((state) => {
        itemService.invalidateItemsCache()
        this.setData({ state })
      })
      .catch((error) => this.setData({ pageError: error.message || '恢复失败' }))
      .finally(() => this.setData({ operating: false }))
  },

  onShareAppMessage() {
    if (!this.data.state || this.data.state.membership.role !== 'owner') {
      return { title: '冰箱小雷达', path: '/pages/index/index', imageUrl: SHARE_IMAGE }
    }

    return {
      title: `加入「${this.data.state.family.name}」一起管理冰箱`,
      path: '/pages/family/family',
      imageUrl: SHARE_IMAGE,
      promise: familyService.createInvite().then((invite) => {
        this.setData({
          inviteCode: invite.inviteCode,
          inviteExpiresText: formatExpireTime(invite.expiresAt),
        })
        return {
          title: `加入「${invite.familyName}」一起管理冰箱`,
          path: `/pages/family/family?invite=${encodeURIComponent(invite.inviteCode)}`,
          imageUrl: SHARE_IMAGE,
        }
      }),
    }
  },

  handleRevokeInvite() {
    if (!this.data.inviteCode || this.data.operating) return
    wx.showModal({
      title: '撤回邀请',
      content: '撤回后，刚才分享的邀请码将立即失效。',
      confirmText: '撤回',
      success: (res) => {
        if (!res.confirm) return
        this.setData({ operating: true })
        familyService
          .revokeInvite()
          .then(() => {
            this.setData({ inviteCode: '', inviteExpiresText: '' })
            wx.showToast({ title: '邀请已撤回', icon: 'success' })
          })
          .catch((error) => this.setData({ pageError: error.message || '撤回失败' }))
          .finally(() => this.setData({ operating: false }))
      },
    })
  },

  handleRemoveMember(event) {
    const memberId = event.currentTarget.dataset.id
    if (!memberId || this.data.operating) return
    wx.showModal({
      title: '移除家庭成员',
      content: '移除后，该成员将不能继续查看或修改家庭库存。',
      confirmText: '移除',
      confirmColor: '#c94238',
      success: (res) => {
        if (!res.confirm) return
        this.setData({ operating: true })
        familyService
          .removeMember(memberId)
          .then((state) => this.setData({ state }))
          .catch((error) => this.setData({ pageError: error.message || '移除失败' }))
          .finally(() => this.setData({ operating: false }))
      },
    })
  },

  handleLeaveFamily() {
    if (!this.data.state || this.data.operating) return
    const isOwner = this.data.state.membership.role === 'owner'
    wx.showModal({
      title: isOwner ? '解散家庭' : '退出家庭',
      content: isOwner
        ? '只有移除其他成员后才能解散。解散后库存会恢复为你的个人库存。'
        : '退出后将不能继续查看或修改这个家庭的库存。',
      confirmText: isOwner ? '解散' : '退出',
      confirmColor: '#c94238',
      success: (res) => {
        if (!res.confirm) return
        this.setData({ operating: true })
        familyService
          .leaveFamily()
          .then(() => {
            itemService.invalidateItemsCache()
            this.setData({ state: null, inviteCode: '', inviteExpiresText: '' })
            wx.showToast({ title: isOwner ? '家庭已解散' : '已退出家庭', icon: 'success' })
          })
          .catch((error) => this.setData({ pageError: error.message || '操作失败' }))
          .finally(() => this.setData({ operating: false }))
      },
    })
  },
})
