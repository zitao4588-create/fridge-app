const cloud = require('wx-server-sdk')
const https = require('https')
const {
  REMINDER_RECORD_TYPE,
  classifySendError,
  getAuthorizationState,
  hasDailySummaryRecord,
} = require('./domain')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command
const DEFAULT_REMIND_DAYS = 3
const PAGE_SIZE = 100
const MESSAGE_STATES = ['developer', 'trial', 'formal']
const DEFAULT_APPID = 'wx328e2b87665508e7'
const SUBSCRIBE_SEND_PATH = '/cgi-bin/message/subscribe/send'
const CHINA_TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000

function pad(value) {
  return String(value).padStart(2, '0')
}

function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function getTodayString() {
  const chinaNow = new Date(Date.now() + CHINA_TIMEZONE_OFFSET_MS)
  return `${chinaNow.getUTCFullYear()}-${pad(chinaNow.getUTCMonth() + 1)}-${pad(chinaNow.getUTCDate())}`
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

  if (parts.length !== 3) {
    return String(dateString || '')
  }

  return `${parts[0]}年${parts[1]}月${parts[2]}日`
}

function getRemindDays() {
  const value = Number(process.env.EXPIRY_REMIND_DAYS || DEFAULT_REMIND_DAYS)
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 7) : DEFAULT_REMIND_DAYS
}

function trimValue(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch (error) {
    return null
  }
}

function requestJson(options, body) {
  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      let raw = ''

      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        raw += chunk
      })
      response.on('end', () => {
        const data = safeJsonParse(raw)

        if (!data) {
          reject(new Error(`invalid json response: ${response.statusCode}`))
          return
        }

        resolve(data)
      })
    })

    request.setTimeout(8000, () => {
      request.destroy(new Error('request timeout'))
    })
    request.on('error', reject)

    if (body) {
      request.write(body)
    }

    request.end()
  })
}

function getServerAppId() {
  return process.env.WX_APPID || DEFAULT_APPID
}

function getServerAppSecret() {
  return process.env.WX_APPSECRET || ''
}

function canUseServerOpenapi() {
  return Boolean(getServerAppId() && getServerAppSecret())
}

function getMiniprogramState(event) {
  const miniprogramState = event && event.miniprogramState

  return MESSAGE_STATES.includes(miniprogramState) ? miniprogramState : 'formal'
}

function sortByExpireDate(items) {
  return items.slice().sort((left, right) => {
    const leftDate = left.expireDate || ''
    const rightDate = right.expireDate || ''

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate)
    }

    return String(left.name || '').localeCompare(String(right.name || ''))
  })
}

function buildSummaryName(items) {
  const names = items.map((item) => String(item.name || '').trim()).filter(Boolean)

  if (names.length === 0) return '冰箱食材'
  if (names.length === 1) return names[0]
  return `${names[0]}等${items.length}样`
}

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
    thing6: {
      value: trimValue(target.name || '冰箱食材', 20),
    },
    time16: {
      value: formatDateForMessage(target.expireDate),
    },
    thing3: {
      value: trimValue(note, 20),
    },
  }
}

function buildDueQuery(today, endDate, openid) {
  const query = {
    expireDate: _.gte(today).and(_.lte(endDate)),
  }

  if (openid) {
    query._openid = openid
  }

  return query
}

async function fetchDueItems(today, endDate, openid, skip = 0, collected = []) {
  const res = await db
    .collection('items')
    .where(buildDueQuery(today, endDate, openid))
    .skip(skip)
    .limit(PAGE_SIZE)
    .get()

  const items = collected.concat(res.data || [])

  if (!res.data || res.data.length < PAGE_SIZE) {
    return items
  }

  return fetchDueItems(today, endDate, openid, skip + PAGE_SIZE, items)
}

async function fetchTargetItem(itemId, openid) {
  if (!itemId) {
    return null
  }

  try {
    const res = await db.collection('items').doc(itemId).get()
    const item = res.data

    if (!item || (openid && item._openid !== openid)) {
      return null
    }

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

  if (!res.data || res.data.length < PAGE_SIZE) {
    return records
  }

  return fetchUserReminderRecords(openid, skip + PAGE_SIZE, records)
}

async function writeSummaryReminderRecord(
  target,
  remindDate,
  status,
  detail,
  failureCode = '',
  retryable = false,
) {
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
      detail: detail || '',
      failureCode,
      retryable,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  })
}

