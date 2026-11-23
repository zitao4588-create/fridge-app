const assert = require('node:assert/strict')
const { test } = require('node:test')
const { openStore } = require('./sqlite-store.cjs')
const createFamilyHandler = require('./family/handler.cjs')

test('invite, join, migrate, protect, consume, undo, leave and dissolve', async (t) => {
  const database = openStore(':memory:')
  t.after(() => database.close())
  const handler = createFamilyHandler(database)
  const call = (user, action, data) => database.runRequest(() =>
    handler(user, { ...data, action }))
  const success = async (...args) => {
    const result = await call(...args)
    assert.equal(result.ok, true, JSON.stringify(result))
    return result.data
  }
  const fixture = { name: '仅用于测试', expireDate: '2026-11-24',
    quantityTracked: true, quantity: 3, accessMode: 'personal' }
  database.collection('items').doc('before-family').set({
    data: { ...fixture, _openid: 'fixture-owner' },
  })
  const state = await success('fixture-owner', 'createFamily')
  assert.equal(state.membership.status, 'active')
  const { inviteCode } = await success('fixture-owner', 'createInvite')
  assert.equal((await success('fixture-owner', 'createInvite')).inviteCode, inviteCode)
  const joined = await success('fixture-editor', 'joinFamily', { inviteCode })
  assert.equal(joined.family.id, state.family.id)
  assert.equal(joined.membership.role, 'editor')
  assert.equal((await call('fixture-outsider', 'listItems')).error, 'NOT_IN_FAMILY')
  assert.equal((await call('fixture-outsider', 'getItem', { itemId: 'before-family' })).ok, false)
  const items = await success('fixture-editor', 'listItems')
  assert.equal(items[0]._id, 'before-family')
  assert.equal(Object.hasOwn(items[0], '_openid'), false)
  const { _id: itemId } = await success('fixture-editor', 'createItem', { item: fixture })
  const stale = await success('fixture-editor', 'getItem', { itemId })
  const [first, second] = await Promise.all([
    success('fixture-editor', 'consumeItem', { itemId }),
    success('fixture-owner', 'consumeItem', { itemId }),
  ])
  assert.equal((await call('fixture-editor', 'updateItem', { itemId, item: { ...stale, note: '备注' },
    expectedUpdatedAt: stale.updatedAt })).error, 'ITEM_CHANGED')
  assert.equal((await success('fixture-owner', 'getItem', { itemId })).quantity, 1)
  assert.equal(first.quantityBefore, 3)
  assert.equal(second.quantityBefore, 2)
  assert.equal((await call('fixture-editor', 'undoConsume', { undoToken: first.undoToken })).error, 'ITEM_CHANGED')
  assert.equal((await success('fixture-owner', 'undoConsume', { undoToken: second.undoToken })).undone, true)
  assert.equal((await success('fixture-owner', 'getItem', { itemId })).quantity, 2)
  assert.equal((await call('fixture-editor', 'clearItems')).error, 'OWNER_ONLY')
  await success('fixture-owner', 'deleteItem', { itemId })
  assert.equal((await success('fixture-owner', 'listItems')).length, 1)
  assert.equal((await call('fixture-owner', 'clearItems', { expectedFamilyId: 'old-family' })).error, 'INVENTORY_SCOPE_CHANGED')
  const members = database.collection('familyMembers')
  members.doc('pending-member').set({ data: { openid: 'fixture-pending', familyId: state.family.id, status: 'migrating' } })
  await success('fixture-editor', 'leaveFamily')
  assert.equal((await call('fixture-owner', 'leaveFamily')).error, 'OWNER_HAS_MEMBERS')
  assert.equal((await call('fixture-editor', 'deleteItem', { itemId: 'before-family' })).error, 'NOT_IN_FAMILY')
  members.doc('pending-member').update({ data: { status: 'left' } })
  assert.equal((await call('fixture-editor', 'listItems')).error, 'NOT_IN_FAMILY')
  await success('fixture-owner', 'leaveFamily')
  assert.equal((await success('fixture-owner', 'getFamilyState')), null)
  assert.equal((await call('fixture-owner', 'constructor')).error, 'UNKNOWN_ACTION')
  assert.equal((await call('', 'getFamilyState')).error, 'NOT_AUTHENTICATED')
})

test('failing request rolls back writes and following request can proceed', async (t) => {
  const database = openStore(':memory:')
  t.after(() => database.close())
  const doc = database.collection('items').doc('synthetic')
  await assert.rejects(database.runRequest(async () => {
    await database.runTransaction(async () => doc.set({ data: { quantity: 1 } }))
    throw new Error('synthetic failure')
  }), /synthetic failure/)
  assert.equal(doc.get().data, null)
  await database.runRequest(() => doc.set({ data: { quantity: 2 } }))
  assert.equal(doc.get().data.quantity, 2)
})
