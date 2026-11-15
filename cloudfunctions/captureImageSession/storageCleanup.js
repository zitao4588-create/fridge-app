function isMissingStorageSource(value) {
  const text = [
    value && value.code,
    value && value.message,
    value && value.errMsg,
    value && value.error,
  ]
    .filter((part) => part !== undefined && part !== null)
    .map((part) => String(part))
    .join(' ')
    .toLowerCase()
  return (
    /not.?found/.test(text) ||
    /not.?exist/.test(text) ||
    text.includes('no such') ||
    text.includes('404')
  )
}

function createCleanupStorage(dependencies = {}) {
  const {
    buildRecoveryPath,
    cloud,
    createLifecycleError,
    storageApp,
  } = dependencies

  async function copyForCleanup(
    cloudPath,
    captureId,
    removeOriginal,
  ) {
    const response = await storageApp.copyFile({
      fileList: [
        {
          srcPath: cloudPath,
          dstPath: buildRecoveryPath(captureId),
          overwrite: true,
          removeOriginal,
        },
      ],
    })
    const result = response && Array.isArray(response.fileList)
      ? response.fileList[0]
      : null
    if (result && result.fileId) {
      return { fileId: String(result.fileId) }
    }
    if (isMissingStorageSource(result)) {
      return { missing: true }
    }
    throw createLifecycleError(
      'STORAGE_RECOVERY_FAILED',
      '无法恢复待清理图片',
      true,
    )
  }

  async function deleteFile(fileId) {
    const response = await cloud.deleteFile({ fileList: [fileId] })
    const result = response && Array.isArray(response.fileList)
      ? response.fileList[0]
      : null
    if (
      !result ||
      (result.status !== 0 && !isMissingStorageSource(result))
    ) {
      throw createLifecycleError(
        'STORAGE_DELETE_FAILED',
        '图片清理失败',
        true,
      )
    }
    return response
  }

  return {
    delete: deleteFile,
    removeOriginalForCleanup(cloudPath, captureId) {
      return copyForCleanup(cloudPath, captureId, true)
    },
    stageForCleanup(cloudPath, captureId) {
      return copyForCleanup(cloudPath, captureId, false)
    },
  }
}

module.exports = {
  createCleanupStorage,
  isMissingStorageSource,
}
