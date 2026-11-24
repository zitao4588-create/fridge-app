const assert = require('assert')
const { classifySendError, hasDailySummaryRecord } = require('../backend/reminders/domain')
const { sendReminders } = require('../backend/reminders/sender.cjs')

function createMockStore({ writeFails = false } = {}) {
  const writes = []
  const docs = {
    items: {
      food: { _id: 'food', _openid: 'user', name: '蛋', expireDate: '2026-09-10' },
    },
    reminders: {
      auth1: {
        _id: 'auth1',
        _openid: 'user',
        type: 'subscriptionAuthorization',
        status: 'accepted',
        createdAt: 1,
      },
    },
    families: {},
    familyMembers: {},
  }

  function collection(name) {
    const store = docs[name] || (docs[name] = {})
    const query = (criteria = {}, offset = 0, limit = Infinity) => ({
      where: (next) => query(next, offset, limit),
      skip: (next) => query(criteria, next, limit),
      limit: (next) => query(criteria, offset, next),
      get() {
        const list = Object.values(store)
          .filter((doc) => Object.entries(criteria).every(([k, v]) => (typeof v === 'function' ? v(doc[k]) : doc[k] === v)))
          .slice(offset, offset + limit)
        return { data: list }
      },
    })
    return {
      ...query(),
      add({ data }) {
        writes.push(data)
        if (writeFails) throw new Error('write failed')
        const id = `rec_${writes.length}`
        store[id] = { ...data, _id: id }
        return { _id: id }
      },
      doc(id) {
        return {
          get() { return { data: store[id] || null } },
          set({ data }) {
            writes.push({ ...data, _id: id })
            if (writeFails && store[id]) throw new Error('write failed')
            store[id] = { ...data, _id: id }
          },
          update({ data }) {
            writes.push({ ...data, _id: id })
            if (writeFails) throw new Error('write failed')
            store[id] = { ...(store[id] || {}), ...data, _id: id }
          },
          remove() { delete store[id] },
        }
      },
    }
  }

  return {
    writes,
    store: {
      collection,
      runRequest(fn) {
        return fn()
      },
      command: {
        in: (values) => (val) => values.includes(val),
        gte: (min) => Object.assign((val) => val >= min, { and: (other) => (val) => val >= min && other(val) }),
        lte: (max) => (val) => val <= max,
      },
    },
  }
}

async function runScenario({ responses = [], writeFails = false } = {}) {
  const { store, writes } = createMockStore({ writeFails })
  let sends = 0
  const result = await sendReminders({
    store,
    env: { WX_APPSECRET: 'synthetic', EXPIRY_REMINDER_TEMPLATE_ID: 'synthetic' },
    event: { itemId: 'food' },
    openid: 'user',
    today: '2026-09-09',
    logger: { log() {}, error() {} },
    requestJson: async (options) => {
      if (options.path && options.path.includes('/message/subscribe/send')) sends++
      const next = responses.shift()
      if (next instanceof Error) throw next
      return next
    },
  })
  return { result, writes, sends }
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

  let run = await runScenario({ responses: [new Error('token timeout')] })
  assert.strictEqual(run.sends, 0)
  assert.strictEqual(run.writes.at(-1).deliveryOutcome, 'NOT_SENT')
  assert.strictEqual(run.writes.at(-1).retryable, true)

  run = await runScenario({ responses: [{ access_token: 'synthetic' }, { errcode: 40001, errmsg: 'invalid token' }] })
  assert.strictEqual(run.writes.at(-1).deliveryOutcome, 'API_REJECTED')
  assert.strictEqual(run.writes.at(-1).retryable, true)

  run = await runScenario({ responses: [{ access_token: 'synthetic' }, new Error('request timeout')] })
  assert.strictEqual(run.writes.at(-1).deliveryOutcome, 'UNKNOWN')
  assert.strictEqual(run.writes.at(-1).retryable, false)

  run = await runScenario({ responses: [{ access_token: 'synthetic' }, { errcode: 0 }], writeFails: true })
  assert.strictEqual(run.sends, 1)
  assert.strictEqual(run.result.recordWriteFailures, 1)
  assert.strictEqual(run.result.sentUnrecorded, 1)
  console.log('reminder retry safety: domain and 4 handler scenarios passed')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
