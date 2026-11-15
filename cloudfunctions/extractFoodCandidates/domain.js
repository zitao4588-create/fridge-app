function createFailure(code, message, retryable = false) {
  return {
    ok: false,
    error: {
      code,
      message,
      retryable,
    },
    fallback: 'manual',
  }
}

function handleCandidateRequest(event = {}, options = {}) {
  if (options.enabled !== true) {
    return createFailure(
      'RECOGNITION_DISABLED',
      '非生成式图片识别服务尚未开放',
    )
  }

  const imageFileId = String(event.imageFileId || '').trim()
  if (!imageFileId) {
    return createFailure(
      'INVALID_IMAGE',
      '没有收到可识别的图片',
    )
  }

  if (options.ownershipVerified !== true) {
    return createFailure(
      'IMAGE_OWNERSHIP_UNVERIFIED',
      '图片所有权尚未通过服务端校验',
    )
  }

  if (options.providerConfigured !== true) {
    return createFailure(
      'PROVIDER_NOT_CONFIGURED',
      '非生成式识别供应商尚未完成配置',
    )
  }

  return {
    ok: true,
    ready: true,
    imageFileId,
  }
}

module.exports = {
  createFailure,
  handleCandidateRequest,
}
