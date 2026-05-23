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
  const today = new Date()
  const productionDate = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const result = {
    name: '原味酸奶',
    category: '乳制品',
    quantity: 1,
    unit: '盒',
    productionDate,
    shelfLifeDays: 21,
    expireDate: addDays(today, 21),
    storageLocation: '冷藏',
    imageFileId: event.imageFileId || '',
  }
  const response = {
    source: 'photo',
    type: 'photo',
    imageFileId: result.imageFileId,
    result,
    fields: result,
    confidence: 0.76,
    rawText: '常用乳制品信息预填',
  }

  await db
    .collection('parseLogs')
    .add({
      data: {
        _openid: wxContext.OPENID,
        type: 'photo',
        imageFileId: result.imageFileId,
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
