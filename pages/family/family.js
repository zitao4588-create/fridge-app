const familyService = require('../../services/familyService')
const itemService = require('../../services/itemService')
const {
  FAMILY_FAILURE_OUTCOME_KEYS,
  FAMILY_OUTCOME_KEYS,
  buildFamilyOutcome,
  resolveFamilyRecoveryOutcome,
} = require('../../utils/familyOutcome')

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
    operationResult: null,
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
        const patch = { state, loading: false }
        if (this.preparedInvite && (this.preparedInvite.family !== state?.family.id || this.preparedInvite.expiresAt <= Date.now())) {
          Object.assign(patch, { inviteCode: '', inviteExpiresText: '' })
        }
        if (state && state.migrationPending) {
          patch.operationResult = buildFamilyOutcome(
            FAMILY_OUTCOME_KEYS.MIGRATION_PENDING,
          )
        }
        this.setData(patch)
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
    this.setData({ operating: true, pageError: '', operationResult: null })
    familyService
      .createFamily(this.data.familyName)
      .then((state) => {
        itemService.invalidateItemsCache()
        this.setData({
          state,
          operationResult: buildFamilyOutcome(
            state && state.migrationPending
              ? FAMILY_OUTCOME_KEYS.MIGRATION_PENDING
              : FAMILY_OUTCOME_KEYS.CREATED,
          ),
        })
      })
      .catch((error) => {
        return this.recoverFamilyStateAfterFailure('create', error)
      })
      .finally(() => this.setData({ operating: false, loading: false }))
  },

  handleJoinFamily() {
    if (!this.data.pendingInviteCode || this.data.operating) return
    this.setData({ operating: true, pageError: '', operationResult: null })
    familyService
      .joinFamily(this.data.pendingInviteCode)
      .then((state) => {
        itemService.invalidateItemsCache()
        this.setData({
          state,
          invitePreview: null,
          pendingInviteCode: '',
          operationResult: buildFamilyOutcome(
            state && state.migrationPending
              ? FAMILY_OUTCOME_KEYS.MIGRATION_PENDING
              : FAMILY_OUTCOME_KEYS.JOINED,
          ),
        })
      })
      .catch((error) => {
        return this.recoverFamilyStateAfterFailure('join', error)
      })
      .finally(() => this.setData({ operating: false, loading: false }))
  },

  handleRetryMigration() {
    if (this.data.operating) return
    this.setData({ operating: true, pageError: '', operationResult: null })
    familyService
      .retryMigration()
      .then((state) => {
        itemService.invalidateItemsCache()
        this.setData({
          state,
          operationResult: buildFamilyOutcome(
            state && state.migrationPending
              ? FAMILY_OUTCOME_KEYS.MIGRATION_PENDING
              : FAMILY_OUTCOME_KEYS.MIGRATION_COMPLETED,
          ),
        })
      })
      .catch((error) =>
        this.recoverFamilyStateAfterFailure('migration', error),
      )
      .finally(() => this.setData({ operating: false }))
  },

  recoverFamilyStateAfterFailure(action, error, context = {}) {
    return familyService
      .refreshFamilyState()
      .then((state) => {
        itemService.invalidateItemsCache()
        const outcomeKey = resolveFamilyRecoveryOutcome(action, state, context)
        const fallbackKey =
          FAMILY_FAILURE_OUTCOME_KEYS[action] ||
          FAMILY_OUTCOME_KEYS.RESULT_UNKNOWN

        this.setData({
          state,
          pageError:
            outcomeKey === fallbackKey
              ? error.message || '家庭操作失败'
              : '',
          operationResult: buildFamilyOutcome(outcomeKey),
        })
      })
      .catch(() => {
        this.setData({
          pageError: error.message || '家庭操作结果暂时无法确认',
          operationResult: buildFamilyOutcome(
            FAMILY_OUTCOME_KEYS.RESULT_UNKNOWN,
          ),
        })
      })
  },

  async handlePrepareInvite() {
    const state = this.data.state
    if (!state || state.membership.role !== 'owner' || this.data.operating) return
    this.setData({ operating: true, pageError: '' })
    try {
      const invite = await familyService.createInvite()
      if (this.data.state?.family.id !== state.family.id) return
      this.preparedInvite = { ...invite, family: state.family.id }
      this.setData({ inviteCode: invite.inviteCode, inviteExpiresText: formatExpireTime(invite.expiresAt) })
      clearTimeout(this.inviteTimer)
      this.inviteTimer = setTimeout(() => {
        this.setData({ inviteCode: '', inviteExpiresText: '' })
      }, Math.max(0, invite.expiresAt - Date.now()))
    } catch (error) {
      this.setData({ pageError: error.message || '邀请生成失败，请重试' })
    } finally {
      this.setData({ operating: false })
    }
  },

  onUnload() {
    clearTimeout(this.inviteTimer)
  },

  onShareAppMessage() {
    const invite = this.preparedInvite
    if (!this.data.inviteCode || !invite || this.data.state?.membership.role !== 'owner' ||
        invite.family !== this.data.state.family.id || invite.expiresAt <= Date.now()) {
      return { title: '冰箱小雷达', path: '/pages/index/index', imageUrl: SHARE_IMAGE }
    }
    return {
      title: `加入「${invite.familyName}」一起管理冰箱`,
      path: `/pages/family/family?invite=${encodeURIComponent(invite.inviteCode)}`,
      imageUrl: SHARE_IMAGE,
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
        this.setData({ operating: true, pageError: '', operationResult: null })
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
      content:
        '移除后，该成员将不能继续查看或修改家庭库存；其此前迁入的库存仍留在家庭，不会自动回到个人库存。',
      confirmText: '移除',
      confirmColor: '#c94238',
      success: (res) => {
        if (!res.confirm) return
        this.setData({ operating: true, pageError: '', operationResult: null })
        familyService
          .removeMember(memberId)
          .then((state) =>
            this.setData({
              state,
              operationResult: buildFamilyOutcome(
                FAMILY_OUTCOME_KEYS.MEMBER_REMOVED,
              ),
            }),
          )
          .catch((error) =>
            this.recoverFamilyStateAfterFailure('remove', error, { memberId }),
          )
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
        ? '只有移除其他成员后才能解散。解散后，当前家庭库存会恢复为创建者的个人库存。'
        : '退出后将不能继续访问家庭库存；你此前迁入的库存仍留在家庭，不会自动回到个人库存。',
      confirmText: isOwner ? '解散' : '退出',
      confirmColor: '#c94238',
      success: (res) => {
        if (!res.confirm) return
        this.setData({ operating: true, pageError: '', operationResult: null })
        familyService
          .leaveFamily()
          .then(() => {
            itemService.invalidateItemsCache()
            this.setData({
              state: null,
              inviteCode: '',
              inviteExpiresText: '',
              operationResult: buildFamilyOutcome(
                isOwner
                  ? FAMILY_OUTCOME_KEYS.DISSOLVED
                  : FAMILY_OUTCOME_KEYS.LEFT,
              ),
            })
          })
          .catch((error) =>
            this.recoverFamilyStateAfterFailure(
              isOwner ? 'dissolve' : 'leave',
              error,
            ),
          )
          .finally(() => this.setData({ operating: false }))
      },
    })
  },
})
