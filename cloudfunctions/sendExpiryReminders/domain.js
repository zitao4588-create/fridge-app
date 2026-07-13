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
      record.remindDate === remindDate,
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
      record.status === 'sent' &&
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

function classifySendError(error) {
  const detail = error && error.message ? error.message : 'send failed'
  const refused = /43101|user refuse to accept/i.test(detail)

  return {
    detail,
    status: refused ? 'refused' : 'failed',
    failureCode: refused ? 'NO_ACTIVE_GRANT' : 'SEND_FAILED',
    retryable: !refused,
  }
}

module.exports = {
  AUTH_RECORD_TYPE,
  REMINDER_RECORD_TYPE,
  classifySendError,
  getAuthorizationState,
  hasDailySummaryRecord,
}
