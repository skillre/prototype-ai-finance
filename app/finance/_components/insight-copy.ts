import type { Messages } from "@/lib/i18n"
import type { FinanceInsight } from "@/lib/finance-insights"
import { formatCurrency, formatCurrencyCompact, formatRatio } from "@/lib/format"

/**
 * 洞察 → 中文。
 *
 * 这一层只做一件事：把 `lib/finance-insights.ts` 算出来的**结构化事实**
 * 翻译成词典里的模板。金额在这里统一格式化（万元紧凑），因此所有页面上
 * 同一个数字的写法完全一致。
 *
 * 事实由代码给出，措辞由词典给出——换掉数据，句子自己会变。
 */
export function insightTitle(t: Messages, insight: FinanceInsight): string {
  return t.finance.insight.kind[insight.kind].title
}

export function insightAction(t: Messages, insight: FinanceInsight): string {
  return t.finance.insight.kind[insight.kind].action
}

export function insightSentence(t: Messages, insight: FinanceInsight): string {
  const facts = insight.facts
  const compact = formatCurrencyCompact

  switch (facts.kind) {
    case "category-spike":
      return t.finance.insight.kind["category-spike"].sentence({
        category: facts.category,
        monthLabel: facts.monthLabel,
        amount: compact(facts.amount),
        previousAmount: compact(facts.previousAmount),
        deltaPct: facts.deltaPct,
      })
    case "budget-overrun":
      return t.finance.insight.kind["budget-overrun"].sentence({
        quarterLabel: facts.quarterLabel,
        count: facts.count,
        overrun: compact(facts.overrun),
        worst: {
          name: facts.worst.name,
          usage: facts.worst.usage,
          overrun: compact(facts.worst.overrun),
        },
      })
    case "receivables-risk":
      return t.finance.insight.kind["receivables-risk"].sentence({
        openTotal: compact(facts.openTotal),
        overdueCount: facts.overdueCount,
        overdueTotal: compact(facts.overdueTotal),
        oldest: {
          customer: facts.oldest.customer,
          days: facts.oldest.days,
          amount: compact(facts.oldest.amount),
        },
      })
    case "cash-pressure":
      return t.finance.insight.kind["cash-pressure"].sentence({
        runwayMonths: Number(formatRatio(facts.runwayMonths)),
        burn: compact(facts.burn),
        floorDateLabel: facts.floorDateLabel,
      })
    case "cost-opportunity":
      return t.finance.insight.kind["cost-opportunity"].sentence({
        category: facts.category,
        cutPct: facts.cutPct,
        monthlySaving: compact(facts.monthlySaving),
        runwayNow: Number(formatRatio(facts.runwayNow)),
        runwayAfter: Number(formatRatio(facts.runwayAfter)),
      })
    case "vendor-concentration":
      return t.finance.insight.kind["vendor-concentration"].sentence({
        vendor: facts.vendor,
        category: facts.category,
        sharePct: facts.sharePct,
        amount: compact(facts.amount),
      })
    case "runway-scenario":
      return t.finance.insight.kind["runway-scenario"].sentence({
        runwayMonths: Number(formatRatio(facts.runwayMonths)),
        baselineRunway: Number(formatRatio(facts.baselineRunway)),
        deltaMonths: facts.deltaMonths,
        floorDateLabel: facts.floorDateLabel,
      })
  }
}

/** 影响金额的展示口径：一句话结论里出现的金额都走万元紧凑写法。 */
export const insightImpact = (value: number): string => formatCurrencyCompact(value)

/** 大额场景（发票详情）用全精度。 */
export const insightExact = (value: number): string => formatCurrency(value)
