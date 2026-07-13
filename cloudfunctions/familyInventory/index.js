const crypto = require('crypto')
const cloud = require('wx-server-sdk')
const {
  canManageFamily,
  getConsumeType,
  getFamilyOwnerOpenid,
  isInviteUsable,
} = require('./domain')
const { createCollectionNames, isMissingDocumentError } = require('./collections')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const COLLECTIONS = createCollectionNames(process.env.FAMILY_COLLECTION_PREFIX)
const PAGE_SIZE = 100
const INVITE_TTL = 24 * 60 * 60 * 1000
const UNDO_TTL = 10 * 1000
const LOCATIONS = ['冷藏', '冷冻', '门架', '果蔬抽屉', '变温', '常温']

function fail(error, message) {
  const err = new Error(message)
  err.code = error
  throw err
}

function safeName(value, fallback) {
  return String(value || '').trim().slice(0, 20) || fallback
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`
}

function getMemberId(familyId, openid) {
  const digest = crypto
    .createHash('sha256')
    .update(`${familyId}:${openid}`)
    .digest('hex')
    .slice(0, 24)
  return `${familyId}_${digest}`
}

function normalizeLocation(value) {
  const aliases = {
    保鲜: '果蔬抽屉',
    果蔬: '果蔬抽屉',
    果蔬区: '果蔬抽屉',
    蔬果区: '果蔬抽屉',
    常温区: '常温',
  }
  const normalized = aliases[value] || value
  return LOCATIONS.includes(normalized) ? normalized : '冷藏'
}

function cleanItemPayload(payload = {}) {
  const quantityTracked = payload.quantityTracked === true
  const quantity = Number(payload.quantity)
  const shelfLifeDays = Number(payload.shelfLifeDays)

  return {
    name: String(payload.name || '').trim().slice(0, 30),
    category: payload.category || '其他',
    quantityTracked,
    quantity:
      quantityTracked && Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
    unit: '',
    productionDate: payload.productionDate || '',
    shelfLifeDays:
      Number.isInteger(shelfLifeDays) && shelfLifeDays > 0
        ? shelfLifeDays
        : undefined,
    expireDate: payload.expireDate || '',
    storageLocation: normalizeLocation(payload.storageLocation),
    note: String(payload.note || '').trim().slice(0, 100),
    source: payload.source || 'manual',
    barcode: payload.barcode || '',
    imageFileId: payload.imageFileId || '',
    parseConfidence:
      typeof payload.parseConfidence === 'number'
        ? payload.parseConfidence
        : undefined,
    parseRawText: payload.parseRawText || '',
    parseStatus: payload.parseStatus || '',
  }
}

function toClientItem(item) {
  const safeItem = { ...item }
  delete safeItem._openid
  delete safeItem.createdByOpenid
  delete safeItem.actorOpenid
  return safeItem
}

async function fetchAll(collection, where) {
  const rows = []
  let offset = 0

  while (true) {
    const res = await db
      .collection(collection)
      .where(where)
      .skip(offset)
      .limit(PAGE_SIZE)
      .get()
    const page = res.data || []
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
    offset += PAGE_SIZE
  }
}

async function getDocumentOrNull(collection, documentId) {
  try {
    const response = await db.collection(collection).doc(documentId).get()
    return response.data || null
  } catch (error) {
    if (isMissingDocumentError(error)) return null
    throw error
  }
}

async function findMembership(openid, includeMigrating = false) {
  const statuses = includeMigrating ? ['active', 'migrating'] : ['active']
  const res = await db
    .collection(COLLECTIONS.familyMembers)
    .where({ openid, status: _.in(statuses) })
    .limit(1)
    .get()
  return (res.data || [])[0] || null
}

async function requireMembership(openid) {
  const membership = await findMembership(openid)
  if (!membership) fail('NOT_IN_FAMILY', '你还没有加入家庭')
  return membership
}

async function migratePersonalItems(openid, familyId, memberId, ownerOpenid) {
  if (!ownerOpenid) fail('FAMILY_UNAVAILABLE', '家庭创建者信息不完整')
  const items = await fetchAll(COLLECTIONS.items, { _openid: openid })
  const pendingItems = items.filter((item) => !item.familyId || item.familyId === familyId)

  for (const item of pendingItems) {
    if (item.familyId === familyId) continue
    await db.collection(COLLECTIONS.items).doc(item._id).update({
      data: {
        _openid: ownerOpenid,
        familyId,
        accessMode: 'family',
        migratedByMemberId: memberId,
        updatedAt: Date.now(),
      },
    })
  }

  await db.collection(COLLECTIONS.familyMembers).doc(memberId).update({
    data: { status: 'active', migrationCompletedAt: Date.now() },
  })
}

async function getFamilyState(openid) {
  let membership = await findMembership(openid, true)
  if (!membership) return null

  const family = await getDocumentOrNull(COLLECTIONS.families, membership.familyId)
  if (!family || family.status !== 'active') fail('FAMILY_UNAVAILABLE', '家庭已停用')
  const ownerOpenid = getFamilyOwnerOpenid(family)
  if (!ownerOpenid) fail('FAMILY_UNAVAILABLE', '家庭创建者信息不完整')

  if (membership.status === 'migrating') {
    try {
      await migratePersonalItems(
        openid,
        membership.familyId,
        membership._id,
        ownerOpenid,
      )
      membership = await findMembership(openid, true)
    } catch (error) {
      return {
        family: { id: membership.familyId, name: '家庭库存' },
        membership: {
          id: membership._id,
          role: membership.role,
          status: 'migrating',
        },
        members: [],
        migrationPending: true,
      }
    }
  }

  const members = await fetchAll(COLLECTIONS.familyMembers, {
    familyId: membership.familyId,
    status: 'active',
  })
  members.sort((left, right) => (left.joinedAt || 0) - (right.joinedAt || 0))

  return {
    family: {
      id: family._id,
      name: family.name,
      memberCount: members.length,
    },
    membership: {
      id: membership._id,
      role: membership.role,
      status: membership.status,
    },
    members: members.map((member, index) => ({
      id: member._id,
      role: member.role,
      label: member.openid === openid ? '我' : `家庭成员 ${index + 1}`,
      isSelf: member.openid === openid,
      joinedAt: member.joinedAt,
    })),
    migrationPending: false,
  }
}

async function createFamily(openid, event) {
  if (await findMembership(openid, true)) {
    fail('ALREADY_IN_FAMILY', '每位用户只能加入一个家庭')
  }

  const familyId = randomId('family')
  const memberId = getMemberId(familyId, openid)
  const now = Date.now()

  await db.runTransaction(async (transaction) => {
    await transaction.collection(COLLECTIONS.families).doc(familyId).set({
      data: {
        name: safeName(event.name, '我的家庭'),
        ownerOpenid: openid,
        inviteVersion: 1,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    })
    await transaction.collection(COLLECTIONS.familyMembers).doc(memberId).set({
      data: {
        familyId,
        openid,
        role: 'owner',
        status: 'migrating',
        joinedAt: now,
      },
    })
  })

  await migratePersonalItems(openid, familyId, memberId, openid)
  return getFamilyState(openid)
}

async function createInvite(openid) {
  const membership = await requireMembership(openid)
  if (!canManageFamily(membership.role)) fail('OWNER_ONLY', '只有家庭创建者可以邀请成员')

  const family = await getDocumentOrNull(COLLECTIONS.families, membership.familyId)
  if (!family || family.status !== 'active') fail('FAMILY_UNAVAILABLE', '家庭已停用')
  const now = Date.now()
  const inviteCode = randomId('invite')

  await db.collection(COLLECTIONS.familyInvites).where({
    familyId: membership.familyId,
    status: 'active',
  }).update({ data: { status: 'revoked', revokedAt: now } })

  await db.collection(COLLECTIONS.familyInvites).doc(inviteCode).set({
    data: {
      familyId: membership.familyId,
      inviterOpenid: openid,
      inviteVersion: family.inviteVersion || 1,
      status: 'active',
      createdAt: now,
      expiresAt: now + INVITE_TTL,
    },
  })

  return {
    inviteCode,
    familyName: family.name,
    expiresAt: now + INVITE_TTL,
  }
}

async function getInvitePreview(openid, event) {
  const inviteCode = String(event.inviteCode || '').trim()
  if (!inviteCode) fail('INVALID_INVITE', '邀请信息不完整')
  const invite = await getDocumentOrNull(COLLECTIONS.familyInvites, inviteCode)
  if (!invite) fail('INVITE_EXPIRED', '邀请已失效，请让创建者重新邀请')
  const family = await getDocumentOrNull(COLLECTIONS.families, invite.familyId)
  if (!isInviteUsable(invite, family)) {
    fail('INVITE_EXPIRED', '邀请已失效，请让创建者重新邀请')
  }
  return {
    familyName: family.name,
    expiresAt: invite.expiresAt,
    alreadyInFamily: Boolean(await findMembership(openid, true)),
  }
}

async function revokeInvite(openid) {
  const membership = await requireMembership(openid)
  if (!canManageFamily(membership.role)) fail('OWNER_ONLY', '只有家庭创建者可以撤回邀请')
  const now = Date.now()

  await db.collection(COLLECTIONS.familyInvites).where({
    familyId: membership.familyId,
    status: 'active',
  }).update({ data: { status: 'revoked', revokedAt: now } })

  await db.collection(COLLECTIONS.families).doc(membership.familyId).update({
    data: { inviteVersion: _.inc(1), updatedAt: now },
  })

  return { revoked: true }
}

async function joinFamily(openid, event) {
  if (await findMembership(openid, true)) {
    fail('ALREADY_IN_FAMILY', '每位用户只能加入一个家庭')
  }

  const inviteCode = String(event.inviteCode || '').trim()
  if (!inviteCode) fail('INVALID_INVITE', '邀请信息不完整')

  const invite = await getDocumentOrNull(COLLECTIONS.familyInvites, inviteCode)
  const now = Date.now()
  if (!invite) fail('INVITE_EXPIRED', '邀请已失效，请让创建者重新邀请')
  const family = await getDocumentOrNull(COLLECTIONS.families, invite.familyId)
  if (!isInviteUsable(invite, family, now)) {
    fail('INVITE_EXPIRED', '邀请已失效，请让创建者重新邀请')
  }

  const memberId = getMemberId(invite.familyId, openid)
  await db.runTransaction(async (transaction) => {
    const latestInviteRes = await transaction
      .collection(COLLECTIONS.familyInvites)
      .doc(inviteCode)
      .get()
    const latestInvite = latestInviteRes.data
    if (!latestInvite || latestInvite.status !== 'active') {
      fail('INVITE_USED', '邀请已经被使用')
    }

    await transaction.collection(COLLECTIONS.familyInvites).doc(inviteCode).update({
      data: { status: 'used', usedByOpenid: openid, usedAt: now },
    })
    await transaction.collection(COLLECTIONS.familyMembers).doc(memberId).set({
      data: {
        familyId: invite.familyId,
        openid,
        role: 'editor',
        status: 'migrating',
        joinedAt: now,
      },
    })
  })

  await migratePersonalItems(
    openid,
    invite.familyId,
    memberId,
    getFamilyOwnerOpenid(family),
  )
  return getFamilyState(openid)
}

async function retryMigration(openid) {
  const membership = await findMembership(openid, true)
  if (!membership || membership.status !== 'migrating') {
    return getFamilyState(openid)
  }
  const family = await getDocumentOrNull(COLLECTIONS.families, membership.familyId)
  if (!family || family.status !== 'active') fail('FAMILY_UNAVAILABLE', '家庭已停用')
  await migratePersonalItems(
    openid,
    membership.familyId,
    membership._id,
    getFamilyOwnerOpenid(family),
  )
  return getFamilyState(openid)
}

async function removeMember(openid, event) {
  const membership = await requireMembership(openid)
  if (!canManageFamily(membership.role)) fail('OWNER_ONLY', '只有家庭创建者可以移除成员')

  const target = await getDocumentOrNull(COLLECTIONS.familyMembers, event.memberId)
  if (!target || target.familyId !== membership.familyId || target.status !== 'active') {
    fail('MEMBER_NOT_FOUND', '成员不存在或已经离开')
  }
  if (target.role === 'owner') fail('CANNOT_REMOVE_OWNER', '不能移除家庭创建者')

  await db.collection(COLLECTIONS.familyMembers).doc(target._id).update({
    data: { status: 'removed', removedAt: Date.now(), removedBy: openid },
  })
  return getFamilyState(openid)
}

async function leaveFamily(openid) {
  const membership = await requireMembership(openid)

  if (membership.role !== 'owner') {
    await db.collection(COLLECTIONS.familyMembers).doc(membership._id).update({
      data: { status: 'left', leftAt: Date.now() },
    })
    return { left: true }
  }

  const members = await fetchAll(COLLECTIONS.familyMembers, {
    familyId: membership.familyId,
    status: 'active',
  })
  if (members.length > 1) {
    fail('OWNER_HAS_MEMBERS', '请先移除其他成员，再解散家庭')
  }

  const familyItems = await fetchAll(COLLECTIONS.items, { familyId: membership.familyId })
  for (const item of familyItems) {
    await db.collection(COLLECTIONS.items).doc(item._id).update({
      data: {
        _openid: openid,
        familyId: '',
        accessMode: 'personal',
        updatedAt: Date.now(),
      },
    })
  }
  await db.collection(COLLECTIONS.familyMembers).doc(membership._id).update({
    data: { status: 'left', leftAt: Date.now() },
  })
  await db.collection(COLLECTIONS.families).doc(membership.familyId).update({
    data: { status: 'archived', archivedAt: Date.now() },
  })
  return { left: true, dissolved: true }
}

async function requireFamilyItem(openid, itemId) {
  const membership = await requireMembership(openid)
  const item = await getDocumentOrNull(COLLECTIONS.items, itemId)
  if (!item || item.familyId !== membership.familyId) {
    fail('ITEM_NOT_FOUND', '食材不存在或没有访问权限')
  }
  return { membership, item }
}

async function listItems(openid) {
  const membership = await requireMembership(openid)
  const items = await fetchAll(COLLECTIONS.items, { familyId: membership.familyId })
  return items.map(toClientItem)
}

async function getItem(openid, event) {
  const { item } = await requireFamilyItem(openid, event.itemId)
  return toClientItem(item)
}

async function createItem(openid, event) {
  const membership = await requireMembership(openid)
  const family = await getDocumentOrNull(COLLECTIONS.families, membership.familyId)
  if (!family || family.status !== 'active') fail('FAMILY_UNAVAILABLE', '家庭已停用')
  const ownerOpenid = getFamilyOwnerOpenid(family)
  if (!ownerOpenid) fail('FAMILY_UNAVAILABLE', '家庭创建者信息不完整')
  const item = cleanItemPayload(event.item)
  if (!item.name || !item.expireDate) fail('INVALID_ITEM', '食品名称和过期日期不能为空')
  const now = Date.now()
  const res = await db.collection(COLLECTIONS.items).add({
    data: {
      ...item,
      _openid: ownerOpenid,
      familyId: membership.familyId,
      accessMode: 'family',
      createdByMemberId: membership._id,
      createdAt: now,
      updatedAt: now,
    },
  })
  return { _id: res._id }
}

async function updateItem(openid, event) {
  await requireFamilyItem(openid, event.itemId)
  const item = cleanItemPayload(event.item)
  if (!item.name || !item.expireDate) fail('INVALID_ITEM', '食品名称和过期日期不能为空')
  await db.collection(COLLECTIONS.items).doc(event.itemId).update({
    data: { ...item, updatedAt: Date.now() },
  })
  return { updated: true }
}

async function deleteItem(openid, event) {
  const { membership, item } = await requireFamilyItem(openid, event.itemId)
  await db.runTransaction(async (transaction) => {
    await transaction.collection(COLLECTIONS.items).doc(item._id).remove()
    await transaction.collection(COLLECTIONS.inventoryEvents).doc(randomId('event')).set({
      data: {
        familyId: membership.familyId,
        actorOpenid: openid,
        type: 'delete',
        itemId: item._id,
        createdAt: Date.now(),
      },
    })
  })
  return { deleted: true }
}

async function consumeItem(openid, event) {
  const { membership } = await requireFamilyItem(openid, event.itemId)
  const eventId = randomId('event')

  return db.runTransaction(async (transaction) => {
    const itemRes = await transaction.collection(COLLECTIONS.items).doc(event.itemId).get()
    const item = itemRes.data
    if (!item || item.familyId !== membership.familyId) {
      fail('ITEM_CHANGED', '库存已变化，请刷新后重试')
    }

    const quantity = Number(item.quantity)
    const type = getConsumeType(item)
    if (type === 'decrease') {
      await transaction.collection(COLLECTIONS.items).doc(item._id).update({
        data: { quantity: quantity - 1, updatedAt: Date.now() },
      })
    } else {
      await transaction.collection(COLLECTIONS.items).doc(item._id).remove()
    }

    await transaction.collection(COLLECTIONS.inventoryEvents).doc(eventId).set({
      data: {
        familyId: membership.familyId,
        actorOpenid: openid,
        type,
        itemId: item._id,
        before: item,
        status: 'active',
        createdAt: Date.now(),
      },
    })
    return { type, undoToken: eventId, itemName: item.name, quantityBefore: quantity }
  })
}

async function undoConsume(openid, event) {
  const membership = await requireMembership(openid)
  const record = await getDocumentOrNull(COLLECTIONS.inventoryEvents, event.undoToken)
  if (
    !record ||
    record.familyId !== membership.familyId ||
    record.actorOpenid !== openid ||
    record.status !== 'active' ||
    Date.now() - record.createdAt > UNDO_TTL
  ) {
    fail('UNDO_EXPIRED', '撤销时间已过或库存已经变化')
  }

  await db.runTransaction(async (transaction) => {
    if (record.type === 'decrease') {
      await transaction.collection(COLLECTIONS.items).doc(record.itemId).update({
        data: { quantity: record.before.quantity, updatedAt: Date.now() },
      })
    } else {
      const restored = { ...record.before, updatedAt: Date.now() }
      delete restored._id
      await transaction.collection(COLLECTIONS.items).doc(record.itemId).set({ data: restored })
    }
    await transaction.collection(COLLECTIONS.inventoryEvents).doc(record._id).update({
      data: { status: 'undone', undoneAt: Date.now() },
    })
  })
  return { undone: true }
}

async function clearItems(openid) {
  const membership = await requireMembership(openid)
  if (!canManageFamily(membership.role)) fail('OWNER_ONLY', '只有家庭创建者可以清空家庭库存')
  await db.collection(COLLECTIONS.items).where({ familyId: membership.familyId }).remove()
  return { cleared: true }
}

const ACTIONS = {
  getFamilyState,
  createFamily,
  createInvite,
  getInvitePreview,
  revokeInvite,
  joinFamily,
  retryMigration,
  removeMember,
  leaveFamily,
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  consumeItem,
  undoConsume,
  clearItems,
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_AUTHENTICATED', message: '无法识别当前微信用户' }

  const handler = ACTIONS[event.action]
  if (!handler) return { ok: false, error: 'UNKNOWN_ACTION', message: '不支持的家庭操作' }

  try {
    const data = await handler(OPENID, event)
    return { ok: true, data }
  } catch (error) {
    console.error('familyInventory failed', event.action, error)
    return {
      ok: false,
      error: error.code || 'FAMILY_INVENTORY_ERROR',
      message: error.message || '家庭库存操作失败',
    }
  }
}
