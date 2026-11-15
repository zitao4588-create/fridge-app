const nodeAssert = require('assert')
const fs = require('fs')
const path = require('path')
let assertionCount = 0
const assert = new Proxy(nodeAssert, {
  get(target, property) {
    const value = target[property]
    if (typeof value !== 'function') return value
    return (...args) => {
      assertionCount += 1
      return value(...args)
    }
  },
})
const {
  createRecognitionClient,
  FUNCTION_NAME,
  RECOGNITION_FEATURE_ENABLED,
} = require('../services/recognitionService')
const {
  handleCandidateRequest,
} = require('../cloudfunctions/extractFoodCandidates/domain')
const {
  handleRecognitionRequest,
} = require('../cloudfunctions/extractFoodCandidates/handler')
const {
  handleCaptureRecognition,
} = require('../cloudfunctions/extractFoodCandidates/captureRecognition')

const projectRoot = path.resolve(__dirname, '..')
const serviceSource = fs.readFileSync(
  path.join(projectRoot, 'services', 'recognitionService.js'),
  'utf8'
)
const functionSource = fs.readFileSync(
  path.join(
    projectRoot,
    'cloudfunctions',
    'extractFoodCandidates',
    'index.js',
  ),
  'utf8'
)
const functionPackage = JSON.parse(
  fs.readFileSync(
    path.join(
      projectRoot,
      'cloudfunctions',
      'extractFoodCandidates',
      'package.json',
    ),
    'utf8'
  )
)
const appConfig = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8'),
)
const quickCaptureSource = fs.readFileSync(
  path.join(
    projectRoot,
    'pkg-add',
    'quick-capture',
    'quick-capture.js',
  ),
  'utf8',
)
const handlerSource = fs.readFileSync(
  path.join(
    projectRoot,
    'cloudfunctions',
    'extractFoodCandidates',
    'handler.js',
  ),
  'utf8',
)

