const assert = require('assert')
const {
  classifySendError,
  getAuthorizationState,
  hasDailySummaryRecord,
} = require('../backend/reminders/domain')

const backendServicePath = require.resolve('../services/backendService')
const reminderServicePath = require.resolve('../services/reminderService')

assert.deepStrictEqual(getAuthorizationState([]), {
  available: false,
  availableCredits: 0,
  reason: 'NO_RECORDED_AUTHORIZATION',
})
assert.strictEqual(
  getAuthorizationState([
    { type: 'subscriptionAuthorization', status: 'accepted', createdAt: 10 },
  ]).available,
  true,
)
assert.strictEqual(
  getAuthorizationState([
    { type: 'subscriptionAuthorization', status: 'accepted', createdAt: 10 },
    { type: 'subscriptionAuthorization', status: 'rejected', createdAt: 20 },
  ]).available,
  true,
)
assert.strictEqual(
  getAuthorizationState([
    { type: 'subscriptionAuthorization', status: 'accepted', createdAt: 10 },
    { type: 'expirySummary', status: 'sent', createdAt: 20 },
  ]).available,
  false,
)
assert.strictEqual(
  getAuthorizationState([
    { type: 'subscriptionAuthorization', status: 'accepted', createdAt: 10 },
    { type: 'subscriptionAuthorization', status: 'accepted', createdAt: 20 },
    { type: 'expirySummary', status: 'sent', createdAt: 30 },
  ]).availableCredits,
  1,
)
assert.strictEqual(
  getAuthorizationState([
    { type: 'expirySummary', status: 'refused', createdAt: 20 },
    { type: 'subscriptionAuthorization', status: 'accepted', createdAt: 30 },
  ]).available,
  true,
)
assert.strictEqual(
  getAuthorizationState([
    { type: 'subscriptionAuthorization', status: 'accepted', createdAt: 10 },
    { type: 'expirySummary', status: 'refused', createdAt: 20 },
  ]).available,
  false,
)
assert.strictEqual(
  hasDailySummaryRecord(
    [{ type: 'expirySummary', status: 'failed', remindDate: '2026-07-13' }],
    '2026-07-13',
  ),
  true,
)
assert.deepStrictEqual(
  classifySendError(new Error('errCode: 43101 | user refuse to accept the msg')),
  {
    detail: 'errCode: 43101 | user refuse to accept the msg',
    status: 'refused',
    category: 'user',
    failureCode: 'NO_ACTIVE_GRANT',
    retryable: false,
    deliveryOutcome: 'API_REJECTED',
  },
)
assert.strictEqual(
  classifySendError(new Error('request timeout')).retryable,
  false,
)

async function testAuthorizationRecording() {
  const originalWx = global.wx
  const writes = []
  let failWrite = false

  try {
    global.wx = {
      login({ success }) {
        success({ code: 'synthetic-code' })
      },
      request({ url, data, success }) {
        if (url.endsWith('/session')) {
          success({ statusCode: 200, data: { ok: true, data: { token: 'synthetic-token' } } })
          return
        }
        if (failWrite) {
          success({ statusCode: 500, data: { ok: false, error: 'WRITE_FAILED', message: 'record failed' } })
          return
        }
        writes.push(data)
        success({ statusCode: 200, data: { ok: true, data: { _id: 'authorization_event' } } })
      },
      requestSubscribeMessage({ tmplIds, success }) {
        success({
          [tmplIds[0]]: 'accept',
          errMsg: 'requestSubscribeMessage:ok',
        })
      },
    }

    delete require.cache[backendServicePath]
    delete require.cache[reminderServicePath]
    const reminderService = require('../services/reminderService')

    assert.strictEqual(
      reminderService.getSubscribeDecisionStatus({ authorized: true }),
      'accepted',
    )
    assert.strictEqual(
      reminderService.getSubscribeDecisionStatus({ supported: true, setting: 'reject' }),
      'rejected',
    )

    const result = await reminderService.requestAndRecordSubscribeMessage()
    assert.strictEqual(result.authorized, true)
    assert.strictEqual(result.recorded, true)
    assert.strictEqual(writes.length, 1)
    assert.strictEqual(writes[0].action, 'createReminder')
    assert.strictEqual(writes[0].data.type, 'subscriptionAuthorization')
    assert.strictEqual(writes[0].data.status, 'accepted')
    assert.strictEqual(writes[0].data.subscribeMessageAuthorized, true)

    failWrite = true
    const unrecorded = await reminderService.requestAndRecordSubscribeMessage()
    assert.strictEqual(unrecorded.recorded, false)
  } finally {
    delete require.cache[backendServicePath]
    delete require.cache[reminderServicePath]
    global.wx = originalWx
  }
}

testAuthorizationRecording()
  .then(() => {
    console.log('reminder-domain: 20 assertions passed')
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
