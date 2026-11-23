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
  buildDateCandidateViews,
  normalizeCandidateForm,
  validateConfirmationForm,
} = require('../utils/captureConfirmation')
const captureImageService = require('../services/captureImageService')

let pageDefinition = null
global.Page = (definition) => {
  pageDefinition = definition
}
global.wx = {
  navigateTo() {},
  navigateBack() {},
}

require('../pkg-add/capture-confirm/capture-confirm')

function createChannel() {
  const listeners = new Map()
  return {
    on(name, listener) {
      listeners.set(name, listener)
    },
    emit(name, payload) {
      const listener = listeners.get(name)
      if (listener) listener(payload)
    },
  }
}

function createPage(channel) {
  return {
    ...pageDefinition,
    data: {
      ...pageDefinition.data,
      form: { ...pageDefinition.data.form },
    },
    setData(patch) {
      this.data = { ...this.data, ...patch }
    },
    getOpenerEventChannel() {
      return channel
    },
  }
}

async function run() {
  const candidatePayload = {
    fields: {
      name: { value: 'Fresh Milk', confidence: 0.95 },
      category: { value: '乳制品', confidence: 0.92 },
      quantity: { value: '2', confidence: 0.82 },
      storageLocation: { value: '冷藏', confidence: 0.91 },
    },
    dateCandidates: [
      {
        kind: 'production',
        value: '2026-07-01',
        confidence: 0.88,
      },
      {
        kind: 'expire',
        value: '2026-07-15',
        confidence: 0.86,
      },
    ],
  }
  const normalized = normalizeCandidateForm(candidatePayload, '常温')
  assert.strictEqual(normalized.form.name, 'Fresh Milk')
  assert.strictEqual(normalized.form.category, '乳制品')
  assert.strictEqual(normalized.form.quantityTracked, true)
  assert.strictEqual(normalized.form.quantity, 2)
  assert.strictEqual(normalized.form.productionDate, '2026-07-01')
  assert.strictEqual(normalized.form.expireDate, '2026-07-15')
  assert.strictEqual(normalized.form.storageLocation, '冷藏')
  assert.strictEqual(normalized.review.autoWriteAllowed, false)

  const dateViews = buildDateCandidateViews(normalized.review)
  assert.strictEqual(dateViews.length, 2)
  assert.strictEqual(dateViews[0].label, '生产日期候选')
  assert.strictEqual(dateViews[1].label, '到期日候选')

  const valid = validateConfirmationForm(normalized.form)
  assert.strictEqual(valid.valid, true)
  assert.strictEqual(valid.preset.source, 'photo')
  assert.strictEqual(valid.preset.expireDate, '2026-07-15')
  assert.ok(!Object.prototype.hasOwnProperty.call(valid.preset, 'imageFileId'))
  assert.ok(!Object.prototype.hasOwnProperty.call(valid.preset, 'captureId'))

  const conflict = normalizeCandidateForm({
    fields: {
      name: { value: '牛奶', confidence: 0.9 },
      category: { value: '乳制品', confidence: 0.9 },
      storageLocation: { value: '冷藏', confidence: 0.9 },
    },
    dateCandidates: [
      { kind: 'expire', value: '2026-07-10', confidence: 0.9 },
      { kind: 'expire', value: '2026-07-12', confidence: 0.9 },
    ],
  })
  assert.strictEqual(conflict.review.attentionLevel, 'critical')
  assert.strictEqual(conflict.form.expireDate, '')
  const invalidConflict = validateConfirmationForm(conflict.form)
  assert.strictEqual(invalidConflict.valid, false)
  assert.ok(invalidConflict.errors.includes('请确认过期日期'))

  const channel = createChannel()
  const page = createPage(channel)
  page.onLoad()
  channel.emit('recognitionReady', {
    candidatePayload,
    captureId: `capture_${'a'.repeat(36)}`,
    previewPath: 'wxfile://preview.jpg',
    storageLocation: '常温',
  })
  assert.strictEqual(page.data.loaded, true)
  assert.strictEqual(page.data.previewPath, 'wxfile://preview.jpg')
  assert.strictEqual(page.data.captureId, `capture_${'a'.repeat(36)}`)
  assert.strictEqual(page.data.form.name, 'Fresh Milk')

  const cleanupCalls = []
  captureImageService.cleanupCaptureSession = (captureId, options) => {
    cleanupCalls.push({ captureId, options })
    return Promise.resolve({ deleted: true })
  }
  let emittedPreset = null
  wx.navigateTo = (options) => {
    options.success({
      eventChannel: {
        emit(name, payload) {
          assert.strictEqual(name, 'recognizedPreset')
          emittedPreset = payload
        },
      },
    })
  }
  await page.handleContinue()
  assert.strictEqual(cleanupCalls.length, 1)
  assert.strictEqual(cleanupCalls[0].options.reason, 'not_retained')
  assert.strictEqual(emittedPreset.retainImage, false)
  assert.strictEqual(emittedPreset.captureId, '')
  assert.strictEqual(emittedPreset.preset.name, 'Fresh Milk')
  assert.strictEqual(page.data.leaving, true)

  const retainChannel = createChannel()
  const retainPage = createPage(retainChannel)
  retainPage.onLoad()
  retainChannel.emit('recognitionReady', {
    candidatePayload,
    captureId: `capture_${'b'.repeat(36)}`,
    previewPath: 'wxfile://preview.jpg',
  })
  retainPage.handleRetainImage({ detail: { value: true } })
  let retainedPreset = null
  wx.navigateTo = (options) => {
    options.success({
      eventChannel: {
        emit(name, payload) {
          retainedPreset = payload
        },
      },
    })
  }
  const cleanupCountBeforeRetain = cleanupCalls.length
  await retainPage.handleContinue()
  assert.strictEqual(cleanupCalls.length, cleanupCountBeforeRetain)
  assert.strictEqual(retainedPreset.retainImage, true)
  assert.strictEqual(
    retainedPreset.captureId,
    `capture_${'b'.repeat(36)}`,
  )

  const cleanupFailureChannel = createChannel()
  const cleanupFailurePage = createPage(cleanupFailureChannel)
  cleanupFailurePage.onLoad()
  cleanupFailureChannel.emit('recognitionReady', {
    candidatePayload,
    captureId: `capture_${'c'.repeat(36)}`,
    previewPath: 'wxfile://preview.jpg',
    storageLocation: '冷藏',
  })
  let cleanupFailureNavigations = 0
  captureImageService.cleanupCaptureSession = () =>
    Promise.reject(Object.assign(
      new Error('network unavailable'),
      { code: 'CAPTURE_NETWORK_ERROR' },
    ))
  wx.navigateTo = () => {
    cleanupFailureNavigations += 1
  }
  await cleanupFailurePage.handleManualFallback()
  assert.strictEqual(cleanupFailurePage.data.cleanupPending, true)
  assert.ok(cleanupFailurePage.data.errorMessage.includes('重试'))
  assert.strictEqual(cleanupFailurePage.data.leaving, false)
  assert.strictEqual(cleanupFailureNavigations, 0)

  cleanupFailurePage.handleManualWithPendingCleanup()
  assert.strictEqual(cleanupFailurePage.data.leaving, true)
  assert.strictEqual(cleanupFailureNavigations, 1)

  const retryChannel = createChannel()
  const retryPage = createPage(retryChannel)
  retryPage.onLoad()
  retryChannel.emit('recognitionReady', {
    candidatePayload,
    captureId: `capture_${'d'.repeat(36)}`,
    previewPath: 'wxfile://preview.jpg',
  })
  let retryCleanupCalls = 0
  let retryPreset = null
  captureImageService.cleanupCaptureSession = () => {
    retryCleanupCalls += 1
    if (retryCleanupCalls === 1) {
      return Promise.reject(Object.assign(
        new Error('timeout'),
        { code: 'CAPTURE_NETWORK_ERROR' },
      ))
    }
    return Promise.resolve({ deleted: true })
  }
  wx.navigateTo = (options) => {
    options.success({
      eventChannel: {
        emit(name, payload) {
          retryPreset = payload
        },
      },
    })
  }
  await retryPage.handleContinue()
  assert.strictEqual(retryCleanupCalls, 1)
  assert.strictEqual(retryPage.data.cleanupPending, true)
  assert.strictEqual(retryPage.data.leaving, false)
  assert.strictEqual(retryPreset, null)

  await retryPage.handleContinue()
  assert.strictEqual(retryCleanupCalls, 2)
  assert.strictEqual(retryPage.data.cleanupPending, false)
  assert.strictEqual(retryPage.data.leaving, true)
  assert.strictEqual(retryPreset.retainImage, false)
  assert.strictEqual(retryPreset.captureId, '')

  retryPage.onShow()
  assert.strictEqual(retryPage.data.leaving, false)
  retryPage.handleRetainImage({ detail: { value: true } })
  assert.strictEqual(retryPage.data.retainImage, false)

  const missingChannelPage = createPage(null)
  missingChannelPage.onLoad()
  assert.strictEqual(missingChannelPage.data.loaded, true)
  assert.ok(missingChannelPage.data.errorMessage.includes('没有收到'))

  const projectRoot = path.resolve(__dirname, '..')
  const itemFormSource = fs.readFileSync(
    path.join(projectRoot, 'pkg-add', 'item-form', 'item-form.js'),
    'utf8',
  )
  const confirmWxml = fs.readFileSync(
    path.join(
      projectRoot,
      'pkg-add',
      'capture-confirm',
      'capture-confirm.wxml',
    ),
    'utf8',
  )
  assert.ok(itemFormSource.includes('attachCaptureToItem'))
  assert.ok(itemFormSource.includes('照片保留状态暂时无法确认'))
  assert.ok(confirmWxml.includes('图片只提供候选'))
  assert.ok(confirmWxml.includes('默认关闭'))
  assert.ok(confirmWxml.includes('日期存在冲突'))
  assert.ok(confirmWxml.includes('临时图待清理，仍转手动填写'))

  console.log(
    `capture-confirmation: ${assertionCount} assertions passed`,
  )
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
