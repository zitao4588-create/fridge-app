const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

exports.main = async () => {
  return {
    sent: 0,
    skipped: 0,
    message: '当前未开启订阅提醒。',
  }
}
