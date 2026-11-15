const { createFailure, handleCandidateRequest } = require('./domain')
const { runTrustedCandidatePipeline } = require('./pipeline')

const EXECUTION_FAILURES = {
  IMAGE_DOWNLOAD_FAILED: {
    message: '图片读取失败，请重新选择或改用手动填写',
    retryable: true,
  },
  INVALID_IMAGE: {
    message: '图片无效，请重新选择或改用手动填写',
    retryable: false,
  },
  IMAGE_TOO_LARGE: {
    message: '图片过大，请重新拍摄或改用手动填写',
    retryable: false,
  },
  PROVIDER_AUTH_FAILED: {
    message: '识别服务配置不可用，请改用手动填写',
    retryable: false,
  },
  PROVIDER_NOT_CONFIGURED: {
    message: '识别服务尚未完成配置，请改用手动填写',
    retryable: false,
  },
  PROVIDER_RATE_LIMITED: {
    message: '识别服务繁忙，请稍后重试或改用手动填写',
    retryable: true,
  },
  PROVIDER_TIMEOUT: {
    message: '识别超时，请稍后重试或改用手动填写',
    retryable: true,
  },
  PROVIDER_INVALID_IMAGE: {
    message: '识别服务无法读取这张图片，请重新选择或改用手动填写',
    retryable: false,
  },
  PROVIDER_REQUEST_FAILED: {
    message: '识别服务暂时不可用，请稍后重试或改用手动填写',
    retryable: true,
  },
}

function createExecutionFailure(error) {
  const code = String(error && error.code || '')
  const failure = EXECUTION_FAILURES[code] || {
    message: '图片识别失败，请改用手动填写',
    retryable: false,
  }
  return createFailure(
    EXECUTION_FAILURES[code] ? code : 'RECOGNITION_FAILED',
    failure.message,
    failure.retryable,
  )
}

async function handleRecognitionRequest(
  event = {},
  options = {},
  dependencies = {},
) {
  const gate = handleCandidateRequest(event, options)
  if (gate.ok !== true) return gate

  try {
    if (typeof dependencies.downloadFile !== 'function') {
      throw Object.assign(new Error('IMAGE_DOWNLOAD_FAILED'), {
        code: 'IMAGE_DOWNLOAD_FAILED',
      })
    }

    const downloaded = await dependencies.downloadFile({
      fileID: gate.imageFileId,
    })
    const fileContent = downloaded && downloaded.fileContent
    if (!fileContent || !Buffer.from(fileContent).length) {
      throw Object.assign(new Error('IMAGE_DOWNLOAD_FAILED'), {
        code: 'IMAGE_DOWNLOAD_FAILED',
      })
    }

    const provider = dependencies.provider ||
      (typeof dependencies.createProvider === 'function'
        ? dependencies.createProvider()
        : null)
    if (!provider || typeof provider.recognize !== 'function') {
      throw Object.assign(new Error('PROVIDER_NOT_CONFIGURED'), {
        code: 'PROVIDER_NOT_CONFIGURED',
      })
    }

    const pipeline = await runTrustedCandidatePipeline(
      {
        imageBase64: Buffer.from(fileContent).toString('base64'),
      },
      { provider },
    )

    return {
      ok: true,
      data: pipeline.data,
      providerMeta: pipeline.providerMeta,
    }
  } catch (error) {
    return createExecutionFailure(error)
  }
}

module.exports = {
  createExecutionFailure,
  handleRecognitionRequest,
}
