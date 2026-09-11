/**
 * Shared formatting — one place that decides how the product renders money,
 * numbers, dates and person initials.
 *
 * Money rules (kept deliberately consistent):
 *   • 凭证、流水、表格里的金额 → 全精度、带千分位：  ¥1,480,000
 *   • Hero 大数字与图表坐标轴     → 万元紧凑：        ¥1,480万
 *   • 需要可比性的地方（跑道、执行率）→ 固定 1–2 位小数
 */

export type Currency = "CNY" | "USD"

const LOCALE = "zh-CN"

/**
 * 一位 / 两位小数（用于跑道月数、执行率这类"要能对齐"的数字）。
 * 14.76 → "14.8"，99.0 → "99.0"。
 */
export const formatRatio = (value: number, digits: 0 | 1 | 2 = 1): string => {
  if (!Number.isFinite(value)) return "—"
  return value.toFixed(digits)
}

/** 带符号百分比："9.8" → "+9.8%"，"-2.4" → "-2.4%"。 */
export const formatSignedPercent = (value: number, digits = 1): string =>
  `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`

/** 增长率等文案里用的百分比："92.5%"（一位小数，不带符号）。 */
export const formatPercent1 = (value: number): string => `${value.toFixed(1)}%`

/** Full-precision currency: 1480000 → "¥1,480,000". */
export const formatCurrency = (value: number, currency: Currency = "CNY"): string =>
  new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)

/**
 * Compact currency for dense surfaces.
 *   2650000 → "¥265万"    48000 → "¥4.8万"    980 → "¥980"
 * Large amounts roll up to 亿 so an axis label never wraps.
 */
export const formatCurrencyCompact = (value: number, currency: Currency = "CNY"): string => {
  const symbol = currency === "CNY" ? "¥" : "$"
  const abs = Math.abs(value)

  if (abs >= 100_000_000) return `${symbol}${trim(value / 100_000_000)}亿`
  if (abs >= 10_000) return `${symbol}${trim(value / 10_000)}万`
  return `${symbol}${Math.round(value).toLocaleString(LOCALE)}`
}

/** Thousands-separated plain number: 20060 → "20,060". */
export const formatNumber = (value: number): string =>
  new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(value)

export const formatPercent = (value: number): string => `${value.toFixed(2)}%`

/** "2026-08-19" → "2026年8月19日" (falls back to the raw input if unparseable). */
export const formatDate = (iso: string): string => {
  const date = parseISODate(iso)
  if (!date) return iso
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`
}

/** "2026-09-11" → "9月11日" — for board cards and dense timelines. */
export const formatDateShort = (iso: string): string => {
  const date = parseISODate(iso)
  if (!date) return iso
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`
}

/** "2026-09-11" → "2026年9月" — 财务口径一律精确到月。 */
export const formatMonthLabel = (iso: string): string => {
  const date = parseISODate(iso)
  if (!date) return iso
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月`
}

/** "2026-09" → "2026年9月"。 */
export const formatMonthKey = (month: string): string =>
  `${month.slice(0, 4)}年${Number(month.slice(5))}月`

/** "2026-09-11" → "2026-09-11"（凭证、账本里保持原样，便于对账）。 */
export const formatISODate = (iso: string): string => iso.slice(0, 10)

/** Hours since last touch → "3 小时前" / "昨天" / "12 天前". */
export const formatRelativeHours = (hours: number): string => {
  if (hours < 1) return "刚刚"
  if (hours < 24) return `${Math.round(hours)} 小时前`
  const days = Math.round(hours / 24)
  if (days === 1) return "昨天"
  if (days < 30) return `${days} 天前`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} 个月前`
  return `${Math.round(months / 12)} 年前`
}

/* -------------------------------------------------------------------------- */

/**
 * 头像文字。中文名取姓名末两字（名），西文名取首字母缩写——
 * 全站头像都走这一个函数，避免每个视图各写一份。
 *
 * `max` 用于密集场景：24px 及以下的小头像放不下两个汉字，
 * 传 1 只取一个姓氏字符，避免文字被裁切成不可读的碎片。
 */
export const personInitials = (name: string, max: 1 | 2 = 2): string => {
  const trimmed = name.trim()
  if (!trimmed) return "?"
  const parts = trimmed.split(/\s+/)
  if (parts.length > 1) {
    return parts
      .slice(0, max)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }
  return trimmed.length > max ? trimmed.slice(-max) : trimmed
}

/** One decimal only when it adds information: 4.85 → "4.9", 26.5 → "26.5", 30 → "30". */
function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10
  if (Number.isInteger(rounded)) return rounded.toLocaleString(LOCALE)
  return rounded.toLocaleString(LOCALE, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function parseISODate(iso: string): Date | null {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}
