const { addDays, getTodayString } = require('./date')

const BASE_FOOD_LEXICON = [
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

function createEntries(names, category, shelfLifeDays, storageLocation, aliases = {}) {
  return names.map((name) => ({
    name,
    aliases: aliases[name] || [],
    category,
    shelfLifeDays,
    storageLocation,
  }))
}

const EXTRA_FOOD_LEXICON = [
  ...createEntries([
    '空心菜', '苋菜', '茼蒿', '韭菜', '韭黄', '芹菜', '西芹', '茴香菜', '苦菊', '菜心',
    '芥蓝', '芥菜', '莴笋', '油菜', '紫甘蓝', '包菜', '卷心菜', '大白菜', '甜玉米', '山药',
    '红薯', '紫薯', '芋头', '芋艿', '魔芋', '丝瓜', '苦瓜', '佛手瓜', '西葫芦', '秋葵',
    '豇豆', '四季豆', '荷兰豆', '甜豆', '毛豆', '豌豆', '扁豆', '黄豆芽', '绿豆芽', '海带',
    '海带结', '紫菜', '木耳', '银耳', '杏鲍菇', '平菇', '蟹味菇', '白玉菇', '茶树菇', '猴头菇',
    '竹笋', '春笋', '冬笋', '茭白', '藕片', '莲子', '百合', '马蹄', '荸荠', '辣椒',
    '小米椒', '杭椒', '线椒', '彩椒', '香椿', '蒜苗', '蒜苔', '洋姜', '雪里蕻', '酸菜',
    '泡菜', '榨菜', '萝卜干', '橄榄菜', '梅干菜', '番薯叶', '芦笋', '牛油果',
  ], '蔬菜', 5, '果蔬抽屉', {
    空心菜: ['通菜'],
    包菜: ['圆白菜'],
    卷心菜: ['包心菜'],
    毛豆: ['毛豆仁'],
    木耳: ['黑木耳'],
    马蹄: ['荸荠'],
    辣椒: ['红辣椒'],
  }),
  ...createEntries([
    '车厘子', '樱桃', '桃子', '油桃', '黄桃', '李子', '杏子', '杨梅', '荔枝', '龙眼',
    '桂圆', '菠萝', '凤梨', '榴莲', '山竹', '木瓜', '椰子', '石榴', '柚子', '蜜柚',
    '柑橘', '橘子', '金桔', '百香果', '圣女果', '无花果', '桑葚', '蔓越莓', '树莓', '黑莓',
    '柿子', '枇杷', '冬枣', '红枣', '青枣', '甘蔗', '杨桃', '释迦', '莲雾', '牛油果果肉',
    '椰青', '香瓜', '甜瓜', '柚子肉', '冻榴莲',
  ], '水果', 7, '果蔬抽屉', {
    车厘子: ['大樱桃'],
    龙眼: ['鲜桂圆'],
    凤梨: ['菠萝'],
    圣女果: ['小番茄'],
  }),
  ...createEntries([
    '排骨', '肋排', '筒骨', '猪蹄', '猪肝', '猪腰', '猪肚', '猪耳', '猪皮', '午餐肉',
    '肥牛', '牛排', '牛腱', '牛肋条', '牛肉卷', '牛肉丸', '羊排', '羊腿', '羊肉卷', '羊肉串',
    '鸡爪', '鸡胗', '鸡肝', '鸡块', '整鸡', '鸭肉', '鸭腿', '鸭胸', '鸭翅', '鸭脖',
    '鹅肉', '鸽子', '兔肉', '肉丸', '鱼丸', '贡丸', '蟹棒', '午餐方腿', '腊肉', '腊肠',
    '咸肉', '酱牛肉', '卤牛肉', '烤鸡', '烧鸭',
  ], '肉类', 3, '变温', {
    肥牛: ['肥牛卷'],
    午餐方腿: ['方腿'],
    蟹棒: ['蟹柳'],
  }),
  ...createEntries([
    '明虾', '河虾', '皮皮虾', '小龙虾', '虾滑', '扇贝', '生蚝', '牡蛎', '蛏子', '蛤蜊肉',
    '青口贝', '鲍鱼', '螃蟹', '梭子蟹', '大闸蟹', '蟹肉棒', '墨鱼', '章鱼', '章鱼足', '海参',
    '海蜇', '海螺', '黄鱼', '小黄鱼', '鲫鱼', '草鱼', '鲤鱼', '黑鱼', '龙利鱼', '巴沙鱼',
    '秋刀鱼', '鲅鱼', '鲳鱼', '金枪鱼', '银鳕鱼', '鱼片', '鱼头', '鱼籽', '鱼豆腐', '海鲜丸',
  ], '水产', 2, '变温', {
    生蚝: ['牡蛎'],
    墨鱼: ['乌贼'],
    龙利鱼: ['龙利鱼柳'],
  }),
  ...createEntries([
    '无菌蛋', '咸鸭蛋', '皮蛋', '松花蛋', '鸭蛋', '鹅蛋', '鸡蛋液', '蛋挞液',
  ], '蛋', 21, '冷藏'),
  ...createEntries([
    '豆皮', '千张', '油豆腐', '豆泡', '素鸡', '素鸭', '面筋', '烤麸', '纳豆', '豆腐皮',
    '冻豆腐', '内酯豆腐', '老豆腐', '豆腐丝', '豆腐脑',
  ], '豆制品', 7, '冷藏'),
  ...createEntries([
    '低脂牛奶', '高钙牛奶', '奶粉', '淡奶油', '炼乳', '奶油奶酪', '马苏里拉', '芝士碎',
    '奶昔', '乳酸菌饮料', '酸奶杯', '希腊酸奶',
  ], '乳制品', 14, '冷藏', {
    马苏里拉: ['马苏里拉芝士'],
  }),
  ...createEntries([
    '白米饭', '糙米饭', '杂粮饭', '粥', '米粥', '小米粥', '八宝粥', '馄饨', '饺子', '面包片',
    '贝果', '法棍', '欧包', '蛋糕', '蛋挞', '烧饼', '油条', '花卷', '窝头', '烙饼',
    '米线', '米粉', '河粉', '凉皮', '粉丝', '粉条', '乌冬面', '拉面', '刀削面', '挂面',
    '馄饨面', '炒面', '炒饭', '寿司饭', '饭团',
  ], '主食', 5, '冷藏'),
  ...createEntries([
    '冻鸡块', '冻薯饼', '冻玉米粒', '冻青豆', '冻混合蔬菜', '冻西兰花', '冻菠菜', '冻贝柱',
    '冻虾滑', '冻牛排', '冻羊肉卷', '冻肥牛卷', '冻鸡翅', '冻鸡米花', '冻披萨', '冻蛋挞皮',
    '冻包子', '冻馒头', '冻烧麦', '冻春卷', '冻云吞', '冻年糕', '冻鱼丸', '冻肉丸',
  ], '速冻', 120, '冷冻'),
  ...createEntries([
    '咖啡', '拿铁', '美式咖啡', '豆奶', '燕麦奶', '椰奶', '绿茶', '红茶', '奶茶', '酸梅汤',
    '运动饮料', '电解质水', '苏打汽水', '啤酒', '白葡萄酒', '红葡萄酒', '黄酒', '米酒',
    '凉茶', '乳酸菌', '柠檬茶', '蜂蜜水', '西梅汁', '蔬菜汁', '苹果醋',
  ], '饮料', 90, '门架'),
  ...createEntries([
    '盐', '白糖', '冰糖', '红糖', '料酒', '白胡椒粉', '黑胡椒', '花椒', '八角', '桂皮',
    '香叶', '孜然', '五香粉', '十三香', '鸡精', '味精', '豆瓣酱', '甜面酱', '黄豆酱', '柱候酱',
    '照烧汁', '烤肉酱', '黑椒汁', '芥末酱', '芝麻酱', '花生酱', '腐乳', '虾皮', '虾米',
    '海米', '木鱼花', '昆布', '高汤块', '浓汤宝', '椰浆',
  ], '调料', 180, '门架', {
    豆瓣酱: ['郫县豆瓣'],
    腐乳: ['豆腐乳'],
    浓汤宝: ['汤块'],
  }),
  ...createEntries([
    '剩菜', '炒青菜', '红烧肉', '炖牛腩', '卤味', '卤蛋', '卤鸡腿', '凉拌菜', '沙拉', '熟牛肉',
    '熟鸡胸', '熟虾仁', '熟玉米', '蒸南瓜', '蒸红薯', '开封牛奶', '开封酸奶', '开封果汁',
    '开封罐头', '泡发木耳', '泡发腐竹', '切片水果', '洗净草莓', '半个西瓜', '半颗包菜',
  ], '其他', 2, '冷藏'),
]

const PINYIN_INITIALS = {
  鲜: 'x', 牛: 'n', 奶: 'n', 酸: 's', 原: 'y', 味: 'w', 低: 'd', 温: 'w', 酪: 'l', 芝: 'z',
  士: 's', 片: 'p', 黄: 'h', 油: 'y', 动: 'd', 物: 'w', 鸡: 'j', 蛋: 'd', 土: 't', 鹌: 'a',
  鹑: 'c', 豆: 'd', 腐: 'f', 嫩: 'n', 北: 'b', 盒: 'h', 装: 'z', 干: 'g', 香: 'x', 竹: 'z',
  浆: 'j', 生: 's', 菜: 'c', 球: 'q', 菠: 'b', 绿: 'l', 叶: 'y', 麦: 'm', 小: 'x', 白: 'b',
  上: 's', 海: 'h', 青: 'q', 娃: 'w', 西: 'x', 兰: 'l', 花: 'h', 胡: 'h', 萝: 'l', 卜: 'b',
  红: 'h', 马: 'm', 铃: 'l', 薯: 's', 番: 'f', 茄: 'q', 柿: 's', 黄: 'h', 瓜: 'g', 紫: 'z',
  椒: 'j', 彩: 'c', 蘑: 'm', 菇: 'g', 口: 'k', 金: 'j', 针: 'z', 洋: 'y', 葱: 'c', 玉: 'y',
  米: 'm', 莲: 'l', 藕: 'o', 冬: 'd', 南: 'n', 贝: 'b', 香: 'x', 芫: 'y', 荽: 's', 姜: 'j',
  蒜: 's', 苹: 'p', 果: 'g', 香: 'x', 蕉: 'j', 橙: 'c', 子: 'z', 脐: 'q', 柠: 'n', 檬: 'm',
  葡: 'p', 萄: 't', 阳: 'y', 玫: 'm', 瑰: 'g', 提: 't', 草: 'c', 莓: 'm', 蓝: 'l', 猕: 'm',
  猴: 'h', 桃: 't', 奇: 'q', 异: 'y', 西: 'x', 哈: 'h', 密: 'm', 火: 'h', 龙: 'l', 芒: 'm',
  梨: 'l', 雪: 'x', 皇: 'h', 冠: 'g', 肉: 'r', 冷: 'l', 胸: 'x', 腿: 't', 翅: 'c', 中: 'z',
  猪: 'z', 里: 'l', 脊: 'j', 五: 'w', 末: 'm', 腩: 'n', 羊: 'y', 火: 'h', 腊: 'l', 肠: 'c',
  虾: 'x', 仁: 'r', 冻: 'd', 基: 'j', 围: 'w', 大: 'd', 三: 's', 文: 'w', 鱼: 'y', 鳕: 'x',
  带: 'd', 鲈: 'l', 蛤: 'g', 蜊: 'l', 鱿: 'y', 须: 'x', 饭: 'f', 剩: 's', 馒: 'm', 头: 't',
  面: 'm', 包: 'b', 吐: 't', 司: 's', 条: 't', 湿: 's', 饺: 'j', 皮: 'p', 馄: 'h', 饨: 't',
  云: 'y', 吞: 't', 年: 'n', 糕: 'g', 意: 'y', 速: 's', 水: 's', 汤: 't', 圆: 'y', 抓: 'z',
  饼: 'b', 薯: 's', 冰: 'b', 淇: 'q', 淋: 'l', 矿: 'k', 泉: 'q', 瓶: 'p', 可: 'k', 乐: 'l',
  无: 'w', 糖: 't', 雪: 'x', 碧: 'b', 柠: 'n', 汽: 'q', 乌: 'w', 茶: 'c', 果: 'g', 汁: 'z',
  椰: 'y', 气: 'q', 泡: 'p', 酱: 'j', 醋: 'c', 蚝: 'h', 耗: 'h', 沙: 's', 拉: 'l', 辣: 'l',
  老: 'l', 妈: 'm', 锅: 'g', 底: 'd', 料: 'l', 咖: 'k', 喱: 'l', 空: 'k', 心: 'x', 苋: 'x',
  茼: 't', 蒿: 'h', 韭: 'j', 芹: 'q', 茴: 'h', 苦: 'k', 菊: 'j', 芥: 'j', 蓝: 'l', 莴: 'w',
  笋: 's', 甘: 'g', 甜: 't', 山: 's', 芋: 'y', 魔: 'm', 丝: 's', 苦: 'k', 佛: 'f', 手: 's',
  秋: 'q', 葵: 'k', 豇: 'j', 四: 's', 季: 'j', 荷: 'h', 豌: 'w', 扁: 'b', 芽: 'y', 带: 'd',
  结: 'j', 木: 'm', 耳: 'e', 银: 'y', 杏: 'x', 鲍: 'b', 平: 'p', 蟹: 'x', 茶: 'c', 树: 's',
  春: 'c', 茭: 'j', 百: 'b', 合: 'h', 蹄: 't', 荸: 'b', 荠: 'j', 米: 'm', 杭: 'h', 线: 'x',
  椿: 'c', 苔: 't', 雪: 'x', 蕻: 'h', 榨: 'z', 橄: 'g', 榄: 'l', 梅: 'm', 车: 'c', 厘: 'l',
  樱: 'y', 油: 'y', 李: 'l', 杏: 'x', 杨: 'y', 荔: 'l', 枝: 'z', 眼: 'y', 桂: 'g', 圆: 'y',
  凤: 'f', 梨: 'l', 榴: 'l', 山: 's', 木: 'm', 椰: 'y', 石: 's', 蜜: 'm', 柑: 'g', 橘: 'j',
  桔: 'j', 圣: 's', 女: 'n', 黑: 'h', 皮: 'p', 排: 'p', 肋: 'l', 筒: 't', 骨: 'g', 肝: 'g',
  腰: 'y', 肚: 'd', 耳: 'e', 培: 'p', 根: 'g', 牛: 'n', 腱: 'j', 卷: 'j', 串: 'c', 爪: 'z',
  胗: 'z', 整: 'z', 鸭: 'y', 鹅: 'e', 鸽: 'g', 兔: 't', 丸: 'w', 贡: 'g', 咸: 'x', 卤: 'l',
  明: 'm', 河: 'h', 扇: 's', 贝: 'b', 牡: 'm', 蛎: 'l', 蛏: 'c', 肉: 'r', 螃: 'p', 梭: 's',
  墨: 'm', 章: 'z', 参: 's', 蜇: 'z', 螺: 'l', 鲫: 'j', 草: 'c', 鲤: 'l', 黑: 'h', 巴: 'b',
  沙: 's', 刀: 'd', 鲅: 'b', 鲳: 'c', 枪: 'q', 籽: 'z', 液: 'y', 挞: 't', 千: 'q', 张: 'z',
  泡: 'p', 素: 's', 筋: 'j', 烤: 'k', 麸: 'f', 纳: 'n', 脂: 'z', 高: 'g', 钙: 'g', 粉: 'f',
  淡: 'd', 炼: 'l', 碎: 's', 昔: 'x', 菌: 'j', 杯: 'b', 希: 'x', 腊: 'l', 挂: 'g', 粉: 'f',
  汤: 't', 披: 'p', 萨: 's', 春: 'c', 啡: 'f', 拿: 'n', 铁: 't', 美: 'm', 式: 's', 燕: 'y',
  绿: 'l', 红: 'h', 黄: 'h', 凉: 'l', 酒: 'j', 白: 'b', 盐: 'y', 料: 'l', 胡: 'h', 麻: 'm',
  八: 'b', 桂: 'g', 孜: 'z', 五: 'w', 粉: 'f', 十: 's', 精: 'j', 甜: 't', 柱: 'z', 照: 'z',
  烧: 's', 黑: 'h', 芥: 'j', 芝: 'z', 花: 'h', 生: 's', 乳: 'r', 虾: 'x', 木: 'm', 昆: 'k',
  布: 'b', 浓: 'n', 椰: 'y', 开: 'k', 封: 'f', 罐: 'g', 切: 'q', 半: 'b', 颗: 'k',
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function getPinyinInitials(value) {
  return Array.from(String(value || '').trim())
    .map((char) => {
      if (/[a-z0-9]/i.test(char)) return char.toLowerCase()
      return PINYIN_INITIALS[char] || ''
    })
    .join('')
}

function enrichEntry(entry) {
  const aliases = entry.aliases || []

  return {
    ...entry,
    aliases,
    initials: entry.initials || getPinyinInitials(entry.name),
    aliasInitials: aliases.map(getPinyinInitials).filter(Boolean),
  }
}

function dedupeEntries(entries) {
  const seen = {}

  return entries.filter((entry) => {
    const key = normalizeText(entry.name)

    if (!key || seen[key]) return false
    seen[key] = true
    return true
  })
}

const FOOD_LEXICON = dedupeEntries(BASE_FOOD_LEXICON.concat(EXTRA_FOOD_LEXICON))
  .map(enrichEntry)

function getEntryTokens(entry) {
  return [entry.name, entry.initials]
    .concat(entry.aliases || [])
    .concat(entry.aliasInitials || [])
    .map(normalizeText)
    .filter(Boolean)
}

function scoreToken(keyword, token) {
  if (!keyword || !token) return 0
  if (token === keyword) return 1000 + token.length
  if (token.startsWith(keyword)) return 700 + keyword.length
  if (keyword.includes(token)) return 400 + token.length
  if (token.includes(keyword)) return 300 + keyword.length
  return 0
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
      const score = tokens.reduce((maxScore, token) => {
        return Math.max(maxScore, scoreToken(keyword, token))
      }, 0)

      return score ? { entry, score } : null
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)
  const best = matches[0]

  return best ? best.entry : null
}

function getFoodSuggestions(name, limit = 8) {
  const keyword = normalizeText(name)

  if (!keyword) return []

  return FOOD_LEXICON
    .map((entry) => {
      const tokens = getEntryTokens(entry)
      const score = tokens.reduce((maxScore, token) => {
        return Math.max(maxScore, scoreToken(keyword, token))
      }, 0)

      return score ? { entry, score } : null
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((match) => match.entry)
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
  getFoodSuggestions,
  getFoodSuggestion,
  getStarterFoodEntries,
}
