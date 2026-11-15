const FUNCTION_NAME = 'extractFoodCandidates'

// v3.0 发布候选已明确放行独立的非生成式 OCR 路径。
// 旧混合识别总闸门仍保持关闭，候选仍必须经确认页才能写入库存。
const RECOGNITION_FEATURE_ENABLED = true

function createRecognitionError(code, message, retryable = false) {
  const error = new Error(message)
  error.code = code
  error.retryable = retryable
  error.fallback = 'manual'
  return error
}

function createErrorFromResult(result = {}) {
  const failure = result.error || {}
  return createRecognitionError(
    failure.code || 'RECOGNITION_FAILED',
    failure.message || '暂时无法识别，请改用手动填写',
    failure.retryable === true,
  )
}

function createRecognitionClient(options = {}) {
  const enabled = options.enabled === true
  const wxApi = options.wxApi || (
    typeof wx === 'undefined' ? null : wx
  )

  function requestFoodCandidates(request = {}) {
    if (!enabled) {
      return Promise.reject(
        createRecognitionError(
          'RECOGNITION_DISABLED',
          '图片识别尚未开放，请改用手动填写',
        ),
      )
    }

    const captureId = String(request.captureId || '').trim()
    if (!/^capture_[a-f0-9]{24,64}$/.test(captureId)) {
      return Promise.reject(
        createRecognitionError(
          'INVALID_CAPTURE',
          '图片会话无效，请重新选择或改用手动填写',
        ),
      )
    }

    if (
      !wxApi ||
      !wxApi.cloud ||
      typeof wxApi.cloud.callFunction !== 'function'
    ) {
      return Promise.reject(
        createRecognitionError(
          'CLOUD_UNAVAILABLE',
          '当前环境无法使用图片识别，请改用手动填写',
          true,
        ),
      )
    }

    return wxApi.cloud
      .callFunction({
        name: FUNCTION_NAME,
        data: { captureId },
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
        throw createRecognitionError(
          'RECOGNITION_NETWORK_ERROR',
          '识别服务连接失败，请稍后重试或改用手动填写',
          true,
        )
      })
  }

  return { requestFoodCandidates }
}

const defaultClient = createRecognitionClient({
  enabled: RECOGNITION_FEATURE_ENABLED,
})

module.exports = {
  FUNCTION_NAME,
  RECOGNITION_FEATURE_ENABLED,
  createRecognitionClient,
  requestFoodCandidates: defaultClient.requestFoodCandidates,
}
