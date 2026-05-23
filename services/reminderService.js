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

function requestSubscribeMessage() {
  return Promise.resolve({
    supported: false,
    authorized: false,
    message: '当前未开启订阅提醒',
  })
}

module.exports = {
  cancelReminder,
  createReminder,
  getCalendarEvents,
  requestSubscribeMessage,
}
