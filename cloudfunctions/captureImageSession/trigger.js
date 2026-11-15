const CLEANUP_BATCH_LIMIT = 20

function isTrustedCleanupTimer(event = {}, openid = '') {
  if (String(openid || '').trim()) return false
  const type = String(event.Type || event.type || '').trim().toLowerCase()
  const time = String(event.Time || event.time || '').trim()
  return type === 'timer' && Boolean(time)
}

function createCaptureMainHandler(dependencies = {}) {
  const {
    createLifecycleError,
    createService,
    getOpenid,
    logger = console,
    toFailure,
  } = dependencies

  return async function main(event = {}) {
    const openid = String(getOpenid() || '').trim()
    const service = createService()

    if (isTrustedCleanupTimer(event, openid)) {
      try {
        const summary = await service.retryDue(CLEANUP_BATCH_LIMIT)
        if (logger && typeof logger.info === 'function') {
          logger.info('[capture-cleanup]', {
            scanned: Number(summary.scanned || 0),
            deleted: Number(summary.deleted || 0),
            failed: Number(summary.failed || 0),
          })
        }
        return { ok: true, data: summary }
      } catch (error) {
        return toFailure(error)
      }
    }

    const actions = {
      begin: () => service.begin(openid),
      confirmUpload: () => service.confirmUpload(openid, event),
      cleanup: () => service.cleanup(openid, event),
      attach: () => service.attach(openid, event),
    }
    const action = actions[event.action]
    if (!action) {
      return toFailure(
        createLifecycleError(
          'INVALID_ACTION',
          '不支持的图片处理操作',
        ),
      )
    }

    try {
      return { ok: true, data: await action() }
    } catch (error) {
      return toFailure(error)
    }
  }
}

module.exports = {
  CLEANUP_BATCH_LIMIT,
  createCaptureMainHandler,
  isTrustedCleanupTimer,
}
