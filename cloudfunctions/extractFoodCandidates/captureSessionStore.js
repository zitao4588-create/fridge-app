const SESSION_COLLECTION = 'imageCaptureSessions'

function createStoreError(code) {
  const error = new Error(code)
  error.code = code
  return error
}

function isMissingDocumentError(error) {
  const message = String(
    error && (error.errMsg || error.message) || '',
  )
  return (
    Number(error && error.errCode) === -1 &&
    message.includes('document.get:fail') &&
    message.includes('does not exist')
  )
}

function createCaptureSessionStore(options = {}) {
  const db = options.db
  const cloud = options.cloud
  const now = options.now || (() => Date.now())

  async function getSession(captureId) {
    try {
      const response = await db
        .collection(SESSION_COLLECTION)
        .doc(captureId)
        .get()
      return response.data
        ? { _id: captureId, ...response.data }
        : null
    } catch (error) {
      if (isMissingDocumentError(error)) return null
      throw createStoreError('CAPTURE_STATE_UPDATE_FAILED')
    }
  }

  async function getOwned(openid, captureId) {
    const session = await getSession(captureId)
    if (!session || session.ownerOpenid !== openid) {
      throw createStoreError('CAPTURE_NOT_FOUND')
    }
    return session
  }

  async function update(captureId, data) {
    try {
      await db
        .collection(SESSION_COLLECTION)
        .doc(captureId)
        .update({ data })
    } catch (error) {
      throw createStoreError('CAPTURE_STATE_UPDATE_FAILED')
    }
  }

  async function getRecognitionSession(openid, captureId) {
    const session = await getOwned(openid, captureId)
    if (session.cleanupAfter <= now()) {
      throw createStoreError('CAPTURE_EXPIRED')
    }
    if (
      !['uploaded', 'recognizing'].includes(session.status) ||
      !session.fileId
    ) {
      throw createStoreError('CAPTURE_NOT_READY')
    }
    return {
      captureId: session._id,
      fileId: session.fileId,
    }
  }

  async function markRecognizing(openid, captureId) {
    const session = await getOwned(openid, captureId)
    if (session.status !== 'uploaded') {
      throw createStoreError('CAPTURE_NOT_READY')
    }
    await update(captureId, {
      status: 'recognizing',
      recognizingAt: now(),
    })
  }

  async function deleteExactFile(fileId) {
    const response = await cloud.deleteFile({ fileList: [fileId] })
    const result = response && Array.isArray(response.fileList)
      ? response.fileList[0]
      : null
    if (!result || result.status !== 0) {
      throw createStoreError('STORAGE_DELETE_FAILED')
    }
  }

  async function completeRecognition(openid, captureId, succeeded) {
    const session = await getOwned(openid, captureId)
    if (succeeded) {
      await update(captureId, {
        status: 'uploaded',
        recognizedAt: now(),
        lastErrorCode: '',
      })
      return { readyForConfirmation: true }
    }

    await update(captureId, {
      status: 'cleanup_pending',
      cleanupReason: 'recognition_failed',
      cleanupStartedAt: now(),
    })
    try {
      await deleteExactFile(session.fileId)
      await update(captureId, {
        status: 'deleted',
        deletedAt: now(),
        fileId: '',
        lastErrorCode: '',
      })
      return { deleted: true }
    } catch (error) {
      await update(captureId, {
        status: 'cleanup_failed',
        retryCount: Number(session.retryCount || 0) + 1,
        lastErrorCode: 'STORAGE_DELETE_FAILED',
        lastCleanupAttemptAt: now(),
      })
      return { cleanupPending: true }
    }
  }

  return {
    completeRecognition,
    getRecognitionSession,
    markRecognizing,
  }
}

module.exports = {
  SESSION_COLLECTION,
  createCaptureSessionStore,
  isMissingDocumentError,
}
