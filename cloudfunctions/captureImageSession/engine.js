const crypto = require('crypto')

const SESSION_TTL_MS = 24 * 60 * 60 * 1000
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_CLEANUP_REASONS = new Set([
  'cancel',
  'replace',
  'manual',
  'recognition_failed',
  'not_retained',
  'save_failed',
  'expired',
  'unknown',
])
const CLEANABLE_STATUSES = new Set([
  'awaiting_upload',
  'uploaded',
  'recognizing',
  'cleanup_pending',
  'cleanup_failed',
])

function createLifecycleError(code, message, retryable = false) {
  const error = new Error(message)
  error.code = code
  error.retryable = retryable
  error.fallback = 'manual'
  return error
}

function requireIdentity(openid) {
  const ownerOpenid = String(openid || '').trim()
  if (!ownerOpenid) {
    throw createLifecycleError(
      'IDENTITY_UNAVAILABLE',
      '无法确认当前用户，请改用手动填写',
    )
  }
  return ownerOpenid
}

function normalizeCaptureId(value) {
  const captureId = String(value || '').trim()
  if (!/^capture_[a-f0-9]{24,64}$/.test(captureId)) {
    throw createLifecycleError(
      'INVALID_CAPTURE',
      '图片会话无效，请重新选择或改用手动填写',
    )
  }
  return captureId
}

function createDefaultCaptureId() {
  return `capture_${crypto.randomBytes(18).toString('hex')}`
}

function buildCloudPath(captureId, now) {
  const datePart = new Date(now).toISOString().slice(0, 10).replace(/-/g, '')
  return `fridge-captures/${datePart}/${captureId}`
}

function isExpectedFileId(fileId, cloudPath) {
  const normalizedFileId = String(fileId || '').trim()
  const normalizedCloudPath = String(cloudPath || '').trim()
  return (
    normalizedFileId.startsWith('cloud://') &&
    normalizedCloudPath.startsWith('fridge-captures/') &&
    normalizedFileId.endsWith(`/${normalizedCloudPath}`)
  )
}

function buildRecoveryPath(captureId) {
  return `fridge-capture-cleanup/${normalizeCaptureId(captureId)}`
}

function isExpectedRecoveryFileId(fileId, captureId) {
  const normalizedFileId = String(fileId || '').trim()
  const recoveryPath = buildRecoveryPath(captureId)
  return (
    normalizedFileId.startsWith('cloud://') &&
    normalizedFileId.endsWith(`/${recoveryPath}`)
  )
}

function detectImageType(fileContent) {
  const buffer = Buffer.from(fileContent || [])
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpeg'
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png'
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp'
  }
  return ''
}

function normalizeCleanupReason(value) {
  const reason = String(value || '').trim()
  return ALLOWED_CLEANUP_REASONS.has(reason) ? reason : 'unknown'
}

function assertOwnedSession(session, openid) {
  if (!session || session.ownerOpenid !== openid) {
    throw createLifecycleError(
      'CAPTURE_NOT_FOUND',
      '图片会话不存在或没有访问权限',
    )
  }
  return session
}

