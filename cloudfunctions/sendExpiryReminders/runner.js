// Core reminder run, with all platform dependencies injected so it can be tested offline.
// index.js wires the real wx-server-sdk / database / HTTPS client into runReminders().
const {
  REMINDER_RECORD_TYPE,
  classifySendError,
  getAuthorizationState,
  hasDailySummaryRecord,
  isConfigFailure,
} = require('./domain')

const PAGE_SIZE = 100
const MESSAGE_STATES = ['developer', 'trial', 'formal']
const SEND_MODES = ['auto', 'cloud', 'server']
const STABLE_TOKEN_PATH = '/cgi-bin/stable_token'
const SUBSCRIBE_SEND_PATH = '/cgi-bin/message/subscribe/send'
const ALERT_PREFIX = '[ALERT][sendExpiryReminders]'

function pad(value) {
  return String(value).padStart(2, '0')
}

function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(dateString, days) {
  const parts = String(dateString || '').split('-').map(Number)
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return ''

  const date = new Date(parts[0], parts[1] - 1, parts[2])
  date.setDate(date.getDate() + Number(days))
  return toDateString(date)
}

function formatDateForMessage(dateString) {
  const parts = String(dateString || '').split('-')
  if (parts.length !== 3) return String(dateString || '')
  return `${parts[0]}年${parts[1]}月${parts[2]}日`
}

