const FAMILY_OUTCOME_KEYS = Object.freeze({
  CREATED: 'created',
  JOINED: 'joined',
  STATE_RECOVERED: 'state-recovered',
  MIGRATION_PENDING: 'migration-pending',
  MIGRATION_COMPLETED: 'migration-completed',
  MEMBER_REMOVED: 'member-removed',
  LEFT: 'left',
  DISSOLVED: 'dissolved',
  CREATE_FAILED: 'create-failed',
  JOIN_FAILED: 'join-failed',
  MIGRATION_FAILED: 'migration-failed',
  REMOVE_FAILED: 'remove-failed',
  LEAVE_FAILED: 'leave-failed',
  DISSOLVE_FAILED: 'dissolve-failed',
  RESULT_UNKNOWN: 'result-unknown',
})

const FAMILY_OUTCOMES = {
  [FAMILY_OUTCOME_KEYS.CREATED]: {
    tone: 'success',
    title: '家庭已创建',
    detail: '你的原个人库存已迁入家庭库存，现在由家庭成员共同管理。',
  },
  [FAMILY_OUTCOME_KEYS.JOINED]: {
    tone: 'success',
    title: '已加入家庭',
    detail:
      '你的原个人库存已迁入该家庭。以后退出或被移除时，这些库存不会自动回到个人库存。',
  },
  [FAMILY_OUTCOME_KEYS.STATE_RECOVERED]: {
    tone: 'warning',
    title: '已重新读取家庭状态',
    detail:
      '刚才的操作没有返回明确结果，但当前仍有有效家庭关系。请先核对成员和库存，再决定是否重试。',
  },
  [FAMILY_OUTCOME_KEYS.MIGRATION_PENDING]: {
    tone: 'warning',
    title: '家庭关系已建立，库存迁移未完成',
    detail:
      '创建或加入已经成功，但原个人库存尚未全部迁入。家庭成员暂时不会看到不完整数据，请点击“继续迁移”。',
  },
  [FAMILY_OUTCOME_KEYS.MIGRATION_COMPLETED]: {
    tone: 'success',
    title: '库存迁移已完成',
    detail: '原个人库存已经迁入家庭库存，现在可以由家庭成员共同查看和修改。',
  },
  [FAMILY_OUTCOME_KEYS.MEMBER_REMOVED]: {
    tone: 'success',
    title: '成员已移除',
    detail:
      '该成员已失去家庭库存访问权；其此前迁入的库存仍留在家庭，不会自动回到该成员个人库存。',
  },
  [FAMILY_OUTCOME_KEYS.LEFT]: {
    tone: 'success',
    title: '已退出家庭',
    detail:
      '你已失去该家庭库存的访问权；此前迁入的库存仍留在家庭，不会自动回到个人库存。',
  },
  [FAMILY_OUTCOME_KEYS.DISSOLVED]: {
    tone: 'success',
    title: '家庭已解散',
    detail:
      '家庭已停用，当前家庭库存已恢复为创建者的个人库存，其他原成员不再有访问权。',
  },
  [FAMILY_OUTCOME_KEYS.CREATE_FAILED]: {
    tone: 'error',
    title: '家庭没有创建完成',
    detail: '没有读取到有效家庭关系。请检查网络后重试创建，原个人库存不会因此自动删除。',
  },
  [FAMILY_OUTCOME_KEYS.JOIN_FAILED]: {
    tone: 'error',
    title: '没有加入家庭',
    detail: '没有读取到有效家庭关系。请让创建者确认邀请仍有效，再重新加入。',
  },
  [FAMILY_OUTCOME_KEYS.MIGRATION_FAILED]: {
    tone: 'error',
    title: '库存迁移仍未完成',
    detail:
      '家庭关系仍然有效，但原个人库存迁移没有完成。请稍后点击“继续迁移”，不要重复创建或加入家庭。',
  },
  [FAMILY_OUTCOME_KEYS.REMOVE_FAILED]: {
    tone: 'error',
    title: '成员没有移除',
    detail: '刷新后该成员仍在家庭中。请检查网络和成员状态后再试。',
  },
  [FAMILY_OUTCOME_KEYS.LEAVE_FAILED]: {
    tone: 'error',
    title: '退出没有完成',
    detail: '刷新后你仍在家庭中，家庭库存归属没有确认改变。请检查网络后再试。',
  },
  [FAMILY_OUTCOME_KEYS.DISSOLVE_FAILED]: {
    tone: 'error',
    title: '解散没有完成',
    detail:
      '刷新后家庭仍然存在。部分库存处理状态可能需要重新核对，请先检查家庭库存，不要连续重复解散。',
  },
  [FAMILY_OUTCOME_KEYS.RESULT_UNKNOWN]: {
    tone: 'warning',
    title: '结果暂时无法确认',
    detail:
      '网络或家庭服务没有返回最终状态。请先下拉刷新家庭状态，不要连续重复操作。',
  },
}

const FAMILY_FAILURE_OUTCOME_KEYS = Object.freeze({
  create: FAMILY_OUTCOME_KEYS.CREATE_FAILED,
  join: FAMILY_OUTCOME_KEYS.JOIN_FAILED,
  migration: FAMILY_OUTCOME_KEYS.MIGRATION_FAILED,
  remove: FAMILY_OUTCOME_KEYS.REMOVE_FAILED,
  leave: FAMILY_OUTCOME_KEYS.LEAVE_FAILED,
  dissolve: FAMILY_OUTCOME_KEYS.DISSOLVE_FAILED,
})

function buildFamilyOutcome(key) {
  const outcome = FAMILY_OUTCOMES[key] || FAMILY_OUTCOMES[FAMILY_OUTCOME_KEYS.RESULT_UNKNOWN]
  return { key, ...outcome }
}

function resolveFamilyRecoveryOutcome(action, state, context = {}) {
  const fallbackKey =
    FAMILY_FAILURE_OUTCOME_KEYS[action] || FAMILY_OUTCOME_KEYS.RESULT_UNKNOWN

  if (action === 'create' || action === 'join') {
    if (state && state.migrationPending) {
      return FAMILY_OUTCOME_KEYS.MIGRATION_PENDING
    }
    return state ? FAMILY_OUTCOME_KEYS.STATE_RECOVERED : fallbackKey
  }

  if (action === 'migration' && state) {
    return state.migrationPending
      ? FAMILY_OUTCOME_KEYS.MIGRATION_FAILED
      : FAMILY_OUTCOME_KEYS.MIGRATION_COMPLETED
  }

  if (action === 'remove' && state) {
    const memberStillExists = (state.members || []).some(
      (member) => member.id === context.memberId,
    )
    return memberStillExists
      ? FAMILY_OUTCOME_KEYS.REMOVE_FAILED
      : FAMILY_OUTCOME_KEYS.MEMBER_REMOVED
  }

  if ((action === 'leave' || action === 'dissolve') && !state) {
    return action === 'dissolve'
      ? FAMILY_OUTCOME_KEYS.DISSOLVED
      : FAMILY_OUTCOME_KEYS.LEFT
  }

  return fallbackKey
}

module.exports = {
  FAMILY_OUTCOME_KEYS,
  FAMILY_FAILURE_OUTCOME_KEYS,
  buildFamilyOutcome,
  resolveFamilyRecoveryOutcome,
}
