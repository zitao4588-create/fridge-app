const { addDays, getTodayString } = require('./date')

const FOOD_LEXICON = [
  { name: '鲜牛奶', aliases: ['牛奶', '纯牛奶'], category: '乳制品', shelfLifeDays: 7, storageLocation: '冷藏' },
  { name: '酸奶', aliases: ['原味酸奶', '低温酸奶'], category: '乳制品', shelfLifeDays: 14, storageLocation: '冷藏' },
  { name: '奶酪', aliases: ['芝士', '奶酪片'], category: '乳制品', shelfLifeDays: 30, storageLocation: '冷藏' },
  { name: '黄油', aliases: ['动物黄油'], category: '乳制品', shelfLifeDays: 60, storageLocation: '冷藏' },
  { name: '鸡蛋', aliases: ['鲜鸡蛋', '土鸡蛋'], category: '蛋', shelfLifeDays: 30, storageLocation: '冷藏' },
  { name: '鹌鹑蛋', aliases: ['熟鹌鹑蛋'], category: '蛋', shelfLifeDays: 14, storageLocation: '冷藏' },
  { name: '豆腐', aliases: ['嫩豆腐', '北豆腐', '盒装豆腐'], category: '豆制品', shelfLifeDays: 3, storageLocation: '冷藏' },
  { name: '豆干', aliases: ['香干', '豆腐干'], category: '豆制品', shelfLifeDays: 7, storageLocation: '冷藏' },
  { name: '腐竹', aliases: ['干腐竹'], category: '豆制品', shelfLifeDays: 180, storageLocation: '冷藏' },
  { name: '豆浆', aliases: ['鲜豆浆'], category: '豆制品', shelfLifeDays: 2, storageLocation: '冷藏' },

  { name: '生菜', aliases: ['球生菜'], category: '蔬菜', shelfLifeDays: 4, storageLocation: '果蔬抽屉' },
  { name: '菠菜', aliases: ['绿叶菠菜'], category: '蔬菜', shelfLifeDays: 3, storageLocation: '果蔬抽屉' },
  { name: '油麦菜', aliases: ['油麦'], category: '蔬菜', shelfLifeDays: 4, storageLocation: '果蔬抽屉' },
  { name: '小白菜', aliases: ['青菜', '上海青'], category: '蔬菜', shelfLifeDays: 4, storageLocation: '果蔬抽屉' },
  { name: '娃娃菜', aliases: ['小娃娃菜'], category: '蔬菜', shelfLifeDays: 7, storageLocation: '果蔬抽屉' },
  { name: '西兰花', aliases: ['绿花菜'], category: '蔬菜', shelfLifeDays: 5, storageLocation: '果蔬抽屉' },
  { name: '花菜', aliases: ['菜花'], category: '蔬菜', shelfLifeDays: 5, storageLocation: '果蔬抽屉' },
  { name: '胡萝卜', aliases: ['红萝卜'], category: '蔬菜', shelfLifeDays: 14, storageLocation: '果蔬抽屉' },
  { name: '白萝卜', aliases: ['萝卜'], category: '蔬菜', shelfLifeDays: 14, storageLocation: '果蔬抽屉' },
  { name: '土豆', aliases: ['马铃薯'], category: '蔬菜', shelfLifeDays: 30, storageLocation: '冷藏' },
  { name: '番茄', aliases: ['西红柿'], category: '蔬菜', shelfLifeDays: 7, storageLocation: '果蔬抽屉' },
  { name: '黄瓜', aliases: ['青瓜'], category: '蔬菜', shelfLifeDays: 5, storageLocation: '果蔬抽屉' },
  { name: '茄子', aliases: ['紫茄子'], category: '蔬菜', shelfLifeDays: 5, storageLocation: '果蔬抽屉' },
  { name: '青椒', aliases: ['甜椒', '彩椒'], category: '蔬菜', shelfLifeDays: 7, storageLocation: '果蔬抽屉' },
  { name: '蘑菇', aliases: ['口蘑', '白蘑菇'], category: '蔬菜', shelfLifeDays: 4, storageLocation: '冷藏' },
  { name: '香菇', aliases: ['鲜香菇'], category: '蔬菜', shelfLifeDays: 5, storageLocation: '冷藏' },
  { name: '金针菇', aliases: ['金针蘑'], category: '蔬菜', shelfLifeDays: 5, storageLocation: '冷藏' },
  { name: '洋葱', aliases: ['紫洋葱'], category: '蔬菜', shelfLifeDays: 21, storageLocation: '冷藏' },
  { name: '玉米', aliases: ['鲜玉米'], category: '蔬菜', shelfLifeDays: 5, storageLocation: '冷藏' },
  { name: '莲藕', aliases: ['藕'], category: '蔬菜', shelfLifeDays: 7, storageLocation: '冷藏' },
  { name: '冬瓜', aliases: ['切块冬瓜'], category: '蔬菜', shelfLifeDays: 5, storageLocation: '冷藏' },
  { name: '南瓜', aliases: ['贝贝南瓜'], category: '蔬菜', shelfLifeDays: 14, storageLocation: '冷藏' },
  { name: '香菜', aliases: ['芫荽'], category: '蔬菜', shelfLifeDays: 3, storageLocation: '果蔬抽屉' },
  { name: '葱', aliases: ['小葱', '香葱'], category: '蔬菜', shelfLifeDays: 5, storageLocation: '果蔬抽屉' },
  { name: '姜', aliases: ['生姜'], category: '调料', shelfLifeDays: 21, storageLocation: '冷藏' },
  { name: '蒜', aliases: ['大蒜'], category: '调料', shelfLifeDays: 30, storageLocation: '冷藏' },

  { name: '苹果', aliases: ['红苹果'], category: '水果', shelfLifeDays: 21, storageLocation: '果蔬抽屉' },
  { name: '香蕉', aliases: ['进口香蕉'], category: '水果', shelfLifeDays: 4, storageLocation: '冷藏' },
  { name: '橙子', aliases: ['脐橙'], category: '水果', shelfLifeDays: 14, storageLocation: '果蔬抽屉' },
  { name: '柠檬', aliases: ['黄柠檬'], category: '水果', shelfLifeDays: 21, storageLocation: '果蔬抽屉' },
  { name: '葡萄', aliases: ['阳光玫瑰', '提子'], category: '水果', shelfLifeDays: 5, storageLocation: '果蔬抽屉' },
  { name: '草莓', aliases: ['盒装草莓'], category: '水果', shelfLifeDays: 3, storageLocation: '冷藏' },
  { name: '蓝莓', aliases: ['盒装蓝莓'], category: '水果', shelfLifeDays: 5, storageLocation: '冷藏' },
  { name: '猕猴桃', aliases: ['奇异果'], category: '水果', shelfLifeDays: 10, storageLocation: '果蔬抽屉' },
  { name: '西瓜', aliases: ['切块西瓜'], category: '水果', shelfLifeDays: 2, storageLocation: '冷藏' },
  { name: '哈密瓜', aliases: ['切块哈密瓜'], category: '水果', shelfLifeDays: 3, storageLocation: '冷藏' },
  { name: '火龙果', aliases: ['红心火龙果'], category: '水果', shelfLifeDays: 7, storageLocation: '果蔬抽屉' },
  { name: '芒果', aliases: ['小台芒'], category: '水果', shelfLifeDays: 5, storageLocation: '果蔬抽屉' },
  { name: '梨', aliases: ['雪梨', '皇冠梨'], category: '水果', shelfLifeDays: 14, storageLocation: '果蔬抽屉' },

  { name: '鸡胸肉', aliases: ['冷鲜鸡胸', '鸡胸'], category: '肉类', shelfLifeDays: 3, storageLocation: '变温' },
  { name: '鸡腿', aliases: ['琵琶腿'], category: '肉类', shelfLifeDays: 3, storageLocation: '变温' },
  { name: '鸡翅', aliases: ['翅中', '鸡中翅'], category: '肉类', shelfLifeDays: 3, storageLocation: '变温' },
  { name: '猪肉', aliases: ['猪里脊', '五花肉'], category: '肉类', shelfLifeDays: 3, storageLocation: '变温' },
  { name: '肉末', aliases: ['猪肉末'], category: '肉类', shelfLifeDays: 2, storageLocation: '变温' },
  { name: '牛肉', aliases: ['牛腩', '牛里脊'], category: '肉类', shelfLifeDays: 3, storageLocation: '变温' },
  { name: '羊肉', aliases: ['羊肉片'], category: '肉类', shelfLifeDays: 3, storageLocation: '变温' },
  { name: '火腿', aliases: ['火腿片'], category: '肉类', shelfLifeDays: 7, storageLocation: '冷藏' },
  { name: '培根', aliases: ['培根片'], category: '肉类', shelfLifeDays: 7, storageLocation: '冷藏' },
  { name: '香肠', aliases: ['腊肠', '热狗肠'], category: '肉类', shelfLifeDays: 14, storageLocation: '冷藏' },

  { name: '虾仁', aliases: ['冻虾仁'], category: '水产', shelfLifeDays: 90, storageLocation: '冷冻' },
  { name: '鲜虾', aliases: ['基围虾', '大虾'], category: '水产', shelfLifeDays: 2, storageLocation: '变温' },
  { name: '三文鱼', aliases: ['三文鱼排'], category: '水产', shelfLifeDays: 2, storageLocation: '变温' },
  { name: '鳕鱼', aliases: ['鳕鱼块'], category: '水产', shelfLifeDays: 90, storageLocation: '冷冻' },
  { name: '带鱼', aliases: ['冻带鱼'], category: '水产', shelfLifeDays: 90, storageLocation: '冷冻' },
  { name: '鲈鱼', aliases: ['鲜鲈鱼'], category: '水产', shelfLifeDays: 2, storageLocation: '变温' },
  { name: '蛤蜊', aliases: ['花甲'], category: '水产', shelfLifeDays: 1, storageLocation: '变温' },
  { name: '鱿鱼', aliases: ['鱿鱼须'], category: '水产', shelfLifeDays: 2, storageLocation: '变温' },

  { name: '米饭', aliases: ['剩米饭'], category: '主食', shelfLifeDays: 2, storageLocation: '冷藏' },
  { name: '馒头', aliases: ['白馒头'], category: '主食', shelfLifeDays: 5, storageLocation: '冷冻' },
  { name: '面包', aliases: ['吐司', '全麦面包'], category: '主食', shelfLifeDays: 5, storageLocation: '冷藏' },
  { name: '面条', aliases: ['鲜面条', '湿面'], category: '主食', shelfLifeDays: 5, storageLocation: '冷藏' },
  { name: '饺子皮', aliases: ['水饺皮'], category: '主食', shelfLifeDays: 3, storageLocation: '冷藏' },
  { name: '馄饨皮', aliases: ['云吞皮'], category: '主食', shelfLifeDays: 3, storageLocation: '冷藏' },
  { name: '年糕', aliases: ['切片年糕'], category: '主食', shelfLifeDays: 14, storageLocation: '冷藏' },
  { name: '意面', aliases: ['意大利面'], category: '主食', shelfLifeDays: 180, storageLocation: '冷藏' },

  { name: '速冻水饺', aliases: ['水饺', '冻饺子'], category: '速冻', shelfLifeDays: 120, storageLocation: '冷冻' },
  { name: '速冻馄饨', aliases: ['冻馄饨'], category: '速冻', shelfLifeDays: 120, storageLocation: '冷冻' },
  { name: '汤圆', aliases: ['速冻汤圆'], category: '速冻', shelfLifeDays: 120, storageLocation: '冷冻' },
  { name: '包子', aliases: ['速冻包子'], category: '速冻', shelfLifeDays: 90, storageLocation: '冷冻' },
  { name: '手抓饼', aliases: ['葱油饼'], category: '速冻', shelfLifeDays: 120, storageLocation: '冷冻' },
  { name: '薯条', aliases: ['冷冻薯条'], category: '速冻', shelfLifeDays: 180, storageLocation: '冷冻' },
  { name: '冰淇淋', aliases: ['雪糕'], category: '速冻', shelfLifeDays: 180, storageLocation: '冷冻' },

  { name: '矿泉水', aliases: ['瓶装水'], category: '饮料', shelfLifeDays: 365, storageLocation: '门架' },
  { name: '可乐', aliases: ['无糖可乐'], category: '饮料', shelfLifeDays: 180, storageLocation: '门架' },
  { name: '雪碧', aliases: ['柠檬汽水'], category: '饮料', shelfLifeDays: 180, storageLocation: '门架' },
  { name: '乌龙茶', aliases: ['低糖乌龙茶'], category: '饮料', shelfLifeDays: 180, storageLocation: '门架' },
  { name: '果汁', aliases: ['橙汁', '苹果汁'], category: '饮料', shelfLifeDays: 14, storageLocation: '门架' },
  { name: '椰子水', aliases: ['椰汁'], category: '饮料', shelfLifeDays: 180, storageLocation: '门架' },
  { name: '气泡水', aliases: ['苏打水'], category: '饮料', shelfLifeDays: 180, storageLocation: '门架' },

  { name: '酱油', aliases: ['生抽', '老抽'], category: '调料', shelfLifeDays: 365, storageLocation: '门架' },
  { name: '醋', aliases: ['陈醋', '米醋'], category: '调料', shelfLifeDays: 365, storageLocation: '门架' },
  { name: '蚝油', aliases: ['耗油'], category: '调料', shelfLifeDays: 180, storageLocation: '门架' },
  { name: '番茄酱', aliases: ['番茄沙司'], category: '调料', shelfLifeDays: 90, storageLocation: '门架' },
  { name: '沙拉酱', aliases: ['蛋黄酱'], category: '调料', shelfLifeDays: 60, storageLocation: '门架' },
  { name: '辣椒酱', aliases: ['老干妈'], category: '调料', shelfLifeDays: 180, storageLocation: '门架' },
  { name: '火锅底料', aliases: ['麻辣火锅底料'], category: '调料', shelfLifeDays: 180, storageLocation: '冷藏' },
  { name: '咖喱块', aliases: ['咖喱'], category: '调料', shelfLifeDays: 180, storageLocation: '冷藏' },
]

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function getEntryTokens(entry) {
  return [entry.name].concat(entry.aliases || []).map(normalizeText).filter(Boolean)
}

