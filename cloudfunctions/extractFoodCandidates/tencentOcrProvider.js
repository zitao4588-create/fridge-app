const PROVIDER_NAME = 'tencent-general-basic'
const MAX_BASE64_LENGTH = 7 * 1024 * 1024

function createProviderError(code, retryable = false, providerCode = '') {
  const error = new Error(code)
  error.code = code
  error.retryable = retryable
  error.providerCode = /^[A-Za-z0-9_.-]{1,120}$/.test(providerCode)
    ? providerCode
    : ''
  return error
}

function normalizeConfidence(value) {
  const confidence = Number(value)
  if (!Number.isFinite(confidence)) return null
  return Math.max(0, Math.min(1, confidence / 100))
}

function normalizeDetection(item = {}) {
  let text = String(item.DetectedText || '')
  try {
    text = text.normalize('NFKC')
  } catch (error) {
    // 旧 Node 运行时不支持 Unicode normalize 时继续做基础清洗。
  }

  return {
    text: text
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160),
    confidence: normalizeConfidence(item.Confidence),
  }
}

function normalizeProviderError(error) {
  const providerCode = String(
    error && (error.code || error.name || error.message) || '',
  )
  const sourceCode = providerCode.toLowerCase()

  if (sourceCode.includes('authfailure')) {
    return createProviderError('PROVIDER_AUTH_FAILED', false, providerCode)
  }
  if (
    sourceCode.includes('requestlimit') ||
    sourceCode.includes('limitexceeded')
  ) {
    return createProviderError('PROVIDER_RATE_LIMITED', true, providerCode)
  }
  if (
    sourceCode.includes('timeout') ||
    sourceCode.includes('etimedout') ||
    sourceCode.includes('econnreset')
  ) {
    return createProviderError('PROVIDER_TIMEOUT', true, providerCode)
  }
  if (
    sourceCode.includes('invalidparam') ||
    sourceCode.includes('invalidimage') ||
    sourceCode.includes('failedoperation.image')
  ) {
    return createProviderError('PROVIDER_INVALID_IMAGE', false, providerCode)
  }

  return createProviderError('PROVIDER_REQUEST_FAILED', true, providerCode)
}

function createTencentClient(options = {}) {
  const secretId = String(options.secretId || '')
  const secretKey = String(options.secretKey || '')
  if (!secretId || !secretKey) {
    throw createProviderError('PROVIDER_NOT_CONFIGURED')
  }

  const sdk = require('tencentcloud-sdk-nodejs-ocr')
  return new sdk.ocr.v20181119.Client({
    credential: {
      secretId,
      secretKey,
    },
    region: options.region || 'ap-guangzhou',
    profile: {
      httpProfile: {
        endpoint: 'ocr.tencentcloudapi.com',
        reqTimeout: Number(options.requestTimeoutSeconds) || 30,
      },
    },
  })
}

function createTencentOcrProvider(options = {}) {
  const client = options.client || createTencentClient(options)

  return {
    name: PROVIDER_NAME,

    async recognize(input = {}) {
      const imageUrl = String(input.imageUrl || '').trim()
      const imageBase64 = String(input.imageBase64 || '').trim()
      if (!imageUrl && !imageBase64) {
        throw createProviderError('INVALID_IMAGE')
      }
      if (imageBase64.length > MAX_BASE64_LENGTH) {
        throw createProviderError('IMAGE_TOO_LARGE')
      }

      const params = imageUrl
        ? { ImageUrl: imageUrl }
        : { ImageBase64: imageBase64 }
      const startedAt = Date.now()

      try {
        const response = await client.GeneralBasicOCR(params)
        const detections = Array.isArray(response.TextDetections)
          ? response.TextDetections
            .map(normalizeDetection)
            .filter((item) => item.text)
          : []

        return {
          provider: PROVIDER_NAME,
          detections,
          lineCount: detections.length,
          latencyMs: Date.now() - startedAt,
        }
      } catch (error) {
        throw normalizeProviderError(error)
      }
    },
  }
}

module.exports = {
  createTencentOcrProvider,
  MAX_BASE64_LENGTH,
  normalizeDetection,
  normalizeProviderError,
  PROVIDER_NAME,
}
