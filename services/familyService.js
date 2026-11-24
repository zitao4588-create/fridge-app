const backend = require('./backendService')
const FAMILY_STATE_STORAGE_KEY = 'fridge_family_state_v2'
let familyStateRevision = 0
let pendingRefresh = null

function callFamilyFunction(action, payload = {}) {
  const state = readCachedFamilyState()
  const scoped = state && !['getFamilyState', 'getInvitePreview', 'joinFamily', 'createFamily'].includes(action)
  return backend.family(action, scoped ? { ...payload, expectedFamilyId: state.family.id } : payload)
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
