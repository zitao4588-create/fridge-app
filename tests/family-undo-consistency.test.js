const assert = require('assert')
const fs = require('fs')
const vm = require('vm')
const path = require('path')
const { createRequire } = require('module')
const filename = path.resolve(__dirname, '../cloudfunctions/familyInventory/index.js')
const realRequire = createRequire(filename)
const copy = (v) => v == null ? v : structuredClone(v)

function setup(quantity = 3) {
  let rows = {
    items: { food: { _id: 'food', familyId: 'home', name: '蛋', quantityTracked: true, quantity, updatedAt: 1 } },
    familyMembers: { A: { _id: 'A', openid: 'A', familyId: 'home', status: 'active' }, B: { _id: 'B', openid: 'B', familyId: 'home', status: 'active' } },
    inventoryEvents: {},
  }
  let actor = 'A'
  let queue = Promise.resolve()
  function collection(name) {
    return {
      doc(id) {
        return {
          async get() { return { data: copy(rows[name][id]) } },
          async update({ data }) { assert(rows[name][id]); Object.assign(rows[name][id], copy(data)) },
          async set({ data }) { rows[name][id] = { ...copy(data), _id: id } },
          async remove() { delete rows[name][id] },
        }
      },
      where(query) {
        return { limit() { return this }, async get() {
          return { data: Object.values(rows[name]).filter(row => Object.entries(query).every(([k, v]) => Array.isArray(v) ? v.includes(row[k]) : row[k] === v)).map(copy) }
        } }
      },
    }
  }
  const db = { collection, command: { in: v => v }, runTransaction(fn) {
    const result = queue.then(async () => {
      const before = copy(rows)
      try { return await fn({ collection }) } catch (e) { rows = before; throw e }
    })
    queue = result.catch(() => {})
    return result
  } }
  const cloud = { init() {}, database: () => db, getWXContext: () => ({ OPENID: actor }) }
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    require: name => name === 'wx-server-sdk' ? cloud : realRequire(name),
    exports: module.exports, process: { env: {} }, console: { error() {} }, Date,
  }, { filename })
  return {
    async call(action, who = 'A', extra = {}) { actor = who; return module.exports.main({ action, itemId: 'food', ...extra }) },
    item: () => rows.items.food,
    replace: value => { rows.items.food = value },
    event: token => rows.inventoryEvents[token],
  }
}

async function main() {
  let db = setup()
  let consumed = await db.call('consumeItem')
  assert.strictEqual(db.item().quantity, 2)
  assert.strictEqual((await db.call('undoConsume', 'A', { undoToken: consumed.data.undoToken })).ok, true)
  assert.strictEqual(db.item().quantity, 3)
  assert.strictEqual((await db.call('undoConsume', 'A', { undoToken: consumed.data.undoToken })).error, 'UNDO_EXPIRED')
  assert.strictEqual(db.item().quantity, 3)

  db = setup()
  consumed = await db.call('consumeItem')
  await db.call('consumeItem', 'B')
  assert.strictEqual((await db.call('undoConsume', 'A', { undoToken: consumed.data.undoToken })).error, 'ITEM_CHANGED')
  assert.strictEqual(db.item().quantity, 1)

  db = setup(1)
  consumed = await db.call('consumeItem')
  assert.strictEqual(db.item(), undefined)
  assert.strictEqual((await db.call('undoConsume', 'A', { undoToken: consumed.data.undoToken })).ok, true)
  assert.strictEqual(db.item().quantity, 1)

  db = setup(1)
  consumed = await db.call('consumeItem')
  db.replace({ _id: 'food', familyId: 'home', name: '新食材', quantity: 7 })
  assert.strictEqual((await db.call('undoConsume', 'A', { undoToken: consumed.data.undoToken })).error, 'ITEM_CHANGED')
  assert.strictEqual(db.item().quantity, 7)

  db = setup()
  consumed = await db.call('consumeItem')
  delete db.event(consumed.data.undoToken).after
  assert.strictEqual((await db.call('undoConsume', 'A', { undoToken: consumed.data.undoToken })).error, 'ITEM_CHANGED')
  assert.strictEqual(db.item().quantity, 2)

  db = setup()
  consumed = await db.call('consumeItem')
  const results = await Promise.all([1, 2].map(() => db.call('undoConsume', 'A', { undoToken: consumed.data.undoToken })))
  assert.strictEqual(results.filter(r => r.ok).length, 1)
  assert.strictEqual(results.filter(r => r.error === 'UNDO_EXPIRED').length, 1)
  assert.strictEqual(db.item().quantity, 3)
  console.log('family undo consistency: 6 handler scenarios passed')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
