const { runReminders } = require('./runner')

function shanghaiDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts()
  const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return [date.year, date.month, date.day].join('-')
}

async function wechatRequest(options, body) {
  if (options.hostname !== 'api.weixin.qq.com') throw new Error('Unexpected WeChat endpoint')
  const response = await fetch('https://api.weixin.qq.com' + options.path, {
    method: options.method, headers: options.headers, body,
    signal: AbortSignal.timeout(8000), redirect: 'error',
  })
  if (!response.ok) throw new Error('WeChat HTTP ' + response.status)
  return response.json()
}

async function sendReminders({ store, env, event, openid, requestJson = wechatRequest,
  today = shanghaiDate(), logger = console }) {
  return runReminders({
    db: store, env: { ...env, REMINDER_SEND_MODE: 'server' },
    event, today, appId: 'wx328e2b87665508e7',
    getWXContext: openid ? () => ({ OPENID: openid }) : null,
    requestJson, logger,
  })
}

module.exports = { sendReminders }
