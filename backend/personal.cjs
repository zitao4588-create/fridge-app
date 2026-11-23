const { createHash, randomUUID } = require('node:crypto')
const { getConsumptionType, normalizeQuantityState } = require('./inventory.cjs')
const { isDeepStrictEqual } = require('node:util')

const TEXT_LIMITS = {
  name: 30, category: 24, productionDate: 10, expireDate: 10,
  storageLocation: 24, note: 100, source: 16, barcode: 64, parseStatus: 32,
}
const SUBSCRIBE_TEMPLATE = 'rxGJi_mQR7J7n0PiEq0MfZkn0-DEP7O9wXbtCDqzWQ4'
const REMINDER_TYPES = ['accepted', 'rejected', 'unsupported', 'failed']
const fail = (error, message) => ({ ok: false, error, message })
const ok = (data) => ({ ok: true, data })

function safeItem(item) {
  const { parseRawText, imageCaptureId, _openid, ...client } = item
  return client
}

function inputItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  const fields = Object.fromEntries(Object.entries(TEXT_LIMITS).map(([key, limit]) =>
    [key, typeof item[key] === 'string' ? item[key].trim().slice(0, limit) : '']))
  if (!fields.name || !/^\d{4}-\d{2}-\d{2}$/.test(fields.expireDate)) return null
  const shelfLifeDays = Number(item.shelfLifeDays)
  return {
    ...fields, unit: '', ...normalizeQuantityState(item),
    ...(Number.isInteger(shelfLifeDays) && shelfLifeDays > 0 ? { shelfLifeDays } : {}),
    ...(Number.isFinite(item.parseConfidence) ? { parseConfidence: item.parseConfidence } : {}),
  }
}

function createPersonalHandler(store) {
  const items = store.collection('items')
  const reminders = store.collection('reminders')
  const undo = store.collection('personalUndo')

  function getItem(openid, id) {
    const item = items.doc(id).get().data
    return item?._openid === openid && !item.familyId && item.accessMode !== 'family' ? item : null
  }

  const ownedItems = (openid) => items.where({ _openid: openid }).get().data
    .filter((item) => !item.familyId && item.accessMode !== 'family')

  function applyReminder(openid, event) {
    if (event.action === 'createReminder') {
      const details = event.data ?? {}
      if (details.type !== 'subscriptionAuthorization' ||
          details.templateId !== SUBSCRIBE_TEMPLATE || !REMINDER_TYPES.includes(details.status)) {
        return fail('INVALID_REMINDER', '不支持的提醒记录')
      }
      const createdAt = Date.now()
      return ok(reminders.add({ data: {
        _openid: openid, type: details.type, templateId: SUBSCRIBE_TEMPLATE,
        status: details.status, createdAt, updatedAt: createdAt,
        setting: String(details.setting || '').slice(0, 30),
        code: String(details.code || '').slice(0, 30),
        detail: String(details.detail || '').slice(0, 230),
        subscribeMessageAuthorized: details.status === 'accepted' && details.setting === 'accept',
      } }))
    }
    const row = reminders.doc(event.id).get().data
    if (row?._openid !== openid) return fail('NOT_FOUND', '提醒不存在')
    return ok(reminders.doc(event.id).update({
      data: { status: 'cancelled', updatedAt: Date.now() },
    }))
  }

  return function personal(openid, event) {
    const { action, id } = event
    if (action === 'createReminder' || action === 'cancelReminder') {
      return applyReminder(openid, event)
    }
    if (action === 'listItems') {
      const offset = Number(event.offset)
      if (!Number.isSafeInteger(offset) || offset < 0) return fail('INVALID_PAGE', '页码无效')
      const size = event.pageSize === 100 ? 100 : 20
      const rows = ownedItems(openid)
      const hasMore = offset + size < rows.length
      const revision = hasMore || offset > 0 ? createHash('sha256').update(JSON.stringify(rows)).digest('hex') : ''
      if (offset && event.revision !== revision) return fail('LIST_CHANGED', '库存已变动，请重新读取')
      return ok({ data: rows.slice(offset, offset + size).map(safeItem), hasMore, revision })
    }
    const item = getItem(openid, id)
    if (action === 'getItem') return ok({ data: item ? safeItem(item) : null })

    const membership = store.collection('familyMembers').where({
      openid, status: store.command.in(['active', 'migrating']),
    }).limit(1).get().data[0]
    if (membership) return fail('INVENTORY_SCOPE_CHANGED', '当前账号已加入家庭，请刷新库存')
    const now = Date.now()
    if (action === 'createItem' || action === 'updateItem') {
      const fields = inputItem(event.item)
      if (!fields) return fail('INVALID_ITEM', '请检查名称和过期日期')
      if (action === 'createItem') return ok(items.add({ data: {
        ...fields, accessMode: 'personal', _openid: openid, createdAt: now, updatedAt: now,
      } }))
      if (!item) return fail('NOT_FOUND', '食材不存在')
      if (event.expectedUpdatedAt !== (item.updatedAt ?? null)) {
        return fail('ITEM_CHANGED', '库存已变动，请重新打开后核对。当前输入已保留。')
      }
      const changes = Object.fromEntries(Object.entries(fields).filter(([key, value]) => item[key] !== value))
      changes.shelfLifeDays = fields.shelfLifeDays ?? null
      return ok(items.doc(id).update({ data: { ...changes, updatedAt: Math.max(now, (Number(item.updatedAt) || 0) + 1) } }))
    }
    if (action === 'deleteItem') {
      if (!item) return fail('NOT_FOUND', '食材不存在')
      return ok(items.doc(id).remove())
    }
    if (action === 'clearItems') {
      for (const current of ownedItems(openid)) items.doc(current._id).remove()
      return ok({ cleared: true })
    }
    if (action === 'consumeItem') {
      if (!item) return fail('NOT_FOUND', '食材不存在')
      const type = getConsumptionType(item)
      const later = type === 'decrease'
        ? { quantity: normalizeQuantityState(item).quantity - 1,
          updatedAt: Math.max(now, (Number(item.updatedAt) || 0) + 1) } : null
      if (later) items.doc(id).update({ data: later })
      else items.doc(id).remove()
      const token = randomUUID()
      undo.doc(token).set({ data: {
        openid, itemId: id, before: item, later, deadline: now + 10_000,
      } })
      return ok({ type, item: safeItem(item), personalUndoToken: token })
    }
    if (action === 'undoConsume') {
      const record = undo.doc(event.token).get().data
      if (record?.openid !== openid || record.deadline < now) {
        return fail('UNDO_EXPIRED', '撤销时间已过或库存已经变化')
      }
      const current = items.doc(record.itemId).get().data
      const expected = record.later ? { ...record.before, ...record.later } : null
      if (!isDeepStrictEqual(current, expected)) return fail('ITEM_CHANGED', '库存已经变化')
      items.doc(record.itemId).set({ data: { ...record.before,
        updatedAt: Math.max(now, (Number(current?.updatedAt) || 0) + 1) } })
      undo.doc(event.token).remove()
      return ok({ undone: true })
    }
    return fail('UNKNOWN_ACTION', '不支持的个人库存操作')
  }
}

module.exports = { createPersonalHandler }
