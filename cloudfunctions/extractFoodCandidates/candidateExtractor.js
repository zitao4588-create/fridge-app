const FOOD_RULES = [
  { pattern: /牛奶|milk/i, name: '牛奶', category: '乳制品', storageLocation: '冷藏' },
  { pattern: /酸奶|yogurt|yoghurt/i, name: '酸奶', category: '乳制品', storageLocation: '冷藏' },
  { pattern: /奶酪|cheese/i, name: '奶酪', category: '乳制品', storageLocation: '冷藏' },
  { pattern: /鸡蛋|egg/i, name: '鸡蛋', category: '蛋', storageLocation: '冷藏' },
  { pattern: /面包|bread/i, name: '面包', category: '主食', storageLocation: '常温' },
  { pattern: /果汁|juice/i, name: '果汁', category: '饮料', storageLocation: '冷藏' },
  { pattern: /饮料|beverage|drink/i, name: '饮料', category: '饮料', storageLocation: '冷藏' },
  { pattern: /豆腐|tofu/i, name: '豆腐', category: '豆制品', storageLocation: '冷藏' },
  { pattern: /鱼|fish/i, name: '鱼', category: '水产', storageLocation: '冷冻' },
  { pattern: /鸡肉|chicken/i, name: '鸡肉', category: '肉类', storageLocation: '冷冻' },
]

const YEAR_FIRST_DATE_PATTERN =
  /(20\d{2})\s*(?:年|[-/.])\s*(1[0-2]|0?[1-9])\s*(?:月|[-/.])\s*(3[01]|[12]\d|0?[1-9])\s*日?(?!\d)/g
const DAY_FIRST_DOT_DATE_PATTERN =
  /(3[01]|[12]\d|0?[1-9])\s*\.\s*(1[0-2]|0?[1-9])\s*\.\s*(20\d{2})(?!\d)/g
const DELIMITED_DATE_PATTERN =
  /(3[01]|[12]\d|0?[1-9])\s*[-/]\s*(3[01]|[12]\d|0?[1-9])\s*[-/]\s*(20\d{2})(?!\d)/g
const COMPACT_DATE_PATTERN =
  /(20\d{2})(1[0-2]|0[1-9])(3[01]|[12]\d|0[1-9])(?!\d)/g

function normalizeLine(item = {}) {
  return {
    text: String(item.text || '').trim().slice(0, 160),
    confidence:
      Number.isFinite(Number(item.confidence))
        ? Math.max(0, Math.min(1, Number(item.confidence)))
        : null,
  }
}

function formatDate(match) {
  return [
    match[1],
    String(match[2]).padStart(2, '0'),
    String(match[3]).padStart(2, '0'),
  ].join('-')
}

function classifyDateKind(text) {
  const normalized = String(text || '').toLowerCase()
  if (/生产|制造|包装|灌装|mfg|prod|manufacture/.test(normalized)) {
    return 'production'
  }
  if (
    /有效期至|到期|失效|截止|保质期至|exp|best before|best by|use by|mhd|parasta ennen/.test(
      normalized,
    )
  ) {
    return 'expire'
  }
  return 'unknown'
}

function addDateCandidate(candidates, seen, line, kind, value) {
  const key = `${kind}:${value}`
  if (seen.has(key)) return
  seen.add(key)
  candidates.push({
    kind,
    value,
    confidence: line.confidence,
  })
}

function findDateCandidates(lines) {
  const candidates = []
  const seen = new Set()
  lines.forEach((line) => {
    const kind = classifyDateKind(line.text)

    YEAR_FIRST_DATE_PATTERN.lastIndex = 0
    let matched = YEAR_FIRST_DATE_PATTERN.exec(line.text)
    while (matched) {
      addDateCandidate(candidates, seen, line, kind, formatDate(matched))
      matched = YEAR_FIRST_DATE_PATTERN.exec(line.text)
    }

    DAY_FIRST_DOT_DATE_PATTERN.lastIndex = 0
    matched = DAY_FIRST_DOT_DATE_PATTERN.exec(line.text)
    while (matched) {
      addDateCandidate(
        candidates,
        seen,
        line,
        kind,
        [matched[3], matched[2], matched[1]]
          .map((part, index) =>
            index === 0 ? part : String(part).padStart(2, '0'),
          )
          .join('-'),
      )
      matched = DAY_FIRST_DOT_DATE_PATTERN.exec(line.text)
    }

    DELIMITED_DATE_PATTERN.lastIndex = 0
    matched = DELIMITED_DATE_PATTERN.exec(line.text)
    while (matched) {
      const first = Number(matched[1])
      const second = Number(matched[2])
      let month = 0
      let day = 0

      if (first > 12 && second <= 12) {
        day = first
        month = second
      } else if (second > 12 && first <= 12) {
        month = first
        day = second
      }

      if (month && day) {
        addDateCandidate(
          candidates,
          seen,
          line,
          kind,
          [
            matched[3],
            String(month).padStart(2, '0'),
            String(day).padStart(2, '0'),
          ].join('-'),
        )
      }
      matched = DELIMITED_DATE_PATTERN.exec(line.text)
    }

    COMPACT_DATE_PATTERN.lastIndex = 0
    matched = COMPACT_DATE_PATTERN.exec(line.text)
    while (matched) {
      addDateCandidate(candidates, seen, line, kind, formatDate(matched))
      matched = COMPACT_DATE_PATTERN.exec(line.text)
    }
  })
  return candidates
}

function findFoodCandidate(lines) {
  for (const line of lines) {
    const matched = FOOD_RULES.find((rule) => rule.pattern.test(line.text))
    if (matched) {
      return {
        name: { value: matched.name, confidence: line.confidence },
        category: { value: matched.category, confidence: line.confidence },
        storageLocation: {
          value: matched.storageLocation,
          confidence: line.confidence,
        },
      }
    }
  }
  return {}
}

function findQuantityCandidate(lines) {
  for (const line of lines) {
    const matched = line.text.match(
      /(?:数量|内装|contains?)\s*[:：]?\s*(\d{1,3})\s*(?:个|盒|瓶|袋|包|pcs?|pieces?)/i,
    )
    if (matched) {
      return {
        value: matched[1],
        confidence: line.confidence,
      }
    }
  }
  return undefined
}

function calculateAverageConfidence(lines) {
  const values = lines
    .map((line) => line.confidence)
    .filter((value) => value !== null)
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function extractCandidatePayload(detections = []) {
  const lines = detections.map(normalizeLine).filter((line) => line.text)
  const fields = findFoodCandidate(lines)
  const quantity = findQuantityCandidate(lines)
  if (quantity) fields.quantity = quantity

  return {
    source: 'tencent_general_basic',
    fields,
    dateCandidates: findDateCandidates(lines),
    providerMeta: {
      lineCount: lines.length,
      averageConfidence: calculateAverageConfidence(lines),
    },
    requiresConfirmation: true,
    autoWriteAllowed: false,
  }
}

module.exports = {
  extractCandidatePayload,
  findDateCandidates,
  findFoodCandidate,
  findQuantityCandidate,
}
