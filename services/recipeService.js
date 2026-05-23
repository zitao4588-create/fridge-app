const { getDaysUntil } = require('../utils/date')

const RULES = [
  {
    id: 'tomato-egg',
    title: '番茄鸡蛋快手菜',
    keywords: ['番茄', '西红柿', '鸡蛋'],
    steps: ['番茄切块炒软', '加入鸡蛋翻炒成型', '按口味加盐调味'],
    reasonTemplate: '优先消耗临期的{items}，做法简单。',
  },
  {
    id: 'vegetable-stir-fry',
    title: '清炒时蔬',
    keywords: ['青菜', '菠菜', '生菜', '白菜', '西兰花', '蔬菜'],
    steps: ['蔬菜洗净切好', '热锅少油快炒', '出锅前加盐或少量生抽'],
    reasonTemplate: '用{items}做清炒菜，可以快速处理库存。',
  },
  {
    id: 'dairy-fruit',
    title: '酸奶水果碗',
    keywords: ['酸奶', '牛奶', '香蕉', '苹果', '草莓', '蓝莓', '水果'],
    steps: ['水果切小块', '加入酸奶或牛奶', '可额外准备燕麦或坚果'],
    reasonTemplate: '{items}适合做轻食，适合早餐或加餐。',
  },
  {
    id: 'frozen-noodle',
    title: '速冻食品热汤面',
    keywords: ['速冻', '饺子', '馄饨', '面条', '主食'],
    steps: ['锅中加水煮开', '放入主食或速冻食品', '加入蔬菜并调味'],
    reasonTemplate: '用{items}可以快速做一顿热食。',
  },
  {
    id: 'drink-pair',
    title: '饮料轻食搭配',
    keywords: ['饮料', '牛奶', '茶', '果汁'],
    steps: ['先确认饮品保质期', '搭配水果或面包', '临期饮品优先饮用'],
    reasonTemplate: '{items}适合优先安排到今天的饮食里。',
  },
]

const FALLBACK_RULES = [
  {
    id: 'quick-plate',
    title: '库存快手拼盘',
    steps: ['选择现有食品中最早到期的一项', '清洗、切块或加热', '搭配主食一起食用'],
  },
  {
    id: 'simple-rice-bowl',
    title: '简易拌饭',
    steps: ['处理一种现有食材', '铺在米饭或主食上', '按口味加少量酱汁'],
  },
  {
    id: 'warm-soup',
    title: '家常热汤',
    steps: ['选择现有蔬菜或肉蛋', '加水煮开', '最后简单调味'],
  },
]

function itemMatchesRule(item, rule) {
  const text = `${item.name} ${item.category}`.toLowerCase()
  return rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))
}

function formatItemNames(items) {
  return items
    .slice(0, 3)
    .map((item) => item.name)
    .join('、')
}

function pickBaseItems(items) {
  const validItems = items.filter((item) => getDaysUntil(item.expireDate) >= 0)
  const warningItems = validItems.filter((item) => getDaysUntil(item.expireDate) <= 3)
  const soonItems = validItems.filter((item) => getDaysUntil(item.expireDate) <= 7)

  if (warningItems.length > 0) {
    return {
      mode: 'warning',
      items: warningItems,
    }
  }

  if (soonItems.length > 0) {
    return {
      mode: 'soon',
      items: soonItems,
    }
  }

  return {
    mode: validItems.length > 0 ? 'normal' : 'empty',
    items: validItems,
  }
}

function ruleBasedRecipes(items) {
  const base = pickBaseItems(items)

  if (base.mode === 'empty') {
    return []
  }

  const recommendations = []
  const usedTitles = new Set()

  RULES.forEach((rule) => {
    if (recommendations.length >= 3) {
      return
    }

    const matchedItems = base.items.filter((item) => itemMatchesRule(item, rule))

    if (matchedItems.length === 0 || usedTitles.has(rule.title)) {
      return
    }

    usedTitles.add(rule.title)
    recommendations.push({
      id: rule.id,
      title: rule.title,
      usedItems: matchedItems.slice(0, 4),
      steps: rule.steps,
      reason: rule.reasonTemplate.replace('{items}', formatItemNames(matchedItems)),
    })
  })

  let fallbackIndex = 0

  while (recommendations.length < 3 && fallbackIndex < FALLBACK_RULES.length) {
    const rule = FALLBACK_RULES[fallbackIndex]
    const item = base.items[fallbackIndex % base.items.length]

    recommendations.push({
      id: `${rule.id}-${item._id || item.name}`,
      title: `${item.name}${rule.title}`,
      usedItems: [item],
      steps: rule.steps,
      reason:
        base.mode === 'normal'
          ? `库存里有${item.name}，适合安排一道简单餐食。`
          : `优先消耗${item.name}，减少临期浪费。`,
    })

    fallbackIndex += 1
  }

  return recommendations
}

function fallbackAIRecipes(items) {
  return ruleBasedRecipes(items)
}

function getRecipeRecommendations(items) {
  return ruleBasedRecipes(items)
}

module.exports = {
  fallbackAIRecipes,
  getRecipeRecommendations,
  ruleBasedRecipes,
}
