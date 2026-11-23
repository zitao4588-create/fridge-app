const test = require('node:test')
const assert = require('node:assert/strict')

const dates = require('../utils/date')
const { getExpiryStatus } = require('../utils/status')
const { getItemBucket } = require('../utils/mealRadar')

test('parseDate 拒绝不存在的日期，不再进位', () => {
  assert.equal(dates.parseDate('2026-02-31'), null)
  assert.equal(dates.parseDate('2026-13-01'), null)
  assert.equal(dates.parseDate('2026-00-10'), null)
  assert.equal(dates.parseDate('2025-02-29'), null)
  assert.equal(dates.toDateString(dates.parseDate('2028-02-29')), '2028-02-29')
  assert.equal(dates.isValidDateString('2026-02-31'), false)
  assert.equal(dates.isValidDateString('2026-02-28'), true)
})

test('parseDate 对空值、非字符串、格式不规范的旧数据返回 null 而不是抛错', () => {
  for (const value of ['', '   ', null, undefined, 0, 1767225600000, {}, '2026/01/05', 'abc', '2026-01', '2026-01-05T00:00:00Z']) {
    assert.equal(dates.parseDate(value), null, `value=${String(value)}`)
  }
  // 历史数据可能是未补零的日期，仍可解析
  assert.equal(dates.toDateString(dates.parseDate('2026-1-5')), '2026-01-05')
  assert.equal(dates.toDateString(dates.parseDate(' 2026-01-05 ')), '2026-01-05')
})

test('空日期 / 无效日期不算今天到期', () => {
  assert.ok(Number.isNaN(dates.getDaysUntil('')))
  assert.ok(Number.isNaN(dates.getDaysUntil(undefined)))
  assert.ok(Number.isNaN(dates.getDaysUntil('2026-02-31')))
  assert.equal(dates.getDaysUntil(dates.getTodayString()), 0)
})

test('getExpiryStatus 对旧数据安全降级', () => {
  for (const value of ['', undefined, null, '2026-02-31', 'bad']) {
    const status = getExpiryStatus(value)
    assert.equal(status.key, 'unknown')
    assert.equal(status.label, '日期待补')
    assert.notEqual(status.hint, '今天到期')
    assert.equal(typeof status.className, 'string')
  }
  assert.equal(getExpiryStatus(dates.getTodayString()).hint, '今天到期')
  assert.equal(getExpiryStatus(dates.addDays(dates.getTodayString(), -2)).key, 'overdue')
})

test('mealRadar 分桶不会把空日期算成临期', () => {
  assert.equal(getItemBucket({ expireDate: '' }), 'normal')
  assert.equal(getItemBucket({}), 'normal')
  assert.equal(getItemBucket({ expireDate: dates.getTodayString() }), 'expiring')
})

test('formatDate / addDays / calculateExpireDate 对无效输入返回空串', () => {
  assert.equal(dates.formatDate('2026-02-31'), '')
  assert.equal(dates.formatDate(''), '')
  assert.equal(dates.addDays('2026-02-31', 1), '')
  assert.equal(dates.addDays('2026-02-28', 1), '2026-03-01')
  assert.equal(dates.calculateExpireDate('2026-01-01', ''), '')
  assert.equal(dates.calculateExpireDate('2026-01-01', '0'), '')
  assert.equal(dates.calculateExpireDate('2026-01-01', '1.5'), '')
  assert.equal(dates.calculateExpireDate('2026-01-01', 'abc'), '')
  assert.equal(dates.calculateExpireDate('', '7'), '')
  assert.equal(dates.calculateExpireDate('2026-02-31', '7'), '')
  assert.equal(dates.calculateExpireDate('2026-01-01', '7'), '2026-01-08')
  assert.equal(dates.calculateExpireDate('2026-01-01', 7), '2026-01-08')
})
