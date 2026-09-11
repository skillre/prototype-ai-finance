import {
  BUDGET,
  CASH,
  FORECAST,
  MONTHLY,
  PREVIOUS_MONTH,
  CURRENT_MONTH,
  BURN,
  RUNWAY,
  FLOOR_CROSSING,
  RECEIVABLES_SUMMARY,
  selectRunwayScenario,
  selectTopCounterparties,
  type Assumptions,
} from "./finance-metrics"
import { CUSTOMERS, EXPENSE_CATEGORIES, REFERENCE_DATE } from "./finance-data"
import { monthLabelOf, BURN_WINDOW_MONTHS } from "./finance-metrics"

/**
 * AI 财务洞察层（deterministic derived insights）。
 *
 * **它不是聊天框**，也不调用任何外部模型：每一条洞察都是从账本里"算"出来的
 * 结构化事实，再由词典把它说成人话。同输入 → 同输出；换掉
 * `lib/finance-data.ts` 里的任何一个数字，句子里的科目、金额、百分比、
 * 月份、客户名都会跟着变。
 *
 * 每条洞察都带三样东西：
 *   • facts      —— 事实（金额、百分比、日期、实体名）
 *   • impact     —— 影响金额，决定排序（不是按"我觉得重要"排）
 *   • target     —— 一个**真实目的地**，点击就能落到出问题的记录上
 */

export type InsightSeverity = "high" | "medium" | "low"

export type InsightKind =
  | "category-spike"
  | "budget-overrun"
  | "receivables-risk"
  | "cash-pressure"
  | "cost-opportunity"
  | "vendor-concentration"
  | "runway-scenario"

export type InsightTarget =
  /** 去某个路由（可带筛选参数）。 */
  | { kind: "route"; href: string }
  /** 打开某一笔流水。 */
  | { kind: "transaction"; id: string }
  /** 打开某一张发票。 */
  | { kind: "invoice"; id: string }

export type InsightFacts =
  | {
      kind: "category-spike"
      categoryId: string
      category: string
      amount: number
      previousAmount: number
      deltaPct: number
      monthLabel: string
      /** 该科目里金额最高的几笔付款，用来解释"增长来自哪里"。 */
      drivers: { name: string; amount: number }[]
    }
  | {
      kind: "budget-overrun"
      count: number
      overrun: number
      budget: number
      actual: number
      usage: number
      worst: { name: string; usage: number; overrun: number }
      quarterLabel: string
    }
  | {
      kind: "receivables-risk"
      overdueTotal: number
      overdueCount: number
      openTotal: number
      oldest: { customer: string; days: number; amount: number; invoiceNumber: string; id: string }
      dueSoon: number
    }
  | {
      kind: "cash-pressure"
      runwayMonths: number
      floorMonths: number
      floorDate: string
      floorDateLabel: string
      burn: number
      cash: number
    }
  | {
      kind: "cost-opportunity"
      categoryId: string
      category: string
      monthlySaving: number
      cutPct: number
      runwayNow: number
      runwayAfter: number
      floorDateAfter: string
      floorDateAfterLabel: string
    }
  | {
      kind: "vendor-concentration"
      vendor: string
      categoryId: string
      category: string
      sharePct: number
      amount: number
      alternatives: number
    }
  | {
      kind: "runway-scenario"
      runwayMonths: number
      baselineRunway: number
      deltaMonths: number
      burn: number
      floorDate: string
      floorDateLabel: string
      assumption: Assumptions
    }

export interface FinanceInsight {
  id: string
  kind: InsightKind
  severity: InsightSeverity
  /** 影响金额（元）：越大越靠前。 */
  impact: number
  /** 确定性置信度 84–97：由样本量、异常幅度与证据条数决定，不是随机数。 */
  confidence: number
  facts: InsightFacts
  target: InsightTarget
  /** 支撑这条结论的记录数——界面上用它说明"结论有多厚"。 */
  evidenceCount: number
}

const severityRank: Record<InsightSeverity, number> = { high: 0, medium: 1, low: 2 }

/* -------------------------------------------------------------------------- */
/* 1. 科目异常增长                                                             */
/* -------------------------------------------------------------------------- */

/** 环比增长超过这个比例、且金额足够大，才算"异常"，而不是正常波动。 */
const SPIKE_THRESHOLD = 0.4
const SPIKE_MIN_AMOUNT = 150_000

