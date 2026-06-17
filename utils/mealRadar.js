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

function getTimeContext(now = new Date()) {
  const hour = now.getHours()

  if (hour >= 5 && hour < 10) {
    return { period: 'morning', shortText: '早上', timeText: '早上先看一眼' }
  }
  if (hour >= 10 && hour < 14) {
    return { period: 'noon', shortText: '午饭前', timeText: '午饭前先安排' }
  }
  if (hour >= 14 && hour < 18) {
    return { period: 'afternoon', shortText: '傍晚前', timeText: '傍晚前先定下来' }
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
      statusText: `状态变红：${radar.overdueCount}样已过期`,
      levelTitle: `${timeContext.shortText}先确认过期食材`,
      priorityTitle: '先处理风险',
      priorityEmptyText: '暂无过期风险。',
    }
  }

  if (radar.expiringCount > 0) {
    return {
      statusText: `状态变黄：${radar.expiringCount}样3天内到期`,
      levelTitle: `${timeContext.shortText}优先安排临期食材`,
      priorityTitle: '今日优先用掉',
      priorityEmptyText: '暂无临期压力。',
    }
  }

  if (radar.usableCount > 0) {
    return {
      statusText: '状态稳定：暂无临期压力',
      levelTitle: `${timeContext.shortText}库存状态稳定`,
      priorityTitle: '今日优先用掉',
      priorityEmptyText: '暂无临期压力，可以按心情安排一顿。',
    }
  }

  return {
    statusText: '状态空白：先建立第一批库存',
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
  const baseRadar = {
    usableCount,
    expiringCount,
    overdueCount,
  }
  const statusCopy = buildStatusCopy(baseRadar, timeContext)
  const priorityItems = overdueCount > 0
    ? overdueItems.slice(0, 3)
    : expiringItems.slice(0, 3)

  return {
    score,
    scoreText: `${score}%`,
    ...getMealRadarLevel(score),
    ...statusCopy,
    period: timeContext.period,
    timeText: timeContext.timeText,
    usableCount,
    expiringCount,
    overdueCount,
    overdueItems,
    priorityItems,
    explanation: `已扫描 ${usableCount} 个可用库存 · ${expiringCount} 个临期 · ${overdueCount} 个过期风险`,
  }
}

function buildHomeRadar(items = [], options = {}) {
  const radar = buildMealRadar(items, options)
  const priorityNames = radar.priorityItems.map((item) => item.name).filter(Boolean)
  const overdueNames = radar.overdueItems.slice(0, 2).map((item) => item.name).filter(Boolean)

  if (radar.overdueCount > 0) {
    return {
      ...radar,
      title: `${radar.timeText}过期风险`,
      actionText: overdueNames.length ? overdueNames.join('、') : '查看已过期清单',
      body: '有食材已经过期，先确认还能不能吃，再安排今天这顿。',
    }
  }

  if (priorityNames.length > 0) {
    return {
      ...radar,
      title: `${radar.timeText}临期食材`,
      actionText: priorityNames.join('、'),
      body: '这些食材快到期了，今晚优先安排它们，浪费会少很多。',
    }
  }

  if (radar.usableCount > 0) {
    return {
      ...radar,
      title: `${radar.timeText}放心开饭`,
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
  getTimeContext,
  getItemBucket,
}
