const {
  CATEGORY_OPTIONS,
  STORAGE_LOCATION_OPTIONS,
} = require('./constants')

const CANDIDATE_SCHEMA_VERSION = 1
const LOW_CONFIDENCE_THRESHOLD = 0.7
const MAX_NAME_LENGTH = 30

const STORAGE_LOCATION_ALIASES = {
  保鲜: '果蔬抽屉',
  果蔬: '果蔬抽屉',
  果蔬区: '果蔬抽屉',
  蔬果区: '果蔬抽屉',
  常温区: '常温',
  冷藏区: '冷藏',
  冷冻区: '冷冻',
  变温区: '变温',
  门上储物格: '门架',
  冰箱门: '门架',
}

const DATE_KINDS = ['production', 'expire', 'unknown']

function normalizeText(value) {
  let text = String(value === undefined || value === null ? '' : value)

  try {
    text = text.normalize('NFKC')
  } catch (error) {
    // 旧基础库不支持 Unicode normalize 时，仍继续执行其余清洗。
  }

  return text
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function readCandidateField(input) {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return {
      value: input.value,
      confidence: normalizeConfidence(input.confidence),
    }
  }

  return {
    value: input,
    confidence: null,
  }
}

function normalizeConfidence(value) {
  const confidence = Number(value)

  return Number.isFinite(confidence) && confidence >= 0 && confidence <= 1
    ? confidence
    : null
}

function sanitizeName(value) {
  const normalized = normalizeText(value)
  const nextValue = normalized.slice(0, MAX_NAME_LENGTH)

  return {
    value: nextValue,
    valid: Boolean(nextValue),
    normalized: nextValue !== String(value === undefined || value === null ? '' : value),
    issueCode: normalized.length > MAX_NAME_LENGTH ? 'name_truncated' : '',
  }
}

function sanitizeCategory(value) {
  const normalized = normalizeText(value)

  return {
    value: CATEGORY_OPTIONS.includes(normalized) ? normalized : '',
    valid: CATEGORY_OPTIONS.includes(normalized),
    normalized: normalized !== String(value === undefined || value === null ? '' : value),
    issueCode: normalized && !CATEGORY_OPTIONS.includes(normalized)
      ? 'category_invalid'
      : '',
  }
}

function sanitizeStorageLocation(value) {
  const normalized = normalizeText(value)
  const nextValue = STORAGE_LOCATION_ALIASES[normalized] || normalized
  const valid = STORAGE_LOCATION_OPTIONS.includes(nextValue)

  return {
    value: valid ? nextValue : '',
    valid,
    normalized: valid && nextValue !== String(value === undefined || value === null ? '' : value),
    issueCode: normalized && !valid ? 'storage_location_invalid' : '',
  }
}

function sanitizeQuantity(value) {
  const normalized = normalizeText(value)
  const matched = normalized.match(
    /^(\d{1,3})(?:\s*(?:个|盒|瓶|袋|包|斤|克|毫升|份))?$/,
  )
  const quantity = matched ? Number(matched[1]) : NaN
  const valid = Number.isInteger(quantity) && quantity > 0 && quantity <= 999

  return {
    value: valid ? quantity : '',
    valid,
    normalized: valid && normalized !== String(quantity),
    issueCode: normalized && !valid ? 'quantity_invalid' : '',
  }
}

