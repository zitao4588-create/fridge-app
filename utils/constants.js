const CATEGORY_OPTIONS = [
  '蔬菜',
  '水果',
  '肉类',
  '水产',
  '蛋',
  '乳制品',
  '豆制品',
  '主食',
  '饮料',
  '速冻',
  '调料',
  '其他',
]

const STORAGE_LOCATION_OPTIONS = [
  '冷藏',
  '冷冻',
  '门架',
  '果蔬抽屉',
  '变温',
  '常温',
]

const STORAGE_LOCATION_ALIASES = {
  保鲜: '果蔬抽屉',
  果蔬: '果蔬抽屉',
  果蔬区: '果蔬抽屉',
  蔬果区: '果蔬抽屉',
  常温区: '常温',
}

function normalizeStorageLocation(location) {
  const value = String(location || '').trim()
  const normalizedValue = STORAGE_LOCATION_ALIASES[value] || value

  return STORAGE_LOCATION_OPTIONS.includes(normalizedValue)
    ? normalizedValue
    : '冷藏'
}

const HOME_ZONE_DEFINITIONS = [
  {
    key: 'cold',
    name: '冷藏区',
    location: '冷藏',
    locations: ['冷藏'],
    temperature: '2-5°C',
    theme: 'cold',
    hint: '熟食、乳制品和短期食材',
  },
  {
    key: 'freeze',
    name: '冷冻区',
    location: '冷冻',
    locations: ['冷冻'],
    temperature: '-18°C',
    theme: 'freeze',
    hint: '肉类、速冻和长期保存',
  },
  {
    key: 'door',
    name: '门上储物格',
    location: '门架',
    locations: ['门架'],
    temperature: '4-8°C',
    theme: 'door',
    hint: '饮料、酱料和小包装',
  },
  {
    key: 'produce',
    name: '果蔬抽屉',
    location: '果蔬抽屉',
    locations: ['果蔬抽屉', '保鲜'],
    temperature: '3-7°C',
    theme: 'produce',
    hint: '蔬菜、水果和新鲜食材',
  },
  {
    key: 'temp',
    name: '变温区',
    location: '变温',
    locations: ['变温'],
    temperature: '0-2°C',
    theme: 'temp',
    hint: '短期肉类、软冷冻和即食食品',
  },
  {
    key: 'ambient',
    name: '常温储物',
    location: '常温',
    locations: ['常温'],
    temperature: '室温',
    theme: 'ambient',
    hint: '干货、零食和无需冷藏的食材',
  },
]

const DEFAULT_HOME_ZONE_CONFIG = HOME_ZONE_DEFINITIONS.map((zone) => ({
  key: zone.key,
  enabled: true,
}))

const UNIT_OPTIONS = ['个', '盒', '瓶', '袋', '包', '斤', '克', '毫升', '份']

const SOURCE_LABELS = {
  manual: '手动录入',
  photo: '拍食品识别',
  package: '包装说明识别',
  receipt: '小票批量识别',
}

module.exports = {
  CATEGORY_OPTIONS,
  DEFAULT_HOME_ZONE_CONFIG,
  HOME_ZONE_DEFINITIONS,
  normalizeStorageLocation,
  STORAGE_LOCATION_OPTIONS,
  UNIT_OPTIONS,
  SOURCE_LABELS,
}
