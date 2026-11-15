const fs = require('fs')
const crypto = require('crypto')
const os = require('os')
const path = require('path')
const {
  createTencentOcrProvider,
} = require('../cloudfunctions/extractFoodCandidates/tencentOcrProvider')
const {
  handleCaptureRecognition,
} = require('../cloudfunctions/extractFoodCandidates/captureRecognition')
const {
  sanitizeRecognitionCandidate,
} = require('../utils/recognitionCandidate')

const sampleSet = process.env.OCR_SUITE_SET === 'dates'
  ? 'dates'
  : 'packaging'
const sampleFixture = sampleSet === 'dates'
  ? 'ocr-real-date-samples.json'
  : 'ocr-real-samples.json'
const samples = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'tests', 'fixtures', sampleFixture),
    'utf8',
  ),
)

function createSuiteError(code) {
  const error = new Error(code)
  error.code = code
  return error
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

async function fetchWithRetry(url, options = {}) {
  let lastStatus = 0

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, options)
    if (response.ok) return response

    lastStatus = response.status
    if (response.status !== 429 && response.status < 500) break
    await wait(750 * (attempt + 1))
  }

  throw createSuiteError(`SAMPLE_HTTP_${lastStatus || 'UNKNOWN'}`)
}

function readCredentials() {
  if (
    process.env.TENCENTCLOUD_SECRET_ID &&
    process.env.TENCENTCLOUD_SECRET_KEY
  ) {
    return {
      secretId: process.env.TENCENTCLOUD_SECRET_ID,
      secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
    }
  }

  const credentialPath = path.join(os.homedir(), '.tccli', 'default.credential')
  const credentials = JSON.parse(fs.readFileSync(credentialPath, 'utf8'))
  return {
    secretId: credentials.secretId,
    secretKey: credentials.secretKey,
  }
}

function encodeCommonsFilename(filename) {
  return encodeURIComponent(filename).replace(/'/g, '%27')
}

function resolveCommonsImage(title) {
  const filename = String(title || '')
    .replace(/^File:/, '')
    .replace(/ /g, '_')
  if (!filename) throw createSuiteError('SAMPLE_IMAGE_UNAVAILABLE')
  const digest = crypto.createHash('md5').update(filename).digest('hex')
  const encodedFilename = encodeCommonsFilename(filename)
  const basePath =
    `https://upload.wikimedia.org/wikipedia/commons/${digest[0]}/${digest.slice(0, 2)}`
  const originalUrl = `${basePath}/${encodedFilename}`
  const thumbBase = `${basePath.replace('/commons/', '/commons/thumb/')}/${encodedFilename}`

  return {
    imageUrls: [
      `${thumbBase}/1280px-${encodedFilename}`,
      `${thumbBase}/960px-${encodedFilename}`,
      `${thumbBase}/640px-${encodedFilename}`,
      originalUrl,
    ],
    sourcePage: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
  }
}

async function downloadImageBuffer(imageUrls) {
  let lastError = createSuiteError('SAMPLE_IMAGE_DOWNLOAD_FAILED')

  for (const imageUrl of imageUrls) {
    try {
      const response = await fetchWithRetry(imageUrl, {
        headers: {
          'User-Agent': 'fridge-app-local-ocr-suite/1.0',
        },
      })
      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

function summarizeReview(review) {
  return {
    attentionLevel: review.attentionLevel,
    fieldKeys: Object.entries(review.fields)
      .filter(([, field]) => Boolean(field.value))
      .map(([key]) => key),
    dateCandidateCount: review.dates.candidates.length,
    dateConflictCodes: review.dates.conflictCodes,
    manualFallbackRecommended: review.manualFallbackRecommended,
  }
}

async function run() {
  const requestedIds = new Set(
    String(process.env.OCR_SUITE_IDS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  )
  const selectedSamples = requestedIds.size > 0
    ? samples.filter((sample) => requestedIds.has(sample.id))
    : samples
  const limit = Math.max(
    1,
    Math.min(
      selectedSamples.length,
      Number(process.env.OCR_SUITE_LIMIT) || selectedSamples.length,
    ),
  )
  const credentials = readCredentials()
  const provider = createTencentOcrProvider({
    ...credentials,
    region: 'ap-guangzhou',
    requestTimeoutSeconds: 30,
  })
  const results = []

  for (const sample of selectedSamples.slice(0, limit)) {
    if (results.length > 0) await wait(500)
    const startedAt = Date.now()
    try {
      const resolved = resolveCommonsImage(sample.title)
      const imageBuffer = await downloadImageBuffer(resolved.imageUrls)
      const captureId = `capture_${crypto
        .createHash('sha256')
        .update(sample.id)
        .digest('hex')
        .slice(0, 36)}`
      const localFileId = `cloud://local-public/${captureId}`
      const handled = await handleCaptureRecognition(
        { captureId },
        {
          enabled: true,
          openid: 'local-public-sample-owner',
          providerConfigured: true,
        },
        {
          getRecognitionSession(openid, requestedCaptureId) {
            if (
              openid !== 'local-public-sample-owner' ||
              requestedCaptureId !== captureId
            ) {
              const error = new Error('CAPTURE_NOT_FOUND')
              error.code = 'CAPTURE_NOT_FOUND'
              return Promise.reject(error)
            }
            return Promise.resolve({
              captureId,
              fileId: localFileId,
            })
          },
          markRecognizing() {
            return Promise.resolve()
          },
          completeRecognition(openid, requestedCaptureId, succeeded) {
            return Promise.resolve({
              readyForConfirmation:
                openid === 'local-public-sample-owner' &&
                requestedCaptureId === captureId &&
                succeeded,
            })
          },
          downloadFile: () =>
            Promise.resolve({ fileContent: imageBuffer }),
          provider,
        },
      )
      if (handled.ok !== true) {
        const failure = new Error(handled.error && handled.error.code)
        failure.code = handled.error && handled.error.code
        throw failure
      }
      const review = sanitizeRecognitionCandidate(handled.data)
      results.push({
        id: sample.id,
        scenario: sample.scenario,
        status: 'success',
        latencyMs: Date.now() - startedAt,
        providerLineCount: handled.providerMeta.lineCount,
        ...summarizeReview(review),
        sourcePage: resolved.sourcePage,
      })
    } catch (error) {
      results.push({
        id: sample.id,
        scenario: sample.scenario,
        status: 'failed',
        latencyMs: Date.now() - startedAt,
        errorCode: String(error && error.code || error && error.message || 'UNKNOWN'),
        providerCode: String(error && error.providerCode || ''),
      })
    }
  }

  const succeeded = results.filter((result) => result.status === 'success').length
  const failed = results.length - succeeded
  process.stdout.write(
    `${JSON.stringify({
      provider: 'tencent-general-basic',
      sampleSet,
      requested: results.length,
      succeeded,
      failed,
      storesOcrRawText: false,
      results,
    }, null, 2)}\n`,
  )

  if (failed > 0) process.exitCode = 1
}

run().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({
      provider: 'tencent-general-basic',
      sampleSet,
      status: 'suite_failed',
      errorCode: String(error && error.code || error && error.message || 'UNKNOWN'),
    })}\n`,
  )
  process.exitCode = 1
})
