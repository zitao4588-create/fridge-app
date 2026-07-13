const assert = require('assert')
const {
  canManageFamily,
  getConsumeType,
  getFamilyOwnerOpenid,
  isInviteUsable,
} = require('../cloudfunctions/familyInventory/domain')
const {
  createCollectionNames,
  isMissingDocumentError,
  normalizeCollectionPrefix,
} = require('../cloudfunctions/familyInventory/collections')

const now = 1_000
const family = { _id: 'family_a', status: 'active', inviteVersion: 3 }
const invite = {
  familyId: 'family_a',
  status: 'active',
  inviteVersion: 3,
  expiresAt: now + 100,
}

assert.strictEqual(canManageFamily('owner'), true)
assert.strictEqual(canManageFamily('editor'), false)
assert.strictEqual(isInviteUsable(invite, family, now), true)
assert.strictEqual(isInviteUsable({ ...invite, status: 'used' }, family, now), false)
assert.strictEqual(isInviteUsable({ ...invite, expiresAt: now }, family, now), false)
assert.strictEqual(isInviteUsable(invite, { ...family, inviteVersion: 4 }, now), false)
assert.strictEqual(getConsumeType({ quantityTracked: true, quantity: 2 }), 'decrease')
assert.strictEqual(getConsumeType({ quantityTracked: false, quantity: 8 }), 'remove')
assert.strictEqual(getFamilyOwnerOpenid({ ownerOpenid: ' owner-a ' }), 'owner-a')
assert.strictEqual(getFamilyOwnerOpenid({}), '')
assert.deepStrictEqual(createCollectionNames('').items, 'items')
assert.deepStrictEqual(createCollectionNames('v2test_').items, 'v2test_items')
assert.throws(() => normalizeCollectionPrefix('prod-items-'), /FAMILY_COLLECTION_PREFIX/)
assert.strictEqual(
  isMissingDocumentError({
    errCode: -1,
    errMsg: 'document.get:fail document with _id test does not exist',
  }),
  true,
)
assert.strictEqual(isMissingDocumentError({ errCode: -1, errMsg: 'network failed' }), false)

console.log('family-domain: 15 assertions passed')
