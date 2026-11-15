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
  createCleanupStorage,
  isMissingStorageSource,
} = require('../cloudfunctions/captureImageSession/storageCleanup')

function createTestError(code, message, retryable) {
  const error = new Error(message)
  error.code = code
  error.retryable = retryable
  error.fallback = 'manual'
  return error
}

async function run() {
  const copyCalls = []
  const deleteCalls = []
  let copyResult = {
    fileList: [
      {
        fileId:
          'cloud://env/fridge-capture-cleanup/capture_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
    ],
  }
  let deleteResult = {
    fileList: [{ status: 0 }],
  }
  const storage = createCleanupStorage({
    buildRecoveryPath: (captureId) =>
      `fridge-capture-cleanup/${captureId}`,
    cloud: {
      deleteFile(options) {
        deleteCalls.push(options)
        return Promise.resolve(deleteResult)
      },
    },
    createLifecycleError: createTestError,
    storageApp: {
      copyFile(options) {
        copyCalls.push(options)
        return Promise.resolve(copyResult)
      },
    },
  })
  const captureId = `capture_${'a'.repeat(36)}`
  const cloudPath = `fridge-captures/20260724/${captureId}`

  assert.strictEqual(
    isMissingStorageSource({ code: 'STORAGE_FILE_NOT_FOUND' }),
    true,
  )
  assert.strictEqual(
    isMissingStorageSource({ message: 'permission denied' }),
    false,
  )
  assert.strictEqual(
    isMissingStorageSource({
      code: -1,
      errMsg: 'source file does not exist',
    }),
    true,
  )

  const staged = await storage.stageForCleanup(cloudPath, captureId)
  assert.ok(staged.fileId.endsWith(`/fridge-capture-cleanup/${captureId}`))
  assert.deepStrictEqual(copyCalls[0], {
    fileList: [
      {
        srcPath: cloudPath,
        dstPath: `fridge-capture-cleanup/${captureId}`,
        overwrite: true,
        removeOriginal: false,
      },
    ],
  })

  await storage.removeOriginalForCleanup(cloudPath, captureId)
  assert.strictEqual(
    copyCalls[1].fileList[0].removeOriginal,
    true,
  )

  copyResult = {
    fileList: [
      {
        code: 'STORAGE_FILE_NOT_FOUND',
        message: 'source does not exist',
      },
    ],
  }
  assert.deepStrictEqual(
    await storage.stageForCleanup(cloudPath, captureId),
    { missing: true },
  )

  copyResult = {
    fileList: [
      {
        code: 'PERMISSION_DENIED',
        message: 'permission denied',
      },
    ],
  }
  await assert.rejects(
    storage.stageForCleanup(cloudPath, captureId),
    (error) => {
      assert.strictEqual(error.code, 'STORAGE_RECOVERY_FAILED')
      assert.strictEqual(error.retryable, true)
      return true
    },
  )

  await storage.delete('cloud://env/recovery-file')
  assert.deepStrictEqual(deleteCalls[0], {
    fileList: ['cloud://env/recovery-file'],
  })

  deleteResult = {
    fileList: [
      {
        status: -1,
        errMsg: 'file not found',
      },
    ],
  }
  await storage.delete('cloud://env/already-gone')

  deleteResult = {
    fileList: [
      {
        status: -1,
        errMsg: 'permission denied',
      },
    ],
  }
  await assert.rejects(
    storage.delete('cloud://env/forbidden'),
    (error) => {
      assert.strictEqual(error.code, 'STORAGE_DELETE_FAILED')
      assert.strictEqual(error.retryable, true)
      return true
    },
  )

  console.log(
    `capture-cleanup-storage: ${assertionCount} assertions passed`,
  )
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
