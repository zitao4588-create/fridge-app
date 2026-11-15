const { extractCandidatePayload } = require('./candidateExtractor')

async function runTrustedCandidatePipeline(input = {}, options = {}) {
  if (!options.provider || typeof options.provider.recognize !== 'function') {
    const error = new Error('PROVIDER_NOT_CONFIGURED')
    error.code = 'PROVIDER_NOT_CONFIGURED'
    throw error
  }

  const recognition = await options.provider.recognize(input)
  return {
    ok: true,
    data: extractCandidatePayload(recognition.detections),
    providerMeta: {
      provider: recognition.provider,
      lineCount: recognition.lineCount,
      latencyMs: recognition.latencyMs,
    },
  }
}

module.exports = {
  runTrustedCandidatePipeline,
}