function getFoodSuggestion(name) {
  const keyword = normalizeText(name)

  if (keyword.length < 2) {
    return FOOD_LEXICON.find((entry) =>
      getEntryTokens(entry).some((token) => token === keyword),
    ) || null
  }

  const matches = FOOD_LEXICON
    .map((entry) => {
      const tokens = getEntryTokens(entry)
      const matchedToken = tokens.find((token) => keyword.includes(token) || token.includes(keyword))

      return matchedToken ? { entry, score: matchedToken.length } : null
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)
  const best = matches[0]

  return best ? best.entry : null
}

function buildFoodDraft(name, options = {}) {
  const suggestion = getFoodSuggestion(name)

  if (!suggestion) return null

  const productionDate = options.productionDate || getTodayString()
  const shelfLifeDays = suggestion.shelfLifeDays

  return {
    lexiconName: suggestion.name,
    name: String(name || '').trim() || suggestion.name,
    category: suggestion.category,
    quantity: 1,
    unit: '份',
    productionDate,
    shelfLifeDays,
    expireDate: addDays(productionDate, shelfLifeDays),
    storageLocation: suggestion.storageLocation,
    note: '',
    source: 'manual',
  }
}

function getStarterFoodEntries(limit = 48) {
  return FOOD_LEXICON.slice(0, limit)
}

function getFoodLexiconSamples(limit = 48) {
  return getStarterFoodEntries(limit)
    .map((entry) => buildFoodDraft(entry.name))
    .filter(Boolean)
}

module.exports = {
  FOOD_LEXICON,
  buildFoodDraft,
  getFoodLexiconSamples,
  getFoodSuggestion,
  getStarterFoodEntries,
}
