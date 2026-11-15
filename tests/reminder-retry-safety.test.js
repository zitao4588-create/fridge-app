const assert = require('assert')
const fs = require('fs')
const vm = require('vm')
const path = require('path')
const { createRequire } = require('module')
const { classifySendError, hasDailySummaryRecord } = require('../cloudfunctions/sendExpiryReminders/domain')
const filename = path.resolve(__dirname, '../cloudfunctions/sendExpiryReminders/index.js')
const realRequire = createRequire(filename)
function load({ responses = [], writeFails = false } = {}) {
  const writes = []
  let sends = 0
  const item = { _id: 'food', _openid: 'user', name: '蛋', expireDate: '2026-09-10' }
  const db = { command: {}, collection() { return {
    doc() { return { async get() { return { data: item } } } },
    where() { return this }, skip() { return this }, limit() { return this },
    async get() { return { data: [{ type: 'subscriptionAuthorization', status: 'accepted', createdAt: 1 }] } },
    async add({ data }) { writes.push(data); if (writeFails) throw new Error('write failed'); return { _id: 'record' } },
  } } }
  const cloud = { init() {}, database: () => db, getWXContext: () => ({ OPENID: 'user' }) }
  const output = {}
  vm.runInNewContext(fs.readFileSync(filename, 'utf8') + '\nrequestJson = mockRequest; exports.sendForTest = sendReminder;', {
    exports: output, require: name => name === 'wx-server-sdk' ? cloud : realRequire(name),
    process: { env: { WX_APPSECRET: 'synthetic', EXPIRY_REMINDER_TEMPLATE_ID: 'synthetic' } },
    Buffer, console: { log() {} },
    mockRequest: async options => {
      if (options.method === 'POST') sends++
      const next = responses.shift()
      if (next instanceof Error) throw next
      return next
    },
  })
  return { output, writes, sends: () => sends, item }
}
async function main() {
  for (const outcome of ['NOT_SENT', 'API_REJECTED']) {
    const failure = classifySendError(Object.assign(new Error('rejected'), { deliveryOutcome: outcome }))
    assert.strictEqual(failure.retryable, true)
    assert.strictEqual(hasDailySummaryRecord([{ type: 'expirySummary', remindDate: 'today', ...failure }], 'today'), false)
  }
  for (const record of [
    { status: 'failed', retryable: true },
    { status: 'failed', retryable: true, deliveryOutcome: 'UNKNOWN' },
    { status: 'sent', retryable: true, deliveryOutcome: 'NOT_SENT' },
    { status: 'refused', deliveryOutcome: 'API_REJECTED' },
  ]) assert.strictEqual(hasDailySummaryRecord([{ type: 'expirySummary', remindDate: 'today', ...record }], 'today'), true)

  let runtime = load({ responses: [new Error('token timeout')] })
  await runtime.output.main({ itemId: 'food' })
  assert.strictEqual(runtime.sends(), 0)
  assert.strictEqual(runtime.writes[0].deliveryOutcome, 'NOT_SENT')
  assert.strictEqual(runtime.writes[0].retryable, true)

  runtime = load({ responses: [{ access_token: 'synthetic' }, { errcode: 40001, errmsg: 'invalid token' }] })
  await runtime.output.main({ itemId: 'food' })
  assert.strictEqual(runtime.writes[0].deliveryOutcome, 'API_REJECTED')
  assert.strictEqual(runtime.writes[0].retryable, true)

  runtime = load({ responses: [{ access_token: 'synthetic' }, new Error('request timeout')] })
  await runtime.output.main({ itemId: 'food' })
  assert.strictEqual(runtime.writes[0].deliveryOutcome, 'UNKNOWN')
  assert.strictEqual(runtime.writes[0].retryable, false)

  runtime = load({ responses: [{ access_token: 'synthetic' }, { errcode: 0 }], writeFails: true })
  await assert.rejects(runtime.output.main({ itemId: 'food' }), /write failed/)
  assert.strictEqual(runtime.sends(), 1)
  assert.strictEqual(runtime.writes.length, 1)
  assert.strictEqual(runtime.writes[0].status, 'sent')
  console.log('reminder retry safety: domain and 4 handler scenarios passed')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
