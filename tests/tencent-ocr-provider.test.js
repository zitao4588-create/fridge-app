const assert = require('assert')
const {
  createTencentOcrProvider,
  normalizeProviderError,
} = require('../cloudfunctions/extractFoodCandidates/tencentOcrProvider')
const {
  extractCandidatePayload,
  findDateCandidates,
} = require('../cloudfunctions/extractFoodCandidates/candidateExtractor')
const {
  runTrustedCandidatePipeline,
} = require('../cloudfunctions/extractFoodCandidates/pipeline')
const {
  sanitizeRecognitionCandidate,
} = require('../utils/recognitionCandidate')
const realSamples = require('./fixtures/ocr-real-samples.json')
const realDateSamples = require('./fixtures/ocr-real-date-samples.json')

async function run() {
  const calls = []
  const client = {
    GeneralBasicOCR(params) {
      calls.push(params)
      return Promise.resolve({
        TextDetections: [
          { DetectedText: 'Fresh Milk', Confidence: 96 },
          { DetectedText: '生产日期 2026-07-01', Confidence: 92 },
          { DetectedText: '有效期至 2026-07-15', Confidence: 88 },
          { DetectedText: '数量 2 盒', Confidence: 81 },
        ],
      })
    },
  }
  const provider = createTencentOcrProvider({ client })
  assert.strictEqual(provider.name, 'tencent-general-basic')
  const recognition = await provider.recognize({
    imageUrl: 'https://example.invalid/public-test.jpg',
  })

  assert.strictEqual(calls.length, 1)
  assert.deepStrictEqual(calls[0], {
    ImageUrl: 'https://example.invalid/public-test.jpg',
  })
  assert.strictEqual(recognition.provider, 'tencent-general-basic')
  assert.strictEqual(recognition.lineCount, 4)
  assert.strictEqual(recognition.detections[0].confidence, 0.96)

  const extracted = extractCandidatePayload(recognition.detections)
  assert.strictEqual(extracted.fields.name.value, '牛奶')
  assert.strictEqual(extracted.fields.category.value, '乳制品')
  assert.strictEqual(extracted.fields.storageLocation.value, '冷藏')
  assert.strictEqual(extracted.fields.quantity.value, '2')
  assert.strictEqual(extracted.dateCandidates.length, 2)
  assert.strictEqual(extracted.dateCandidates[0].kind, 'production')
  assert.strictEqual(extracted.dateCandidates[0].value, '2026-07-01')
  assert.strictEqual(extracted.dateCandidates[1].kind, 'expire')
  assert.strictEqual(extracted.dateCandidates[1].value, '2026-07-15')
  assert.strictEqual(extracted.requiresConfirmation, true)
  assert.strictEqual(extracted.autoWriteAllowed, false)
  assert.ok(!JSON.stringify(extracted).includes('Fresh Milk'))
  assert.ok(!Object.prototype.hasOwnProperty.call(extracted, 'rawText'))

  const reviewed = sanitizeRecognitionCandidate(extracted)
  assert.strictEqual(reviewed.requiresConfirmation, true)
  assert.strictEqual(reviewed.autoWriteAllowed, false)
  assert.strictEqual(reviewed.fields.name.value, '牛奶')
  assert.strictEqual(reviewed.dates.productionDate, '2026-07-01')
  assert.strictEqual(reviewed.dates.expireDate, '2026-07-15')

  const pipelineResult = await runTrustedCandidatePipeline(
    { imageUrl: 'https://example.invalid/public-test.jpg' },
    { provider },
  )
  assert.strictEqual(pipelineResult.ok, true)
  assert.strictEqual(pipelineResult.providerMeta.lineCount, 4)
  assert.ok(!Object.prototype.hasOwnProperty.call(pipelineResult.data, 'rawText'))

  const authError = normalizeProviderError({
    code: 'AuthFailure.SignatureFailure',
  })
  assert.strictEqual(authError.code, 'PROVIDER_AUTH_FAILED')
  assert.strictEqual(authError.providerCode, 'AuthFailure.SignatureFailure')
  assert.strictEqual(
    normalizeProviderError({ code: 'RequestLimitExceeded' }).code,
    'PROVIDER_RATE_LIMITED',
  )
  assert.strictEqual(
    normalizeProviderError({ code: 'ETIMEDOUT' }).code,
    'PROVIDER_TIMEOUT',
  )
  assert.strictEqual(
    normalizeProviderError({ code: 'InvalidParameterValue' }).code,
    'PROVIDER_INVALID_IMAGE',
  )
  assert.strictEqual(realSamples.length, 20)
  assert.strictEqual(new Set(realSamples.map((sample) => sample.id)).size, 20)
  assert.strictEqual(new Set(realSamples.map((sample) => sample.title)).size, 20)
  assert.ok(realSamples.every((sample) => sample.title.startsWith('File:')))
  assert.ok(new Set(realSamples.map((sample) => sample.scenario)).size >= 10)
  assert.strictEqual(realDateSamples.length, 12)
  assert.strictEqual(
    new Set(realDateSamples.map((sample) => sample.id)).size,
    12,
  )
  assert.strictEqual(
    new Set(realDateSamples.map((sample) => sample.title)).size,
    12,
  )
  assert.ok(
    realDateSamples.every((sample) => sample.title.startsWith('File:')),
  )
  assert.ok(
    new Set(realDateSamples.map((sample) => sample.scenario)).size >= 10,
  )

  const localizedDates = findDateCandidates([
    { text: 'MHD 12.01.2026', confidence: 0.91 },
    { text: 'Manufacture Date 28/05/2026', confidence: 0.89 },
    { text: 'EXP 05/28/2026', confidence: 0.87 },
    { text: 'EXP 05/06/2026', confidence: 0.95 },
  ])
  assert.strictEqual(localizedDates.length, 3)
  assert.deepStrictEqual(
    localizedDates.map((candidate) => candidate.value),
    ['2026-01-12', '2026-05-28', '2026-05-28'],
  )
  assert.deepStrictEqual(
    localizedDates.map((candidate) => candidate.kind),
    ['expire', 'production', 'expire'],
  )
  assert.ok(
    !localizedDates.some((candidate) => candidate.value === '2026-05-06'),
  )
  assert.strictEqual(localizedDates[0].confidence, 0.91)
  assert.strictEqual(localizedDates[1].confidence, 0.89)
  assert.strictEqual(localizedDates[2].confidence, 0.87)
  assert.ok(localizedDates.every((candidate) => candidate.value.length === 10))

  console.log('tencent-ocr-provider: 50 assertions passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