async function getOfficialAccessToken() {
  const appid = encodeURIComponent(getServerAppId())
  const secret = encodeURIComponent(getServerAppSecret())
  const data = await requestJson({
    hostname: 'api.weixin.qq.com',
    path: `/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`,
    method: 'GET',
  })

  if (!data.access_token) {
    throw new Error(
      `get access_token failed: ${data.errcode || 'UNKNOWN'} ${data.errmsg || ''}`.trim(),
    )
  }

  return data.access_token
}

async function sendReminderWithServerApi(target, templateId, miniprogramState) {
  const accessToken = await getOfficialAccessToken()
  const body = JSON.stringify({
    touser: target._openid,
    template_id: templateId,
    page: 'pages/index/index',
    miniprogram_state: miniprogramState,
    lang: 'zh_CN',
    data: buildMessageData(target),
  })
  const data = await requestJson({
    hostname: 'api.weixin.qq.com',
    path: `${SUBSCRIBE_SEND_PATH}?access_token=${encodeURIComponent(accessToken)}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body)

  if (data.errcode !== 0) {
    throw new Error(`errCode: ${data.errcode} | errMsg: ${data.errmsg || 'send failed'}`)
  }

  return data
}

async function sendReminder(target, templateId, miniprogramState) {
  if (canUseServerOpenapi()) {
    return sendReminderWithServerApi(target, templateId, miniprogramState)
  }

  return cloud.openapi.subscribeMessage.send({
    touser: target._openid,
    templateId,
    page: 'pages/index/index',
    miniprogramState,
    lang: 'zh_CN',
    data: buildMessageData(target),
  })
}

exports.main = async (event = {}) => {
  const templateId = process.env.EXPIRY_REMINDER_TEMPLATE_ID

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

  const today = getTodayString()
  const remindDays = getRemindDays()
  const endDate = addDays(today, remindDays)
  const wxContext = cloud.getWXContext()
  const openid = wxContext && wxContext.OPENID ? wxContext.OPENID : ''
  const dueItems = await fetchReminderItems(event, today, endDate, openid)
  const invalidItemCount = dueItems.filter((item) => !item._openid || !item._id).length
  const targets = buildReminderTargets(dueItems)
  const miniprogramState = getMiniprogramState(event)
  const stats = {
    ok: true,
    sent: 0,
    skipped: 0,
    skippedNoGrant: 0,
    failed: 0,
    refused: 0,
    retryableFailures: 0,
    sentItems: 0,
    skippedItems: invalidItemCount,
    failedItems: 0,
    remindDays,
    dateRange: { today, endDate },
    summaryMode: 'daily',
  }

  for (const target of targets) {
    const reminderRecords = await fetchUserReminderRecords(target._openid)

    if (hasDailySummaryRecord(reminderRecords, today)) {
      stats.skipped += 1
      stats.skippedItems += target.itemCount
      continue
    }

    const authorization = getAuthorizationState(reminderRecords)
    if (!authorization.available) {
      stats.skipped += 1
      stats.skippedNoGrant += 1
      stats.skippedItems += target.itemCount
      continue
    }

    try {
      await sendReminder(target, templateId, miniprogramState)
      await writeSummaryReminderRecord(target, today, 'sent')
      stats.sent += 1
      stats.sentItems += target.itemCount
    } catch (error) {
      const failure = classifySendError(error)
      await writeSummaryReminderRecord(
        target,
        today,
        failure.status,
        failure.detail,
        failure.failureCode,
        failure.retryable,
      )
      if (failure.status === 'refused') {
        stats.refused += 1
      } else {
        stats.failed += 1
      }
      if (failure.retryable) stats.retryableFailures += 1
      stats.failedItems += target.itemCount
    }
  }

  stats.ok = stats.failed === 0 && stats.refused === 0
  console.log(JSON.stringify({
    event: 'expiry_reminder_summary',
    ...stats,
  }))

  return stats
}
