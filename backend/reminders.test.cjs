const { test } = require('node:test')
const assert = require('node:assert/strict')
const { openStore } = require('./sqlite-store.cjs')
const { sendReminders } = require('./reminders/sender.cjs')

test('VPS reminder run sends one eligible summary and records deduplication', async (t) => {
  const store = openStore(':memory:')
  t.after(() => store.close())
  const items = store.collection('items')
  const reminders = store.collection('reminders')
  items.doc('due').set({ data: { _openid: 'fixture-owner', name: '测试食材',
    expireDate: '2026-11-24' } })
  items.doc('too-late').set({ data: { _openid: 'fixture-owner', name: '不发送',
    expireDate: '2026-11-28' } })
  reminders.add({ data: { type: 'subscriptionAuthorization',
    _openid: 'fixture-owner', status: 'accepted', createdAt: 1 } })
  const outgoing = []
  const requestJson = async (options, body) => {
    if (options.path === '/cgi-bin/stable_token') return { access_token: 'synthetic' }
    outgoing.push(JSON.parse(body))
    return { errcode: 0 }
  }
  const logger = { log() {}, warn() {}, error() {} }
  const args = { store, env: { WX_APPSECRET: 'synthetic', EXPIRY_REMINDER_TEMPLATE_ID: 'fixture' },
    openid: 'fixture-owner', today: '2026-11-22', logger, requestJson,
    event: { miniprogramState: 'developer' } }
  const runs = await Promise.all([sendReminders(args), sendReminders(args)])
  assert.equal(runs.reduce((total, run) => total + run.sent, 0), 1)
  assert.equal((await sendReminders(args)).sent, 0)
  assert.equal(outgoing.length, 1)
  assert.equal(outgoing[0].touser, 'fixture-owner')
  assert.equal(outgoing[0].data.thing6.value, '测试食材')
})

test('only subscribed active members receive one daily summary, membership checked again after token fetch', async (t) => {
  const store = openStore(':memory:')
  t.after(() => store.close())
  const put = (collection, id, data) => store.collection(collection).doc(id).set({ data })
  put('families', 'home', { status: 'active' })
  for (const id of ['owner', 'editor', 'revoked', 'no-grant']) {
    put('familyMembers', id, { openid: id, familyId: 'home', status: 'active' })
    if (id !== 'no-grant') put('reminders', id, { _openid: id, type: 'subscriptionAuthorization', status: 'accepted', createdAt: 1 })
  }
  put('items', 'milk', { _openid: 'owner', familyId: 'home', name: '测试牛奶', expireDate: '2026-11-24' })
  const outgoing = []
  const requestJson = async (options, body) => {
    if (options.path === '/cgi-bin/stable_token') {
      store.collection('familyMembers').doc('revoked').update({ data: { status: 'left' } })
      return { access_token: 'synthetic' }
    }
    outgoing.push(JSON.parse(body).touser)
    return { errcode: 0 }
  }
  const args = { store, env: { WX_APPSECRET: 'synthetic', EXPIRY_REMINDER_TEMPLATE_ID: 'test' },
    today: '2026-11-22', requestJson, logger: { log() {}, warn() {}, error() {} } }
  await sendReminders(args)
  await sendReminders(args)
  assert.deepEqual(outgoing.sort(), ['editor', 'owner'])
})

test('a lost send receipt blocks same-day retries and reserves the grant across restarts', async (t) => {
  const fs = require('node:fs')
  const path = require('node:path')
  const filename = path.join(fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'fridge-reminder-')), 'test.sqlite')
  let store = openStore(filename)
  t.after(() => store.close())
  store.collection('items').doc('fruit').set({ data: { _openid: 'person', name: '测试苹果', expireDate: '2026-11-24' } })
  store.collection('reminders').doc('grant').set({ data: { _openid: 'person', type: 'subscriptionAuthorization', status: 'accepted', createdAt: 1 } })
  let sends = 0
  const requestJson = async options => {
    if (options.path === '/cgi-bin/stable_token') return { access_token: 'synthetic' }
    sends++
    throw new Error('network timeout after transmission')
  }
  const args = { store, env: { WX_APPSECRET: 'synthetic', EXPIRY_REMINDER_TEMPLATE_ID: 'test' },
    requestJson, logger: { log() {}, warn() {}, error() {} } }
  await sendReminders({ ...args, today: '2026-11-22' })
  store.close()
  store = openStore(filename)
  for (const today of ['2026-11-22', '2026-11-23']) await sendReminders({ ...args, store, today })
  assert.equal(sends, 1)
  const events = store.collection('reminders').where({ type: 'expirySummary' }).get().data
  assert.equal(events.length, 1)
  assert.equal(events[0].deliveryOutcome, 'UNKNOWN')
})

test('WeChat accepted but both local receipt writes fail, a second job does not send again', async (t) => {
  const store = openStore(':memory:')
  t.after(() => store.close())
  store.collection('items').doc('due').set({ data: { _openid: 'u', name: '样品', expireDate: '2026-11-24' } })
  store.collection('reminders').doc('grant').set({ data: { _openid: 'u', type: 'subscriptionAuthorization', status: 'accepted', createdAt: 1 } })
  const collection = store.collection
  store.collection = name => {
    const ref = collection(name)
    if (name !== 'reminders') return ref
    const doc = ref.doc
    ref.doc = id => {
      const entry = doc(id)
      const set = entry.set
      entry.set = ({ data }) => {
        if (data.status === 'sent') throw new Error('synthetic write failure')
        return set({ data })
      }
      return entry
    }
    return ref
  }
  let transmitted = 0
  const args = { store, today: '2026-11-23', env: { WX_APPSECRET: 'synthetic', EXPIRY_REMINDER_TEMPLATE_ID: 'test' },
    requestJson: async options => {
      if (options.path === '/cgi-bin/stable_token') return { access_token: 'synthetic' }
      transmitted++
      return { errcode: 0 }
    }, logger: { log() {}, warn() {}, error() {} } }
  assert.equal((await sendReminders(args)).sentUnrecorded, 1)
  await sendReminders(args)
  assert.equal(transmitted, 1)
  assert.equal(collection('reminders').where({ status: 'sending' }).get().data.length, 1)
})
