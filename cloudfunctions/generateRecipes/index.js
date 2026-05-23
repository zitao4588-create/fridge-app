const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const DAY_MS = 24 * 60 * 60 * 1000

function parseDate(dateString) {
  const parts = String(dateString || '').split('-').map(Number)
  return new Date(parts[0], parts[1] - 1, parts[2])
}

function getToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getDaysUntil(dateString) {
  return Math.round((parseDate(dateString).getTime() - getToday().getTime()) / DAY_MS)
}

function formatNames(items) {
  return items
    .slice(0, 3)
    .map((item) => item.name)
    .join('、')
}

exports.main = async (event) => {
  const items = Array.isArray(event.items) ? event.items : []
  const usableItems = items.filter((item) => getDaysUntil(item.expireDate) >= 0)
  const priorityItems = usableItems.filter((item) => getDaysUntil(item.expireDate) <= 3)
  const baseItems = priorityItems.length > 0 ? priorityItems : usableItems

  if (baseItems.length === 0) {
    return {
      recommendations: [],
    }
  }

  const pickedItems = baseItems.slice(0, 3)
  const recommendations = pickedItems.map((item) => ({
    title: `${item.name}快手餐`,
    usedItems: [item],
    steps: ['检查食品状态', '清洗、切块或加热', '按口味简单调味'],
    reason:
      priorityItems.length > 0
        ? `优先消耗临期的${item.name}。`
        : `库存里有${formatNames([item])}，适合今天安排。`,
  }))

  return {
    recommendations,
  }
}

