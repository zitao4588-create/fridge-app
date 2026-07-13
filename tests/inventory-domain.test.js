const assert = require('assert')
const {
  getConsumptionType,
  getQuantityAfterConsumption,
  normalizeQuantityState,
} = require('../utils/inventory')

assert.deepStrictEqual(normalizeQuantityState({ quantity: 1, unit: '份' }), {
  quantityTracked: false,
  quantity: 1,
})
assert.deepStrictEqual(
  normalizeQuantityState({ quantityTracked: true, quantity: 3 }),
  { quantityTracked: true, quantity: 3 },
)
assert.deepStrictEqual(
  normalizeQuantityState({ quantityTracked: true, quantity: 0 }),
  { quantityTracked: true, quantity: 1 },
)
assert.strictEqual(getConsumptionType({ quantityTracked: true, quantity: 3 }), 'decrease')
assert.strictEqual(getQuantityAfterConsumption({ quantityTracked: true, quantity: 3 }), 2)
assert.strictEqual(getConsumptionType({ quantityTracked: true, quantity: 1 }), 'remove')
assert.strictEqual(getConsumptionType({ quantity: 8 }), 'remove')
assert.strictEqual(getQuantityAfterConsumption({ quantity: 8 }), 0)

console.log('inventory-domain: 8 assertions passed')
