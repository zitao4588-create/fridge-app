const BASE_COLLECTIONS = {
  items: 'items',
  families: 'families',
  familyMembers: 'familyMembers',
  familyInvites: 'familyInvites',
  inventoryEvents: 'inventoryEvents',
}

function normalizeCollectionPrefix(value) {
  const prefix = String(value || '').trim()
  if (!prefix) return ''
  if (!/^[a-z][a-z0-9_]{0,19}$/.test(prefix)) {
    throw new Error('FAMILY_COLLECTION_PREFIX must use lowercase letters, numbers, or underscores')
  }
  return prefix
}

function createCollectionNames(prefixValue) {
  const prefix = normalizeCollectionPrefix(prefixValue)
  return Object.fromEntries(
    Object.entries(BASE_COLLECTIONS).map(([key, name]) => [key, `${prefix}${name}`]),
  )
}

function isMissingDocumentError(error) {
  const message = String((error && (error.errMsg || error.message)) || '')
  return Number(error && error.errCode) === -1 && message.includes('document.get:fail') && message.includes('does not exist')
}

module.exports = {
  createCollectionNames,
  isMissingDocumentError,
  normalizeCollectionPrefix,
}
