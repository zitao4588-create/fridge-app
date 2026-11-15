const crypto = require('crypto')
const cloudbase = require('@cloudbase/node-sdk')
const cloud = require('wx-server-sdk')
const {
  buildRecoveryPath,
  createImageLifecycle,
  createLifecycleError,
} = require('./engine')
const {
  createCaptureMainHandler,
} = require('./trigger')
const {
  createCleanupStorage,
} = require('./storageCleanup')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command
const storageApp = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
})
const SESSION_COLLECTION = 'imageCaptureSessions'
const cleanupStorage = createCleanupStorage({
  buildRecoveryPath,
  cloud,
  createLifecycleError,
  storageApp,
})

function getMemberId(familyId, openid) {
  const digest = crypto
    .createHash('sha256')
    .update(`${familyId}:${openid}`)
    .digest('hex')
    .slice(0, 24)
  return `${familyId}_${digest}`
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

function getDocumentOrNull(collectionName, documentId) {
  return db
    .collection(collectionName)
    .doc(documentId)
    .get()
    .then((response) => response.data || null)
    .catch((error) => {
      if (isMissingDocumentError(error)) return null
      throw error
    })
}

function createRepositories() {
  return {
    sessions: {
      create(record) {
        const data = { ...record }
        delete data._id
        return db
          .collection(SESSION_COLLECTION)
          .doc(record._id)
          .set({ data })
      },
      get(captureId) {
        return getDocumentOrNull(SESSION_COLLECTION, captureId).then(
          (session) => session ? { _id: captureId, ...session } : null,
        )
      },
      update(captureId, patch) {
        return db
          .collection(SESSION_COLLECTION)
          .doc(captureId)
          .update({ data: patch })
      },
      findDue(now, limit) {
        return db
          .collection(SESSION_COLLECTION)
          .where({
            cleanupAfter: _.lte(now),
            status: _.in([
              'awaiting_upload',
              'uploaded',
              'recognizing',
              'cleanup_pending',
              'cleanup_failed',
            ]),
          })
          .limit(limit)
          .get()
          .then((response) => response.data || [])
      },
    },
    storage: {
      read(fileId) {
        return cloud
          .downloadFile({ fileID: fileId })
          .then((response) => response.fileContent)
      },
      ...cleanupStorage,
    },
    items: {
      get(itemId) {
        return getDocumentOrNull('items', itemId)
      },
    },
    memberships: {
      isActive(openid, familyId) {
        if (!openid || !familyId) return Promise.resolve(false)
        return db
          .collection('familyMembers')
          .where({ openid, familyId, status: 'active' })
          .limit(1)
          .get()
          .then((response) => Boolean((response.data || [])[0]))
      },
    },
    attachRetainedImage(payload) {
      return db.runTransaction(async (transaction) => {
        const sessionResponse = await transaction
          .collection(SESSION_COLLECTION)
          .doc(payload.captureId)
          .get()
        const itemResponse = await transaction
          .collection('items')
          .doc(payload.itemId)
          .get()
        const session = sessionResponse.data
        const item = itemResponse.data
        if (
          !session ||
          session.ownerOpenid !== payload.ownerOpenid ||
          session.status !== 'uploaded' ||
          session.fileId !== payload.imageFileId ||
          !item
        ) {
          throw createLifecycleError(
            'ATTACHMENT_CHANGED',
            '图片或食材状态已经变化，请重新核对',
            true,
          )
        }
        if (item.accessMode === 'family' || item.familyId) {
          let membership
          try {
            const membershipResponse = await transaction
              .collection('familyMembers')
              .doc(getMemberId(item.familyId, payload.ownerOpenid))
              .get()
            membership = membershipResponse.data
          } catch (error) {
            throw createLifecycleError(
              'ATTACHMENT_CHANGED',
              '家庭权限已经变化，请刷新后重试',
              true,
            )
          }
          if (
            !membership ||
            membership.openid !== payload.ownerOpenid ||
            membership.familyId !== item.familyId ||
            membership.status !== 'active'
          ) {
            throw createLifecycleError(
              'ITEM_NOT_FOUND',
              '食材记录不存在或没有访问权限',
            )
          }
        } else if (item._openid !== payload.ownerOpenid) {
          throw createLifecycleError(
            'ITEM_NOT_FOUND',
            '食材记录不存在或没有访问权限',
          )
        }
        await transaction.collection('items').doc(payload.itemId).update({
          data: {
            imageFileId: payload.imageFileId,
            imageCaptureId: payload.captureId,
            source: 'photo',
            updatedAt: payload.retainedAt,
          },
        })
        await transaction
          .collection(SESSION_COLLECTION)
          .doc(payload.captureId)
          .update({
            data: {
              status: 'retained',
              itemId: payload.itemId,
              retainedAt: payload.retainedAt,
              cleanupAfter: null,
              lastErrorCode: '',
            },
          })
      })
    },
  }
}

function toFailure(error) {
  const trustedMessage =
    error &&
    error.fallback === 'manual' &&
    /^[A-Z][A-Z0-9_]{2,64}$/.test(String(error.code || ''))
  return {
    ok: false,
    error: {
      code: trustedMessage
        ? String(error.code)
        : 'CAPTURE_REQUEST_FAILED',
      message: String(
        trustedMessage && error.message ||
        '图片处理失败，请重新选择或改用手动填写',
      ),
      retryable: trustedMessage && error.retryable === true,
    },
    fallback: 'manual',
  }
}

function createService() {
  return createImageLifecycle(createRepositories())
}

exports.main = createCaptureMainHandler({
  createLifecycleError,
  createService,
  getOpenid: () => cloud.getWXContext().OPENID,
  toFailure,
})