async function run() {
  assert.strictEqual(FUNCTION_NAME, 'extractFoodCandidates')
  assert.strictEqual(RECOGNITION_FEATURE_ENABLED, true)

  const disabledClient = createRecognitionClient({ enabled: false })
  await assert.rejects(
    disabledClient.requestFoodCandidates({
      captureId: `capture_${'1'.repeat(36)}`,
    }),
    (error) => {
      assert.strictEqual(error.code, 'RECOGNITION_DISABLED')
      assert.strictEqual(error.fallback, 'manual')
      return true
    },
  )

  const clientCalls = []
  const enabledClient = createRecognitionClient({
    enabled: true,
    wxApi: {
      cloud: {
        callFunction(options) {
          clientCalls.push(options)
          return Promise.resolve({
            result: {
              ok: true,
              data: { requiresConfirmation: true },
            },
          })
        },
      },
    },
  })
  const clientCaptureId = `capture_${'2'.repeat(36)}`
  const clientResult = await enabledClient.requestFoodCandidates({
    captureId: clientCaptureId,
  })
  assert.strictEqual(clientResult.requiresConfirmation, true)
  assert.deepStrictEqual(clientCalls[0], {
    name: 'extractFoodCandidates',
    data: { captureId: clientCaptureId },
  })
  assert.ok(!JSON.stringify(clientCalls[0]).includes('imageFileId'))

  const disabled = handleCandidateRequest(
    { imageFileId: 'cloud://private-image' },
    { enabled: false },
  )
  assert.strictEqual(disabled.ok, false)
  assert.strictEqual(disabled.error.code, 'RECOGNITION_DISABLED')
  assert.strictEqual(disabled.fallback, 'manual')

  const missingImage = handleCandidateRequest({}, { enabled: true })
  assert.strictEqual(missingImage.ok, false)
  assert.strictEqual(missingImage.error.code, 'INVALID_IMAGE')

  const ownershipUnverified = handleCandidateRequest(
    { imageFileId: 'cloud://private-image' },
    { enabled: true },
  )
  assert.strictEqual(ownershipUnverified.ok, false)
  assert.strictEqual(
    ownershipUnverified.error.code,
    'IMAGE_OWNERSHIP_UNVERIFIED',
  )

  const providerUnavailable = handleCandidateRequest(
    { imageFileId: 'cloud://private-image' },
    { enabled: true, ownershipVerified: true },
  )
  assert.strictEqual(providerUnavailable.ok, false)
  assert.strictEqual(providerUnavailable.error.code, 'PROVIDER_NOT_CONFIGURED')

  const ready = handleCandidateRequest(
    { imageFileId: 'cloud://private-image' },
    {
      enabled: true,
      ownershipVerified: true,
      providerConfigured: true,
    },
  )
  assert.strictEqual(ready.ok, true)
  assert.strictEqual(ready.ready, true)

  const downloadCalls = []
  const providerInputs = []
  const handled = await handleRecognitionRequest(
    { imageFileId: 'cloud://private-image' },
    {
      enabled: true,
      ownershipVerified: true,
      providerConfigured: true,
    },
    {
      downloadFile(params) {
        downloadCalls.push(params)
        return Promise.resolve({
          fileContent: Buffer.from('test-image'),
        })
      },
      provider: {
        name: 'fake-non-generative-provider',
        recognize(input) {
          providerInputs.push(input)
          return Promise.resolve({
            provider: 'fake-non-generative-provider',
            detections: [
              { text: 'Fresh Milk', confidence: 0.96 },
            ],
            lineCount: 1,
            latencyMs: 12,
          })
        },
      },
    },
  )
  assert.deepStrictEqual(downloadCalls, [
    { fileID: 'cloud://private-image' },
  ])
  assert.strictEqual(providerInputs.length, 1)
  assert.strictEqual(
    Buffer.from(providerInputs[0].imageBase64, 'base64').toString(),
    'test-image',
  )
  assert.strictEqual(handled.ok, true)
  assert.strictEqual(handled.data.fields.name.value, '牛奶')
  assert.strictEqual(handled.data.requiresConfirmation, true)
  assert.strictEqual(handled.data.autoWriteAllowed, false)
  assert.strictEqual(handled.providerMeta.lineCount, 1)
  assert.ok(!JSON.stringify(handled).includes('Fresh Milk'))
  assert.ok(!JSON.stringify(handled).includes('cloud://private-image'))

  const timeout = await handleRecognitionRequest(
    { imageFileId: 'cloud://private-image' },
    {
      enabled: true,
      ownershipVerified: true,
      providerConfigured: true,
    },
    {
      downloadFile() {
        return Promise.resolve({ fileContent: Buffer.from('test-image') })
      },
      provider: {
        recognize() {
          return Promise.reject(
            Object.assign(new Error('PROVIDER_TIMEOUT'), {
              code: 'PROVIDER_TIMEOUT',
            }),
          )
        },
      },
    },
  )
  assert.strictEqual(timeout.ok, false)
  assert.strictEqual(timeout.error.code, 'PROVIDER_TIMEOUT')
  assert.strictEqual(timeout.error.retryable, true)
  assert.strictEqual(timeout.fallback, 'manual')

  const missingContent = await handleRecognitionRequest(
    { imageFileId: 'cloud://private-image' },
    {
      enabled: true,
      ownershipVerified: true,
      providerConfigured: true,
    },
    {
      downloadFile() {
        return Promise.resolve({})
      },
    },
  )
  assert.strictEqual(missingContent.error.code, 'IMAGE_DOWNLOAD_FAILED')

  const captureId = `capture_${'3'.repeat(36)}`
  const captureFlow = []
  const captured = await handleCaptureRecognition(
    { captureId },
    {
      enabled: true,
      openid: 'owner-openid',
      providerConfigured: true,
    },
    {
      getRecognitionSession(openid, requestedCaptureId) {
        captureFlow.push(`get:${openid}:${requestedCaptureId}`)
        return Promise.resolve({
          captureId: requestedCaptureId,
          fileId: 'cloud://env/fridge-captures/owned-image',
        })
      },
      markRecognizing(openid, requestedCaptureId) {
        captureFlow.push(`mark:${openid}:${requestedCaptureId}`)
        return Promise.resolve()
      },
      completeRecognition(openid, requestedCaptureId, succeeded) {
        captureFlow.push(
          `complete:${openid}:${requestedCaptureId}:${succeeded}`,
        )
        return Promise.resolve({ readyForConfirmation: succeeded })
      },
      downloadFile(params) {
        captureFlow.push(`download:${params.fileID}`)
        return Promise.resolve({ fileContent: Buffer.from('test-image') })
      },
      provider: {
        recognize() {
          captureFlow.push('provider')
          return Promise.resolve({
            provider: 'fake-non-generative-provider',
            detections: [{ text: 'Fresh Milk', confidence: 0.96 }],
            lineCount: 1,
            latencyMs: 8,
          })
        },
      },
    },
  )
  assert.strictEqual(captured.ok, true)
  assert.strictEqual(captured.data.fields.name.value, '牛奶')
  assert.ok(
    captureFlow.includes(
      `get:owner-openid:${captureId}`,
    ),
  )
  assert.ok(
    captureFlow.includes(
      `complete:owner-openid:${captureId}:true`,
    ),
  )
  assert.ok(
    !JSON.stringify(captured).includes(
      'cloud://env/fridge-captures/owned-image',
    ),
  )

  let unauthorizedDownloaded = false
  const unauthorized = await handleCaptureRecognition(
    { captureId },
    {
      enabled: true,
      openid: 'other-openid',
      providerConfigured: true,
    },
    {
      getRecognitionSession() {
        const error = new Error('CAPTURE_NOT_FOUND')
        error.code = 'CAPTURE_NOT_FOUND'
        return Promise.reject(error)
      },
      markRecognizing() {
        return Promise.resolve()
      },
      completeRecognition() {
        return Promise.resolve()
      },
      downloadFile() {
        unauthorizedDownloaded = true
        return Promise.resolve({ fileContent: Buffer.from('test-image') })
      },
    },
  )
  assert.strictEqual(unauthorized.ok, false)
  assert.strictEqual(unauthorized.error.code, 'CAPTURE_NOT_FOUND')
  assert.strictEqual(unauthorizedDownloaded, false)

  assert.ok(serviceSource.includes("name: FUNCTION_NAME"))
  assert.ok(functionSource.includes('FRIDGE_NON_GENERATIVE_RECOGNITION_ENABLED'))
  assert.ok(!serviceSource.includes('parseFoodImage'))
  assert.ok(!functionSource.includes('parseFoodImage'))
  assert.ok(!serviceSource.includes('uploadFile'))
  assert.ok(!serviceSource.includes('tempFilePath'))
  assert.ok(
    !/(OPENAI|DEEPSEEK|ZHIPU|generateRecipes)/i.test(
      `${serviceSource}\n${functionSource}`,
    ),
  )
  assert.ok(
    Object.prototype.hasOwnProperty.call(
      functionPackage.dependencies,
      'tencentcloud-sdk-nodejs-ocr',
    ),
  )
  assert.ok(
    Object.prototype.hasOwnProperty.call(
      functionPackage.dependencies,
      'wx-server-sdk',
    ),
  )
  assert.strictEqual(functionPackage.name, 'extractFoodCandidates')
  assert.ok(functionSource.includes('createCaptureSessionStore'))
  assert.ok(!functionSource.includes('ownershipVerified: false'))
  assert.ok(!serviceSource.includes('imageFileId'))
  assert.ok(handlerSource.includes('runTrustedCandidatePipeline'))
  assert.ok(!handlerSource.includes('console.'))
  assert.ok(!handlerSource.includes('parseFoodImage'))
  assert.strictEqual(appConfig.__usePrivacyCheck__, true)
  assert.ok(quickCaptureSource.includes('wx.chooseMedia'))

  console.log(
    `recognition-service-boundary: ${assertionCount} assertions passed`,
  )
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
