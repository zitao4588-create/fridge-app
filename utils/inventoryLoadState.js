const INVENTORY_VIEW_KEYS = Object.freeze({
  LOADING: 'loading',
  REFRESHING: 'refreshing',
  CACHE: 'cache',
  SUCCESS: 'success',
  EMPTY: 'empty',
  PERMISSION_REVOKED: 'permission-revoked',
  PERMISSION_UNVERIFIED: 'permission-unverified',
  ERROR_STALE: 'error-stale',
  ERROR: 'error',
})

function buildInventoryLoadingState(hasSnapshot) {
  if (hasSnapshot) {
    return {
      key: INVENTORY_VIEW_KEYS.REFRESHING,
      tone: 'info',
      title: '正在更新云端库存',
      detail: '当前显示上次读取结果，更新完成前不代表云端最新状态。',
      showCard: true,
      canRetry: false,
      retainSnapshot: true,
    }
  }

  return {
    key: INVENTORY_VIEW_KEYS.LOADING,
    tone: 'info',
    title: '正在读取库存',
    detail: '正在确认家庭权限并读取云端数据，请稍候。',
    showCard: true,
    canRetry: false,
    retainSnapshot: false,
  }
}

function buildInventoryResultState(result) {
  const items = (result && result.items) || []

  if (result && result.permissionState === 'revoked') {
    return {
      key: INVENTORY_VIEW_KEYS.PERMISSION_REVOKED,
      tone: 'warning',
      title: '家庭权限已失效',
      detail: '已隐藏旧家庭缓存并切换到个人库存，可重新检查或进入家庭页确认。',
      showCard: true,
      canRetry: true,
      retainSnapshot: true,
    }
  }

  if (result && result.source === 'cache') {
    return {
      key: INVENTORY_VIEW_KEYS.CACHE,
      tone: 'warning',
      title: '当前显示缓存数据',
      detail: '这不是本次云端读取成功的结果；可下拉刷新或点击重新读取。',
      showCard: true,
      canRetry: true,
      retainSnapshot: true,
    }
  }

  if (items.length === 0) {
    return {
      key: INVENTORY_VIEW_KEYS.EMPTY,
      tone: 'empty',
      title: '云端库存为空',
      detail: '已完成读取，目前没有食材记录，可以从“加食材”开始。',
      showCard: true,
      canRetry: false,
      retainSnapshot: true,
    }
  }

  return {
    key: INVENTORY_VIEW_KEYS.SUCCESS,
    tone: 'success',
    title: '云端库存已更新',
    detail: '',
    showCard: false,
    canRetry: false,
    retainSnapshot: true,
  }
}

function buildInventoryErrorState(error, hasSnapshot) {
  if (error && error.inventoryAccessUnverified) {
    return {
      key: INVENTORY_VIEW_KEYS.PERMISSION_UNVERIFIED,
      tone: 'error',
      title: '家庭权限暂时无法确认',
      detail: '为避免越权，已隐藏库存数据。请检查网络后重新读取。',
      showCard: true,
      canRetry: true,
      retainSnapshot: false,
    }
  }

  if (hasSnapshot) {
    return {
      key: INVENTORY_VIEW_KEYS.ERROR_STALE,
      tone: 'error',
      title: '云端更新失败',
      detail: '下面保留上次读取结果，不代表云端最新状态。请检查网络后重试。',
      showCard: true,
      canRetry: true,
      retainSnapshot: true,
    }
  }

  return {
    key: INVENTORY_VIEW_KEYS.ERROR,
    tone: 'error',
    title: '库存读取失败',
    detail: '没有可安全显示的库存数据，请检查网络后重新读取。',
    showCard: true,
    canRetry: true,
    retainSnapshot: false,
  }
}

module.exports = {
  INVENTORY_VIEW_KEYS,
  buildInventoryErrorState,
  buildInventoryLoadingState,
  buildInventoryResultState,
}
