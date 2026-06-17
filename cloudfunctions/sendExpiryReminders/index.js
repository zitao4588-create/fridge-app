const cloud = require('wx-server-sdk')
const https = require('https')

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

function buildMessageData(item) {
  return {
    thing6: {
      value: trimValue(item.name || '冰箱食材', 20),
    },
    time16: {
      value: formatDateForMessage(item.expireDate),
    },
    thing3: {
      value: trimValue(`${item.storageLocation || '冰箱'} · 请尽快处理`, 20),
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

async function hasReminderRecord(item, remindDate) {
  const res = await db
    .collection('reminders')
    .where({
      type: 'expiry',
      itemId: item._id,
      remindDate,
      status: 'sent',
    })
    .limit(1)
    .get()

  return Boolean(res.data && res.data.length)
}

async function writeReminderRecord(item, remindDate, status, detail) {
  return db.collection('reminders').add({
    data: {
      _openid: item._openid,
      type: 'expiry',
      itemId: item._id,
      itemName: item.name || '',
      expireDate: item.expireDate || '',
      remindDate,
      status,
      detail: detail || '',
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

async function sendReminderWithServerApi(item, templateId, miniprogramState) {
  const accessToken = await getOfficialAccessToken()
  const body = JSON.stringify({
    touser: item._openid,
    template_id: templateId,
    page: 'pages/index/index',
    miniprogram_state: miniprogramState,
    lang: 'zh_CN',
    data: buildMessageData(item),
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

async function sendReminder(item, templateId, miniprogramState) {
  if (canUseServerOpenapi()) {
    return sendReminderWithServerApi(item, templateId, miniprogramState)
  }

  return cloud.openapi.subscribeMessage.send({
    touser: item._openid,
    templateId,
    page: 'pages/index/index',
    miniprogramState,
    lang: 'zh_CN',
    data: buildMessageData(item),
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
  const miniprogramState = getMiniprogramState(event)
  const stats = {
    ok: true,
    sent: 0,
    skipped: 0,
    failed: 0,
    remindDays,
    dateRange: { today, endDate },
  }

  for (const item of dueItems) {
    if (!item._openid || !item._id) {
      stats.skipped += 1
      continue
    }

    const duplicated = await hasReminderRecord(item, today)
    if (duplicated) {
      stats.skipped += 1
      continue
    }

    try {
      await sendReminder(item, templateId, miniprogramState)
      await writeReminderRecord(item, today, 'sent')
      stats.sent += 1
    } catch (error) {
      await writeReminderRecord(
        item,
        today,
        'failed',
        error && error.message ? error.message : 'send failed',
      )
      stats.failed += 1
    }
  }

  return stats
}
