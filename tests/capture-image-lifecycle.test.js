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
  SESSION_TTL_MS,
  buildRecoveryPath,
  createImageLifecycle,
  detectImageType,
  isExpectedFileId,
  isExpectedRecoveryFileId,
} = require('../cloudfunctions/captureImageSession/engine')
const {
  createCaptureImageClient,
} = require('../services/captureImageService')

function jpegBuffer(label = '') {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff]),
    Buffer.from(label || 'image'),
  ])
}

async function run() {
  let currentTime = Date.UTC(2026, 6, 24, 8, 0, 0)
  let idIndex = 0
  const idChars = ['a', 'b', 'c', 'd', 'e', 'f', '1', '2', '3']
  const sessions = new Map()
  const items = new Map()
  const storageFiles = new Map()
  const storageReads = []
  const storageDeletes = []
  const recoveryStages = []
  const recoveryRemovals = []
  const activeMemberships = new Set()
  const failDeleteOnce = new Set()
  const failRecoveryRemovalOnce = new Set()

  const repositories = {
    sessions: {
      create(record) {
        sessions.set(record._id, { ...record })
        return Promise.resolve()
      },
      get(captureId) {
        return Promise.resolve(sessions.get(captureId) || null)
      },
      findRetained(now, limit) {
        return [...sessions.values()].filter(row => row.status === 'retained' && row.cleanupAfter <= now).slice(0, limit)
      },
      transition(captureId, expected, patch) {
        if (!Object.entries(expected).every(([key, value]) => sessions.get(captureId)[key] === value)) {
          throw new Error('Concurrent session update')
        }
        sessions.set(captureId, {
          ...sessions.get(captureId),
          ...patch,
        })
        return Promise.resolve()
      },
      findDue(now, limit) {
        return Promise.resolve(
          Array.from(sessions.values())
            .filter(
              (session) =>
                session.cleanupAfter !== null &&
                session.cleanupAfter <= now &&
                !['deleted', 'retained'].includes(session.status),
            )
            .slice(0, limit),
        )
      },
    },
    storage: {
      read(fileId) {
        storageReads.push(fileId)
        if (!storageFiles.has(fileId)) {
          return Promise.reject(new Error('missing'))
        }
        return Promise.resolve(storageFiles.get(fileId))
      },
      delete(fileId) {
        storageDeletes.push(fileId)
        if (failDeleteOnce.has(fileId)) {
          failDeleteOnce.delete(fileId)
          return Promise.reject(new Error('delete failed'))
        }
        storageFiles.delete(fileId)
        return Promise.resolve()
      },
      stageForCleanup(cloudPath, captureId) {
        recoveryStages.push({ cloudPath, captureId })
        const sourceFileId = `cloud://env/${cloudPath}`
        if (!storageFiles.has(sourceFileId)) {
          return Promise.resolve({ missing: true })
        }
        const recoveryFileId =
          `cloud://env/${buildRecoveryPath(captureId)}`
        storageFiles.set(
          recoveryFileId,
          storageFiles.get(sourceFileId),
        )
        return Promise.resolve({ fileId: recoveryFileId })
      },
      removeOriginalForCleanup(cloudPath, captureId) {
        recoveryRemovals.push({ cloudPath, captureId })
        if (failRecoveryRemovalOnce.has(captureId)) {
          failRecoveryRemovalOnce.delete(captureId)
          return Promise.reject(new Error('copy failed'))
        }
        const sourceFileId = `cloud://env/${cloudPath}`
        if (!storageFiles.has(sourceFileId)) {
          return Promise.resolve({ missing: true })
        }
        const recoveryFileId =
          `cloud://env/${buildRecoveryPath(captureId)}`
        storageFiles.set(
          recoveryFileId,
          storageFiles.get(sourceFileId),
        )
        storageFiles.delete(sourceFileId)
        return Promise.resolve({ fileId: recoveryFileId })
      },
    },
    items: {
      referencesImage(fileId) { return [...items.values()].some(item => item.imageFileId === fileId) },
      get(itemId) {
        return Promise.resolve(items.get(itemId) || null)
      },
    },
    memberships: {
      isActive(openid, familyId) {
        return Promise.resolve(
          activeMemberships.has(`${openid}:${familyId}`),
        )
      },
    },
    attachRetainedImage(payload) {
      const item = items.get(payload.itemId)
      items.set(payload.itemId, {
        ...item,
        imageFileId: payload.imageFileId,
        imageCaptureId: payload.captureId,
        source: 'photo',
      })
      sessions.set(payload.captureId, {
        ...sessions.get(payload.captureId),
        status: 'retained',
        itemId: payload.itemId,
        retainedAt: payload.retainedAt,
        cleanupAfter: payload.retainedAt + SESSION_TTL_MS,
      })
      return Promise.resolve()
    },
    now: () => currentTime,
    createCaptureId() {
      const value = idChars[idIndex] || 'f'
      idIndex += 1
      return `capture_${value.repeat(36)}`
    },
  }
  const lifecycle = createImageLifecycle(repositories)

  assert.strictEqual(detectImageType(jpegBuffer()), 'jpeg')
  assert.strictEqual(detectImageType(Buffer.from('not-image')), '')
  assert.strictEqual(
    isExpectedFileId(
      'cloud://env/fridge-captures/20260724/capture_test',
      'fridge-captures/20260724/capture_test',
    ),
    true,
  )
  assert.strictEqual(
    isExpectedRecoveryFileId(
      `cloud://env/${buildRecoveryPath(`capture_${'a'.repeat(36)}`)}`,
      `capture_${'a'.repeat(36)}`,
    ),
    true,
  )

  const first = await lifecycle.begin('owner-a')
  assert.ok(/^capture_a{36}$/.test(first.captureId))
  assert.ok(first.cloudPath.includes(first.captureId))
  assert.strictEqual(first.cleanupAfter, currentTime + SESSION_TTL_MS)
  assert.ok(!JSON.stringify(first).includes('owner-a'))
  assert.strictEqual(
    sessions.get(first.captureId).ownerOpenid,
    'owner-a',
  )

  await assert.rejects(
    lifecycle.getRecognitionSession('owner-b', first.captureId),
    (error) => {
      assert.strictEqual(error.code, 'CAPTURE_NOT_FOUND')
      return true
    },
  )
  await assert.rejects(
    lifecycle.confirmUpload('owner-a', {
      captureId: first.captureId,
      fileId: 'cloud://env/fridge-captures/forged',
    }),
    (error) => {
      assert.strictEqual(error.code, 'CAPTURE_FILE_MISMATCH')
      return true
    },
  )

  const firstFileId = `cloud://env/${first.cloudPath}`
  storageFiles.set(firstFileId, jpegBuffer('first'))
  const confirmed = await lifecycle.confirmUpload('owner-a', {
    captureId: first.captureId,
    fileId: firstFileId,
  })
  assert.strictEqual(confirmed.status, 'uploaded')
  assert.ok(!Object.prototype.hasOwnProperty.call(confirmed, 'fileId'))
  assert.deepStrictEqual(storageReads, [firstFileId])
  assert.strictEqual(sessions.get(first.captureId).imageType, 'jpeg')

  const recognitionSession = await lifecycle.getRecognitionSession(
    'owner-a',
    first.captureId,
  )
  assert.strictEqual(recognitionSession.fileId, firstFileId)
  await lifecycle.markRecognizing('owner-a', first.captureId)
  assert.strictEqual(
    sessions.get(first.captureId).status,
    'recognizing',
  )
  await lifecycle.completeRecognition('owner-a', first.captureId, true)
  assert.strictEqual(sessions.get(first.captureId).status, 'uploaded')

  items.set('personal-item', {
    _id: 'personal-item',
    _openid: 'owner-a',
    accessMode: 'personal',
  })
  const retained = await lifecycle.attach('owner-a', {
    captureId: first.captureId,
    itemId: 'personal-item',
  })
  assert.strictEqual(retained.retained, true)
  assert.strictEqual(
    items.get('personal-item').imageFileId,
    firstFileId,
  )
  assert.strictEqual(sessions.get(first.captureId).status, 'retained')
  await assert.rejects(
    lifecycle.cleanup('owner-a', {
      captureId: first.captureId,
      reason: 'cancel',
    }),
    (error) => {
      assert.strictEqual(error.code, 'CAPTURE_RETAINED')
      return true
    },
  )

  const second = await lifecycle.begin('owner-a')
  const secondFileId = `cloud://env/${second.cloudPath}`
  storageFiles.set(secondFileId, jpegBuffer('second'))
  await lifecycle.confirmUpload('owner-a', {
    captureId: second.captureId,
    fileId: secondFileId,
  })
  await assert.rejects(
    lifecycle.cleanup('owner-b', {
      captureId: second.captureId,
      reason: 'cancel',
    }),
    (error) => {
      assert.strictEqual(error.code, 'CAPTURE_NOT_FOUND')
      return true
    },
  )
  const cleaned = await lifecycle.cleanup('owner-a', {
    captureId: second.captureId,
    reason: 'cancel',
  })
  assert.strictEqual(cleaned.deleted, true)
  assert.strictEqual(storageDeletes.at(-1), secondFileId)
  assert.strictEqual(sessions.get(second.captureId).status, 'deleted')
  assert.strictEqual(sessions.get(second.captureId).fileId, '')
  const cleanedAgain = await lifecycle.cleanup('owner-a', {
    captureId: second.captureId,
    reason: 'cancel',
  })
  assert.strictEqual(cleanedAgain.alreadyDeleted, true)

  const third = await lifecycle.begin('owner-a')
  const thirdFileId = `cloud://env/${third.cloudPath}`
  storageFiles.set(thirdFileId, jpegBuffer('third'))
  await lifecycle.confirmUpload('owner-a', {
    captureId: third.captureId,
    fileId: thirdFileId,
  })
  failDeleteOnce.add(thirdFileId)
  await assert.rejects(
    lifecycle.cleanup('owner-a', {
      captureId: third.captureId,
      reason: 'manual',
    }),
    (error) => {
      assert.strictEqual(error.code, 'CLEANUP_FAILED')
      assert.strictEqual(error.retryable, true)
      return true
    },
  )
  assert.strictEqual(
    sessions.get(third.captureId).status,
    'cleanup_failed',
  )
  assert.strictEqual(sessions.get(third.captureId).retryCount, 1)
  await lifecycle.cleanup('owner-a', {
    captureId: third.captureId,
    reason: 'manual',
  })
  assert.strictEqual(sessions.get(third.captureId).status, 'deleted')

  const fourth = await lifecycle.begin('owner-a')
  const fourthFileId = `cloud://env/${fourth.cloudPath}`
  storageFiles.set(fourthFileId, Buffer.from('not-an-image'))
  await assert.rejects(
    lifecycle.confirmUpload('owner-a', {
      captureId: fourth.captureId,
      fileId: fourthFileId,
    }),
    (error) => {
      assert.strictEqual(error.code, 'INVALID_IMAGE')
      return true
    },
  )
  assert.strictEqual(sessions.get(fourth.captureId).status, 'deleted')
  assert.strictEqual(storageDeletes.at(-1), fourthFileId)

  const fifth = await lifecycle.begin('family-member')
  const fifthFileId = `cloud://env/${fifth.cloudPath}`
  storageFiles.set(fifthFileId, jpegBuffer('family'))
  await lifecycle.confirmUpload('family-member', {
    captureId: fifth.captureId,
    fileId: fifthFileId,
  })
  items.set('family-item', {
    _id: 'family-item',
    accessMode: 'family',
    familyId: 'family-1',
  })
  await assert.rejects(
    lifecycle.attach('family-member', {
      captureId: fifth.captureId,
      itemId: 'family-item',
    }),
    (error) => {
      assert.strictEqual(error.code, 'ITEM_NOT_FOUND')
      return true
    },
  )
  activeMemberships.add('family-member:family-1')
  await lifecycle.attach('family-member', {
    captureId: fifth.captureId,
    itemId: 'family-item',
  })
  assert.strictEqual(
    items.get('family-item').imageFileId,
    fifthFileId,
  )

  const sixth = await lifecycle.begin('owner-a')
  currentTime += SESSION_TTL_MS + 1
  await assert.rejects(
    lifecycle.confirmUpload('owner-a', {
      captureId: sixth.captureId,
      fileId: `cloud://env/${sixth.cloudPath}`,
    }),
    (error) => {
      assert.strictEqual(error.code, 'CAPTURE_EXPIRED')
      return true
    },
  )
  const retrySummary = await lifecycle.retryDue()
  assert.ok(retrySummary.scanned >= 1)
  assert.ok(retrySummary.deleted >= 1)
  assert.strictEqual(sessions.get(sixth.captureId).status, 'deleted')
  assert.strictEqual(
    recoveryStages.at(-1).captureId,
    sixth.captureId,
  )

  const seventh = await lifecycle.begin('owner-a')
  const seventhFileId = `cloud://env/${seventh.cloudPath}`
  storageFiles.set(seventhFileId, jpegBuffer('orphan-after-upload'))
  currentTime += SESSION_TTL_MS + 1
  const orphanCleanup = await lifecycle.retryDue()
  const seventhRecoveryFileId =
    `cloud://env/${buildRecoveryPath(seventh.captureId)}`
  assert.ok(orphanCleanup.deleted >= 1)
  assert.strictEqual(sessions.get(seventh.captureId).status, 'deleted')
  assert.strictEqual(storageFiles.has(seventhFileId), false)
  assert.strictEqual(storageFiles.has(seventhRecoveryFileId), false)
  assert.strictEqual(
    recoveryRemovals.at(-1).captureId,
    seventh.captureId,
  )

  const eighth = await lifecycle.begin('owner-a')
  const eighthFileId = `cloud://env/${eighth.cloudPath}`
  const eighthRecoveryFileId =
    `cloud://env/${buildRecoveryPath(eighth.captureId)}`
  storageFiles.set(eighthFileId, jpegBuffer('retry-recovery'))
  failRecoveryRemovalOnce.add(eighth.captureId)
  currentTime += SESSION_TTL_MS + 1
  const interruptedCleanup = await lifecycle.retryDue()
  assert.ok(interruptedCleanup.failed >= 1)
  assert.strictEqual(
    sessions.get(eighth.captureId).status,
    'cleanup_failed',
  )
  assert.strictEqual(
    sessions.get(eighth.captureId).fileId,
    eighthRecoveryFileId,
  )
  assert.strictEqual(
    sessions.get(eighth.captureId).recoverySourcePending,
    true,
  )
  assert.strictEqual(storageFiles.has(eighthFileId), true)
  assert.strictEqual(storageFiles.has(eighthRecoveryFileId), true)

  const resumedCleanup = await lifecycle.retryDue()
  assert.ok(resumedCleanup.deleted >= 1)
  assert.strictEqual(sessions.get(eighth.captureId).status, 'deleted')
  assert.strictEqual(storageFiles.has(eighthFileId), false)
  assert.strictEqual(storageFiles.has(eighthRecoveryFileId), false)

  const ninth = await lifecycle.begin('owner-a')
  const ninthRecoveryFileId =
    `cloud://env/${buildRecoveryPath(ninth.captureId)}`
  storageFiles.set(ninthRecoveryFileId, jpegBuffer('moved-before-crash'))
  currentTime += SESSION_TTL_MS + 1
  sessions.set(ninth.captureId, {
    ...sessions.get(ninth.captureId),
    status: 'cleanup_failed',
    fileId: ninthRecoveryFileId,
    recoverySourcePending: true,
  })
  const postMoveCleanup = await lifecycle.retryDue()
  assert.ok(postMoveCleanup.deleted >= 1)
  assert.strictEqual(sessions.get(ninth.captureId).status, 'deleted')
  assert.strictEqual(storageFiles.has(ninthRecoveryFileId), false)

  const cloudCalls = []
  const uploadFileId =
    'cloud://env/fridge-captures/20260724/capture_client'
  const client = createCaptureImageClient({
    enabled: true,
    wxApi: {
      cloud: {
        callFunction(options) {
          cloudCalls.push(options)
          if (options.data.action === 'begin') {
            return Promise.resolve({
              result: {
                ok: true,
                data: {
                  captureId: `capture_${'9'.repeat(36)}`,
                  cloudPath:
                    'fridge-captures/20260724/capture_client',
                  cleanupAfter: currentTime + SESSION_TTL_MS,
                },
              },
            })
          }
          return Promise.resolve({
            result: { ok: true, data: { status: 'uploaded' } },
          })
        },
        uploadFile(options) {
          cloudCalls.push({ uploadFile: options })
          return Promise.resolve({ fileID: uploadFileId })
        },
      },
    },
  })
  const clientUpload = await client.uploadCapture(
    'wxfile://local-photo.jpg',
  )
  assert.strictEqual(
    clientUpload.captureId,
    `capture_${'9'.repeat(36)}`,
  )
  assert.ok(!Object.prototype.hasOwnProperty.call(clientUpload, 'fileId'))
  assert.strictEqual(cloudCalls[0].data.action, 'begin')
  assert.strictEqual(
    cloudCalls[1].uploadFile.filePath,
    'wxfile://local-photo.jpg',
  )
  assert.deepStrictEqual(cloudCalls[2].data, {
    action: 'confirmUpload',
    captureId: `capture_${'9'.repeat(36)}`,
    fileId: uploadFileId,
  })

  // Shared references and a restored item survive the delayed orphan sweep.
  items.delete('personal-item')
  items.set('shared-reference', { imageFileId: firstFileId })
  currentTime += SESSION_TTL_MS + 1
  await lifecycle.retryDue()
  assert.equal(sessions.get(first.captureId).status, 'retained')
  items.delete('shared-reference')
  currentTime += SESSION_TTL_MS + 1
  await lifecycle.retryDue()
  assert.ok(sessions.get(first.captureId).orphanObservedAt)
  items.set('undo-restored', { imageFileId: firstFileId })
  currentTime += SESSION_TTL_MS + 1
  await lifecycle.retryDue()
  assert.equal(sessions.get(first.captureId).orphanObservedAt, 0)
  items.delete('undo-restored')
  currentTime += SESSION_TTL_MS + 1
  await lifecycle.retryDue()
  currentTime += SESSION_TTL_MS + 1
  await lifecycle.retryDue()
  assert.equal(sessions.get(first.captureId).status, 'deleted')
  assert.equal(storageFiles.has(firstFileId), false)
  await assert.rejects(lifecycle.completeRecognition('owner-a', first.captureId, true))

  const disabledClient = createCaptureImageClient({ enabled: false })
  await assert.rejects(
    disabledClient.beginCaptureSession(),
    (error) => {
      assert.strictEqual(error.code, 'CAPTURE_DISABLED')
      assert.strictEqual(error.fallback, 'manual')
      return true
    },
  )

  console.log(
    `capture-image-lifecycle: ${assertionCount} assertions passed`,
  )
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
