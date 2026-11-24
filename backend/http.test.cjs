const { test } = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const { createApplication } = require('./server.cjs')
const { openStore } = require('./sqlite-store.cjs')

test('frontend services use authenticated HTTP and maintain private state', async (t) => {
  const store = openStore(':memory:')
  const server = createApplication(store, async (code) => code, 'test-session-secret-32-character-min')
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(async () => {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
    store.close()
    delete global.wx
  })
  const base = 'http://127.0.0.1:' + server.address().port
  const cache = new Map()
  global.wx = {
    getStorageSync: (key) => cache.get(key),
    setStorageSync: (key, value) => cache.set(key, value),
    removeStorageSync: (key) => cache.delete(key),
    login: ({ success }) => success({ code: 'fixture-owner' }),
    request: async ({ url, header, method, data, success, fail }) => {
      try {
        const response = await fetch(base + new URL(url).pathname, {
          method, headers: header, body: JSON.stringify(data),
        })
        success({ statusCode: response.status, data: await response.json() })
      } catch (error) {
        fail(error)
      }
    },
  }
  for (const mod of [
    '../services/backendService',
    '../services/itemService',
    '../services/familyService',
    '../services/reminderService',
  ]) {
    delete require.cache[require.resolve(mod)]
  }
  const items = require('../services/itemService')
  const family = require('../services/familyService')
  const reminders = require('../services/reminderService')
  const fixture = { name: '仅用于测试', expireDate: '2026-11-24',
    quantityTracked: true, quantity: 2 }
  assert.deepEqual(await items.getItemsWithFamilyAccessCheck(), [])
  const other = store.collection('items').doc('other-personal')
  other.set({ data: { ...fixture, _openid: 'other-user' } })
  assert.equal(await items.getItemById('other-personal'), null)
  await assert.rejects(items.updateItem('other-personal', fixture), { code: 'NOT_FOUND' })

  const { _id: id } = await items.createItem(fixture)
  assert.equal((await items.getItems({ forceRefresh: true })).length, 1)
  const original = await items.getItemById(id)
  await items.updateItem(id, { ...original, quantity: 3 })
  await assert.rejects(items.updateItem(id, { ...original, note: '旧备注' }), { code: 'ITEM_CHANGED' })
  const consumed = await items.consumeItem(id)
  assert.equal(consumed.item.quantity, 3)
  assert.equal((await items.getItemById(id)).quantity, 2)
  await items.undoConsume(consumed)
  assert.equal((await items.getItemById(id)).quantity, 3)

  const record = await reminders.requestAndRecordSubscribeMessage()
  assert.equal(record.recorded, true)
  const [audit] = store.collection('reminders').where({ _openid: 'fixture-owner' }).get().data
  assert.equal(audit.status, 'unsupported')
  const household = await family.createFamily('测试家庭')
  assert.equal(household.membership.status, 'active')
  const [existing] = await items.getItemsWithFamilyAccessCheck({ forceRefresh: true })
  assert.equal(existing._id, id)
  assert.equal(existing._openid, undefined)
  const answer = await fetch(base + '/fridge-api/v2/personal', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'listItems', offset: 0 }),
  })
  assert.equal(answer.status, 401)
  assert.equal(other.get().data.quantity, 2)
})

test('multi-page personal inventory detects edits between pages before combining results', (t) => {
  const store = openStore(':memory:')
  t.after(() => store.close())
  const list = require('./personal.cjs').createPersonalHandler(store)
  const items = store.collection('items')
  for (let i = 0; i < 101; i++) items.doc('fixture-' + i).set({ data: { _openid: 'owner', name: '测试' } })
  const first = list('owner', { action: 'listItems', pageSize: 100, offset: 0 }).data
  assert.equal(first.data.length, 100)
  assert.equal(first.hasMore, true)
  const second = { action: 'listItems', pageSize: 100, offset: 100, revision: first.revision }
  assert.equal(list('owner', second).data.data.length, 1)
  items.doc('fixture-10').remove()
  assert.equal(list('owner', second).error, 'LIST_CHANGED')
  const refreshed = list('owner', { action: 'listItems', pageSize: 100, offset: 0 }).data
  assert.equal(refreshed.hasMore, false)
  assert.equal(new Set(refreshed.data.map(item => item._id)).size, 100)
})