function trimValue(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function getMiniprogramState(event) {
  const state = event && event.miniprogramState
  return MESSAGE_STATES.includes(state) ? state : 'formal'
}

// REMINDER_SEND_MODE:
//   cloud  -> only cloud.openapi.subscribeMessage.send (云调用, no access_token, no IP whitelist)
//   server -> only HTTPS + access_token (needs WX_APPSECRET and an IP whitelist that matches egress)
//   auto   -> HTTPS first; if the token cannot be obtained (e.g. 40164) switch this run to cloud call
// Default: auto when a secret is configured, otherwise cloud.
function resolveSendMode(env = {}) {
  const hasSecret = Boolean(env.WX_APPSECRET)
  const raw = String(env.REMINDER_SEND_MODE || '').trim().toLowerCase()
  let warning = ''
  let mode = raw

  if (!raw) {
    mode = hasSecret ? 'auto' : 'cloud'
  } else if (!SEND_MODES.includes(raw)) {
    warning = `unknown REMINDER_SEND_MODE "${raw}", using ${hasSecret ? 'auto' : 'cloud'}`
    mode = hasSecret ? 'auto' : 'cloud'
  }

  if ((mode === 'auto' || mode === 'server') && !hasSecret) {
    if (mode === 'server') warning = 'REMINDER_SEND_MODE=server but WX_APPSECRET is empty'
    mode = mode === 'server' ? 'server' : 'cloud'
  }

  return { mode, warning }
}

function sortByExpireDate(items) {
  return items.slice().sort((left, right) => {
    const leftDate = left.expireDate || ''
    const rightDate = right.expireDate || ''
    if (leftDate !== rightDate) return leftDate.localeCompare(rightDate)
    return String(left.name || '').localeCompare(String(right.name || ''))
  })
}

function buildSummaryName(items) {
  const names = items.map((item) => String(item.name || '').trim()).filter(Boolean)
  if (names.length === 0) return '冰箱食材'
  if (names.length === 1) return names[0]
  return `${names[0]}等${items.length}样`
}

// NOTE: grouped by the item's _openid (owner). Family members who subscribed but do not own
// the items are not targeted; changing that needs a product decision (Codex F-01).
function buildReminderTargets(items) {
  const groups = items.reduce((acc, item) => {
    if (!item._openid || !item._id) return acc
    ;(acc[item._openid] = acc[item._openid] || []).push(item)
    return acc
  }, {})

  return Object.keys(groups).map((openid) => {
    const sortedItems = sortByExpireDate(groups[openid])
    const firstItem = sortedItems[0] || {}

    return {
      _openid: openid,
      name: buildSummaryName(sortedItems),
      expireDate: firstItem.expireDate || '',
      storageLocation: firstItem.storageLocation || '冰箱',
      itemCount: sortedItems.length,
      items: sortedItems,
      itemIds: sortedItems.map((item) => item._id).filter(Boolean),
      itemNames: sortedItems.map((item) => item.name || '').filter(Boolean),
    }
  })
}

function buildMessageData(target) {
  const note = target.itemCount > 1
    ? `共${target.itemCount}样临期，打开小程序查看`
    : `${target.storageLocation || '冰箱'} · 请尽快处理`

  return {
    thing6: { value: trimValue(target.name || '冰箱食材', 20) },
    time16: { value: formatDateForMessage(target.expireDate) },
    thing3: { value: trimValue(note, 20) },
  }
}

function createStore(db) {
  const _ = db.command

  async function fetchDueItems(today, endDate, openid, skip = 0, collected = []) {
    const query = { expireDate: _.gte(today).and(_.lte(endDate)) }
    if (openid) query._openid = openid
    const res = await db.collection('items').where(query).skip(skip).limit(PAGE_SIZE).get()
    const items = collected.concat(res.data || [])
    if (!res.data || res.data.length < PAGE_SIZE) return items
    return fetchDueItems(today, endDate, openid, skip + PAGE_SIZE, items)
  }

  async function fetchTargetItem(itemId, openid) {
    if (!itemId) return null
    try {
      const res = await db.collection('items').doc(itemId).get()
      const item = res.data
      if (!item || (openid && item._openid !== openid)) return null
      return item
    } catch (error) {
      return null
    }
  }

  async function fetchReminderItems(event, today, endDate, openid) {
    const itemId = String(event && event.itemId ? event.itemId : '').trim()
    if (itemId) {
      const item = await fetchTargetItem(itemId, openid)
      return item ? [item] : []
    }
    return fetchDueItems(today, endDate, openid)
  }

  async function fetchUserReminderRecords(openid, skip = 0, collected = []) {
    const res = await db
      .collection('reminders')
      .where({ _openid: openid })
      .skip(skip)
      .limit(PAGE_SIZE)
      .get()
    const records = collected.concat(res.data || [])
    if (!res.data || res.data.length < PAGE_SIZE) return records
    return fetchUserReminderRecords(openid, skip + PAGE_SIZE, records)
  }

  // Same document shape as before; no new fields.
  async function writeSummaryReminderRecord(target, remindDate, status, failure = {}) {
    return db.collection('reminders').add({
      data: {
        _openid: target._openid,
        type: REMINDER_RECORD_TYPE,
        summaryMode: 'daily',
        itemIds: target.itemIds,
        itemNames: target.itemNames,
        itemCount: target.itemCount,
        itemName: target.name || '',
        expireDate: target.expireDate || '',
        remindDate,
        status,
        detail: failure.detail || '',
        failureCode: failure.failureCode || '',
        retryable: Boolean(failure.retryable),
        deliveryOutcome: failure.deliveryOutcome || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    })
  }

  return { fetchReminderItems, fetchUserReminderRecords, writeSummaryReminderRecord }
}

function markNotSent(error) {
  const wrapped = error instanceof Error ? error : new Error(String(error))
  wrapped.deliveryOutcome = 'NOT_SENT'
  return wrapped
}

// One transport per run: the access_token is requested at most once and shared by every target.
function createTransport({ mode, appId, appSecret, requestJson, openapi, logger }) {
  let activePath = mode === 'cloud' ? 'cloud' : 'server'
  let tokenPromise = null
  let tokenRequests = 0
  let fallback = null

  function switchToCloud(classification, stage) {
    activePath = 'cloud'
    fallback = { from: 'server', to: 'cloud', stage, failureCode: classification.failureCode }
    logger.warn(`${ALERT_PREFIX} server API unavailable at ${stage} (${classification.failureCode}); ` +
      'this run switches to cloud.openapi. Fix or remove WX_APPSECRET / set REMINDER_SEND_MODE=cloud.')
  }

  function getAccessToken() {
    if (!tokenPromise) {
      tokenRequests += 1
      const body = JSON.stringify({
        grant_type: 'client_credential',
        appid: appId,
        secret: appSecret,
        force_refresh: false,
      })
      tokenPromise = Promise.resolve()
        .then(() => requestJson({
          hostname: 'api.weixin.qq.com',
          path: STABLE_TOKEN_PATH,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        }, body))
        .then((data) => {
          if (!data || !data.access_token) {
            const error = new Error(
              `get access_token failed: errCode: ${(data && data.errcode) || 'UNKNOWN'} | ` +
              `errMsg: ${(data && data.errmsg) || ''}`.trim(),
            )
            if (data && data.errcode) error.errcode = data.errcode
            throw error
          }
          return data.access_token
        })
        .catch((error) => {
          throw markNotSent(error)
        })
    }
    return tokenPromise
  }

  async function sendWithServerApi(target, templateId, miniprogramState, accessToken) {
    const body = JSON.stringify({
      touser: target._openid,
      template_id: templateId,
      page: 'pages/index/index',
      miniprogram_state: miniprogramState,
      lang: 'zh_CN',
      data: buildMessageData(target),
    })
    // Network errors here keep deliveryOutcome unset => UNKNOWN => never auto-resent.
    const data = await requestJson({
      hostname: 'api.weixin.qq.com',
      path: `${SUBSCRIBE_SEND_PATH}?access_token=${encodeURIComponent(accessToken)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, body)

    if (!data || data.errcode !== 0) {
      const errcode = data && data.errcode
      const error = new Error(`errCode: ${errcode} | errMsg: ${(data && data.errmsg) || 'send failed'}`)
      if (typeof errcode === 'number' && errcode !== 0) {
        error.errcode = errcode
        error.deliveryOutcome = 'API_REJECTED'
      }
      throw error
    }
    return data
  }

  async function sendWithCloudCall(target, templateId, miniprogramState) {
    if (!openapi || !openapi.subscribeMessage || typeof openapi.subscribeMessage.send !== 'function') {
      const error = markNotSent(new Error('cloud.openapi.subscribeMessage.send unavailable'))
      error.wxErrorCode = -604101
      throw error
    }
    try {
      return await openapi.subscribeMessage.send({
        touser: target._openid,
        templateId,
        page: 'pages/index/index',
        miniprogramState,
        lang: 'zh_CN',
        data: buildMessageData(target),
      })
    } catch (error) {
      // Only structured positive WeChat error codes prove an API rejection; domain.js also
      // recognises known config failures (e.g. permission / invalid openapi token).
      if (Number.isInteger(error.errCode) && error.errCode > 0) error.deliveryOutcome = 'API_REJECTED'
      throw error
    }
  }

  async function send(target, templateId, miniprogramState) {
    if (activePath === 'server') {
      let accessToken
      try {
        accessToken = await getAccessToken()
      } catch (error) {
        // Nothing has been sent at this point, so switching paths cannot double-deliver.
        if (mode !== 'auto') throw error
        if (!fallback) switchToCloud(classifySendError(error), 'token')
        return sendWithCloudCall(target, templateId, miniprogramState)
      }

      try {
        return await sendWithServerApi(target, templateId, miniprogramState, accessToken)
      } catch (error) {
        const classification = classifySendError(error)
        // WeChat explicitly rejected (API_REJECTED) because of IP -> not delivered, safe to retry via cloud.
        if (mode === 'auto' && error.deliveryOutcome === 'API_REJECTED' &&
          ['CONFIG_IP_NOT_WHITELISTED', 'CONFIG_IP_NOT_APPROVED'].includes(classification.failureCode)) {
          if (!fallback) switchToCloud(classification, 'send')
          return sendWithCloudCall(target, templateId, miniprogramState)
        }
        throw error
      }
    }
    return sendWithCloudCall(target, templateId, miniprogramState)
  }

  return {
    send,
    getState: () => ({ activePath, fallback, tokenRequests }),
  }
}

function createStats({ remindDays, today, endDate, sendMode }) {
  return {
    ok: true,
    sendMode,
    sendPath: sendMode === 'cloud' ? 'cloud' : 'server',
    fallback: null,
    tokenRequests: 0,
    targets: 0,
    attempted: 0,
    sent: 0,
    skipped: 0,
    skippedNoGrant: 0,
    failed: 0,
    refused: 0,
    retryableFailures: 0,
    failedConfig: 0,
    failedUser: 0,
    failedTransient: 0,
    failedUnknown: 0,
    failureCodes: {},
    sentUnrecorded: 0,
    recordWriteFailures: 0,
    sentItems: 0,
    skippedItems: 0,
    failedItems: 0,
    remindDays,
    dateRange: { today, endDate },
    summaryMode: 'daily',
    alert: '',
  }
}

function countFailure(stats, failure, target) {
  if (failure.status === 'refused') stats.refused += 1
  else stats.failed += 1
  if (failure.retryable) stats.retryableFailures += 1
  const key = `failed${failure.category.charAt(0).toUpperCase()}${failure.category.slice(1)}`
  stats[key] += 1
  stats.failureCodes[failure.failureCode] = (stats.failureCodes[failure.failureCode] || 0) + 1
  stats.failedItems += target.itemCount
}

async function safeWriteFailure(store, target, today, failure, stats, logger) {
  try {
    await store.writeSummaryReminderRecord(target, today, failure.status, failure)
  } catch (error) {
    stats.recordWriteFailures += 1
    logger.error(`${ALERT_PREFIX} failed to persist failure record (${failure.failureCode}): ${error.message}`)
  }
}

// Never throws: every failure is contained to this one target.
async function processTarget({ target, store, transport, templateId, miniprogramState, today, stats, logger }) {
  let reminderRecords
  try {
    reminderRecords = await store.fetchUserReminderRecords(target._openid)
  } catch (error) {
    stats.attempted += 1
    const failure = {
      detail: `read reminder history failed: ${error && error.message ? error.message : error}`,
      status: 'failed',
      failureCode: 'TRANSIENT_HISTORY_READ_FAILED',
      category: 'transient',
      retryable: true,
      deliveryOutcome: 'NOT_SENT',
    }
    countFailure(stats, failure, target)
    await safeWriteFailure(store, target, today, failure, stats, logger)
    return
  }

  if (hasDailySummaryRecord(reminderRecords, today)) {
    stats.skipped += 1
    stats.skippedItems += target.itemCount
    return
  }

  if (!getAuthorizationState(reminderRecords).available) {
    stats.skipped += 1
    stats.skippedNoGrant += 1
    stats.skippedItems += target.itemCount
    return
  }

  stats.attempted += 1
  try {
    await transport.send(target, templateId, miniprogramState)
  } catch (error) {
    const failure = classifySendError(error)
    countFailure(stats, failure, target)
    await safeWriteFailure(store, target, today, failure, stats, logger)
    return
  }

  // Delivery already succeeded. Persisting is retried once; if it still fails the message is
  // counted as sent-but-unrecorded and is NEVER labelled safe to resend.
  stats.sent += 1
  stats.sentItems += target.itemCount
  let lastError = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await store.writeSummaryReminderRecord(target, today, 'sent')
      return
    } catch (error) {
      lastError = error
    }
  }
  stats.sentUnrecorded += 1
  stats.recordWriteFailures += 1
  logger.error(`${ALERT_PREFIX} SENT_BUT_UNRECORDED: message delivered but sent record could not be saved ` +
    `(${lastError && lastError.message}). A later run today may send a duplicate; check reminders collection.`)
}

function finalizeStats(stats, logger) {
  const totalFailures = stats.failed + stats.refused
  stats.ok = totalFailures === 0 && stats.sentUnrecorded === 0

  if (stats.attempted > 0 && stats.sent === 0 && totalFailures > 0 && stats.failedConfig === totalFailures) {
    stats.alert = 'ALL_FAILED_CONFIG'
    logger.error(`${ALERT_PREFIX} ALL_FAILED_CONFIG: 0/${stats.attempted} reminders sent, all failures are ` +
      `configuration errors ${JSON.stringify(stats.failureCodes)} (sendPath=${stats.sendPath}). ` +
      'Needs human action; see failureCode.')
  } else if (stats.failedConfig > 0) {
    stats.alert = 'CONFIG_FAILURES'
    logger.error(`${ALERT_PREFIX} CONFIG_FAILURES: ${stats.failedConfig} configuration failures ` +
      `${JSON.stringify(stats.failureCodes)} (sent=${stats.sent}, attempted=${stats.attempted}).`)
  } else if (stats.sentUnrecorded > 0) {
    stats.alert = 'SENT_BUT_UNRECORDED'
  }

  logger.log(JSON.stringify({ event: 'expiry_reminder_summary', ...stats }))
  return stats
}

async function runReminders({
  event = {},
  env = {},
  appId = '',
  db,
  openapi,
  requestJson,
  getWXContext,
  today,
  logger = console,
}) {
  const templateId = env.EXPIRY_REMINDER_TEMPLATE_ID
  if (!templateId) {
    return {
      ok: false,
      sent: 0,
      skipped: 0,
      failed: 0,
      code: 'TEMPLATE_NOT_CONFIGURED',
      message: '未配置 EXPIRY_REMINDER_TEMPLATE_ID，临期订阅提醒未发送。',
    }
  }

  const remindDaysRaw = Number(env.EXPIRY_REMIND_DAYS || 3)
  const remindDays = Number.isFinite(remindDaysRaw) && remindDaysRaw > 0 ? Math.min(Math.floor(remindDaysRaw), 7) : 3
  const endDate = addDays(today, remindDays)
  const { mode, warning } = resolveSendMode(env)
  if (warning) logger.warn(`${ALERT_PREFIX} ${warning}`)

  const stats = createStats({ remindDays, today, endDate, sendMode: mode })
  const store = createStore(db)
  const wxContext = getWXContext ? getWXContext() : null
  const openid = wxContext && wxContext.OPENID ? wxContext.OPENID : ''

  let dueItems
  try {
    dueItems = await store.fetchReminderItems(event, today, endDate, openid)
  } catch (error) {
    // Nothing was sent; report instead of throwing (a thrown timer run is retried by the platform).
    stats.ok = false
    stats.alert = 'ITEM_QUERY_FAILED'
    stats.code = 'ITEM_QUERY_FAILED'
    logger.error(`${ALERT_PREFIX} ITEM_QUERY_FAILED: ${error && error.message}`)
    logger.log(JSON.stringify({ event: 'expiry_reminder_summary', ...stats }))
    return stats
  }

  stats.skippedItems = dueItems.filter((item) => !item._openid || !item._id).length
  const targets = buildReminderTargets(dueItems)
  stats.targets = targets.length
  const transport = createTransport({
    mode,
    appId,
    appSecret: env.WX_APPSECRET || '',
    requestJson,
    openapi,
    logger,
  })
  const miniprogramState = getMiniprogramState(event)

  for (const target of targets) {
    try {
      await processTarget({ target, store, transport, templateId, miniprogramState, today, stats, logger })
    } catch (error) {
      // Defensive: processTarget is designed not to throw.
      logger.error(`${ALERT_PREFIX} unexpected target error: ${error && error.message}`)
    }
  }

  const transportState = transport.getState()
  stats.sendPath = transportState.activePath
  stats.fallback = transportState.fallback
  stats.tokenRequests = transportState.tokenRequests
  return finalizeStats(stats, logger)
}

module.exports = {
  ALERT_PREFIX,
  addDays,
  buildMessageData,
  buildReminderTargets,
  createTransport,
  resolveSendMode,
  runReminders,
}
