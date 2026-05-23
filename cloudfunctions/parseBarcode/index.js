const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)

  const year = nextDate.getFullYear()
  const month = String(nextDate.getMonth() + 1).padStart(2, '0')
  const day = String(nextDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  const barcode = event.barcode || ''
  const result = {
    name: '低糖乌龙茶',
    brand: '',
    spec: '500ml',
    category: '饮料',
    quantity: 1,
    unit: '瓶',
    expireDate: addDays(new Date(), 180),
    storageLocation: '门架',
    barcode,
  }
  const response = {
    source: 'barcode',
    type: 'barcode',
    barcode,
    result,
    fields: result,
    confidence: 0.86,
    rawText: '常见饮品信息预填',
  }

  await db
    .collection('parseLogs')
    .add({
      data: {
        _openid: wxContext.OPENID,
        type: 'barcode',
        barcode,
        result,
        confidence: response.confidence,
        rawText: response.rawText,
        status: 'success',
        createdAt: Date.now(),
      },
    })
    .catch(() => null)

  return response
}
