function canManageFamily(role) {
  return role === 'owner'
}

function isInviteUsable(invite, family, now = Date.now()) {
  return Boolean(
    invite &&
      family &&
      invite.status === 'active' &&
      invite.expiresAt > now &&
      family.status === 'active' &&
      invite.familyId === family._id &&
      invite.inviteVersion === (family.inviteVersion || 1),
  )
}

function getConsumeType(item = {}) {
  const quantity = Number(item.quantity)
  return item.quantityTracked === true && Number.isInteger(quantity) && quantity > 1
    ? 'decrease'
    : 'remove'
}

function getFamilyOwnerOpenid(family = {}) {
  return String(family.ownerOpenid || '').trim()
}

module.exports = {
  canManageFamily,
  getConsumeType,
  getFamilyOwnerOpenid,
  isInviteUsable,
}