function createImageLifecycle(dependencies = {}) {
  const sessions = dependencies.sessions || {}
  const storage = dependencies.storage || {}
  const items = dependencies.items || {}
  const memberships = dependencies.memberships || {}
  const now = dependencies.now || (() => Date.now())
  const createCaptureId =
    dependencies.createCaptureId || createDefaultCaptureId

  async function getOwnedSession(openid, captureId) {
    const ownerOpenid = requireIdentity(openid)
    const normalizedCaptureId = normalizeCaptureId(captureId)
    const session =
      typeof sessions.get === 'function'
        ? await sessions.get(normalizedCaptureId)
        : null
    return assertOwnedSession(session, ownerOpenid)
  }

  async function begin(openid) {
    const ownerOpenid = requireIdentity(openid)
    const createdAt = now()
    const captureId = normalizeCaptureId(createCaptureId())
    const record = {
      _id: captureId,
      ownerOpenid,
      cloudPath: buildCloudPath(captureId, createdAt),
      fileId: '',
      status: 'awaiting_upload',
      createdAt,
      cleanupAfter: createdAt + SESSION_TTL_MS,
      retryCount: 0,
      lastErrorCode: '',
    }
    await sessions.create(record)
    return {
      captureId,
      cloudPath: record.cloudPath,
      cleanupAfter: record.cleanupAfter,
    }
  }

  async function cleanupRecord(session, options = {}) {
    if (session.status === 'deleted') {
      return { deleted: true, alreadyDeleted: true }
    }
    if (session.status === 'retained') {
      throw createLifecycleError(
        'CAPTURE_RETAINED',
        '图片已经由用户选择保留，不能按临时文件清理',
      )
    }
    if (!CLEANABLE_STATUSES.has(session.status)) {
      throw createLifecycleError(
        'CAPTURE_STATE_INVALID',
        '图片当前状态不能清理，请稍后重试',
        true,
      )
    }

    const fileIdCandidate = String(options.fileIdCandidate || '').trim()
    if (
      fileIdCandidate &&
      !isExpectedFileId(fileIdCandidate, session.cloudPath)
    ) {
      throw createLifecycleError(
        'CAPTURE_FILE_MISMATCH',
        '图片与当前会话不匹配，已拒绝处理',
      )
    }
    let fileId = session.fileId || fileIdCandidate
    let recoverySourcePending = session.recoverySourcePending === true
    const cleanupReason = normalizeCleanupReason(options.reason)
    const cleanupStartedAt = now()

    async function failCleanup(lastErrorCode) {
      await sessions.update(session._id, {
        status: 'cleanup_failed',
        retryCount: Number(session.retryCount || 0) + 1,
        lastErrorCode,
        lastCleanupAttemptAt: now(),
      })
      throw createLifecycleError(
        'CLEANUP_FAILED',
        '图片清理未完成，服务端已记录并可继续重试',
        true,
      )
    }

    if (!fileId) {
      if (typeof storage.stageForCleanup !== 'function') {
        return failCleanup('STORAGE_RECOVERY_UNAVAILABLE')
      }

      let staged
      try {
        staged = await storage.stageForCleanup(
          session.cloudPath,
          session._id,
        )
      } catch (error) {
        return failCleanup('STORAGE_RECOVERY_FAILED')
      }

      if (staged && staged.missing === true) {
        await sessions.update(session._id, {
          status: 'deleted',
          deletedAt: cleanupStartedAt,
          cleanupReason,
          fileId: '',
          recoverySourcePending: false,
          lastErrorCode: '',
        })
        return { deleted: true, noUploadedFile: true }
      }

      fileId = String(staged && staged.fileId || '').trim()
      if (!isExpectedRecoveryFileId(fileId, session._id)) {
        return failCleanup('STORAGE_RECOVERY_MISMATCH')
      }

      recoverySourcePending = true
      await sessions.update(session._id, {
        status: 'cleanup_pending',
        cleanupReason,
        cleanupStartedAt,
        fileId,
        recoverySourcePending: true,
        recoveryStagedAt: now(),
        lastErrorCode: '',
      })
    }

    await sessions.update(session._id, {
      status: 'cleanup_pending',
      cleanupReason,
      cleanupStartedAt,
    })

    if (recoverySourcePending) {
      if (typeof storage.removeOriginalForCleanup !== 'function') {
        return failCleanup('STORAGE_RECOVERY_UNAVAILABLE')
      }
      let removed
      try {
        removed = await storage.removeOriginalForCleanup(
          session.cloudPath,
          session._id,
        )
      } catch (error) {
        return failCleanup('STORAGE_RECOVERY_FAILED')
      }
      if (
        removed &&
        removed.missing !== true &&
        !isExpectedRecoveryFileId(removed.fileId, session._id)
      ) {
        return failCleanup('STORAGE_RECOVERY_MISMATCH')
      }
      await sessions.update(session._id, {
        recoverySourcePending: false,
        recoverySourceRemovedAt: now(),
      })
    }

    try {
      await storage.delete(fileId)
      await sessions.update(session._id, {
        status: 'deleted',
        deletedAt: now(),
        fileId: '',
        recoverySourcePending: false,
        lastErrorCode: '',
      })
      return { deleted: true }
    } catch (error) {
      return failCleanup('STORAGE_DELETE_FAILED')
    }
  }

  async function confirmUpload(openid, event = {}) {
    const session = await getOwnedSession(openid, event.captureId)
    if (session.cleanupAfter <= now()) {
      throw createLifecycleError(
        'CAPTURE_EXPIRED',
        '图片会话已经过期，请重新选择',
      )
    }
    if (!['awaiting_upload', 'uploaded'].includes(session.status)) {
      throw createLifecycleError(
        'CAPTURE_STATE_INVALID',
        '图片当前状态不能确认上传，请重新选择',
      )
    }
    const fileId = String(event.fileId || '').trim()
    if (!isExpectedFileId(fileId, session.cloudPath)) {
      throw createLifecycleError(
        'CAPTURE_FILE_MISMATCH',
        '上传图片与服务端会话不匹配，已拒绝处理',
      )
    }

    let fileContent
    try {
      fileContent = await storage.read(fileId)
    } catch (error) {
      await cleanupRecord(session, {
        fileIdCandidate: fileId,
        reason: 'unknown',
      }).catch(() => null)
      throw createLifecycleError(
        'IMAGE_UPLOAD_UNVERIFIED',
        '无法验证上传图片，请重新选择或改用手动填写',
        true,
      )
    }

    const buffer = Buffer.from(fileContent || [])
    const imageType = detectImageType(buffer)
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES || !imageType) {
      await cleanupRecord(session, {
        fileIdCandidate: fileId,
        reason: 'unknown',
      }).catch(() => null)
      throw createLifecycleError(
        buffer.length > MAX_IMAGE_BYTES
          ? 'IMAGE_TOO_LARGE'
          : 'INVALID_IMAGE',
        buffer.length > MAX_IMAGE_BYTES
          ? '图片过大，请重新拍摄或改用手动填写'
          : '上传内容不是支持的图片，请重新选择',
      )
    }

    await sessions.update(session._id, {
      fileId,
      status: 'uploaded',
      imageType,
      imageBytes: buffer.length,
      uploadedAt: now(),
      lastErrorCode: '',
    })
    return {
      captureId: session._id,
      status: 'uploaded',
      cleanupAfter: session.cleanupAfter,
    }
  }

  async function cleanup(openid, event = {}) {
    const session = await getOwnedSession(openid, event.captureId)
    return cleanupRecord(session, {
      fileIdCandidate: event.fileIdCandidate,
      reason: event.reason,
    })
  }

  async function getRecognitionSession(openid, captureId) {
    const session = await getOwnedSession(openid, captureId)
    if (session.cleanupAfter <= now()) {
      throw createLifecycleError(
        'CAPTURE_EXPIRED',
        '图片会话已经过期，请重新选择',
      )
    }
    if (!['uploaded', 'recognizing'].includes(session.status)) {
      throw createLifecycleError(
        'CAPTURE_NOT_READY',
        '图片尚未完成安全上传，请重新选择',
      )
    }
    if (!session.fileId) {
      throw createLifecycleError(
        'CAPTURE_NOT_READY',
        '图片文件不存在，请重新选择',
      )
    }
    return {
      captureId: session._id,
      fileId: session.fileId,
      cleanupAfter: session.cleanupAfter,
    }
  }

  async function markRecognizing(openid, captureId) {
    const session = await getOwnedSession(openid, captureId)
    if (session.status !== 'uploaded') {
      throw createLifecycleError(
        'CAPTURE_NOT_READY',
        '图片当前不能识别，请重新选择',
      )
    }
    await sessions.update(session._id, {
      status: 'recognizing',
      recognizingAt: now(),
    })
  }

  async function completeRecognition(openid, captureId, succeeded) {
    const session = await getOwnedSession(openid, captureId)
    if (succeeded) {
      await sessions.update(session._id, {
        status: 'uploaded',
        recognizedAt: now(),
        lastErrorCode: '',
      })
      return { readyForConfirmation: true }
    }
    return cleanupRecord(session, { reason: 'recognition_failed' })
  }

  async function attach(openid, event = {}) {
    const ownerOpenid = requireIdentity(openid)
    const session = await getOwnedSession(ownerOpenid, event.captureId)
    if (session.status !== 'uploaded' || !session.fileId) {
      throw createLifecycleError(
        'CAPTURE_NOT_READY',
        '图片尚未准备好保留，请重新选择',
      )
    }
    const itemId = String(event.itemId || '').trim()
    if (!itemId) {
      throw createLifecycleError(
        'INVALID_ITEM',
        '食材记录不存在，图片不能保留',
      )
    }
    const item =
      typeof items.get === 'function' ? await items.get(itemId) : null
    if (!item) {
      throw createLifecycleError(
        'ITEM_NOT_FOUND',
        '食材记录不存在或没有访问权限',
      )
    }

    if (item.accessMode === 'family' || item.familyId) {
      const active =
        typeof memberships.isActive === 'function' &&
        await memberships.isActive(ownerOpenid, item.familyId)
      if (!active) {
        throw createLifecycleError(
          'ITEM_NOT_FOUND',
          '食材记录不存在或没有访问权限',
        )
      }
    } else if (item._openid !== ownerOpenid) {
      throw createLifecycleError(
        'ITEM_NOT_FOUND',
        '食材记录不存在或没有访问权限',
      )
    }

    if (typeof dependencies.attachRetainedImage !== 'function') {
      throw createLifecycleError(
        'ATTACHMENT_UNAVAILABLE',
        '图片保留服务暂时不可用',
        true,
      )
    }
    await dependencies.attachRetainedImage({
      captureId: session._id,
      itemId,
      imageFileId: session.fileId,
      ownerOpenid,
      retainedAt: now(),
    })
    return { retained: true, itemId }
  }

  async function retryDue(limit = 20) {
    const due =
      typeof sessions.findDue === 'function'
        ? await sessions.findDue(now(), Math.max(1, Math.min(50, limit)))
        : []
    let deleted = 0
    let failed = 0
    for (const session of due) {
      try {
        await cleanupRecord(session, { reason: 'expired' })
        deleted += 1
      } catch (error) {
        failed += 1
      }
    }
    return { scanned: due.length, deleted, failed }
  }

  return {
    attach,
    begin,
    cleanup,
    completeRecognition,
    confirmUpload,
    getRecognitionSession,
    markRecognizing,
    retryDue,
  }
}

module.exports = {
  MAX_IMAGE_BYTES,
  SESSION_TTL_MS,
  buildCloudPath,
  buildRecoveryPath,
  createImageLifecycle,
  createLifecycleError,
  detectImageType,
  isExpectedFileId,
  isExpectedRecoveryFileId,
  normalizeCaptureId,
}
