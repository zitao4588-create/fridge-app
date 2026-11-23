const BASE_URL = 'https://fridge.playgamelab.cn/fridge-api/v2'
let token = ''
let loginPending

function request(path, data, bearer) {
  return new Promise((resolve, reject) => wx.request({
    url: BASE_URL + path,
    method: 'POST',
    timeout: 12_000,
    data,
    header: {
      'content-type': 'application/json',
      ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}),
    },
    success(response) {
      const body = response.data || {}
      if (response.statusCode === 200 && body.ok) return resolve(body.data)
      const error = new Error(body.message || '服务器暂不可用')
      error.code = body.error || 'BACKEND_ERROR'
      return reject(error)
    },
    fail() { reject(new Error('网络连接失败，请重试')) },
  }))
}

function acquireSession() {
  if (token) return Promise.resolve(token)
  if (!loginPending) {
    loginPending = new Promise((resolve, reject) => wx.login({
      success(result) {
        if (result.code) resolve(result.code)
        else reject(new Error('微信登录失败，请重试'))
      },
      fail() { reject(new Error('微信登录失败，请重试')) },
    }))
      .then((code) => request('/session', { code }))
      .then((result) => {
        token = result.token
        return token
      })
      .finally(() => { loginPending = null })
  }
  return loginPending
}

async function invoke(path, action, args) {
  const entered = await acquireSession()
  try {
    return await request(path, { ...args, action }, entered)
  } catch (error) {
    if (error.code !== 'INVALID_SESSION') throw error
    if (token === entered) token = ''
    return request(path, { ...args, action }, await acquireSession())
  }
}

module.exports = {
  personal: (action, args) => invoke('/personal', action, args),
  family: (action, args) => invoke('/family', action, args),
}
