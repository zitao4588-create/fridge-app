const nodeAssert = require('assert')
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
const captureImageService = require('../services/captureImageService')
const recognitionService = require('../services/recognitionService')

let pageDefinition = null
global.Page = (definition) => {
  pageDefinition = definition
}
global.wx = {}

require('../pkg-add/quick-capture/quick-capture')

function createPage() {
  return {
    ...pageDefinition,
    data: { ...pageDefinition.data },
    setData(patch) {
      this.data = { ...this.data, ...patch }
    },
  }
}

async function run() {
  captureImageService.CAPTURE_FEATURE_ENABLED = false
  recognitionService.RECOGNITION_FEATURE_ENABLED = false

  const page = createPage()
  page.onLoad({ storageLocation: encodeURIComponent('果蔬抽屉') })
  assert.strictEqual(page.data.storageLocation, '果蔬抽屉')

  wx.chooseMedia = (options) => {
    assert.deepStrictEqual(options.mediaType, ['image'])
    assert.deepStrictEqual(options.sourceType, ['camera'])
    return Promise.resolve({
      tempFiles: [{ tempFilePath: 'wxfile://camera.jpg', size: 512 }],
    })
  }
  await page.chooseImage('camera')
  assert.strictEqual(page.data.state, 'preview')
  assert.strictEqual(page.data.previewPath, 'wxfile://camera.jpg')
  assert.strictEqual(page.data.choosing, false)

  page.handleConfirmUpload()
  assert.strictEqual(page.data.state, 'blocked')
  assert.ok(page.data.boundaryMessage.includes('不会上传这张照片'))

  let fallbackUrl = ''
  wx.navigateTo = ({ url }) => {
    fallbackUrl = url
  }
  await page.handleManualFallback()
  assert.ok(fallbackUrl.includes('entry=photoFallback'))
  assert.ok(fallbackUrl.includes(encodeURIComponent('果蔬抽屉')))

  const cancelledPage = createPage()
  wx.chooseMedia = () => Promise.reject({ errMsg: 'chooseMedia:fail cancel' })
  await cancelledPage.chooseImage('album')
  assert.strictEqual(cancelledPage.data.state, 'empty')
  assert.strictEqual(cancelledPage.data.errorMessage, '')

  const failedPage = createPage()
  wx.chooseMedia = () => Promise.reject({ errMsg: 'chooseMedia:fail auth deny' })
  await failedPage.chooseImage('album')
  assert.strictEqual(failedPage.data.state, 'error')
  assert.ok(failedPage.data.errorMessage.includes('权限'))

  captureImageService.CAPTURE_FEATURE_ENABLED = true
  recognitionService.RECOGNITION_FEATURE_ENABLED = true
  captureImageService.uploadCapture = () =>
    Promise.resolve({
      captureId: `capture_${'c'.repeat(36)}`,
      cleanupAfter: Date.now() + 1000,
    })
  recognitionService.requestFoodCandidates = ({ captureId }) => {
    assert.strictEqual(captureId, `capture_${'c'.repeat(36)}`)
    return Promise.resolve({
      fields: {
        name: { value: '牛奶', confidence: 0.9 },
      },
      dateCandidates: [],
    })
  }
  let recognitionReady = null
  wx.navigateTo = (options) => {
    assert.strictEqual(
      options.url,
      '/pkg-add/capture-confirm/capture-confirm',
    )
    options.success({
      eventChannel: {
        emit(name, payload) {
          assert.strictEqual(name, 'recognitionReady')
          recognitionReady = payload
        },
      },
    })
  }
  const enabledPage = createPage()
  enabledPage.setData({
    previewPath: 'wxfile://enabled.jpg',
    storageLocation: '冷藏',
    state: 'preview',
  })
  await enabledPage.handleConfirmUpload()
  assert.strictEqual(enabledPage.data.processing, false)
  assert.strictEqual(enabledPage.data.handoffCapture, true)
  assert.strictEqual(
    recognitionReady.captureId,
    `capture_${'c'.repeat(36)}`,
  )
  assert.strictEqual(
    recognitionReady.previewPath,
    'wxfile://enabled.jpg',
  )
  assert.ok(!JSON.stringify(recognitionReady).includes('imageFileId'))

  const replacePage = createPage()
  replacePage.setData({
    previewPath: 'wxfile://old.jpg',
    captureId: `capture_${'d'.repeat(36)}`,
    state: 'preview',
  })
  let replaceCleanupCalls = 0
  let replaceChooseCalls = 0
  captureImageService.cleanupCaptureSession = () => {
    replaceCleanupCalls += 1
    if (replaceCleanupCalls === 1) {
      return Promise.reject(Object.assign(
        new Error('network unavailable'),
        { code: 'CAPTURE_NETWORK_ERROR' },
      ))
    }
    return Promise.resolve({ deleted: true })
  }
  wx.chooseMedia = () => {
    replaceChooseCalls += 1
    return Promise.resolve({
      tempFiles: [{ tempFilePath: 'wxfile://new.jpg', size: 512 }],
    })
  }
  await replacePage.chooseImage('album')
  assert.strictEqual(replaceChooseCalls, 0)
  assert.strictEqual(
    replacePage.data.captureId,
    `capture_${'d'.repeat(36)}`,
  )
  assert.strictEqual(replacePage.data.cleanupPending, true)
  assert.ok(replacePage.data.errorMessage.includes('重试'))

  await replacePage.chooseImage('album')
  assert.strictEqual(replaceChooseCalls, 1)
  assert.strictEqual(replacePage.data.captureId, '')
  assert.strictEqual(replacePage.data.cleanupPending, false)
  assert.strictEqual(replacePage.data.previewPath, 'wxfile://new.jpg')

  const manualPage = createPage()
  manualPage.setData({
    previewPath: 'wxfile://manual.jpg',
    captureId: `capture_${'e'.repeat(36)}`,
    state: 'preview',
  })
  let manualCleanupCalls = 0
  let manualNavigations = 0
  captureImageService.cleanupCaptureSession = () => {
    manualCleanupCalls += 1
    if (manualCleanupCalls === 1) {
      return Promise.reject(Object.assign(
        new Error('timeout'),
        { code: 'CAPTURE_NETWORK_ERROR' },
      ))
    }
    return Promise.resolve({ deleted: true })
  }
  wx.navigateTo = () => {
    manualNavigations += 1
  }
  await manualPage.handleManualFallback()
  assert.strictEqual(manualNavigations, 0)
  assert.strictEqual(
    manualPage.data.captureId,
    `capture_${'e'.repeat(36)}`,
  )
  assert.strictEqual(manualPage.data.cleanupPending, true)

  await manualPage.handleManualFallback()
  assert.strictEqual(manualNavigations, 1)
  assert.strictEqual(manualPage.data.captureId, '')
  assert.strictEqual(manualPage.data.cleanupPending, false)

  const cancelPage = createPage()
  cancelPage.setData({
    previewPath: 'wxfile://cancel.jpg',
    captureId: `capture_${'f'.repeat(36)}`,
    state: 'preview',
  })
  let cancelNavigations = 0
  captureImageService.cleanupCaptureSession = () =>
    Promise.reject(Object.assign(
      new Error('timeout'),
      { code: 'CAPTURE_NETWORK_ERROR' },
    ))
  wx.navigateBack = () => {
    cancelNavigations += 1
  }
  await cancelPage.handleCancel()
  assert.strictEqual(cancelNavigations, 0)
  assert.strictEqual(
    cancelPage.data.captureId,
    `capture_${'f'.repeat(36)}`,
  )
  assert.strictEqual(cancelPage.data.cleanupPending, true)

  const recognitionFailurePage = createPage()
  recognitionFailurePage.setData({
    previewPath: 'wxfile://failure.jpg',
    state: 'preview',
  })
  captureImageService.uploadCapture = () =>
    Promise.resolve({
      captureId: `capture_${'1'.repeat(36)}`,
      cleanupAfter: Date.now() + 1000,
    })
  recognitionService.requestFoodCandidates = () =>
    Promise.reject(Object.assign(
      new Error('recognition timeout'),
      { code: 'RECOGNITION_NETWORK_ERROR' },
    ))
  captureImageService.cleanupCaptureSession = () =>
    Promise.reject(Object.assign(
      new Error('cleanup timeout'),
      { code: 'CAPTURE_NETWORK_ERROR' },
    ))
  await recognitionFailurePage.handleConfirmUpload()
  assert.strictEqual(recognitionFailurePage.data.state, 'preview')
  assert.strictEqual(
    recognitionFailurePage.data.captureId,
    `capture_${'1'.repeat(36)}`,
  )
  assert.strictEqual(recognitionFailurePage.data.cleanupPending, true)
  assert.strictEqual(recognitionFailurePage.data.processing, false)

  captureImageService.CAPTURE_FEATURE_ENABLED = true
  recognitionService.RECOGNITION_FEATURE_ENABLED = true

  console.log(
    `quick-capture-page: ${assertionCount} assertions passed`,
  )
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
