const DAY_MS = 24 * 60 * 60 * 1000

function pad(value) {
  return String(value).padStart(2, '0')
}

function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// 只接受真实存在的 YYYY-M-D 日期；2026-02-31 这类不存在的日期返回 null，
// 不再被 Date 悄悄进位成 3 月 3 日。非字符串 / 空值同样返回 null，调用方可安全降级。
function parseDate(dateString) {
  if (typeof dateString !== 'string') {
    return null
  }

  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateString.trim())

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function isValidDateString(dateString) {
  return parseDate(dateString) !== null
}

function getToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getTodayString() {
  return toDateString(getToday())
}

function addDays(dateString, days) {
  const date = parseDate(dateString)

  if (!date) {
    return ''
  }

  date.setDate(date.getDate() + Number(days))
  return toDateString(date)
}

function getDaysUntil(dateString) {
  const target = parseDate(dateString)

  // 空日期或无效日期没有「距到期天数」，返回 NaN 而不是 0（0 会被当成今天到期）。
  // NaN 与任何数字比较都为 false，旧数据在分桶 / 状态判断里会安全落到非临期分支。
  if (!target) {
    return NaN
  }

  return Math.round((target.getTime() - getToday().getTime()) / DAY_MS)
}

function formatDate(dateString) {
  const date = parseDate(dateString)

  if (!date) {
    return ''
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function getMonthTitle(year, monthIndex) {
  return `${year}年${monthIndex + 1}月`
}

function buildMonthDays(year, monthIndex, eventMap, selectedDate) {
  const firstDate = new Date(year, monthIndex, 1)
  const startDate = new Date(year, monthIndex, 1 - firstDate.getDay())
  const days = []

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)

    const dateString = toDateString(date)
    const events = eventMap[dateString] || []

    days.push({
      date: dateString,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === monthIndex,
      hasEvents: events.length > 0,
      eventCount: events.length,
      selected: dateString === selectedDate,
    })
  }

  return days
}

function calculateExpireDate(productionDate, shelfLifeDays) {
  const days = Number(shelfLifeDays)

  // Number('') / Number(null) 为 0，Number(undefined) 为 NaN，都会在这里被拦下。
  if (!isValidDateString(productionDate) || !Number.isInteger(days) || days <= 0) {
    return ''
  }

  return addDays(productionDate, days)
}


module.exports = {
  calculateExpireDate,
  DAY_MS,
  addDays,
  buildMonthDays,
  formatDate,
  getDaysUntil,
  getMonthTitle,
  getTodayString,
  isValidDateString,
  parseDate,
  toDateString,
}

