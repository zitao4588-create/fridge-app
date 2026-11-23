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
  createCaptureSessionStore,
  isMissingDocumentError,
} = require('../cloudfunctions/extractFoodCandidates/captureSessionStore')

async function run() {
  const currentTime = Date.UTC(2026, 6, 24, 10, 0, 0)
  const firstCaptureId = `capture_${'a'.repeat(36)}`
  const secondCaptureId = `capture_${'b'.repeat(36)}`
  const firstFileId = 'cloud://env/fridge-captures/20260724/first.jpg'
  const secondFileId = 'cloud://env/fridge-captures/20260724/second.jpg'
  const records = new Map([
    [
      firstCaptureId,
      {
        ownerOpenid: 'owner-a',
        status: 'uploaded',
        fileId: firstFileId,
        cleanupAfter: currentTime + 60_000,
      },
    ],
    [
      secondCaptureId,
      {
        ownerOpenid: 'owner-a',
        status: 'uploaded',
        fileId: secondFileId,
        cleanupAfter: currentTime + 60_000,
        retryCount: 2,
      },
    ],
  ])
  const updateCalls = []
  const deleteCalls = []
  let failDelete = false
  const readErrors = new Map()

  const db = {
    collection(name) {
      assert.strictEqual(name, 'imageCaptureSessions')
      return {
        where({ _id, ...expected }) {
          return { update: async ({ data }) => {
            if (!Object.entries(expected).every(([key, value]) => records.get(_id)?.[key] === value)) return { stats: { updated: 0 } }
            await this.doc(_id).update({ data })
            return { stats: { updated: 1 } }
          } }
        },
        doc(captureId) {
          return {
            get() {
              if (readErrors.has(captureId)) {
                return Promise.reject(readErrors.get(captureId))
              }
              const record = records.get(captureId)
              return Promise.resolve({
                data: record ? { ...record } : null,
              })
            },
            update({ data }) {
              updateCalls.push({ captureId, data: { ...data } })
              records.set(captureId, {
                ...records.get(captureId),
                ...data,
              })
              return Promise.resolve()
            },
          }
        },
      }
    },
  }
  const cloud = {
    deleteFile({ fileList }) {
      deleteCalls.push([...fileList])
      return Promise.resolve({
        fileList: [
          {
            fileID: fileList[0],
            status: failDelete ? -1 : 0,
          },
        ],
      })
    },
  }
  const store = createCaptureSessionStore({
    db,
    cloud,
    now: () => currentTime,
  })

  assert.strictEqual(
    isMissingDocumentError({
      errCode: -1,
      errMsg: 'document.get:fail document does not exist',
    }),
    true,
  )
  assert.strictEqual(
    isMissingDocumentError({
      errCode: -502001,
      errMsg: 'database unavailable -1',
    }),
    false,
  )

  const session = await store.getRecognitionSession(
    'owner-a',
    firstCaptureId,
  )
  assert.deepStrictEqual(session, {
    captureId: firstCaptureId,
    fileId: firstFileId,
  })

  await assert.rejects(
    store.getRecognitionSession('owner-b', firstCaptureId),
    (error) => {
      assert.strictEqual(error.code, 'CAPTURE_NOT_FOUND')
      return true
    },
  )
  const missingCaptureId = `capture_${'c'.repeat(36)}`
  readErrors.set(missingCaptureId, {
    errCode: -1,
    errMsg: 'document.get:fail document does not exist',
  })
  await assert.rejects(
    store.getRecognitionSession('owner-a', missingCaptureId),
    (error) => {
      assert.strictEqual(error.code, 'CAPTURE_NOT_FOUND')
      return true
    },
  )
  const unavailableCaptureId = `capture_${'d'.repeat(36)}`
  readErrors.set(unavailableCaptureId, {
    errCode: -502001,
    errMsg: 'database unavailable -1',
  })
  await assert.rejects(
    store.getRecognitionSession('owner-a', unavailableCaptureId),
    (error) => {
      assert.strictEqual(error.code, 'CAPTURE_STATE_UPDATE_FAILED')
      return true
    },
  )

  const starts = await Promise.allSettled([1, 2].map(() => store.markRecognizing('owner-a', firstCaptureId)))
  assert.equal(starts.filter(result => result.status === 'fulfilled').length, 1)
  assert.strictEqual(records.get(firstCaptureId).status, 'recognizing')
  const oldLease = starts.find(result => result.status === 'fulfilled').value
  records.get(firstCaptureId).leaseUntil = currentTime - 1
  const newLease = await store.markRecognizing('owner-a', firstCaptureId)
  await assert.rejects(store.completeRecognition('owner-a', firstCaptureId, true, oldLease))
  await store.completeRecognition('owner-a', firstCaptureId, true, newLease)
  assert.strictEqual(records.get(firstCaptureId).status, 'uploaded')
  assert.strictEqual(
    records.get(firstCaptureId).recognizedAt,
    currentTime,
  )

  const cleanupId = await store.markRecognizing('owner-a', secondCaptureId)
  const cleaned = await store.completeRecognition(
    'owner-a',
    secondCaptureId,
    false, cleanupId,
  )
  assert.deepStrictEqual(cleaned, { deleted: true })
  assert.deepStrictEqual(deleteCalls.at(-1), [secondFileId])
  assert.strictEqual(records.get(secondCaptureId).status, 'deleted')
  assert.strictEqual(records.get(secondCaptureId).fileId, '')

  records.set(secondCaptureId, {
    ownerOpenid: 'owner-a',
    status: 'uploaded',
    fileId: secondFileId,
    cleanupAfter: currentTime + 60_000,
    retryCount: 2,
  })
  await assert.rejects(store.completeRecognition('owner-a', secondCaptureId, true))
  const retryId = await store.markRecognizing('owner-a', secondCaptureId)
  failDelete = true
  const pending = await store.completeRecognition(
    'owner-a',
    secondCaptureId,
    false, retryId,
  )
  assert.deepStrictEqual(pending, { cleanupPending: true })
  assert.strictEqual(records.get(secondCaptureId).status, 'cleanup_failed')
  assert.strictEqual(records.get(secondCaptureId).retryCount, 3)
  assert.strictEqual(
    records.get(secondCaptureId).lastErrorCode,
    'STORAGE_DELETE_FAILED',
  )
  assert.ok(
    updateCalls.some(
      (entry) =>
        entry.captureId === secondCaptureId &&
        entry.data.status === 'cleanup_pending',
    ),
  )

  console.log(
    `capture-session-store: ${assertionCount} assertions passed`,
  )
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
