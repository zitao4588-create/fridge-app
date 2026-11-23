const { createServer } = require('node:http')
const { createHmac, timingSafeEqual } = require('node:crypto')
const { openStore } = require('./sqlite-store.cjs')
const createFamilyHandler = require('./family/handler.cjs')
const { createPersonalHandler } = require('./personal.cjs')

const BASE = '/fridge-api/v2'
const MAX_BODY_BYTES = 32 * 1024
const APPID = 'wx328e2b87665508e7'
const SESSION_MS = 60 * 60 * 1000

function respond(res, status, result) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(result))
}

function publicError(status, error, message) {
  return Object.assign(new Error(message), { status, publicCode: error })
}

async function requestBody(req) {
  if (!String(req.headers['content-type']).startsWith('application/json')) {
    throw publicError(415, 'UNSUPPORTED_TYPE', '请求格式无效')
  }
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
    throw publicError(413, 'BODY_TOO_LARGE', '请求内容过长')
  }
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw publicError(413, 'BODY_TOO_LARGE', '请求内容过长')
    chunks.push(chunk)
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks))
    if (body && typeof body === 'object' && !Array.isArray(body)) return body
  } catch {}
  throw publicError(400, 'INVALID_BODY', '请求内容无效')
}

function createSessionHandlers(sessionSecret) {
  if (typeof sessionSecret !== 'string' || sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters')
  }
  const sign = (value) => createHmac('sha256', sessionSecret).update(value).digest()
  return {
    issue(openid) {
      const claims = Buffer.from(JSON.stringify({ openid, expiry: Date.now() + SESSION_MS }))
        .toString('base64url')
      return claims + '.' + sign(claims).toString('base64url')
    },
    verify(header) {
      const parts = /^Bearer ([A-Za-z0-9_-]{1,256})\.([A-Za-z0-9_-]{43})$/.exec(header || '')
      if (!parts || !timingSafeEqual(sign(parts[1]), Buffer.from(parts[2], 'base64url'))) {
        throw publicError(401, 'INVALID_SESSION', '请重新连接微信')
      }
      const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
      if (typeof claims.openid !== 'string' || claims.expiry <= Date.now()) {
        throw publicError(401, 'INVALID_SESSION', '请重新连接微信')
      }
      return claims.openid
    },
  }
}

function createApplication(store, exchange, sessionSecret) {
  const family = createFamilyHandler(store)
  const personal = createPersonalHandler(store)
  const sessions = createSessionHandlers(sessionSecret)
  const lanes = new Map([[BASE + '/family', family], [BASE + '/personal', personal]])
  return createServer({ requestTimeout: 15_000, headersTimeout: 8_000 }, async (req, res) => {
    if (req.method === 'GET' && req.url === BASE + '/health') {
      return respond(res, 200, { ok: true })
    }
    if (req.method !== 'POST' || (req.url !== BASE + '/session' && !lanes.has(req.url))) {
      return respond(res, 404, { ok: false, error: 'NOT_FOUND' })
    }
    try {
      if (req.url === BASE + '/session') {
        const { code } = await requestBody(req)
        if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(code)) {
          throw publicError(400, 'INVALID_CODE', '登录凭证无效')
        }
        const openid = await exchange(code)
        return respond(res, 200, { ok: true, data: { token: sessions.issue(openid) } })
      }
      const openid = sessions.verify(req.headers.authorization)
      const event = await requestBody(req)
      if (typeof event.action !== 'string' || event.action.length > 40) {
        throw publicError(400, 'INVALID_ACTION', '操作无效')
      }
      const result = await store.runRequest(() => lanes.get(req.url)(openid, event))
      return respond(res, 200, result)
    } catch (error) {
      if (error.status) {
        return respond(res, error.status, {
          ok: false, error: error.publicCode, message: error.message,
        })
      }
      return respond(res, 503, { ok: false, error: 'SERVICE_UNAVAILABLE', message: '服务暂不可用' })
    }
  })
}

function createWeChatExchange(secret) {
  if (!secret) throw new Error('WX_APPSECRET is required')
  return async (code) => {
    const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
    url.search = new URLSearchParams({ appid: APPID, secret, js_code: code,
      grant_type: 'authorization_code' })
    const wechat = await fetch(url, { signal: AbortSignal.timeout(6000), redirect: 'error' })
    const data = await wechat.json()
    if (!wechat.ok || data.errcode || !/^[A-Za-z0-9_-]{12,128}$/.test(data.openid || '')) {
      throw publicError(401, 'WECHAT_LOGIN_FAILED', '微信登录失败，请重试')
    }
    return data.openid
  }
}

if (require.main === module) {
  const { FRIDGE_DB, SESSION_SECRET, WX_APPSECRET, PORT } = process.env
  if (!FRIDGE_DB || !PORT) throw new Error('FRIDGE_DB and PORT are required')
  const service = createApplication(openStore(FRIDGE_DB), createWeChatExchange(WX_APPSECRET),
    SESSION_SECRET)
  service.listen(Number(PORT), '127.0.0.1')
}

module.exports = { createApplication }
