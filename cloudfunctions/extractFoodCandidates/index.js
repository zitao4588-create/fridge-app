const cloud = require('wx-server-sdk')
const {
  createTencentOcrProvider,
} = require('./tencentOcrProvider')
const {
  handleCaptureRecognition,
} = require('./captureRecognition')
const {
  createCaptureSessionStore,
} = require('./captureSessionStore')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

function isEnabled(value) {
  return String(value || '').toLowerCase() === 'true'
}

exports.main = async (event = {}) => {
  const providerConfigured = Boolean(
    process.env.FRIDGE_SECRET_ID &&
    process.env.FRIDGE_SECRET_KEY,
  )

  const sessionStore = createCaptureSessionStore({
    db: cloud.database(),
    cloud,
  })

  return handleCaptureRecognition(
    event,
    {
      enabled: isEnabled(
        process.env.FRIDGE_NON_GENERATIVE_RECOGNITION_ENABLED,
      ),
      openid: cloud.getWXContext().OPENID,
      providerConfigured,
    },
    {
      ...sessionStore,
      downloadFile: (params) => cloud.downloadFile(params),
      createProvider: () =>
        createTencentOcrProvider({
          secretId: process.env.FRIDGE_SECRET_ID,
          secretKey: process.env.FRIDGE_SECRET_KEY,
          region: process.env.FRIDGE_OCR_REGION || 'ap-guangzhou',
          requestTimeoutSeconds: 30,
      }),
    },
  )
}