function categorySpikes(): FinanceInsight[] {
  const index = MONTHLY.length - 1
  const previousIndex = index - 1
  const drivers = selectTopCounterparties("out", 3, CURRENT_MONTH.month)

  return EXPENSE_CATEGORIES.flatMap((category) => {
    const amount = category.monthly[index]
    const previous = category.monthly[previousIndex]
    if (previous <= 0 || amount < SPIKE_MIN_AMOUNT) return []
    const ratio = (amount - previous) / previous
    if (ratio < SPIKE_THRESHOLD) return []

    const categoryDrivers = drivers
      .filter((driver) => driver.category === category.id)
      .map((driver) => ({ name: driver.name, amount: driver.amount }))

    return [
      {
        id: `spike-${category.id}-${CURRENT_MONTH.month}`,
        kind: "category-spike" as const,
        severity: "high" as const,
        impact: amount - previous,
        confidence: Math.min(96, 86 + Math.round(ratio * 8)),
        evidenceCount: categoryDrivers.length + 1,
        facts: {
          kind: "category-spike" as const,
          categoryId: category.id,
          category: category.name,
          amount,
          previousAmount: previous,
          deltaPct: Math.round(ratio * 1000) / 10,
          monthLabel: CURRENT_MONTH.label,
          drivers: categoryDrivers,
        },
        target: { kind: "route" as const, href: `/finance/analysis?category=${category.id}` },
      },
    ]
  })
}

/* -------------------------------------------------------------------------- */
/* 2. 预算超支                                                                 */
/* -------------------------------------------------------------------------- */

function budgetOverrun(): FinanceInsight[] {
  const over = BUDGET.rows.filter((row) => row.status === "over")
  if (over.length === 0) return []

  const worst = over.reduce((max, row) => (row.usage > max.usage ? row : max), over[0])
  const quarterLabel = `${MONTHLY[MONTHLY.length - 3].label} – ${CURRENT_MONTH.label}`

  return [
    {
      id: `budget-overrun-${over.length}`,
      kind: "budget-overrun",
      severity: over.length >= 3 ? "high" : "medium",
      impact: BUDGET.overrun,
      confidence: Math.min(97, 88 + over.length * 2),
      evidenceCount: over.length,
      facts: {
        kind: "budget-overrun",
        count: over.length,
        overrun: BUDGET.overrun,
        budget: BUDGET.budget,
        actual: BUDGET.actual,
        usage: BUDGET.usage,
        worst: { name: worst.name, usage: worst.usage, overrun: Math.abs(worst.remaining) },
        quarterLabel,
      },
      target: { kind: "route", href: "/finance/budget" },
    },
  ]
}

/* -------------------------------------------------------------------------- */
/* 3. 回款风险                                                                 */
/* -------------------------------------------------------------------------- */

function receivablesRisk(): FinanceInsight[] {
  const { overdueTotal, overdueCount, open, atRisk, dueSoon, total } = RECEIVABLES_SUMMARY
  if (overdueCount === 0) return []

  const oldest = [...open]
    .filter((invoice) => invoice.status === "overdue")
    .sort((a, b) => b.daysLate - a.daysLate || b.amount - a.amount)[0]
  const topRisk = atRisk[0]?.invoice ?? oldest

  return [
    {
      id: `receivables-risk-${overdueCount}`,
      kind: "receivables-risk",
      severity: overdueTotal > 400_000 ? "high" : "medium",
      impact: overdueTotal,
      confidence: Math.min(95, 84 + overdueCount * 2 + Math.round(overdueTotal / 200_000)),
      evidenceCount: overdueCount,
      facts: {
        kind: "receivables-risk",
        overdueTotal,
        overdueCount,
        openTotal: total,
        oldest: {
          customer: oldest.customerName,
          days: oldest.daysLate,
          amount: oldest.amount,
          invoiceNumber: oldest.number,
          id: oldest.id,
        },
        dueSoon,
      },
      target: { kind: "invoice", id: topRisk.id },
    },
  ]
}

/* -------------------------------------------------------------------------- */
/* 4. 现金流压力                                                               */
/* -------------------------------------------------------------------------- */

function cashPressure(): FinanceInsight[] {
  const months = RUNWAY
  const severity: InsightSeverity = months < 12 ? "high" : months < 24 ? "medium" : "low"
  if (!Number.isFinite(months)) return []

  return [
    {
      id: "cash-pressure",
      kind: "cash-pressure",
      severity,
      impact: months < 24 ? CASH / Math.max(1, months) : 0,
      confidence: 92,
      evidenceCount: BURN_WINDOW_MONTHS * 2,
      facts: {
        kind: "cash-pressure",
        runwayMonths: months,
        floorMonths: FLOOR_CROSSING.months,
        floorDate: FLOOR_CROSSING.date,
        floorDateLabel: monthLabelOf(FLOOR_CROSSING.date),
        burn: BURN,
        cash: CASH,
      },
      target: { kind: "route", href: "/finance/cashflow" },
    },
  ]
}

