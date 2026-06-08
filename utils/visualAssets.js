// 食材配图：用户照片优先 > 品类系统图 > 通用兜底。
//
// 设计原则（见 NEXT_VERSION_GUIDE.md「图片资源治理」）：
// - 不再为单个食材配专图，改为按「品类 / 食材族群」共用一张写实图。
// - 主包只保留少量必要桶图（写实风），其余食材靠关键词归桶。
// - 已移除本地自动生成（PIL 占位图）那套逻辑与菜谱配图逻辑。
//
// 拍照录入接口（预留，优先级最高）：
//   item.source === 'photo' && item.imageFileId → 直接用用户照片。
//   未来接入拍照录入时，只需给 item 写 source:'photo' + imageFileId，
//   itemService 已持久化 imageFileId，无需再改本文件。

const FOOD_DEFAULT_IMAGE = '/images/foods/default.png'

// 品类桶 → 写实图（主包内保留的必要图）
const BUCKET_IMAGES = {
  leafy: '/images/foods/leafy.png', // 叶菜
  root: '/images/foods/root.png', // 根茎
  mushroom: '/images/foods/mushroom.png', // 菌菇
  fruit: '/images/foods/fruit.png', // 水果
  meat: '/images/foods/beef.png', // 肉类（红肉 / 猪肉合并）
  poultry: '/images/foods/chicken.png', // 禽肉
  seafood: '/images/foods/fish.png', // 水产（鱼 / 蟹 / 贝）
  shrimp: '/images/foods/shrimp.png', // 虾
  egg: '/images/foods/egg.png', // 蛋
  dairy: '/images/foods/milk.png', // 乳制品
  soy: '/images/foods/tofu.png', // 豆制品
  staple: '/images/foods/rice.png', // 主食（米 / 面）
  drink: '/images/foods/drink.png', // 饮料（待替换写实图）
  frozen: '/images/foods/frozen.png', // 速冻（待替换写实图）
  seasoning: '/images/foods/seasoning.png', // 调料（待替换写实图）
  other: FOOD_DEFAULT_IMAGE, // 通用兜底（待替换写实图）
}

// 表单品类 → 桶（含历史数据兼容）
const CATEGORY_BUCKET = {
  蔬菜: 'leafy',
  水果: 'fruit',
  肉类: 'meat',
  水产: 'seafood',
  蛋: 'egg',
  乳制品: 'dairy',
  豆制品: 'soy',
  主食: 'staple',
  饮料: 'drink',
  速冻: 'frozen',
  调料: 'seasoning',
  其他: 'other',
  // 兼容旧品类
  肉蛋: 'meat',
}

// 食材名关键词 → 桶（顺序敏感：先具体、后宽泛，避免「鸡蛋」落入「鸡」、「果汁」落入「水果」）
const KEYWORD_BUCKETS = [
  { bucket: 'egg', keywords: ['鸡蛋', '鸭蛋', '鹌鹑蛋', '咸蛋', '松花蛋', '皮蛋', '蛋'] },
  { bucket: 'soy', keywords: ['豆腐', '豆干', '豆皮', '腐竹', '豆浆', '纳豆', '千张', '素鸡'] },
  { bucket: 'dairy', keywords: ['牛奶', '酸奶', '奶酪', '芝士', '黄油', '奶油', '淡奶', '炼乳', '乳', '奶'] },
  { bucket: 'shrimp', keywords: ['虾'] },
  { bucket: 'seafood', keywords: ['鱼', '蟹', '贝', '蛤', '鱿', '墨鱼', '海鲜', '三文', '鲈', '鳕', '鲫', '带鱼', '黄鱼', '扇贝', '生蚝', '蛏', '鲍'] },
  { bucket: 'poultry', keywords: ['鸡', '鸭', '鹅', '禽'] },
  { bucket: 'meat', keywords: ['牛', '羊', '猪', '五花', '排骨', '里脊', '培根', '火腿', '午餐肉', '腊肉', '肥牛', '牛腩', '肉'] },
  { bucket: 'mushroom', keywords: ['香菇', '金针', '杏鲍', '蘑菇', '木耳', '银耳', '菌', '菇'] },
  { bucket: 'root', keywords: ['土豆', '马铃薯', '萝卜', '胡萝卜', '山药', '莲藕', '藕', '红薯', '地瓜', '南瓜', '芋', '姜', '葱', '蒜', '洋葱'] },
  { bucket: 'leafy', keywords: ['菜心', '青菜', '生菜', '菠菜', '白菜', '油麦', '香菜', '芹菜', '韭菜', '茼蒿', '娃娃菜', '西兰花', '西蓝花', '花菜', '芥蓝', '叶'] },
  { bucket: 'frozen', keywords: ['速冻', '冷冻', '冰淇淋', '雪糕', '汤圆', '冻'] },
  { bucket: 'drink', keywords: ['果汁', '汁', '饮料', '汽水', '可乐', '气泡水', '椰汁', '咖啡', '奶茶', '茶', '啤酒', '饮'] },
  { bucket: 'fruit', keywords: ['苹果', '香蕉', '橙', '橘', '葡萄', '提子', '草莓', '蓝莓', '莓', '梨', '桃', '西瓜', '哈密瓜', '芒果', '柚', '猕猴桃', '车厘子', '樱桃', '菠萝', '火龙果', '牛油果', '柠檬', '果'] },
  { bucket: 'staple', keywords: ['米饭', '米', '面条', '面包', '吐司', '馒头', '包子', '饺子', '馄饨', '粉', '米线', '河粉', '粥', '燕麦', '麦片', '年糕', '饼', '意面', '面'] },
  { bucket: 'seasoning', keywords: ['酱油', '生抽', '老抽', '蚝油', '料酒', '味精', '鸡精', '番茄酱', '沙拉酱', '醋', '盐', '糖', '酱', '油'] },
]

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)))
}

function ensureImagePath(image) {
  return String(image || FOOD_DEFAULT_IMAGE)
}

function visualForBucket(bucket) {
  return {
    type: 'icon',
    image: ensureImagePath(BUCKET_IMAGES[bucket] || FOOD_DEFAULT_IMAGE),
    className: bucket || 'other',
  }
}

function getIngredientVisual(item) {
  // 1) 用户拍照优先（预留接口）
  if (item && item.source === 'photo' && item.imageFileId) {
    return {
      type: 'photo',
      image: ensureImagePath(item.imageFileId),
      className: 'photo',
    }
  }

  // 2) 按食材名关键词归桶
  const name = normalizeText(item && item.name)
  if (name) {
    const hit = KEYWORD_BUCKETS.find((entry) => includesAny(name, entry.keywords))
    if (hit) return visualForBucket(hit.bucket)
  }

  // 3) 按品类归桶（含历史数据），最终兜底 other
  const category = (item && item.category) || '其他'
  return visualForBucket(CATEGORY_BUCKET[category] || 'other')
}

module.exports = {
  getIngredientVisual,
}
