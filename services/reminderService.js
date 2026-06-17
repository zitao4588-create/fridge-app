const EXPIRY_REMINDER_TEMPLATE_ID = 'rxGJi_mQR7J7n0PiEq0MfZkn0-DEP7O9wXbtCDqzWQ4'

function createReminder(data) {
  if (!wx.cloud) {
    return Promise.resolve(null)
  }

  const now = Date.now()

  return wx.cloud.database().collection('reminders').add({
    data: {
      ...data,
      status: data.status || 'pending',
      subscribeMessageAuthorized: Boolean(data.subscribeMessageAuthorized),
      createdAt: now,
      updatedAt: now,
    },
  })
}

function cancelReminder(id) {
  if (!wx.cloud || !id) {
    return Promise.resolve(null)
  }

  return wx.cloud.database().collection('reminders').doc(id).update({
    data: {
      status: 'cancelled',
      updatedAt: Date.now(),
    },
  })
}

function getCalendarEvents(items) {
  return items.reduce((events, item) => {
    if (!item.expireDate) {
      return events
    }

    if (!events[item.expireDate]) {
      events[item.expireDate] = []
    }

    events[item.expireDate].push(item)
    return events
  }, {})
}

function getExpiryTemplateId() {
  return EXPIRY_REMINDER_TEMPLATE_ID
}

function requestSubscribeMessage() {
  if (!wx.requestSubscribeMessage) {
    return Promise.resolve({
      supported: false,
      authorized: false,
      code: 'UNSUPPORTED',
      message: '当前微信版本不支持订阅提醒',
    })
  }

  const templateId = getExpiryTemplateId()

  if (!templateId) {
    return Promise.resolve({
      supported: false,
      authorized: false,
      code: 'TEMPLATE_NOT_CONFIGURED',
      message: '临期提醒模板 ID 尚未配置',
    })
  }

  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success(res) {
        const setting = res[templateId]

        resolve({
          supported: true,
          authorized: setting === 'accept',
          setting,
          templateId,
          errMsg: res.errMsg || '',
        })
      },
      fail(error) {
        resolve({
          supported: true,
          authorized: false,
          code: 'REQUEST_FAILED',
          errMsg: error && error.errMsg ? error.errMsg : '',
          message: error && error.errMsg ? error.errMsg : '订阅提醒请求失败',
        })
      },
    })
  })
}

module.exports = {
  cancelReminder,
  createReminder,
  getCalendarEvents,
  requestSubscribeMessage,
}
