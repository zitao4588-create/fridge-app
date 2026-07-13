const assert = require('assert')
const {
  classifySendError,
  getAuthorizationState,
  hasDailySummaryRecord,
} = require('../cloudfunctions/sendExpiryReminders/domain')
const reminderService = require('../services/reminderService')

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
    failureCode: 'NO_ACTIVE_GRANT',
    retryable: false,
  },
)
assert.strictEqual(
  classifySendError(new Error('request timeout')).retryable,
  true,
)
assert.strictEqual(
  reminderService.getSubscribeDecisionStatus({ authorized: true }),
  'accepted',
)
assert.strictEqual(
  reminderService.getSubscribeDecisionStatus({ supported: true, setting: 'reject' }),
  'rejected',
)

async function testAuthorizationRecording() {
  const originalWx = global.wx
  const writes = []

  try {
    global.wx = {
      requestSubscribeMessage({ tmplIds, success }) {
        success({
          [tmplIds[0]]: 'accept',
          errMsg: 'requestSubscribeMessage:ok',
        })
      },
      cloud: {
        database() {
          return {
            collection(name) {
              assert.strictEqual(name, 'reminders')
              return {
                add(payload) {
                  writes.push(payload.data)
                  return Promise.resolve({ _id: 'authorization_event' })
                },
              }
            },
          }
        },
      },
    }

    const result = await reminderService.requestAndRecordSubscribeMessage()

    assert.strictEqual(result.authorized, true)
    assert.strictEqual(result.recorded, true)
    assert.strictEqual(writes.length, 1)
    assert.strictEqual(writes[0].type, 'subscriptionAuthorization')
    assert.strictEqual(writes[0].status, 'accepted')
    assert.strictEqual(writes[0].subscribeMessageAuthorized, true)

    global.wx.cloud.database = () => ({
      collection() {
        return {
          add() {
            return Promise.reject(new Error('record failed'))
          },
        }
      },
    })

    const unrecorded = await reminderService.requestAndRecordSubscribeMessage()
    assert.strictEqual(unrecorded.recorded, false)
  } finally {
    global.wx = originalWx
  }
}

testAuthorizationRecording()
  .then(() => {
    console.log('reminder-domain: 19 assertions passed')
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
