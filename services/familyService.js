const FAMILY_STATE_STORAGE_KEY = 'fridge_family_state_v2'
let familyStateRevision = 0
let pendingRefresh = null

function callFamilyFunction(action, payload = {}) {
  if (!wx.cloud) {
    return Promise.reject(new Error('当前环境不支持云开发'))
  }

  return wx.cloud
    .callFunction({
      name: 'familyInventory',
      data: { action, ...payload },
    })
    .then((res) => {
      const result = res.result || {}

      if (!result.ok) {
        const error = new Error(result.message || '家庭服务暂时不可用')
        error.code = result.error || 'FAMILY_SERVICE_ERROR'
        throw error
      }

      return result.data
    })
    .catch((error) => {
      if (error && error.code && error.code !== 'FAMILY_SERVICE_ERROR') {
        throw error
      }
      const rawMessage = String((error && (error.errMsg || error.message)) || '')
      if (
        rawMessage.includes('FUNCTION_NOT_FOUND') ||
        rawMessage.includes('FunctionName parameter could not be found') ||
        rawMessage.includes('timeout')
      ) {
        const unavailable = new Error('家庭共享正在完成云端配置，暂时不能使用')
        unavailable.code = 'FAMILY_FUNCTION_UNAVAILABLE'
        throw unavailable
      }
      throw error
    })
}

function readCachedFamilyState() {
  try {
    const state = wx.getStorageSync(FAMILY_STATE_STORAGE_KEY)
    return state && state.family && state.membership ? state : null
  } catch (error) {
    return null
  }
}

function writeCachedFamilyState(state, fromRefresh = false) {
  if (!fromRefresh) familyStateRevision += 1
  try {
    if (state && state.family && state.membership) {
      wx.setStorageSync(FAMILY_STATE_STORAGE_KEY, state)
    } else {
      wx.removeStorageSync(FAMILY_STATE_STORAGE_KEY)
    }
  } catch (error) {
    // 缓存只用于选择请求路径，服务端仍会独立校验真实成员关系。
  }
}

function isFamilyAccessRevoked(error) {
  return Boolean(
    error &&
      (error.code === 'NOT_IN_FAMILY' || error.code === 'FAMILY_UNAVAILABLE'),
  )
}

function refreshFamilyState() {
  const revision = familyStateRevision
  if (pendingRefresh && pendingRefresh.revision === revision) return pendingRefresh.request
  const request = callFamilyFunction('getFamilyState')
    .then((state) => {
      if (revision !== familyStateRevision) {
        const error = new Error('家庭状态已变化，请重试')
        error.code = 'INVENTORY_SCOPE_CHANGED'
        throw error
      }
      writeCachedFamilyState(state, true)
      return state
    })
    .catch((error) => {
      if (revision !== familyStateRevision) {
        const changed = new Error('家庭状态已变化，请重试')
        changed.code = 'INVENTORY_SCOPE_CHANGED'
        throw changed
      }
      if (isFamilyAccessRevoked(error)) {
        writeCachedFamilyState(null)
      }
      throw error
    })
    .finally(() => {
      if (pendingRefresh && pendingRefresh.request === request) pendingRefresh = null
    })
  pendingRefresh = { revision, request }
  return request
}

function createFamily(name) {
  return callFamilyFunction('createFamily', { name }).then((state) => {
    writeCachedFamilyState(state)
    return state
  })
}

function createInvite() {
  return callFamilyFunction('createInvite')
}

function getInvitePreview(inviteCode) {
  return callFamilyFunction('getInvitePreview', { inviteCode })
}

function revokeInvite() {
  return callFamilyFunction('revokeInvite')
}

function joinFamily(inviteCode) {
  return callFamilyFunction('joinFamily', { inviteCode }).then((state) => {
    writeCachedFamilyState(state)
    return state
  })
}

function retryMigration() {
  return callFamilyFunction('retryMigration').then((state) => {
    writeCachedFamilyState(state)
    return state
  })
}

function removeMember(memberId) {
  return callFamilyFunction('removeMember', { memberId })
}

function leaveFamily() {
  return callFamilyFunction('leaveFamily').then(() => {
    writeCachedFamilyState(null)
  })
}

module.exports = {
  callFamilyFunction,
  createFamily,
  createInvite,
  getInvitePreview,
  isFamilyAccessRevoked,
  joinFamily,
  leaveFamily,
  readCachedFamilyState,
  refreshFamilyState,
  removeMember,
  retryMigration,
  revokeInvite,
  writeCachedFamilyState,
}
