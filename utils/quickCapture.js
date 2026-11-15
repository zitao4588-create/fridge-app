const ITEM_FORM_URL = '/pkg-add/item-form/item-form'

function normalizeSelectedMedia(result) {
  const files = result && Array.isArray(result.tempFiles) ? result.tempFiles : []
  const firstFile = files[0] || {}
  const tempFilePath = String(firstFile.tempFilePath || '').trim()

  if (!tempFilePath) {
    return null
  }

  const size = Number(firstFile.size)

  return {
    tempFilePath,
    size: Number.isFinite(size) && size >= 0 ? size : 0,
    fileType: 'image',
  }
}

function classifySelectionError(error) {
  const message = String(
    (error && (error.errMsg || error.message)) || '',
  ).toLowerCase()

  if (message.includes('cancel')) {
    return { cancelled: true, message: '' }
  }

  if (
    message.includes('privacy') ||
    message.includes('scope is not declared') ||
    message.includes('api scope is not declared')
  ) {
    return {
      cancelled: false,
      message: '当前图片隐私配置尚未完成，请先使用手动填写',
    }
  }

  if (
    message.includes('auth deny') ||
    message.includes('permission denied') ||
    message.includes('authorize:fail') ||
    message.includes('denied')
  ) {
    return {
      cancelled: false,
      message: '没有相机或相册权限，请授权后重试，或使用手动填写',
    }
  }

  if (message.includes('timeout')) {
    return {
      cancelled: false,
      message: '图片选择超时，请重试，或使用手动填写',
    }
  }

  return {
    cancelled: false,
    message: '图片选择失败，请重试，或使用手动填写',
  }
}

function buildManualFallbackUrl(options = {}) {
  const params = ['entry=photoFallback', 'smartRecommend=1']
  const storageLocation = String(options.storageLocation || '').trim()

  if (storageLocation) {
    params.push(`storageLocation=${encodeURIComponent(storageLocation)}`)
  }

  return `${ITEM_FORM_URL}?${params.join('&')}`
}

module.exports = {
  buildManualFallbackUrl,
  classifySelectionError,
  normalizeSelectedMedia,
}
