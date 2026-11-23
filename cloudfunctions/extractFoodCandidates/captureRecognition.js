const { createFailure } = require('./domain')
const { handleRecognitionRequest } = require('./handler')

const SAFE_FAILURES = {
  INVALID_CAPTURE: {
    message: '图片会话无效，请重新选择或改用手动填写',
    retryable: false,
  },
  IDENTITY_UNAVAILABLE: {
    message: '无法确认当前用户，请改用手动填写',
    retryable: false,
  },
  CAPTURE_NOT_FOUND: {
    message: '图片会话不存在或没有访问权限',
    retryable: false,
  },
  CAPTURE_EXPIRED: {
    message: '图片会话已经过期，请重新选择',
    retryable: false,
  },
  CAPTURE_NOT_READY: {
    message: '图片尚未完成安全上传，请重新选择',
    retryable: false,
  },
  CAPTURE_STATE_UPDATE_FAILED: {
    message: '图片状态更新失败，请改用手动填写',
    retryable: true,
  },
}

function normalizeCaptureFailure(error) {
  const code = String(error && error.code || '')
  const safe = SAFE_FAILURES[code]
  if (safe) return createFailure(code, safe.message, safe.retryable)
  return createFailure(
    'CAPTURE_REQUEST_FAILED',
    '图片会话校验失败，请重新选择或改用手动填写',
    false,
  )
}

async function handleCaptureRecognition(
  event = {},
  options = {},
  dependencies = {},
) {
  if (options.enabled !== true) {
    return createFailure(
      'RECOGNITION_DISABLED',
      '非生成式图片识别服务尚未开放',
    )
  }

  const captureId = String(event.captureId || '').trim()
  if (!/^capture_[a-f0-9]{24,64}$/.test(captureId)) {
    return normalizeCaptureFailure({ code: 'INVALID_CAPTURE' })
  }
  const openid = String(options.openid || '').trim()
  if (!openid) {
    return normalizeCaptureFailure({ code: 'IDENTITY_UNAVAILABLE' })
  }
  if (
    typeof dependencies.getRecognitionSession !== 'function' ||
    typeof dependencies.markRecognizing !== 'function' ||
    typeof dependencies.completeRecognition !== 'function'
  ) {
    return normalizeCaptureFailure({
      code: 'CAPTURE_STATE_UPDATE_FAILED',
    })
  }

  try {
    const session = await dependencies.getRecognitionSession(
      openid,
      captureId,
    )
    const recognitionId = await dependencies.markRecognizing(openid, captureId)
    const result = await handleRecognitionRequest(
      { imageFileId: session.fileId },
      {
        enabled: true,
        ownershipVerified: true,
        providerConfigured: options.providerConfigured === true,
      },
      dependencies,
    )
    const completion = await dependencies.completeRecognition(
      openid,
      captureId,
      result.ok === true,
      recognitionId,
    )
    if (result.ok !== true && completion && completion.cleanupPending) {
      return {
        ...result,
        cleanupPending: true,
      }
    }
    return result
  } catch (error) {
    return normalizeCaptureFailure(error)
  }
}

module.exports = {
  handleCaptureRecognition,
  normalizeCaptureFailure,
}
