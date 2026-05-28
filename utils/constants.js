const CATEGORY_OPTIONS = [
  '蔬菜',
  '水果',
  '肉蛋',
  '乳制品',
  '饮料',
  '速冻',
  '调料',
  '主食',
  '其他',
]

const STORAGE_LOCATION_OPTIONS = [
  '冷藏',
  '冷冻',
  '门架',
  '果蔬抽屉',
  '变温',
]

const STORAGE_LOCATION_ALIASES = {
  保鲜: '果蔬抽屉',
  果蔬: '果蔬抽屉',
  果蔬区: '果蔬抽屉',
  蔬果区: '果蔬抽屉',
}

function normalizeStorageLocation(location) {
  const value = String(location || '').trim()
  const normalizedValue = STORAGE_LOCATION_ALIASES[value] || value

  return STORAGE_LOCATION_OPTIONS.includes(normalizedValue)
    ? normalizedValue
    : '冷藏'
}

const DEFAULT_FRIDGE_LAYOUT_KEY = 'three-door'

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
]

const DEFAULT_HOME_ZONE_CONFIG = HOME_ZONE_DEFINITIONS.map((zone) => ({
  key: zone.key,
  enabled: true,
}))

const FRIDGE_LAYOUTS = [
  {
    key: 'french-multi-door',
    name: '法式多门',
    description: '上冷藏，中变温，下冷冻',
    image: '/images/fridges/french-multi-door.jpg',
    zones: [
      {
        key: 'french-door-rack',
        name: '门上储物格',
        location: '门架',
        hint: '饮料、调味瓶、小包装',
        hotArea: { left: 6, top: 21, width: 88, height: 37 },
        markerPoint: { left: 80, top: 44 },
      },
      {
        key: 'french-cold',
        name: '冷藏区',
        location: '冷藏',
        locations: ['冷藏', '保鲜'],
        hint: '熟食、饮料、蔬果和常用食材',
        hotArea: { left: 29, top: 21, width: 41, height: 38 },
        markerPoint: { left: 50, top: 45 },
      },
      {
        key: 'french-temp',
        name: '变温区',
        location: '变温',
        hint: '短期肉类、软冷冻、即食食品',
        hotArea: { left: 27, top: 63, width: 46, height: 12 },
        markerPoint: { left: 50, top: 69 },
      },
      {
        key: 'french-freeze',
        name: '冷冻区',
        location: '冷冻',
        hint: '肉类、速冻、长期保存',
        hotArea: { left: 25, top: 78, width: 50, height: 15 },
        markerPoint: { left: 50, top: 86 },
      },
    ],
  },
  {
    key: 'cross-door',
    name: '十字门',
    description: '上冷藏，下冷冻和变温',
    image: '/images/fridges/cross-door.jpg',
    zones: [
      {
        key: 'cross-upper-door-rack',
        name: '上部门架',
        location: '门架',
        hint: '饮料、酱料、常用小件',
        hotArea: { left: 10, top: 22, width: 80, height: 34 },
        markerPoint: { left: 79, top: 35 },
      },
      {
        key: 'cross-cold',
        name: '冷藏区',
        location: '冷藏',
        locations: ['冷藏', '保鲜'],
        hint: '日常冷藏、蔬果和短期食材',
        hotArea: { left: 31, top: 20, width: 38, height: 40 },
        markerPoint: { left: 50, top: 43 },
      },
      {
        key: 'cross-freeze',
        name: '冷冻区',
        location: '冷冻',
        hint: '速冻、肉类、冰品',
        hotArea: { left: 31, top: 64, width: 18, height: 22 },
        markerPoint: { left: 40, top: 76 },
      },
      {
        key: 'cross-temp',
        name: '变温区',
        location: '变温',
        hint: '短期肉类、母婴、软冷冻',
        hotArea: { left: 51, top: 64, width: 18, height: 22 },
        markerPoint: { left: 60, top: 76 },
      },
      {
        key: 'cross-lower-door-rack',
        name: '下部门架',
        location: '门架',
        hint: '小瓶、小袋、调味品',
        hotArea: { left: 10, top: 63, width: 80, height: 24 },
        markerPoint: { left: 79, top: 74 },
      },
    ],
  },
  {
    key: 'side-by-side',
    name: '对开门',
    description: '左冷冻，右冷藏',
    image: '/images/fridges/side-by-side.jpg',
    zones: [
      {
        key: 'side-door-rack',
        name: '门上储物格',
        location: '门架',
        hint: '饮料、酱料、常用小件',
        hotArea: { left: 7, top: 24, width: 86, height: 52 },
        markerPoint: { left: 81, top: 50 },
      },
      {
        key: 'side-freeze',
        name: '冷冻区',
        location: '冷冻',
        hint: '速冻、肉类、冰品',
        hotArea: { left: 28, top: 17, width: 22, height: 70 },
        markerPoint: { left: 39, top: 72 },
      },
      {
        key: 'side-cold',
        name: '冷藏区',
        location: '冷藏',
        locations: ['冷藏', '保鲜'],
        hint: '日常冷藏、蔬果和短期食材',
        hotArea: { left: 50, top: 17, width: 23, height: 70 },
        markerPoint: { left: 62, top: 72 },
      },
    ],
  },
  {
    key: 'three-door',
    name: '三门冰箱',
    description: '上冷藏，中变温，下冷冻',
    image: '/images/fridges/three-door.jpg',
    zones: [
      {
        key: 'three-door-rack',
        name: '门上储物格',
        location: '门架',
        hint: '饮料、酱料、常用小件',
        hotArea: { left: 57, top: 20, width: 28, height: 36 },
        markerPoint: { left: 72, top: 42 },
      },
      {
        key: 'three-cold',
        name: '冷藏区',
        location: '冷藏',
        locations: ['冷藏', '保鲜'],
        hint: '饮料、熟食、蔬果和日常食材',
        hotArea: { left: 22, top: 17, width: 36, height: 42 },
        markerPoint: { left: 40, top: 45 },
      },
      {
        key: 'three-temp',
        name: '变温区',
        location: '变温',
        hint: '短期肉类、软冷冻、即食食品',
        hotArea: { left: 19, top: 62, width: 43, height: 12 },
        markerPoint: { left: 41, top: 68 },
      },
      {
        key: 'three-freeze',
        name: '冷冻区',
        location: '冷冻',
        hint: '肉类、速冻、冰品',
        hotArea: { left: 18, top: 78, width: 46, height: 15 },
        markerPoint: { left: 41, top: 85 },
      },
    ],
  },
  {
    key: 'double-cold-freeze',
    name: '双门上冷藏下冷冻',
    description: '上冷藏，下冷冻',
    image: '/images/fridges/double-cold-freeze.jpg',
    zones: [
      {
        key: 'double-cold-rack',
        name: '门上储物格',
        location: '门架',
        hint: '饮料、酱料、常用小件',
        hotArea: { left: 55, top: 19, width: 29, height: 47 },
        markerPoint: { left: 72, top: 42 },
      },
      {
        key: 'double-cold',
        name: '冷藏区',
        location: '冷藏',
        locations: ['冷藏', '保鲜'],
        hint: '日常冷藏、蔬果和短期食材',
        hotArea: { left: 23, top: 18, width: 36, height: 46 },
        markerPoint: { left: 41, top: 46 },
      },
      {
        key: 'double-freeze',
        name: '冷冻区',
        location: '冷冻',
        hint: '速冻、肉类、冰品',
        hotArea: { left: 20, top: 70, width: 42, height: 16 },
        markerPoint: { left: 41, top: 78 },
      },
    ],
  },
  {
    key: 'double-freeze-cold',
    name: '双门上冷冻下冷藏',
    description: '上冷冻，下冷藏',
    image: '/images/fridges/double-freeze-cold.jpg',
    zones: [
      {
        key: 'double-top-rack',
        name: '门上储物格',
        location: '门架',
        hint: '饮料、酱料、常用小件',
        hotArea: { left: 57, top: 25, width: 27, height: 58 },
        markerPoint: { left: 72, top: 56 },
      },
      {
        key: 'double-top-freeze',
        name: '冷冻区',
        location: '冷冻',
        hint: '冷冻盒、速冻食品',
        hotArea: { left: 22, top: 22, width: 36, height: 18 },
        markerPoint: { left: 40, top: 29 },
      },
      {
        key: 'double-bottom-cold',
        name: '冷藏区',
        location: '冷藏',
        locations: ['冷藏', '保鲜'],
        hint: '日常冷藏、蔬果和短期食材',
        hotArea: { left: 20, top: 45, width: 39, height: 40 },
        markerPoint: { left: 40, top: 66 },
      },
    ],
  },
  {
    key: 'single-door',
    name: '单门冰箱',
    description: '冷藏为主，含可选冷冻盒',
    image: '/images/fridges/single-door.jpg',
    zones: [
      {
        key: 'single-rack',
        name: '门上储物格',
        location: '门架',
        hint: '饮料、酱料、常用小件',
        hotArea: { left: 55, top: 23, width: 28, height: 55 },
        markerPoint: { left: 71, top: 52 },
      },
      {
        key: 'single-freeze',
        name: '冷冻盒',
        location: '冷冻',
        hint: '小份冷冻食品',
        hotArea: { left: 20, top: 17, width: 37, height: 14 },
        markerPoint: { left: 39, top: 25 },
      },
      {
        key: 'single-cold',
        name: '冷藏区',
        location: '冷藏',
        locations: ['冷藏', '保鲜'],
        hint: '日常冷藏、蔬果和短期食材',
        hotArea: { left: 20, top: 32, width: 38, height: 52 },
        markerPoint: { left: 39, top: 58 },
      },
    ],
  },
]

const UNIT_OPTIONS = ['个', '盒', '瓶', '袋', '包', '斤', '克', '毫升', '份']

const SOURCE_LABELS = {
  manual: '手动录入',
  photo: '拍食品识别',
  package: '包装说明识别',
  receipt: '小票批量识别',
}

module.exports = {
  CATEGORY_OPTIONS,
  DEFAULT_FRIDGE_LAYOUT_KEY,
  DEFAULT_HOME_ZONE_CONFIG,
  FRIDGE_LAYOUTS,
  HOME_ZONE_DEFINITIONS,
  normalizeStorageLocation,
  STORAGE_LOCATION_OPTIONS,
  UNIT_OPTIONS,
  SOURCE_LABELS,
}
