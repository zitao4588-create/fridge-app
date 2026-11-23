const AUTH_RECORD_TYPE = 'subscriptionAuthorization'
const REMINDER_RECORD_TYPE = 'expirySummary'

function getRecordTime(record) {
  const value = Number(record && (record.createdAt || record.updatedAt))
  return Number.isFinite(value) ? value : 0
}

function getLatestRecord(records, predicate) {
  return (records || []).reduce((latest, record) => {
    if (!predicate(record)) return latest
    if (!latest || getRecordTime(record) > getRecordTime(latest)) return record
    return latest
  }, null)
}

function hasDailySummaryRecord(records, remindDate) {
  return (records || []).some(
    (record) =>
      record &&
      record.type === REMINDER_RECORD_TYPE &&
      record.remindDate === remindDate &&
      !(record.status === 'failed' && record.retryable === true &&
        ['NOT_SENT', 'API_REJECTED'].includes(record.deliveryOutcome)),
  )
}

function getAuthorizationState(records) {
  const latestRefusedDelivery = getLatestRecord(
    records,
    (record) =>
      record &&
      record.type === REMINDER_RECORD_TYPE &&
      record.status === 'refused',
  )
  const resetAt = getRecordTime(latestRefusedDelivery)
  const acceptedCount = (records || []).filter(
    (record) =>
      record &&
      record.type === AUTH_RECORD_TYPE &&
      record.status === 'accepted' &&
      getRecordTime(record) > resetAt,
  ).length
  const sentCount = (records || []).filter(
    (record) =>
      record &&
      record.type === REMINDER_RECORD_TYPE &&
      (record.status === 'sent' || record.status === 'sending' || record.deliveryOutcome === 'UNKNOWN') &&
      getRecordTime(record) > resetAt,
  ).length
  const availableCredits = Math.max(acceptedCount - sentCount, 0)

  if (acceptedCount === 0) {
    return {
      available: false,
      availableCredits: 0,
      reason: resetAt ? 'AUTHORIZATION_RESET_AFTER_REFUSAL' : 'NO_RECORDED_AUTHORIZATION',
    }
  }

  if (availableCredits === 0) {
    return {
      available: false,
      availableCredits: 0,
      reason: 'AUTHORIZATION_ALREADY_CONSUMED',
    }
  }

  return {
    available: true,
    availableCredits,
    reason: 'ACCEPTED_AUTHORIZATION_AVAILABLE',
  }
}

// Failure categories (stats only, never written as a new DB field):
// - config:    permanent until a human fixes configuration (IP whitelist, secret, template, cloud-call permission)
// - user:      the recipient cannot receive this message (refused / no grant / invalid openid / content)
// - transient: temporary, nothing was delivered, safe to try again later
// - unknown:   the request may or may not have reached the user; never treat as safe to resend
const FAILURE_CATEGORIES = ['config', 'user', 'transient', 'unknown']

// Official error codes:
// https://developers.weixin.qq.com/miniprogram/dev/server/API/mp-access-token/api_getstableaccesstoken.html
// https://developers.weixin.qq.com/miniprogram/dev/server/API/mp-access-token/api_getaccesstoken.html
// https://developers.weixin.qq.com/miniprogram/dev/server/API/mp-message-management/subscribe-message/api_sendmessage.html
const ERROR_CODE_TABLE = {
  40164: { category: 'config', failureCode: 'CONFIG_IP_NOT_WHITELISTED' },
  89503: { category: 'config', failureCode: 'CONFIG_IP_NOT_APPROVED' },
  89506: { category: 'config', failureCode: 'CONFIG_IP_NOT_APPROVED' },
  89507: { category: 'config', failureCode: 'CONFIG_IP_NOT_APPROVED' },
  40002: { category: 'config', failureCode: 'CONFIG_CREDENTIAL_INVALID' },
  40013: { category: 'config', failureCode: 'CONFIG_CREDENTIAL_INVALID' },
  40125: { category: 'config', failureCode: 'CONFIG_CREDENTIAL_INVALID' },
  40243: { category: 'config', failureCode: 'CONFIG_CREDENTIAL_INVALID' },
  41002: { category: 'config', failureCode: 'CONFIG_CREDENTIAL_INVALID' },
  41004: { category: 'config', failureCode: 'CONFIG_CREDENTIAL_INVALID' },
  50004: { category: 'config', failureCode: 'CONFIG_CREDENTIAL_INVALID' },
  50007: { category: 'config', failureCode: 'CONFIG_ACCOUNT_FROZEN' },
  40037: { category: 'config', failureCode: 'CONFIG_TEMPLATE_INVALID' },
  43107: { category: 'config', failureCode: 'CONFIG_TEMPLATE_BANNED' },
  47003: { category: 'config', failureCode: 'CONFIG_MESSAGE_DATA_INVALID' },
  // Cloud call: "没有权限（-604101）" per the official cloud-call guide.
  '-604101': { category: 'config', failureCode: 'CONFIG_CLOUD_OPENAPI_PERMISSION' },
  43101: { category: 'user', failureCode: 'NO_ACTIVE_GRANT', refused: true },
  40003: { category: 'user', failureCode: 'USER_INVALID_OPENID' },
  45168: { category: 'user', failureCode: 'USER_CONTENT_REJECTED' },
  // Send-stage token problems: delivery was rejected, token can be fetched again next run.
  40001: { category: 'transient', failureCode: 'TRANSIENT_ACCESS_TOKEN_INVALID' },
  40014: { category: 'transient', failureCode: 'TRANSIENT_ACCESS_TOKEN_INVALID' },
  42001: { category: 'transient', failureCode: 'TRANSIENT_ACCESS_TOKEN_INVALID' },
  '-1': { category: 'transient', failureCode: 'TRANSIENT_WECHAT_BUSY' },
  43108: { category: 'transient', failureCode: 'TRANSIENT_CONCURRENT_SEND' },
  45009: { category: 'transient', failureCode: 'TRANSIENT_QUOTA_LIMIT' },
  45011: { category: 'transient', failureCode: 'TRANSIENT_QUOTA_LIMIT' },
}