/* -------------------------------------------------------------------------- */
/* 5. 成本优化机会                                                             */
/* -------------------------------------------------------------------------- */

/** 可优化科目：人力与财税是"承诺"，云、工具、市场、差旅才是可动的。 */
const CONTROLLABLE: string[] = ["software", "marketing", "travel", "procurement", "infrastructure"]

/** 目标压降比例：以最近一个月的实际发生额为基数。 */
const CUT_RATIO = 0.12

function costOpportunity(assumptions: Assumptions): FinanceInsight[] {
  const index = MONTHLY.length - 1
  const candidates = EXPENSE_CATEGORIES.filter((category) => CONTROLLABLE.includes(category.id))
  if (candidates.length === 0) return []

  const target = candidates.reduce((max, category) =>
    category.monthly[index] > max.monthly[index] ? category : max
  )
  const monthlySaving = Math.round(target.monthly[index] * CUT_RATIO)

  // 真实推演：把成本压下来之后，跑道与警戒线日期会变成什么样。
  const after = selectRunwayScenario({
    ...assumptions,
    costFactor: assumptions.costFactor * (1 - CUT_RATIO * (target.monthly[index] / averageOutflow())),
  })

  return [
    {
      id: `cost-opportunity-${target.id}`,
      kind: "cost-opportunity",
      severity: "medium",
      impact: monthlySaving * 6,
      confidence: 89,
      evidenceCount: BURN_WINDOW_MONTHS,
      facts: {
        kind: "cost-opportunity",
        categoryId: target.id,
        category: target.name,
        monthlySaving,
        cutPct: Math.round(CUT_RATIO * 100),
        runwayNow: RUNWAY,
        runwayAfter: after.runway,
        floorDateAfter: after.floorDate,
        floorDateAfterLabel: monthLabelOf(after.floorDate),
      },
      target: { kind: "route", href: `/finance/analysis?category=${target.id}` },
    },
  ]
}

/** 近三个月的月均现金流出——把"科目压降"换算成整体的成本系数变化。 */
function averageOutflow(): number {
  const tail = MONTHLY.slice(-BURN_WINDOW_MONTHS)
  return tail.reduce((sum, point) => sum + point.cashOut, 0) / tail.length
}

/* -------------------------------------------------------------------------- */
/* 6. 供应商集中度                                                             */
/* -------------------------------------------------------------------------- */

/** 单一供应商占科目支出超过这个比例就算集中风险。 */
const CONCENTRATION_THRESHOLD = 45

function vendorConcentration(): FinanceInsight[] {
  const index = MONTHLY.length - 1

  return selectTopCounterparties("out", 20, CURRENT_MONTH.month).flatMap((entry) => {
    const category = EXPENSE_CATEGORIES.find((item) => item.id === entry.category)
    if (!category || category.monthly[index] < SPIKE_MIN_AMOUNT) return []

    const sharePct = Math.round((entry.amount / category.monthly[index]) * 1000) / 10
    if (sharePct < CONCENTRATION_THRESHOLD) return []

    return [
      {
        id: `concentration-${category.id}`,
        kind: "vendor-concentration" as const,
        severity: "low" as const,
        impact: entry.amount * 0.1,
        confidence: 87,
        evidenceCount: 1,
        facts: {
          kind: "vendor-concentration" as const,
          vendor: entry.name,
          categoryId: category.id,
          category: category.name,
          sharePct,
          amount: entry.amount,
          alternatives: 0,
        },
        target: { kind: "route" as const, href: `/finance/analysis?category=${category.id}` },
      },
    ]
  })
}

/* -------------------------------------------------------------------------- */
/* 7. 情景洞察（随假设实时重算）                                                 */
/* -------------------------------------------------------------------------- */

function runScenarioInsight(assumptions: Assumptions): FinanceInsight | null {
  const scenario = selectRunwayScenario(assumptions)
  const delta = scenario.runway - RUNWAY
  if (!Number.isFinite(scenario.runway) || Math.abs(delta) < 0.4) return null

  return {
    id: "runway-scenario",
    kind: "runway-scenario",
    severity: delta < 0 ? "high" : "low",
    impact: Math.abs(delta) * scenario.burn,
    confidence: 90,
    evidenceCount: FORECAST.weeks.length,
    facts: {
      kind: "runway-scenario",
      runwayMonths: scenario.runway,
      baselineRunway: RUNWAY,
      deltaMonths: delta,
      burn: scenario.burn,
      floorDate: scenario.floorDate,
      floorDateLabel: monthLabelOf(scenario.floorDate),
      assumption: assumptions,
    },
    target: { kind: "route", href: "/finance/cashflow" },
  }
}

