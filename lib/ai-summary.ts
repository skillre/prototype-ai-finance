/**
 * 确定性的 mock「AI 智能摘要」生成器。
 *
 * 刻意不调用任何真实 AI API：相同输入永远得到相同输出，便于演示与 Playwright
 * 断言。文案由客户自身的真实字段（status / value / tags / lastTouchHours /
 * notes）派生，因此看起来像是对这条记录的分析，而不是通用模板。
 */

import type { CrmCustomer } from "@/lib/crm-data"
import { formatCurrency, formatRelativeHours } from "@/lib/format"
import { messages as t } from "@/lib/i18n"

export interface AiSummary {
  /** 一句话结论。 */
  headline: string
  /** 3–4 条基于数据的关键信号。 */
  signals: string[]
  /** 建议的下一步动作。 */
  nextStep: string
  /** 0–100 的确定性置信度评分。 */
  confidence: number
  /** 展示用的模型标识（技术标识，不翻译）。 */
  model: string
}

/** 模拟推理耗时（毫秒）——store 用它驱动 loading 状态。 */
export const AI_SUMMARY_LATENCY = 1400

const MODEL_ID = "zhiwu-copilot-v2"

/** 确定性哈希——同样的 id 永远得到同样的"置信度"。 */
function hash(input: string): number {
  let acc = 0
  for (let i = 0; i < input.length; i += 1) {
    acc = (acc * 31 + input.charCodeAt(i)) % 100000
  }
  return acc
}

function ageInDays(createdAt: string): number {
  const created = new Date(`${createdAt}T00:00:00Z`).getTime()
  const now = new Date("2026-09-10T00:00:00Z").getTime()
  return Math.max(0, Math.round((now - created) / 86_400_000))
}

/** 自然语言化"多久以前"，避免出现"0 天前"这类生硬文案。 */
function relativeAge(createdAt: string): string {
  const g = t.aiSummary.generated
  const days = ageInDays(createdAt)
  if (days === 0) return g.ageToday
  if (days === 1) return g.ageYesterday
  if (days < 7) return g.ageDays(days)
  if (days < 14) return g.ageLastWeek
  if (days < 60) return g.ageWeeks(Math.round(days / 7))
  return g.ageMonths(Math.round(days / 30))
}

/** 触达间隔的自然语言化（当天创建的新客户不应显示"0 天"）。 */
function relativeTouch(hours: number): { phrase: string; days: number } {
  const g = t.aiSummary.generated
  const days = Math.round(hours / 24)
  if (hours < 1) return { phrase: g.touchJustNow, days: 0 }
  if (hours < 24) return { phrase: g.touchToday, days: 0 }
  if (days === 1) return { phrase: g.touchYesterday, days: 1 }
  return { phrase: formatRelativeHours(hours), days }
}

const HEADLINES: Record<CrmCustomer["status"], (c: CrmCustomer) => string> = {
  lead: (c) =>
    t.aiSummary.generated.headlineLead(
      c.company,
      relativeAge(c.createdAt),
      relativeTouch(c.lastTouchHours).phrase
    ),
  trial: (c) =>
    t.aiSummary.generated.headlineTrial(
      c.company,
      t.plan[c.plan],
      relativeAge(c.createdAt),
      formatCurrency(c.value)
    ),
  active: (c) =>
    t.aiSummary.generated.headlineActive(
      c.company,
      t.plan[c.plan],
      formatCurrency(c.value),
      relativeTouch(c.lastTouchHours).phrase
    ),
  "at-risk": (c) =>
    t.aiSummary.generated.headlineAtRisk(
      c.company,
      formatCurrency(c.value),
      relativeTouch(c.lastTouchHours).phrase
    ),
  churned: (c) => t.aiSummary.generated.headlineChurned(c.company, t.plan[c.plan]),
}

const NEXT_STEPS: Record<CrmCustomer["status"], (c: CrmCustomer) => string> = {
  lead: (c) => t.aiSummary.generated.nextStepLead(c.name),
  trial: (c) => t.aiSummary.generated.nextStepTrial(c.name, t.plan[c.plan]),
  active: (c) => t.aiSummary.generated.nextStepActive(c.name),
  "at-risk": (c) => t.aiSummary.generated.nextStepAtRisk(c.name),
  churned: (c) => t.aiSummary.generated.nextStepChurned(c.company),
}

/**
 * 由客户记录派生一份确定性摘要。相同客户 → 相同结果。
 */
export function buildAiSummary(customer: CrmCustomer): AiSummary {
  const signals: string[] = []

  const g = t.aiSummary.generated

  // 状态本身
  signals.push(g.signalStage(t.status[customer.status], t.plan[customer.plan]))

  // 金额
  signals.push(
    customer.value > 0
      ? g.signalValue(formatCurrency(customer.value))
      : g.signalNoValue
  )

  // 触达间隔
  const touch = relativeTouch(customer.lastTouchHours)
  signals.push(
    touch.days === 0
      ? g.signalTouchFresh
      : g.signalTouchStale(touch.days, touch.days > 30)
  )

  // 标签
  if (customer.tags.length > 0) {
    signals.push(g.signalTags(customer.tags.slice(0, 3).join("、")))
  }

  // 备注里的第一句
  const firstSentence = customer.notes.split(/(?<=[。！？])/)[0]
  if (firstSentence) {
    signals.push(g.signalNote(firstSentence))
  }

  const statusWeight: Record<CrmCustomer["status"], number> = {
    active: 24,
    trial: 16,
    lead: 8,
    "at-risk": -14,
    churned: -22,
  }
  const recencyPenalty = Math.min(30, Math.round(touch.days / 4))
  const confidence = Math.max(
    12,
    Math.min(97, 68 + statusWeight[customer.status] - recencyPenalty + (hash(customer.id) % 9))
  )

  return {
    headline: HEADLINES[customer.status](customer),
    signals: signals.slice(0, 4),
    nextStep: NEXT_STEPS[customer.status](customer),
    confidence,
    model: MODEL_ID,
  }
}
