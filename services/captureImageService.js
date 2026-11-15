const FUNCTION_NAME = 'captureImageSession'
const CAPTURE_FEATURE_ENABLED = true

function createCaptureError(code, message, retryable = false) {
  const error = new Error(message)
  error.code = code
  error.retryable = retryable
  error.fallback = 'manual'
  return error
}

function createErrorFromResult(result = {}) {
  const failure = result.error || {}
  return createCaptureError(
    failure.code || 'CAPTURE_REQUEST_FAILED',
    failure.message || '图片处理失败，请改用手动填写',
    failure.retryable === true,
  )
}

function createCaptureImageClient(options = {}) {
  const enabled = options.enabled === true
  const wxApi = options.wxApi || (
    typeof wx === 'undefined' ? null : wx
  )

  function requireCloud() {
    if (!enabled) {
      throw createCaptureError(
        'CAPTURE_DISABLED',
        '图片上传当前未开放，请改用手动填写',
      )
    }
    if (
      !wxApi ||
      !wxApi.cloud ||
      typeof wxApi.cloud.callFunction !== 'function'
    ) {
      throw createCaptureError(
        'CLOUD_UNAVAILABLE',
        '当前环境无法安全处理图片，请改用手动填写',
        true,
      )
    }
  }

  function call(action, data = {}) {
    try {
      requireCloud()
    } catch (error) {
      return Promise.reject(error)
    }
    return wxApi.cloud
      .callFunction({
        name: FUNCTION_NAME,
        data: { action, ...data },
      })
      .then((response) => {
        const result = response && response.result
        if (!result || result.ok !== true) {
          throw createErrorFromResult(result)
        }
        return result.data
      })
      .catch((error) => {
        if (error && error.code) throw error
        throw createCaptureError(
          'CAPTURE_NETWORK_ERROR',
          '图片服务连接失败，请稍后重试或改用手动填写',
          true,
        )
      })
  }

  function beginCaptureSession() {
    return call('begin')
  }

  function confirmUploadedCapture(captureId, fileId) {
    return call('confirmUpload', { captureId, fileId })
  }

  function cleanupCaptureSession(captureId, cleanupOptions = {}) {
    return call('cleanup', {
      captureId,
      reason: cleanupOptions.reason || 'unknown',
      ...(cleanupOptions.fileIdCandidate
        ? { fileIdCandidate: cleanupOptions.fileIdCandidate }
        : {}),
    })
  }

  function attachCaptureToItem(captureId, itemId) {
    return call('attach', { captureId, itemId })
  }

  async function uploadCapture(tempFilePath) {
    const session = await beginCaptureSession()
    let fileId = ''
    try {
      if (
        !wxApi.cloud ||
        typeof wxApi.cloud.uploadFile !== 'function'
      ) {
        throw createCaptureError(
          'CLOUD_UNAVAILABLE',
          '当前环境无法上传图片，请改用手动填写',
          true,
        )
      }
      const uploaded = await wxApi.cloud.uploadFile({
        cloudPath: session.cloudPath,
        filePath: tempFilePath,
      })
      fileId = String(uploaded && uploaded.fileID || '')
      await confirmUploadedCapture(session.captureId, fileId)
      return {
        captureId: session.captureId,
        cleanupAfter: session.cleanupAfter,
      }
    } catch (error) {
      await cleanupCaptureSession(session.captureId, {
        reason: 'unknown',
        fileIdCandidate: fileId,
      }).catch(() => null)
      throw error
    }
  }

  return {
    attachCaptureToItem,
    beginCaptureSession,
    cleanupCaptureSession,
    confirmUploadedCapture,
    uploadCapture,
  }
}

const defaultClient = createCaptureImageClient({
  enabled: CAPTURE_FEATURE_ENABLED,
})

module.exports = {
  CAPTURE_FEATURE_ENABLED,
  FUNCTION_NAME,
  createCaptureError,
  createCaptureImageClient,
  ...defaultClient,
}