const SAFE_TO_RESEND_OUTCOMES = ['NOT_SENT', 'API_REJECTED']

function extractErrorCode(error) {
  if (!error) return null
  for (const key of ['wxErrorCode', 'errCode', 'errcode']) {
    const value = Number(error[key])
    if (error[key] !== undefined && error[key] !== null && Number.isInteger(value) && value !== 0) {
      return value
    }
  }
  const text = `${error.message || ''} ${error.errMsg || ''}`
  const match = text.match(/err(?:or)?\s*code[":\s]*(-?\d+)/i) || text.match(/\b(4\d{4}|8\d{4}|5000\d)\b/)
  return match ? Number(match[1]) : null
}

function lookupErrorCode(code, detail) {
  if (code !== null && ERROR_CODE_TABLE[String(code)]) {
    return ERROR_CODE_TABLE[String(code)]
  }
  if (/user refuse to accept/i.test(detail)) return ERROR_CODE_TABLE['43101']
  if (/invalid ip|not in whitelist/i.test(detail)) return ERROR_CODE_TABLE['40164']
  // Seen in this project when cloud.openapi ran from a timer trigger (BUG_NOTES 2026-06-16/17).
  if (/invalid wx openapi access_token/i.test(detail)) {
    return { category: 'config', failureCode: 'CONFIG_CLOUD_OPENAPI_UNAVAILABLE' }
  }
  return null
}

function classifySendError(error) {
  const detail = error && error.message ? error.message : 'send failed'
  const code = extractErrorCode(error)
  const known = lookupErrorCode(code, `${detail} ${(error && error.errMsg) || ''}`)
  const reported = error && SAFE_TO_RESEND_OUTCOMES.includes(error.deliveryOutcome)
    ? error.deliveryOutcome
    : ''
  // A recognised WeChat rejection (or a stage before any send) proves nothing was delivered.
  // Anything else (timeouts, socket errors mid-send) is UNKNOWN and must never be resent automatically.
  const deliveryOutcome = reported || (known ? 'API_REJECTED' : 'UNKNOWN')
  const refused = Boolean(known && known.refused)
  let category
  let failureCode

  if (known) {
    category = known.category
    failureCode = known.failureCode
  } else if (deliveryOutcome === 'UNKNOWN') {
    category = 'unknown'
    failureCode = 'SEND_OUTCOME_UNKNOWN'
  } else {
    category = 'transient'
    failureCode = deliveryOutcome === 'NOT_SENT' ? 'TRANSIENT_NOT_SENT' : 'TRANSIENT_API_REJECTED'
  }

  return {
    detail,
    status: refused ? 'refused' : 'failed',
    failureCode,
    category,
    // `retryable` keeps its existing meaning: "nothing was delivered, safe to send again".
    // Config failures are resend-safe too, but they will keep failing until a human fixes config.
    retryable: !refused && SAFE_TO_RESEND_OUTCOMES.includes(deliveryOutcome),
    deliveryOutcome,
  }
}

function isConfigFailure(classification) {
  return Boolean(classification && classification.category === 'config')
}

module.exports = {
  AUTH_RECORD_TYPE,
  FAILURE_CATEGORIES,
  REMINDER_RECORD_TYPE,
  classifySendError,
  extractErrorCode,
  getAuthorizationState,
  hasDailySummaryRecord,
  isConfigFailure,
}
