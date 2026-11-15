const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  FAMILY_OUTCOME_KEYS,
  buildFamilyOutcome,
  resolveFamilyRecoveryOutcome,
} = require('../utils/familyOutcome')

const created = buildFamilyOutcome(FAMILY_OUTCOME_KEYS.CREATED)
assert.strictEqual(created.tone, 'success')
assert.match(created.detail, /迁入家庭库存/)

const joined = buildFamilyOutcome(FAMILY_OUTCOME_KEYS.JOINED)
assert.match(joined.detail, /不会自动回到个人库存/)

const migrationPending = buildFamilyOutcome(
  FAMILY_OUTCOME_KEYS.MIGRATION_PENDING,
)
assert.strictEqual(migrationPending.tone, 'warning')
assert.match(migrationPending.title, /家庭关系已建立/)

const removed = buildFamilyOutcome(FAMILY_OUTCOME_KEYS.MEMBER_REMOVED)
assert.match(removed.detail, /仍留在家庭/)

const left = buildFamilyOutcome(FAMILY_OUTCOME_KEYS.LEFT)
assert.match(left.detail, /失去.*访问权/)

const dissolved = buildFamilyOutcome(FAMILY_OUTCOME_KEYS.DISSOLVED)
assert.match(dissolved.detail, /恢复为创建者的个人库存/)

const unknown = buildFamilyOutcome(FAMILY_OUTCOME_KEYS.RESULT_UNKNOWN)
assert.strictEqual(unknown.tone, 'warning')
assert.match(unknown.detail, /不要连续重复操作/)

const recovered = buildFamilyOutcome(FAMILY_OUTCOME_KEYS.STATE_RECOVERED)
assert.match(recovered.detail, /先核对成员和库存/)

const activeState = {
  migrationPending: false,
  members: [{ id: 'member-kept' }],
}
assert.strictEqual(
  resolveFamilyRecoveryOutcome('create', { migrationPending: true }),
  FAMILY_OUTCOME_KEYS.MIGRATION_PENDING,
)
assert.strictEqual(
  resolveFamilyRecoveryOutcome('join', activeState),
  FAMILY_OUTCOME_KEYS.STATE_RECOVERED,
)
assert.strictEqual(
  resolveFamilyRecoveryOutcome('create', null),
  FAMILY_OUTCOME_KEYS.CREATE_FAILED,
)
assert.strictEqual(
  resolveFamilyRecoveryOutcome('migration', activeState),
  FAMILY_OUTCOME_KEYS.MIGRATION_COMPLETED,
)
assert.strictEqual(
  resolveFamilyRecoveryOutcome('migration', { migrationPending: true }),
  FAMILY_OUTCOME_KEYS.MIGRATION_FAILED,
)
assert.strictEqual(
  resolveFamilyRecoveryOutcome('remove', activeState, {
    memberId: 'member-removed',
  }),
  FAMILY_OUTCOME_KEYS.MEMBER_REMOVED,
)
assert.strictEqual(
  resolveFamilyRecoveryOutcome('remove', activeState, {
    memberId: 'member-kept',
  }),
  FAMILY_OUTCOME_KEYS.REMOVE_FAILED,
)
assert.strictEqual(
  resolveFamilyRecoveryOutcome('leave', null),
  FAMILY_OUTCOME_KEYS.LEFT,
)
assert.strictEqual(
  resolveFamilyRecoveryOutcome('dissolve', null),
  FAMILY_OUTCOME_KEYS.DISSOLVED,
)

const familyPage = fs.readFileSync(
  path.join(__dirname, '../pages/family/family.js'),
  'utf8',
)
const familyTemplate = fs.readFileSync(
  path.join(__dirname, '../pages/family/family.wxml'),
  'utf8',
)

assert.match(familyTemplate, /家庭数据会怎样/)
assert.match(familyTemplate, /不会自动回到个人库存/)
assert.match(familyTemplate, /继续迁移/)
assert.match(familyPage, /recoverFamilyStateAfterFailure\(action, error/)
assert.match(familyPage, /resolveFamilyRecoveryOutcome\(action, state, context\)/)
assert.match(familyPage, /operationResult: buildFamilyOutcome/)
assert.match(familyPage, /其此前迁入的库存仍留在家庭/)
assert.match(familyPage, /当前家庭库存会恢复为创建者的个人库存/)
assert.match(familyTemplate, /创建后，你现有的个人库存会迁入家庭库存/)

console.log('family-outcome: 29 assertions passed')
