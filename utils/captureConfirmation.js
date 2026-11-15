const {
  CATEGORY_OPTIONS,
  STORAGE_LOCATION_OPTIONS,
  normalizeStorageLocation,
} = require('./constants')
const {
  sanitizeRecognitionCandidate,
} = require('./recognitionCandidate')

function normalizeCandidateForm(candidatePayload, fallbackLocation = '') {
  const review = sanitizeRecognitionCandidate(candidatePayload)
  const quantity = review.fields.quantity.value
  const storageLocation = review.fields.storageLocation.value ||
    normalizeStorageLocation(fallbackLocation || '冷藏')
  return {
    review,
    form: {
      name: review.fields.name.value || '',
      category: review.fields.category.value || '其他',
      quantityTracked: Boolean(quantity),
      quantity: quantity || 1,
      productionDate: review.dates.productionDate || '',
      expireDate: review.dates.expireDate || '',
      storageLocation,
    },
  }
}

function buildDateCandidateViews(review = {}) {
  const dates = review.dates || {}
  const labels = {
    production: '生产日期候选',
    expire: '到期日候选',
    unknown: '含义未确定的日期',
  }
  return (dates.candidates || [])
    .filter((candidate) => candidate.value)
    .map((candidate, index) => ({
      key: `${candidate.kind}-${candidate.value}-${index}`,
      label: labels[candidate.kind] || labels.unknown,
      value: candidate.value,
      status:
        candidate.status === 'low_confidence'
          ? '低置信，请核对'
          : '待确认',
      critical:
        candidate.status === 'low_confidence' ||
        candidate.kind === 'unknown',
    }))
}

function validateConfirmationForm(form = {}) {
  const review = sanitizeRecognitionCandidate({
    fields: {
      name: { value: form.name, confidence: 1 },
      category: { value: form.category, confidence: 1 },
      quantity: form.quantityTracked
        ? { value: form.quantity, confidence: 1 }
        : undefined,
      storageLocation: {
        value: form.storageLocation,
        confidence: 1,
      },
      productionDate: form.productionDate
        ? { value: form.productionDate, confidence: 1 }
        : undefined,
      expireDate: form.expireDate
        ? { value: form.expireDate, confidence: 1 }
        : undefined,
    },
  })
  const errors = []
  if (!review.fields.name.value) errors.push('请确认食材名称')
  if (!CATEGORY_OPTIONS.includes(review.fields.category.value)) {
    errors.push('请选择有效品类')
  }
  if (!STORAGE_LOCATION_OPTIONS.includes(
    review.fields.storageLocation.value,
  )) {
    errors.push('请选择有效分区')
  }
  if (form.quantityTracked && !review.fields.quantity.value) {
    errors.push('数量需要是 1 到 999 的整数')
  }
  if (!review.dates.expireDate) errors.push('请确认过期日期')
  if (review.dates.conflict) errors.push('日期仍有冲突，请重新选择')

  return {
    valid: errors.length === 0,
    errors,
    preset: {
      name: review.fields.name.value,
      category: review.fields.category.value || '其他',
      quantityTracked: form.quantityTracked === true,
      quantity: form.quantityTracked
        ? review.fields.quantity.value || 1
        : 1,
      productionDate: review.dates.productionDate,
      shelfLifeDays: '',
      expireDate: review.dates.expireDate,
      storageLocation:
        review.fields.storageLocation.value || '冷藏',
      note: '',
      source: 'photo',
    },
  }
}

module.exports = {
  buildDateCandidateViews,
  normalizeCandidateForm,
  validateConfirmationForm,
}