function normalizeDateValue(value) {
  const normalized = normalizeText(value)
  const compactMatched = normalized.match(/^(\d{4})(\d{2})(\d{2})$/)
  const separatedMatched = normalized.match(
    /^(\d{4})\s*(?:-|\/|\.|年)\s*(\d{1,2})\s*(?:-|\/|\.|月)\s*(\d{1,2})\s*日?$/,
  )
  const matched = compactMatched || separatedMatched

  if (!matched) {
    return {
      value: '',
      valid: false,
      normalized: false,
      issueCode: normalized ? 'date_invalid' : '',
    }
  }

  const year = Number(matched[1])
  const month = Number(matched[2])
  const day = Number(matched[3])
  const date = new Date(year, month - 1, day)
  const valid =
    year >= 2000 &&
    year <= 2100 &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day

  if (!valid) {
    return {
      value: '',
      valid: false,
      normalized: false,
      issueCode: 'date_invalid',
    }
  }

  const valueString = [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-')

  return {
    value: valueString,
    valid: true,
    normalized: valueString !== normalized,
    issueCode: '',
  }
}

function buildField(field, input, sanitizer) {
  const candidate = readCandidateField(input)
  const sanitized = sanitizer(candidate.value)
  let status = 'missing'

  if (sanitized.valid) {
    status =
      candidate.confidence !== null &&
      candidate.confidence >= LOW_CONFIDENCE_THRESHOLD
        ? 'candidate'
        : 'low_confidence'
  } else if (normalizeText(candidate.value)) {
    status = 'invalid'
  }

  return {
    field,
    value: sanitized.value,
    confidence: candidate.confidence,
    status,
    normalized: sanitized.normalized,
    issueCode: sanitized.issueCode,
    requiresConfirmation: true,
  }
}

function normalizeDateKind(value) {
  const kind = normalizeText(value).toLowerCase()
  return DATE_KINDS.includes(kind) ? kind : 'unknown'
}

function buildDateCandidate(input, fallbackKind) {
  const candidate = readCandidateField(input)
  const kind =
    input && typeof input === 'object' && !Array.isArray(input)
      ? normalizeDateKind(input.kind || fallbackKind)
      : normalizeDateKind(fallbackKind)
  const sanitized = normalizeDateValue(candidate.value)
  let status = 'missing'

  if (sanitized.valid) {
    status =
      candidate.confidence !== null &&
      candidate.confidence >= LOW_CONFIDENCE_THRESHOLD
        ? 'candidate'
        : 'low_confidence'
  } else if (normalizeText(candidate.value)) {
    status = 'invalid'
  }

  return {
    kind,
    value: sanitized.value,
    confidence: candidate.confidence,
    status,
    normalized: sanitized.normalized,
    issueCode: sanitized.issueCode,
    requiresConfirmation: true,
  }
}

function deduplicateDateCandidates(candidates) {
  const byKey = new Map()

  candidates.forEach((candidate) => {
    const key = candidate.value
      ? `${candidate.kind}:${candidate.value}`
      : `${candidate.kind}:${candidate.issueCode}:${candidate.status}`
    const existing = byKey.get(key)
    const existingConfidence =
      existing && existing.confidence !== null ? existing.confidence : -1
    const nextConfidence =
      candidate.confidence !== null ? candidate.confidence : -1

    if (!existing || nextConfidence > existingConfidence) {
      byKey.set(key, candidate)
    }
  })

  return Array.from(byKey.values())
}

function pushWarning(warnings, warning) {
  const key = `${warning.code}:${warning.field || ''}`

  if (!warnings.some((item) => `${item.code}:${item.field || ''}` === key)) {
    warnings.push(warning)
  }
}

function buildDateReview(payload, inputFields, warnings) {
  const rawCandidates = []

  if (inputFields.productionDate !== undefined) {
    rawCandidates.push(
      buildDateCandidate(inputFields.productionDate, 'production'),
    )
  }

  if (inputFields.expireDate !== undefined) {
    rawCandidates.push(buildDateCandidate(inputFields.expireDate, 'expire'))
  }

  if (Array.isArray(payload.dateCandidates)) {
    payload.dateCandidates.forEach((candidate) => {
      rawCandidates.push(buildDateCandidate(candidate, 'unknown'))
    })
  }

  const candidates = deduplicateDateCandidates(
    rawCandidates.filter((candidate) => candidate.status !== 'missing'),
  )
  const validCandidates = candidates.filter((candidate) => candidate.value)

  candidates.forEach((candidate) => {
    if (candidate.status === 'invalid') {
      pushWarning(warnings, {
        code: 'date_invalid',
        field: candidate.kind,
        message: '识别到了无法确认的日期，请手动选择',
      })
    } else if (candidate.status === 'low_confidence') {
      pushWarning(warnings, {
        code: 'low_confidence',
        field: candidate.kind,
        message: '日期识别置信度较低，请重点核对',
      })
    }
  })

  const productionValues = Array.from(
    new Set(
      validCandidates
        .filter((candidate) => candidate.kind === 'production')
        .map((candidate) => candidate.value),
    ),
  )
  const expireValues = Array.from(
    new Set(
      validCandidates
        .filter((candidate) => candidate.kind === 'expire')
        .map((candidate) => candidate.value),
    ),
  )
  const unknownValues = Array.from(
    new Set(
      validCandidates
        .filter((candidate) => candidate.kind === 'unknown')
        .map((candidate) => candidate.value),
    ),
  )
  const conflictCodes = []

  if (productionValues.length > 1) {
    conflictCodes.push('multiple_production_dates')
  }

  if (expireValues.length > 1) {
    conflictCodes.push('multiple_expire_dates')
  }

  if (unknownValues.length > 1) {
    conflictCodes.push('multiple_unknown_dates')
  }

  const productionDate =
    productionValues.length === 1 ? productionValues[0] : ''
  const expireDate = expireValues.length === 1 ? expireValues[0] : ''

  if (productionDate && expireDate && productionDate > expireDate) {
    conflictCodes.push('date_order_conflict')
  }

  if (unknownValues.length === 1) {
    pushWarning(warnings, {
      code: 'unclassified_date',
      field: 'date',
      message: '识别到一个未确定含义的日期，请选择它是生产日期还是到期日',
    })
  }

  if (validCandidates.length === 0) {
    pushWarning(warnings, {
      code: 'date_missing',
      field: 'date',
      message: '没有可靠日期，请手动填写',
    })
  }

  if (conflictCodes.length > 0) {
    pushWarning(warnings, {
      code: 'date_conflict',
      field: 'date',
      message: '识别到多个日期或日期顺序冲突，禁止自动采用',
    })
  }

  return {
    candidates,
    productionDate: conflictCodes.includes('multiple_production_dates')
      ? ''
      : productionDate,
    expireDate: conflictCodes.includes('multiple_expire_dates')
      ? ''
      : expireDate,
    unknownDates: unknownValues,
    conflict: conflictCodes.length > 0,
    conflictCodes,
    requiresConfirmation: true,
  }
}

function addFieldWarnings(fields, warnings) {
  Object.values(fields).forEach((field) => {
    if (field.field === 'name' && field.status === 'missing') {
      pushWarning(warnings, {
        code: 'name_missing',
        field: field.field,
        message: '没有可靠名称，请手动填写',
      })
    }

    if (field.status === 'low_confidence') {
      pushWarning(warnings, {
        code: 'low_confidence',
        field: field.field,
        message: `${field.field}识别置信度较低，请重点核对`,
      })
    }

    if (field.status === 'invalid') {
      pushWarning(warnings, {
        code: field.issueCode || 'candidate_invalid',
        field: field.field,
        message: `${field.field}候选无效，请手动填写`,
      })
    }

    if (field.issueCode === 'name_truncated') {
      pushWarning(warnings, {
        code: 'name_truncated',
        field: field.field,
        message: '名称候选过长，已截断，请核对',
      })
    }
  })
}

function sanitizeRecognitionCandidate(payload = {}) {
  const safePayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {}
  const inputFields =
    safePayload.fields &&
    typeof safePayload.fields === 'object' &&
    !Array.isArray(safePayload.fields)
      ? safePayload.fields
      : safePayload
  const fields = {
    name: buildField('name', inputFields.name, sanitizeName),
    category: buildField('category', inputFields.category, sanitizeCategory),
    quantity: buildField('quantity', inputFields.quantity, sanitizeQuantity),
    storageLocation: buildField(
      'storageLocation',
      inputFields.storageLocation,
      sanitizeStorageLocation,
    ),
  }
  const warnings = []

  addFieldWarnings(fields, warnings)
  const dates = buildDateReview(safePayload, inputFields, warnings)
  const attentionLevel = dates.conflict
    ? 'critical'
    : warnings.length > 0
      ? 'warning'
      : 'review'

  return {
    schemaVersion: CANDIDATE_SCHEMA_VERSION,
    source: 'non_generative_candidate',
    fields,
    dates,
    warnings,
    attentionLevel,
    requiresConfirmation: true,
    autoWriteAllowed: false,
    manualFallbackRecommended: !fields.name.value,
  }
}

function classifyRecognitionFailure(error) {
  const code = normalizeText(error && error.code).toLowerCase()
  const message = normalizeText(
    error && (error.errMsg || error.message),
  ).toLowerCase()
  const combined = `${code} ${message}`

  if (combined.includes('cancel')) {
    return {
      code: 'user_cancelled',
      cancelled: true,
      retryable: false,
      fallbackToManual: true,
      message: '',
    }
  }

  if (combined.includes('privacy') || combined.includes('scope is not declared')) {
    return {
      code: 'privacy_not_ready',
      cancelled: false,
      retryable: false,
      fallbackToManual: true,
      message: '图片隐私配置尚未完成，请使用手动填写',
    }
  }

  if (
    combined.includes('disabled') ||
    combined.includes('feature_off') ||
    combined.includes('gate_closed')
  ) {
    return {
      code: 'feature_disabled',
      cancelled: false,
      retryable: false,
      fallbackToManual: true,
      message: '图片识别当前未开放，请使用手动填写',
    }
  }

  if (combined.includes('timeout')) {
    return {
      code: 'timeout',
      cancelled: false,
      retryable: true,
      fallbackToManual: true,
      message: '识别超时，可重试或使用手动填写',
    }
  }

  if (
    combined.includes('network') ||
    combined.includes('offline') ||
    combined.includes('request:fail')
  ) {
    return {
      code: 'network_unavailable',
      cancelled: false,
      retryable: true,
      fallbackToManual: true,
      message: '网络不稳定，可重试或使用手动填写',
    }
  }

  if (
    combined.includes('invalid_response') ||
    combined.includes('invalid_candidate')
  ) {
    return {
      code: 'invalid_response',
      cancelled: false,
      retryable: true,
      fallbackToManual: true,
      message: '没有得到可靠候选，可重试或使用手动填写',
    }
  }

  return {
    code: 'recognition_failed',
    cancelled: false,
    retryable: true,
    fallbackToManual: true,
    message: '识别失败，可重试或使用手动填写',
  }
}

module.exports = {
  CANDIDATE_SCHEMA_VERSION,
  classifyRecognitionFailure,
  LOW_CONFIDENCE_THRESHOLD,
  MAX_NAME_LENGTH,
  normalizeDateValue,
  sanitizeRecognitionCandidate,
}
