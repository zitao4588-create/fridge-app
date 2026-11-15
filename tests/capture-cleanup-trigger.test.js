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
const {
  CLEANUP_BATCH_LIMIT,
  createCaptureMainHandler,
  isTrustedCleanupTimer,
} = require('../cloudfunctions/captureImageSession/trigger')

function createTestError(code, message) {
  const error = new Error(message)
  error.code = code
  error.fallback = 'manual'
  return error
}

async function run() {
  let openid = ''
  let cleanupCalls = 0
  let beginCalls = 0
  const logEntries = []
  const service = {
    retryDue(limit) {
      cleanupCalls += 1
      assert.strictEqual(limit, CLEANUP_BATCH_LIMIT)
      return Promise.resolve({ scanned: 3, deleted: 2, failed: 1 })
    },
    begin(value) {
      beginCalls += 1
      return Promise.resolve({ ownerSeen: value })
    },
    confirmUpload() {
      return Promise.resolve({})
    },
    cleanup() {
      return Promise.resolve({})
    },
    attach() {
      return Promise.resolve({})
    },
  }
  const handler = createCaptureMainHandler({
    createLifecycleError: createTestError,
    createService: () => service,
    getOpenid: () => openid,
    logger: {
      info(label, summary) {
        logEntries.push({ label, summary })
      },
    },
    toFailure(error) {
      return {
        ok: false,
        error: { code: error.code || 'CAPTURE_REQUEST_FAILED' },
      }
    },
  })

  assert.strictEqual(
    isTrustedCleanupTimer(
      { Type: 'Timer', Time: '2026-07-24T12:00:00Z' },
      '',
    ),
    true,
  )
  assert.strictEqual(
    isTrustedCleanupTimer(
      { Type: 'Timer', Time: '2026-07-24T12:00:00Z' },
      'client-openid',
    ),
    false,
  )
  assert.strictEqual(
    isTrustedCleanupTimer({ Type: 'Timer' }, ''),
    false,
  )

  const firstTimerResult = await handler({
    Type: 'Timer',
    Time: '2026-07-24T12:00:00Z',
  })
  assert.deepStrictEqual(firstTimerResult, {
    ok: true,
    data: { scanned: 3, deleted: 2, failed: 1 },
  })
  assert.strictEqual(cleanupCalls, 1)
  assert.deepStrictEqual(logEntries[0], {
    label: '[capture-cleanup]',
    summary: { scanned: 3, deleted: 2, failed: 1 },
  })
  assert.doesNotMatch(JSON.stringify(logEntries), /openid|capture_|family/)

  await handler({
    type: 'timer',
    time: '2026-07-24T12:05:00Z',
  })
  assert.strictEqual(cleanupCalls, 2)

  openid = 'client-openid'
  const forgedTimerResult = await handler({
    Type: 'Timer',
    Time: '2026-07-24T12:10:00Z',
  })
  assert.strictEqual(forgedTimerResult.ok, false)
  assert.strictEqual(forgedTimerResult.error.code, 'INVALID_ACTION')
  assert.strictEqual(cleanupCalls, 2)

  openid = ''
  const incompleteTimerResult = await handler({ Type: 'Timer' })
  assert.strictEqual(incompleteTimerResult.ok, false)
  assert.strictEqual(incompleteTimerResult.error.code, 'INVALID_ACTION')
  assert.strictEqual(cleanupCalls, 2)

  openid = 'owner-a'
  const beginResult = await handler({ action: 'begin' })
  assert.deepStrictEqual(beginResult, {
    ok: true,
    data: { ownerSeen: 'owner-a' },
  })
  assert.strictEqual(beginCalls, 1)

  console.log(
    `capture-cleanup-trigger: ${assertionCount} assertions passed`,
  )
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