/* -------------------------------------------------------------------------- */
/* 汇总                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 全部洞察，按严重度 + 影响金额排序。
 * 传入假设时，情景洞察会插到最前面——用户拖动滑杆之后，最该看到的是
 * "你刚刚把跑道改成了什么"，而不是别的。
 */
export function selectInsights(assumptions?: Assumptions): FinanceInsight[] {
  const list = [
    ...(assumptions ? [runScenarioInsight(assumptions)].filter(Boolean) : []),
    ...categorySpikes(),
    ...budgetOverrun(),
    ...receivablesRisk(),
    ...cashPressure(),
    ...costOpportunity(assumptions ?? BASE_FOR_INSIGHTS),
    ...vendorConcentration(),
  ] as FinanceInsight[]

  return list.sort((a, b) => {
    const bySeverity = severityRank[a.severity] - severityRank[b.severity]
    if (bySeverity !== 0) return bySeverity
    return b.impact - a.impact
  })
}

const BASE_FOR_INSIGHTS: Assumptions = {
  revenueFactor: 1,
  costFactor: 1,
  collectionRate: 1,
}

export interface InsightOverview {
  total: number
  high: number
  medium: number
  low: number
  /** 高优先级洞察的影响金额合计。 */
  exposure: number
  /** 依据的记录条数合计。 */
  evidence: number
}

export function summariseInsights(insights: FinanceInsight[]): InsightOverview {
  return {
    total: insights.length,
    high: insights.filter((insight) => insight.severity === "high").length,
    medium: insights.filter((insight) => insight.severity === "medium").length,
    low: insights.filter((insight) => insight.severity === "low").length,
    exposure: insights
      .filter((insight) => insight.severity !== "low")
      .reduce((sum, insight) => sum + insight.impact, 0),
    evidence: insights.reduce((sum, insight) => sum + insight.evidenceCount, 0),
  }
}

/* -------------------------------------------------------------------------- */
/* 一句话结论                                                                  */
/* -------------------------------------------------------------------------- */

export interface ExecutiveFacts {
  monthLabel: string
  revenue: number
  expense: number
  net: number
  revenueDeltaPct: number
  expenseDeltaPct: number
  cash: number
  runwayMonths: number
  forecastEnding: number
  forecastNet: number
  highRiskCount: number
  overBudgetCount: number
  overdueTotal: number
  referenceDate: string
}

/**
 * 管理层摘要的**事实**。
 * 措辞在词典里（`t.finance.insight.brief.*`），这里只给数字——
 * 于是摘要也是一句"算出来的"话，而不是写死的欢迎语。
 */
export function selectExecutiveFacts(): ExecutiveFacts {
  const revenueDelta =
    PREVIOUS_MONTH.revenue === 0
      ? 0
      : ((CURRENT_MONTH.revenue - PREVIOUS_MONTH.revenue) / PREVIOUS_MONTH.revenue) * 100
  const expenseDelta =
    PREVIOUS_MONTH.expense === 0
      ? 0
      : ((CURRENT_MONTH.expense - PREVIOUS_MONTH.expense) / PREVIOUS_MONTH.expense) * 100

  return {
    monthLabel: CURRENT_MONTH.label,
    revenue: CURRENT_MONTH.revenue,
    expense: CURRENT_MONTH.expense,
    net: CURRENT_MONTH.cashNet,
    revenueDeltaPct: Math.round(revenueDelta * 10) / 10,
    expenseDeltaPct: Math.round(expenseDelta * 10) / 10,
    cash: CASH,
    runwayMonths: RUNWAY,
    forecastEnding: FORECAST.ending,
    forecastNet: FORECAST.net,
    highRiskCount: RECEIVABLES_SUMMARY.overdueCount,
    overBudgetCount: BUDGET.overCount,
    overdueTotal: RECEIVABLES_SUMMARY.overdueTotal,
    referenceDate: REFERENCE_DATE,
  }
}

/** 客户回款纪律——应收风险排序的解释项，页面用它给"风险"一个由头。 */
export function customerDiscipline(customerId: string): number {
  return CUSTOMERS.find((customer) => customer.id === customerId)?.discipline ?? 0.8
}
