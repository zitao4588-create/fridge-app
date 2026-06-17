const { getDaysUntil } = require('./date')

function getItemBucket(item = {}) {
  const days = getDaysUntil(item.expireDate)

  if (days < 0) return 'overdue'
  if (days <= 3) return 'expiring'
  return 'normal'
}

function clampScore(value) {
  return Math.max(0, Math.min(99, Math.round(value)))
}

function getMealRadarLevel(score) {
  if (score >= 80) {
    return { levelLabel: '高', levelTitle: '今天很适合开饭', levelClass: 'high' }
  }
  if (score >= 50) {
    return { levelLabel: '中', levelTitle: '可以开饭，建议补 1-2 样', levelClass: 'medium' }
  }
  return { levelLabel: '低', levelTitle: '先处理风险或补货', levelClass: 'low' }
}

function sortByExpireDate(items) {
  return items.slice().sort((left, right) => {
    const leftDate = left.expireDate || ''
    const rightDate = right.expireDate || ''

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate)
    }

    return String(left.name || '').localeCompare(String(right.name || ''))
  })
}

function buildMealRadar(items = []) {
  const normalizedItems = items.map((item) => ({
    ...item,
    bucket: item.bucket || getItemBucket(item),
  }))
  const usable = normalizedItems.filter((item) => item.bucket !== 'overdue')
  const expiringItems = sortByExpireDate(
    normalizedItems.filter((item) => item.bucket === 'expiring'),
  )
  const overdueItems = sortByExpireDate(
    normalizedItems.filter((item) => item.bucket === 'overdue'),
  )
  const usableCount = usable.length
  const expiringCount = expiringItems.length
  const overdueCount = overdueItems.length
  const categoryCount = new Set(
    usable.map((item) => item.category).filter(Boolean),
  ).size

  const inventoryScore = Math.min(usableCount / 8, 1) * 45
  const diversityScore = Math.min(categoryCount / 4, 1) * 25
  const expiryValueScore = expiringCount > 0 ? Math.min(expiringCount * 5, 15) : 8
  const overduePenalty = Math.min(overdueCount * 10, 30)
  const score = clampScore(
    inventoryScore + diversityScore + expiryValueScore - overduePenalty,
  )

  return {
    score,
    scoreText: `${score}%`,
    ...getMealRadarLevel(score),
    usableCount,
    expiringCount,
    overdueCount,
    overdueItems,
    priorityItems: expiringItems.slice(0, 3),
    explanation: `已扫描 ${usableCount} 个可用库存 · ${expiringCount} 个临期 · ${overdueCount} 个过期风险`,
  }
}

function buildHomeRadar(items = []) {
  const radar = buildMealRadar(items)
  const priorityNames = radar.priorityItems.map((item) => item.name).filter(Boolean)
  const overdueNames = radar.overdueItems.slice(0, 2).map((item) => item.name).filter(Boolean)

  if (radar.overdueCount > 0) {
    return {
      ...radar,
      title: '先处理过期风险',
      actionText: overdueNames.length ? overdueNames.join('、') : '查看已过期清单',
      body: '有食材已经过期，先确认还能不能吃，再安排今天这顿。',
    }
  }

  if (priorityNames.length > 0) {
    return {
      ...radar,
      title: '今天先用掉',
      actionText: priorityNames.join('、'),
      body: '这些食材快到期了，今晚优先安排它们，浪费会少很多。',
    }
  }

  if (radar.usableCount > 0) {
    return {
      ...radar,
      title: '今天可以放心开饭',
      actionText: '暂无临期压力',
      body: '库存状态稳定，可以按想吃的口味安排一顿。',
    }
  }

  return {
    ...radar,
    title: '先放进几样常吃的',
    actionText: '从牛奶、鸡蛋、蔬菜开始',
    body: '录入第一批食材后，小雷达会帮你记住谁该先吃。',
  }
}

module.exports = {
  buildHomeRadar,
  buildMealRadar,
  getItemBucket,
}
