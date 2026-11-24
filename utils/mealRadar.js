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

function getMealRadarLevelClass(score) {
  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

function getTimeContext(now = new Date()) {
  const hour = now.getHours()

  if (hour >= 5 && hour < 10) {
    return { period: 'morning', shortText: '早上', timeText: '早上先看一眼' }
  }
  if (hour >= 10 && hour < 14) {
    return { period: 'noon', shortText: '午饭前', timeText: '午饭前先安排' }
  }
  if (hour >= 14 && hour < 18) {
    return { period: 'afternoon', shortText: '傍晚', timeText: '傍晚先定下来' }
  }
  if (hour >= 18 && hour < 23) {
    return { period: 'evening', shortText: '晚饭前', timeText: '晚饭前优先处理' }
  }
  return { period: 'night', shortText: '明早', timeText: '明早优先处理' }
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

function buildStatusCopy(radar, timeContext) {
  if (radar.overdueCount > 0) {
    return {
      statusText: `已过期 ${radar.overdueCount} 样`,
      levelTitle: `${timeContext.shortText}先确认过期食材`,
      priorityTitle: '先处理风险',
      priorityEmptyText: '暂无过期风险。',
    }
  }

  if (radar.expiringCount > 0) {
    return {
      statusText: `临期 ${radar.expiringCount} 样`,
      levelTitle: `${timeContext.shortText}优先安排临期食材`,
      priorityTitle: '今日优先用掉',
      priorityEmptyText: '暂无临期压力。',
    }
  }

  if (radar.usableCount > 0) {
    return {
      statusText: '库存稳定',
      levelTitle: `${timeContext.shortText}库存状态稳定`,
      priorityTitle: '今日优先用掉',
      priorityEmptyText: '暂无临期压力，可以按心情安排一顿。',
    }
  }

  return {
    statusText: '还没有库存',
    levelTitle: '先放进几样常吃的',
    priorityTitle: '今日优先用掉',
    priorityEmptyText: '录入第一批食材后，小雷达会帮你排序。',
  }
}

function buildMealRadar(items = [], options = {}) {
  const timeContext = getTimeContext(options.now || new Date())
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
  const statusCopy = buildStatusCopy(
    { usableCount, expiringCount, overdueCount },
    timeContext,
  )
  const priorityItems = overdueCount > 0
    ? overdueItems.slice(0, 3)
    : expiringItems.slice(0, 3)

  const verdictClass =
    overdueCount > 0
      ? 'low'
      : expiringCount > 0
        ? 'medium'
        : usableCount > 0
          ? 'high'
          : 'low'

  return {
    score,
    levelClass: getMealRadarLevelClass(score),
    verdictClass,
    ...statusCopy,
    period: timeContext.period,
    shortText: timeContext.shortText,
    timeText: timeContext.timeText,
    usableCount,
    expiringCount,
    overdueCount,
    overdueItems,
    priorityItems,
  }
}

function buildHomeRadar(items = [], options = {}) {
  const radar = buildMealRadar(items, options)
  const priorityNames = radar.priorityItems.map((item) => item.name).filter(Boolean)
  const overdueNames = radar.overdueItems.slice(0, 2).map((item) => item.name).filter(Boolean)

  if (radar.overdueCount > 0) {
    return {
      ...radar,
      levelClass: 'low',
      title: `${radar.shortText}先处理过期风险`,
      actionText: overdueNames.length ? overdueNames.join('、') : '查看已过期清单',
    }
  }

  if (priorityNames.length > 0) {
    return {
      ...radar,
      levelClass: 'medium',
      title: `${radar.shortText}优先安排临期食材`,
      actionText: priorityNames.join('、'),
    }
  }

  if (radar.usableCount > 0) {
    return {
      ...radar,
      levelClass: 'high',
      title: `${radar.shortText}库存稳定，放心开饭`,
      actionText: '暂无临期压力',
    }
  }

  return {
    ...radar,
    levelClass: 'high',
    title: '先放进几样常吃的',
    actionText: '从牛奶、鸡蛋、蔬菜开始',
  }
}

module.exports = {
  buildHomeRadar,
  buildMealRadar,
  getTimeContext,
  getItemBucket,
}
