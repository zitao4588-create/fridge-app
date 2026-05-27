const {
  DEFAULT_HOME_ZONE_CONFIG,
  HOME_ZONE_DEFINITIONS,
} = require('../utils/constants')

const COLLECTION_NAME = 'fridgeZoneConfigs'
const ZONE_KEYS = HOME_ZONE_DEFINITIONS.map((zone) => zone.key)

function getDb() {
  if (!wx.cloud) {
    throw new Error('当前环境不支持云开发')
  }

  return wx.cloud.database()
}

function sanitizeZones(zones) {
  const incoming = Array.isArray(zones) ? zones : []
  const used = {}
  const result = []

  incoming.forEach((zone) => {
    const key = zone && zone.key

    if (!ZONE_KEYS.includes(key) || used[key]) {
      return
    }

    used[key] = true
    result.push({
      key,
      enabled: zone.enabled !== false,
    })
  })

  DEFAULT_HOME_ZONE_CONFIG.forEach((zone) => {
    if (used[zone.key]) {
      return
    }

    result.push({ ...zone })
  })

  return result
}

function getDefaultConfig() {
  return {
    _id: '',
    zones: sanitizeZones(DEFAULT_HOME_ZONE_CONFIG),
    hasSavedConfig: false,
  }
}

function getZoneConfig() {
  if (!wx.cloud) {
    return Promise.resolve(getDefaultConfig())
  }

  return getDb()
    .collection(COLLECTION_NAME)
    .limit(1)
    .get()
    .then((res) => {
      const config = res.data && res.data[0]

      if (!config) {
        return getDefaultConfig()
      }

      return {
        _id: config._id,
        zones: sanitizeZones(config.zones),
        hasSavedConfig: true,
      }
    })
    .catch(() => getDefaultConfig())
}

function saveZoneConfig(config) {
  const zones = sanitizeZones(config && config.zones)
  const now = Date.now()
  const data = {
    zones,
    updatedAt: now,
  }

  if (config && config._id) {
    return getDb()
      .collection(COLLECTION_NAME)
      .doc(config._id)
      .update({
        data,
      })
      .then(() => ({
        _id: config._id,
        zones,
        hasSavedConfig: true,
      }))
  }

  return getDb()
    .collection(COLLECTION_NAME)
    .add({
      data: {
        ...data,
        createdAt: now,
      },
    })
    .then((res) => ({
      _id: res._id,
      zones,
      hasSavedConfig: true,
    }))
}

module.exports = {
  getDefaultConfig,
  getZoneConfig,
  sanitizeZones,
  saveZoneConfig,
}
