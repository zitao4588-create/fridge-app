const DAY_MS = 24 * 60 * 60 * 1000

function pad(value) {
  return String(value).padStart(2, '0')
}

function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseDate(dateString) {
  if (!dateString) {
    return null
  }

  const parts = dateString.split('-').map(Number)

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null
  }

  return new Date(parts[0], parts[1] - 1, parts[2])
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

  if (!target) {
    return 0
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

module.exports = {
  DAY_MS,
  addDays,
  buildMonthDays,
  formatDate,
  getDaysUntil,
  getMonthTitle,
  getTodayString,
  parseDate,
  toDateString,
}

