const FAMILY_STATE_STORAGE_KEY = 'fridge_family_state_v2'

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

function writeCachedFamilyState(state) {
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

function refreshFamilyState() {
  return callFamilyFunction('getFamilyState').then((state) => {
    writeCachedFamilyState(state)
    return state
  })
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
  joinFamily,
  leaveFamily,
  readCachedFamilyState,
  refreshFamilyState,
  removeMember,
  retryMigration,
  revokeInvite,
  writeCachedFamilyState,
}
