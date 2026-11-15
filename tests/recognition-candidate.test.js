const assert = require('assert')
const {
  classifyRecognitionFailure,
  MAX_NAME_LENGTH,
  sanitizeRecognitionCandidate,
} = require('../utils/recognitionCandidate')

let assertionCount = 0

function strictEqual(actual, expected, message) {
  assertionCount += 1
  assert.strictEqual(actual, expected, message)
}

function deepStrictEqual(actual, expected, message) {
  assertionCount += 1
  assert.deepStrictEqual(actual, expected, message)
}

function ok(actual, message) {
  assertionCount += 1
  assert.ok(actual, message)
}

function verifyReviewContract(review, sampleId) {
  strictEqual(review.requiresConfirmation, true, `${sampleId}: 必须人工确认`)
  strictEqual(review.autoWriteAllowed, false, `${sampleId}: 禁止自动写入`)
  strictEqual(
    Object.prototype.hasOwnProperty.call(review, 'rawText'),
    false,
    `${sampleId}: 不保留 OCR 原文`,
  )
}

const samples = [
  {
    id: 'clear-package',
    input: {
      fields: {
        name: { value: '牛奶', confidence: 0.96 },
        category: { value: '乳制品', confidence: 0.92 },
        quantity: { value: '2', confidence: 0.9 },
        storageLocation: { value: '冷藏', confidence: 0.91 },
        productionDate: { value: '2026-07-20', confidence: 0.9 },
        expireDate: { value: '2026-08-05', confidence: 0.93 },
      },
    },
    verify(review) {
      strictEqual(review.fields.name.value, '牛奶')
      strictEqual(review.fields.quantity.value, 2)
      strictEqual(review.dates.conflict, false)
      strictEqual(review.attentionLevel, 'review')
    },
  },
  {
    id: 'blurred-low-confidence',
    input: {
      fields: {
        name: { value: '酸奶', confidence: 0.42 },
        expireDate: { value: '2026-08-01', confidence: 0.5 },
      },
    },
    verify(review) {
      strictEqual(review.fields.name.status, 'low_confidence')
      strictEqual(review.attentionLevel, 'warning')
      ok(review.warnings.some((warning) => warning.code === 'low_confidence'))
    },
  },
  {
    id: 'no-date',
    input: {
      fields: {
        name: { value: '苹果', confidence: 0.9 },
        category: { value: '水果', confidence: 0.9 },
      },
    },
    verify(review) {
      strictEqual(review.dates.candidates.length, 0)
      ok(review.warnings.some((warning) => warning.code === 'date_missing'))
    },
  },
  {
    id: 'multiple-expire-dates',
    input: {
      fields: {
        name: { value: '面包', confidence: 0.9 },
      },
      dateCandidates: [
        { kind: 'expire', value: '2026-07-26', confidence: 0.88 },
        { kind: 'expire', value: '2026-08-02', confidence: 0.86 },
      ],
    },
    verify(review) {
      strictEqual(review.dates.conflict, true)
      strictEqual(review.dates.expireDate, '')
      ok(review.dates.conflictCodes.includes('multiple_expire_dates'))
      strictEqual(review.attentionLevel, 'critical')
    },
  },
  {
    id: 'date-order-conflict',
    input: {
      fields: {
        name: { value: '豆腐', confidence: 0.9 },
        productionDate: { value: '2026-08-10', confidence: 0.9 },
        expireDate: { value: '2026-08-01', confidence: 0.9 },
      },
    },
    verify(review) {
      strictEqual(review.dates.conflict, true)
      ok(review.dates.conflictCodes.includes('date_order_conflict'))
    },
  },
  {
    id: 'invalid-calendar-date',
    input: {
      fields: {
        name: { value: '鸡蛋', confidence: 0.9 },
        expireDate: { value: '2026-02-30', confidence: 0.9 },
      },
    },
    verify(review) {
      strictEqual(review.dates.expireDate, '')
      ok(review.warnings.some((warning) => warning.code === 'date_invalid'))
    },
  },
  {
    id: 'chinese-date-format',
    input: {
      fields: {
        name: { value: '黄瓜', confidence: 0.9 },
        productionDate: { value: '2026年7月21日', confidence: 0.9 },
        expireDate: { value: '2026年7月28日', confidence: 0.9 },
      },
    },
    verify(review) {
      strictEqual(review.dates.productionDate, '2026-07-21')
      strictEqual(review.dates.expireDate, '2026-07-28')
    },
  },
  {
    id: 'duplicate-same-date',
    input: {
      fields: {
        name: { value: '果汁', confidence: 0.9 },
      },
      dateCandidates: [
        { kind: 'expire', value: '2026-09-01', confidence: 0.6 },
        { kind: 'expire', value: '2026/09/01', confidence: 0.95 },
      ],
    },
    verify(review) {
      strictEqual(review.dates.conflict, false)
      strictEqual(review.dates.expireDate, '2026-09-01')
      strictEqual(review.dates.candidates.length, 1)
    },
  },
  {
    id: 'full-width-quantity-with-unit',
    input: {
      fields: {
        name: { value: '苏打水', confidence: 0.9 },
        quantity: { value: '２盒', confidence: 0.85 },
      },
    },
    verify(review) {
      strictEqual(review.fields.quantity.value, 2)
      strictEqual(review.fields.quantity.normalized, true)
    },
  },
  {
    id: 'invalid-zero-quantity',
    input: {
      fields: {
        name: { value: '鸡胸肉', confidence: 0.9 },
        quantity: { value: '0', confidence: 0.9 },
      },
    },
    verify(review) {
      strictEqual(review.fields.quantity.status, 'invalid')
      strictEqual(review.fields.quantity.value, '')
    },
  },
  {
    id: 'unknown-storage-location',
    input: {
      fields: {
        name: { value: '冰淇淋', confidence: 0.9 },
        storageLocation: { value: '地下室', confidence: 0.9 },
      },
    },
    verify(review) {
      strictEqual(review.fields.storageLocation.status, 'invalid')
      strictEqual(review.fields.storageLocation.value, '')
    },
  },
  {
    id: 'storage-location-alias',
    input: {
      fields: {
        name: { value: '生菜', confidence: 0.9 },
        storageLocation: { value: '保鲜', confidence: 0.9 },
      },
    },
    verify(review) {
      strictEqual(review.fields.storageLocation.value, '果蔬抽屉')
      strictEqual(review.fields.storageLocation.normalized, true)
    },
  },
  {
    id: 'unknown-category',
    input: {
      fields: {
        name: { value: '零食', confidence: 0.9 },
        category: { value: '休闲食品', confidence: 0.9 },
      },
    },
    verify(review) {
      strictEqual(review.fields.category.status, 'invalid')
      strictEqual(review.fields.category.value, '')
    },
  },
  {
    id: 'control-character-name',
    input: {
      fields: {
        name: { value: '  牛奶\u0000\n  ', confidence: 0.9 },
      },
    },
    verify(review) {
      strictEqual(review.fields.name.value, '牛奶')
      strictEqual(review.fields.name.normalized, true)
    },
  },
  {
    id: 'long-name',
    input: {
      fields: {
        name: {
          value: '超长食品名称'.repeat(8),
          confidence: 0.9,
        },
      },
    },
    verify(review) {
      strictEqual(review.fields.name.value.length, MAX_NAME_LENGTH)
      ok(review.warnings.some((warning) => warning.code === 'name_truncated'))
    },
  },
  {
    id: 'missing-name-manual-fallback',
    input: {
      fields: {
        expireDate: { value: '2026-08-01', confidence: 0.9 },
      },
    },
    verify(review) {
      strictEqual(review.manualFallbackRecommended, true)
      strictEqual(review.fields.name.status, 'missing')
      ok(review.warnings.some((warning) => warning.code === 'name_missing'))
    },
  },
  {
    id: 'weak-network',
    failure: { code: 'NETWORK_OFFLINE', message: 'request:fail network' },
    verifyFailure(result) {
      strictEqual(result.code, 'network_unavailable')
      strictEqual(result.retryable, true)
      strictEqual(result.fallbackToManual, true)
    },
  },
  {
    id: 'recognition-timeout',
    failure: { code: 'TIMEOUT', message: 'recognition timeout' },
    verifyFailure(result) {
      strictEqual(result.code, 'timeout')
      strictEqual(result.retryable, true)
      strictEqual(result.fallbackToManual, true)
    },
  },
  {
    id: 'user-cancelled',
    failure: { code: 'USER_CANCELLED', message: 'cancel' },
    verifyFailure(result) {
      strictEqual(result.code, 'user_cancelled')
      strictEqual(result.cancelled, true)
      strictEqual(result.message, '')
      strictEqual(result.fallbackToManual, true)
    },
  },
  {
    id: 'server-gate-closed',
    failure: { code: 'GATE_CLOSED', message: 'feature disabled' },
    verifyFailure(result) {
      strictEqual(result.code, 'feature_disabled')
      strictEqual(result.retryable, false)
      strictEqual(result.fallbackToManual, true)
    },
  },
]

samples.forEach((sample) => {
  if (sample.failure) {
    const result = classifyRecognitionFailure(sample.failure)
    sample.verifyFailure(result)
    return
  }

  const review = sanitizeRecognitionCandidate(sample.input)
  verifyReviewContract(review, sample.id)
  sample.verify(review)
})

strictEqual(samples.length, 20, '必须保持 20 组构造契约样本')
deepStrictEqual(
  sanitizeRecognitionCandidate(null).fields.name.value,
  '',
  '空输入应安全降级',
)

console.log(
  `recognition-candidate: ${assertionCount} assertions passed across ${samples.length} synthetic contract samples`,
)
