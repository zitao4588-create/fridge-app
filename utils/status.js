const { getDaysUntil } = require('./date')

const STATUS_META = {
  overdue: {
    label: '已过期',
    className: 'status-overdue',
  },
  critical: {
    label: '1天内过期',
    className: 'status-critical',
  },
  warning: {
    label: '3天内过期',
    className: 'status-warning',
  },
  soon: {
    label: '7天内过期',
    className: 'status-soon',
  },
  normal: {
    label: '正常',
    className: 'status-normal',
  },
  // 历史数据里可能有空的或格式不规范的到期日：不当成今天到期，也不报错，
  // 沿用正常态样式，只把文案降级为「日期待补」。
  unknown: {
    label: '日期待补',
    className: 'status-normal',
  },
}

function getExpiryStatus(expireDate) {
  const diffDays = getDaysUntil(expireDate)

  if (!Number.isFinite(diffDays)) {
    return {
      key: 'unknown',
      days: null,
      hint: '未设置有效到期日',
      ...STATUS_META.unknown,
    }
  }

  if (diffDays < 0) {
    return {
      key: 'overdue',
      days: diffDays,
      hint: `已过期 ${Math.abs(diffDays)} 天`,
      ...STATUS_META.overdue,
    }
  }

  if (diffDays <= 1) {
    return {
      key: 'critical',
      days: diffDays,
      hint: diffDays === 0 ? '今天到期' : `还剩 ${diffDays} 天`,
      ...STATUS_META.critical,
    }
  }

  if (diffDays <= 3) {
    return {
      key: 'warning',
      days: diffDays,
      hint: `还剩 ${diffDays} 天`,
      ...STATUS_META.warning,
    }
  }

  if (diffDays <= 7) {
    return {
      key: 'soon',
      days: diffDays,
      hint: `还剩 ${diffDays} 天`,
      ...STATUS_META.soon,
    }
  }

  return {
    key: 'normal',
    days: diffDays,
    hint: `还剩 ${diffDays} 天`,
    ...STATUS_META.normal,
  }
}

module.exports = {
  getExpiryStatus,
  STATUS_META,
}

