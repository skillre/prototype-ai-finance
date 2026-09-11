import {
  ACCOUNT_BALANCES,
  CASH_POSITION,
  PAYABLES,
  RECEIVABLES,
  TRANSACTIONS,
  addDays,
  dayOfMonth,
  daysBetween,
  monthEnd,
  type CashTransaction,
  type ReceivableInvoice,
} from "./finance-ledger"
import {
  BURN_WINDOW_MONTHS,
  CASH_FLOOR,
  CUSTOMERS,
  EXPENSE_CATEGORIES,
  FORECAST_WEEKS,
  MONTHS,
  QUARTER_BUDGETS,
  REFERENCE_DATE,
  REFERENCE_MONTH,
  REVENUE_LINES,
  WORKSPACE,
  type ExpenseCategoryId,
  type MonthKey,
} from "./finance-data"

/**
 * 派生指标（derived metrics）。
 *
 * 这里是从 `finance-ledger` 的流水出发的**唯一**一层计算：月度序列、跑道、
 * 预算执行、账龄、异常、90 天现金预测。页面不自己算数字，只读这里的结果——
 * 于是"同一个金额在两个页面对不上"这件事在结构上就不可能发生。
 */

/* -------------------------------------------------------------------------- */
/* 常量再导出                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 页面有时需要原始口径常量（警戒线、预测周数、燃烧窗口）。
 * 从这一层统一再导出，视图就不必同时 import data 与 metrics 两个模块。
 */
export {
  BURN_WINDOW_MONTHS,
  CASH_FLOOR,
  CURRENCY,
  FORECAST_WEEKS,
  QUARTER_BUDGET,
  REFERENCE_DATE,
  REFERENCE_MONTH,
  WORKSPACE,
} from "./finance-data"

/* -------------------------------------------------------------------------- */
/* 月度序列                                                                    */
/* -------------------------------------------------------------------------- */

export interface MonthlyPoint {
  month: MonthKey
  /** "2026年9月" */
  label: string
  /** "9月" */
  shortLabel: string
  revenue: number
  expense: number
  /** 会计口径净额 = 收入 - 支出。 */
  net: number
  cashIn: number
  cashOut: number
  /** 现金口径净额 = 收付实现制，排除内部调拨。 */
  cashNet: number
  /** 月末现金余额。 */
  closingCash: number
  categories: Record<ExpenseCategoryId, number>
  lines: Record<string, number>
}

const EMPTY_CATEGORIES = () =>
  Object.fromEntries(EXPENSE_CATEGORIES.map((category) => [category.id, 0])) as Record<
    ExpenseCategoryId,
    number
  >

const monthLabel = (month: MonthKey) => `${month.slice(0, 4)}年${Number(month.slice(5))}月`
const monthShort = (month: MonthKey) => `${Number(month.slice(5))}月`

function buildMonthlySeries(): MonthlyPoint[] {
  let cash = ACCOUNT_BALANCES.reduce((sum, account) => sum + account.opening, 0)

  return MONTHS.map((month, index) => {
    const categories = EMPTY_CATEGORIES()
    const lines = Object.fromEntries(REVENUE_LINES.map((line) => [line.id, line.monthly[index]]))

    const revenue = REVENUE_LINES.reduce((sum, line) => sum + line.monthly[index], 0)
    const expense = EXPENSE_CATEGORIES.reduce((sum, category) => {
      categories[category.id] = category.monthly[index]
      return sum + category.monthly[index]
    }, 0)

    const monthTransactions = TRANSACTIONS.filter(
      (transaction) => transaction.month === month && transaction.kind !== "transfer"
    )
    const cashIn = monthTransactions
      .filter((transaction) => transaction.direction === "in")
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    const cashOut = monthTransactions
      .filter((transaction) => transaction.direction === "out")
      .reduce((sum, transaction) => sum + transaction.amount, 0)

    const cashNet = cashIn - cashOut
    cash += cashNet

    return {
      month,
      label: monthLabel(month),
      shortLabel: monthShort(month),
      revenue,
      expense,
      net: revenue - expense,
      cashIn,
      cashOut,
      cashNet,
      closingCash: cash,
      categories,
      lines,
    }
  })
}

/** 12 个月月度序列（含月末现金）。 */
export const MONTHLY: MonthlyPoint[] = buildMonthlySeries()

export const CURRENT_MONTH: MonthlyPoint = MONTHLY[MONTHLY.length - 1]
export const PREVIOUS_MONTH: MonthlyPoint = MONTHLY[MONTHLY.length - 2]

/** 现金头寸（截至基准日，来自账户余额）。 */
export const CASH: number = CASH_POSITION

/* -------------------------------------------------------------------------- */
/* 跑道与警戒线                                                                */
/* -------------------------------------------------------------------------- */

/** 近 N 个月平均月度**净现金流出**（正数表示净流出）。 */
export function selectBurn(window = BURN_WINDOW_MONTHS): number {
  const tail = MONTHLY.slice(-window)
  const net = tail.reduce((sum, point) => sum + point.cashNet, 0)
  return Math.max(0, -net / tail.length)
}

export const BURN = selectBurn()

/**
 * 现金跑道（月）= 现金 ÷ 月均净流出。
 * 这是"钱还能撑多久"，而不是"多久之后只剩一个空账户"。
 */
export function selectRunway(cash = CASH, burn = BURN): number {
  if (burn <= 0) return Number.POSITIVE_INFINITY
  return cash / burn
}

export const RUNWAY = selectRunway()

export interface FloorCrossing {
  /** 从现在算起几个月后现金低于警戒线。 */
  months: number
  /** 预计日期（ISO）。 */
  date: string
  /** 现金的"缓冲垫"：现金 - 警戒线。 */
  buffer: number
}

/**
 * 触及现金警戒线的时点。
 *
 * 警戒线是**运营备付金下限**：低于它，任何一笔意外支出都会打断工资发放。
 * 所以这里算的是（现金 - 警戒线）÷ 月均净流出，而不是现金 ÷ 月均净流出——
 * 后者会把"跑道"报得比真实安全感更长。
 */
export function selectFloorCrossing(
  cash = CASH,
  burn = BURN,
  floor = CASH_FLOOR
): FloorCrossing {
  const buffer = cash - floor
  if (burn <= 0) return { months: Number.POSITIVE_INFINITY, date: "—", buffer }
  const months = buffer / burn
  const days = Math.round(months * 30.4)
  return { months, date: addDays(REFERENCE_DATE, days), buffer }
}

export const FLOOR_CROSSING: FloorCrossing = selectFloorCrossing()

/* -------------------------------------------------------------------------- */
/* 现金流预测（未来 13 周 / 90 天）                                              */
/* -------------------------------------------------------------------------- */

/**
 * 预测假设。**全部是可解释的业务口径**，不是"调参凑数"：
 *   revenueFactor  —— 未来收入达成率（1 = 与最近三个月持平）
 *   costFactor     —— 成本系数（< 1 表示执行成本优化）
 *   collectionRate —— 应收回款率（1 = 全部按期回款）
 */
export interface Assumptions {
  revenueFactor: number
  costFactor: number
  collectionRate: number
}

export const BASE_ASSUMPTIONS: Assumptions = {
  revenueFactor: 1,
  costFactor: 1,
  collectionRate: 1,
}

/** 压力情景：收入打折、成本不变、回款变慢。 */
export const STRESS_ASSUMPTIONS: Assumptions = {
  revenueFactor: 0.86,
  costFactor: 1.02,
  collectionRate: 0.7,
}

/** 优化情景：不改收入，只把可控成本压下来并推动回款。 */
export const OPTIMIZED_ASSUMPTIONS: Assumptions = {
  revenueFactor: 1,
  costFactor: 0.94,
  collectionRate: 1.05,
}

export interface ForecastWeek {
  index: number
  /** "9月11日" 起始日。 */
  start: string
  end: string
  label: string
  inflow: number
  outflow: number
  net: number
  closing: number
  /** 压力情景下的期末现金。 */
  stress: number
  /** 优化情景下的期末现金。 */
  optimized: number
}

export interface CashForecast {
  weeks: ForecastWeek[]
  /** 期末（90 天）现金。 */
  ending: number
  /** 预测期内累计净额。 */
  net: number
  /** 预测期内的最低点。 */
  trough: { date: string; value: number }
  /** 是否在 90 天内触及警戒线。 */
  breachesFloor: boolean
  /** 需要多少周触及警戒线（未触及为 null）。 */
  breachWeek: number | null
  /** 预测口径的月度净流出（用于把跑道延伸出 90 天窗口）。 */
  monthlyBurn: number
  /** 假设下的跑道（月）。 */
  runway: number
  /** 假设下触及警戒线的日期。 */
  floorDate: string
}

/** 单个供应商的近期月度付款额——预测里的"经常性支出"就来自这里。 */
interface RecurringOutflow {
  counterparty: string
  category: string
  day: number
  monthly: number
  memo: string
}

function buildRecurringOutflows(): RecurringOutflow[] {
  const tail = MONTHS.slice(-BURN_WINDOW_MONTHS)
  const map = new Map<string, { total: number; category: string; memo: string; count: number }>()

  for (const transaction of TRANSACTIONS) {
    if (transaction.kind !== "expense" && transaction.kind !== "payable-settlement") continue
    if (!tail.includes(transaction.month)) continue
    const entry = map.get(transaction.counterparty) ?? {
      total: 0,
      category: transaction.category,
      memo: transaction.memo,
      count: 0,
    }
    entry.total += transaction.amount
    entry.count += 1
    map.set(transaction.counterparty, entry)
  }

  return [...map.entries()].map(([counterparty, entry]) => {
    // 记账日从数据里找不到（流水只有日期），从原始供应商定义里取。
    const day = Number(
      TRANSACTIONS.find((transaction) => transaction.counterparty === counterparty)?.date.slice(8) ??
        "15"
    )
    return {
      counterparty,
      category: entry.category,
      day,
      monthly: Math.round(entry.total / BURN_WINDOW_MONTHS),
      memo: entry.memo,
    }
  })
}

const RECURRING_OUTFLOWS = buildRecurringOutflows()

/**
 * 近 N 个月平均**经常性现金流入**。
 *
 * 只取 `kind === "revenue"`（当月实收的订阅与首款），**不包括**应收账款
 * 回款——那些在预测里由"在手发票的预计到账日"逐笔给出。两者若都算，
 * 同一笔钱会被预测两次。
 */
function trailingRecurringInflow(): number {
  const tail = MONTHS.slice(-BURN_WINDOW_MONTHS)
  const rows = TRANSACTIONS.filter(
    (transaction) => transaction.kind === "revenue" && tail.includes(transaction.month)
  )
  return rows.reduce((sum, transaction) => sum + transaction.amount, 0) / BURN_WINDOW_MONTHS
}

const RECURRING_INFLOW = trailingRecurringInflow()

/**
 * 90 天现金预测。
 *
 * 构成是**可以逐笔对回原始记录的**：
 *   • 流入 = 经常性收入（近三个月均值 × 收入系数）+ 该周内预计到账的应收
 *   • 流出 = 供应商周期性付款（按各自记账日 × 成本系数）+ 到期应付账款
 *
 * 其余两个情景（压力 / 优化）用同一套规则再算一遍，于是"稳妥区间"是一条
 * 由数据算出来的带，不是画上去的阴影。
 */
export function selectCashForecast(assumptions: Assumptions = BASE_ASSUMPTIONS): CashForecast {
  const windowEnd = addDays(REFERENCE_DATE, FORECAST_WEEKS * 7)

  /** 应收在该窗口内的预计到账日：账期 + 该客户的历史拖延天数。 */
  const expectedCollections = (rate: number) =>
    RECEIVABLES.filter((invoice) => invoice.status !== "settled")
      .map((invoice) => {
        const discipline = CUSTOMERS.find((c) => c.id === invoice.customerId)?.discipline ?? 0.8
        const lag = (invoice.status === "overdue" ? 6 : 0) + Math.round((1 - discipline) * 40)
        return { date: addDays(invoice.dueDate, lag), amount: invoice.amount * rate }
      })
      .filter((item) => item.date >= REFERENCE_DATE && item.date <= windowEnd)

  const scenarioWeeks = (current: Assumptions) => {
    const collections = expectedCollections(current.collectionRate)
    const weeklyRecurring = (RECURRING_INFLOW / 30.4) * 7 * current.revenueFactor
    let cash = CASH

    const weeks: ForecastWeek[] = []
    // 第 0 周的起点就在基准日上，因此每一周只覆盖"未来 7 天"。
    for (let index = 0; index < FORECAST_WEEKS; index += 1) {
      const start = addDays(REFERENCE_DATE, index * 7)
      const end = addDays(REFERENCE_DATE, (index + 1) * 7)

      const inflow =
        Math.round(weeklyRecurring) +
        Math.round(
          collections
            .filter((item) => item.date > start && item.date <= end)
            .reduce((sum, item) => sum + item.amount, 0)
        )

      const recurring = RECURRING_OUTFLOWS.filter((outflow) => {
        const date = dayInWindow(outflow.day, start, end)
        return date !== null
      }).reduce((sum, outflow) => sum + outflow.monthly, 0)

      const scheduled = PAYABLES.filter(
        (bill) => bill.status === "scheduled" && bill.dueDate > start && bill.dueDate <= end
      ).reduce((sum, bill) => sum + bill.amount, 0)

      const outflow = Math.round((recurring + scheduled) * current.costFactor)
      const net = inflow - outflow
      cash += net

      weeks.push({
        index,
        start,
        end,
        label: shortDate(start),
        inflow,
        outflow,
        net,
        closing: cash,
        stress: 0,
        optimized: 0,
      })
    }

    return weeks
  }

  const base = scenarioWeeks(assumptions)
  const stress = scenarioWeeks(STRESS_ASSUMPTIONS)
  const optimized = scenarioWeeks(OPTIMIZED_ASSUMPTIONS)

  const weeks = base.map((week, index) => ({
    ...week,
    stress: stress[index]?.closing ?? week.closing,
    optimized: optimized[index]?.closing ?? week.closing,
  }))

  const ending = weeks[weeks.length - 1]?.closing ?? CASH
  const trough = weeks.reduce(
    (lowest, week) => (week.closing < lowest.value ? { date: week.end, value: week.closing } : lowest),
    { date: REFERENCE_DATE, value: CASH }
  )

  const breach = weeks.find((week) => week.closing < CASH_FLOOR)
  /**
   * 预测期内的月度净流出——把跑道外推到 90 天窗口之外时用它。
   * 上界 120 个月：预测一旦"没有流出"，跑道在数学上就是无穷大，
   * 而界面上不该出现 "Infinity 个月" 这种答案。
   */
  const effectiveBurn = Math.min(
    12_000_000,
    Math.max(1, -weeks.reduce((sum, week) => sum + week.net, 0) / (FORECAST_WEEKS / 4.35))
  )

  const floorMonths = Math.max(0, Math.min(240, (CASH - CASH_FLOOR) / effectiveBurn))

  return {
    weeks,
    ending,
    net: ending - CASH,
    trough,
    breachesFloor: Boolean(breach),
    breachWeek: breach ? breach.index : null,
    monthlyBurn: Math.round(effectiveBurn),
    runway: effectiveBurn > 0 ? CASH / effectiveBurn : Number.POSITIVE_INFINITY,
    floorDate: addDays(REFERENCE_DATE, Math.round(floorMonths * 30.4)),
  }
}

export const FORECAST: CashForecast = selectCashForecast()

/** 落在 [start, end] 区间内的"某月第 day 天"。 */
function dayInWindow(day: number, start: string, end: string): string | null {
  const month = start.slice(0, 7) as MonthKey
  const candidate = dayOfMonth(month, day)
  if (candidate > start && candidate <= end) return candidate
  const nextMonth = addDays(end, 1).slice(0, 7)
  const fallback = dayOfMonth(nextMonth as MonthKey, day)
  if (fallback > start && fallback <= end) return fallback
  return null
}

/** "2026-09-11" → "9月11日"。 */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split("-")
  return `${Number(month)}月${Number(day)}日`
}

/** 分页（与 Factory 既有约定一致：纯函数、无状态）。 */
export function paginate<T>(rows: T[], page: number, pageSize = 12) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    rows: rows.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalPages,
    total: rows.length,
  }
}

/** "2026-09-11" → "2027年10月"。 */
export function monthLabelOf(iso: string): string {
  const [year, month] = iso.split("-")
  return `${year}年${Number(month)}月`
}

/* -------------------------------------------------------------------------- */
/* 支出结构                                                                    */
/* -------------------------------------------------------------------------- */

export interface CategorySlice {
  id: ExpenseCategoryId
  name: string
  department: string
  amount: number
  /** 占总支出的比例（0–100）。 */
  share: number
  /** 环比变化百分比（一位小数）。 */
  delta: number
}

/** 某个月的支出构成，按金额倒序。 */
export function selectCategorySlices(
  month: MonthKey = REFERENCE_MONTH,
  assumptionFactor = 1
): { slices: CategorySlice[]; total: number } {
  const index = MONTHS.indexOf(month)
  const previousIndex = Math.max(0, index - 1)

  const slices = EXPENSE_CATEGORIES.map((category) => {
    const amount = Math.round(category.monthly[index] * assumptionFactor)
    const previous = category.monthly[previousIndex]
    return {
      id: category.id,
      name: category.name,
      department: category.department,
      amount,
      share: 0,
      delta: previous > 0 ? Math.round(((amount - previous) / previous) * 1000) / 10 : 0,
    }
  }).sort((a, b) => b.amount - a.amount)

  const total = slices.reduce((sum, slice) => sum + slice.amount, 0)
  return {
    slices: slices.map((slice) => ({ ...slice, share: total === 0 ? 0 : (slice.amount / total) * 100 })),
    total,
  }
}

/* -------------------------------------------------------------------------- */
/* 收入结构                                                                    */
/* -------------------------------------------------------------------------- */

export interface RevenueSlice {
  id: string
  name: string
  amount: number
  share: number
  delta: number
  /** 同比/环比后的月度序列，用于迷你走势。 */
  trend: number[]
}

export function selectRevenueSlices(month: MonthKey = REFERENCE_MONTH): {
  slices: RevenueSlice[]
  total: number
} {
  const index = MONTHS.indexOf(month)
  const previousIndex = Math.max(0, index - 1)

  const slices = REVENUE_LINES.map((line) => {
    const amount = line.monthly[index]
    const previous = line.monthly[previousIndex]
    return {
      id: line.id,
      name: line.name,
      amount,
      share: 0,
      delta: previous > 0 ? Math.round(((amount - previous) / previous) * 1000) / 10 : 0,
      trend: line.monthly.slice(Math.max(0, index - 11), index + 1),
    }
  }).sort((a, b) => b.amount - a.amount)

  const total = slices.reduce((sum, slice) => sum + slice.amount, 0)
  return {
    slices: slices.map((slice) => ({ ...slice, share: total === 0 ? 0 : (slice.amount / total) * 100 })),
    total,
  }
}

/** 月度收入 / 支出 / 净额的迷你走势，供指标带使用。 */
export function selectTrend(key: "revenue" | "expense" | "net" | "cashNet", months = 12): number[] {
  return MONTHLY.slice(-months).map((point) => point[key])
}

/* -------------------------------------------------------------------------- */
/* 预算执行                                                                    */
/* -------------------------------------------------------------------------- */

export interface BudgetRow {
  id: ExpenseCategoryId
  name: string
  department: string
  budget: number
  actual: number
  /** 执行率（0–100+）。 */
  usage: number
  /** 剩余可用额度（可为负）。 */
  remaining: number
  status: "on-track" | "watch" | "over"
}

export interface BudgetSummary {
  rows: BudgetRow[]
  budget: number
  actual: number
  usage: number
  overCount: number
  /** 超支金额合计（正数）。 */
  overrun: number
}

/**
 * 季度预算执行。
 * 实际发生额 = 科目矩阵在季度内三个月的合计——与支出页、月度序列同源。
 */
export function selectBudgetExecution(quarter: MonthKey[] = MONTHS.slice(-3)): BudgetSummary {
  const indexes = quarter.map((month) => MONTHS.indexOf(month))

  const rows: BudgetRow[] = QUARTER_BUDGETS.map((entry) => {
    const category = EXPENSE_CATEGORIES.find((item) => item.id === entry.category)
    const actual = indexes.reduce(
      (sum, index) => sum + (category ? category.monthly[index] : 0),
      0
    )
    const usage = entry.amount === 0 ? 0 : (actual / entry.amount) * 100
    const status: BudgetRow["status"] = usage > 100 ? "over" : usage >= 92 ? "watch" : "on-track"
    return {
      id: entry.category,
      name: category?.name ?? entry.category,
      department: category?.department ?? "—",
      budget: entry.amount,
      actual,
      usage: Math.round(usage * 10) / 10,
      remaining: entry.amount - actual,
      status,
    }
  }).sort((a, b) => b.usage - a.usage)

  const budget = rows.reduce((sum, row) => sum + row.budget, 0)
  const actual = rows.reduce((sum, row) => sum + row.actual, 0)
  const overrun = rows
    .filter((row) => row.remaining < 0)
    .reduce((sum, row) => sum + Math.abs(row.remaining), 0)

  return {
    rows,
    budget,
    actual,
    usage: budget === 0 ? 0 : Math.round((actual / budget) * 1000) / 10,
    overCount: rows.filter((row) => row.status === "over").length,
    overrun,
  }
}

export const BUDGET: BudgetSummary = selectBudgetExecution()

/** 部门维度的预算（按部门汇总科目）。 */
export function selectDepartmentBudget(): { department: string; budget: number; actual: number; usage: number }[] {
  const map = new Map<string, { budget: number; actual: number }>()
  for (const row of BUDGET.rows) {
    const entry = map.get(row.department) ?? { budget: 0, actual: 0 }
    entry.budget += row.budget
    entry.actual += row.actual
    map.set(row.department, entry)
  }
  return [...map.entries()]
    .map(([department, entry]) => ({
      department,
      ...entry,
      usage: Math.round((entry.actual / entry.budget) * 1000) / 10,
    }))
    .sort((a, b) => b.usage - a.usage)
}

/* -------------------------------------------------------------------------- */
/* 应收账款                                                                    */
/* -------------------------------------------------------------------------- */

export type AgingBucketId = "not-due" | "d1-30" | "d31-60" | "d60-plus"

export interface AgingBucket {
  id: AgingBucketId
  amount: number
  count: number
  share: number
}

export interface ReceivablesSummary {
  open: ReceivableInvoice[]
  total: number
  overdueTotal: number
  overdueCount: number
  buckets: AgingBucket[]
  /** 风险敞口 = 金额 × (1 + 逾期天数 / 30) × (1.4 - 客户纪律)。 */
  atRisk: { invoice: ReceivableInvoice; score: number }[]
  /** 未来 30 天预计到账。 */
  dueSoon: number
}

export function selectReceivables(): ReceivablesSummary {
  const open = RECEIVABLES.filter((invoice) => invoice.status !== "settled")
  const total = open.reduce((sum, invoice) => sum + invoice.amount, 0)

  const bucketOf = (invoice: ReceivableInvoice): AgingBucketId => {
    if (invoice.status !== "overdue") return "not-due"
    if (invoice.daysLate <= 30) return "d1-30"
    if (invoice.daysLate <= 60) return "d31-60"
    return "d60-plus"
  }

  const bucketIds: AgingBucketId[] = ["not-due", "d1-30", "d31-60", "d60-plus"]
  const buckets = bucketIds.map((id) => {
    const rows = open.filter((invoice) => bucketOf(invoice) === id)
    const amount = rows.reduce((sum, invoice) => sum + invoice.amount, 0)
    return { id, amount, count: rows.length, share: total === 0 ? 0 : (amount / total) * 100 }
  })

  const withScore = open.map((invoice) => {
    const discipline = CUSTOMERS.find((c) => c.id === invoice.customerId)?.discipline ?? 0.8
    return {
      invoice,
      score:
        invoice.amount *
        (1 + invoice.daysLate / 30) *
        (1 + (1 - discipline)) *
        (invoice.status === "overdue" ? 1.4 : 0.6),
    }
  })
  withScore.sort((a, b) => b.score - a.score)

  const dueSoonLimit = addDays(REFERENCE_DATE, 30)

  return {
    open,
    total,
    overdueTotal: open
      .filter((invoice) => invoice.status === "overdue")
      .reduce((sum, invoice) => sum + invoice.amount, 0),
    overdueCount: open.filter((invoice) => invoice.status === "overdue").length,
    buckets,
    atRisk: withScore,
    dueSoon: open
      .filter((invoice) => invoice.dueDate <= dueSoonLimit && invoice.status !== "overdue")
      .reduce((sum, invoice) => sum + invoice.amount, 0),
  }
}

export const RECEIVABLES_SUMMARY: ReceivablesSummary = selectReceivables()

/**
 * 情景化的跑道。
 *
 * 这是签名交互背后的**唯一**一条公式：拖动"收入达成率 / 成本系数 / 回款率"
 * 时，跑道、警戒线日期、月度净流出全部由它重算——
 *
 *   月均净流出 = 近三个月月均现金流出 × 成本系数
 *              − 近三个月月均现金流入 × 收入达成率
 *              − (回款率 − 1) × 在手应收 ÷ 3
 *
 * 基准假设（1 / 1 / 1）下它就退化成"近三个月实际净流出"，因此基准读数与
 * 历史口径永远一致，不会出现"滑杆在中位、但跑道和历史对不上"的情况。
 */
export interface RunwayScenario {
  /** 月均净流出（≤0 表示净流入）。 */
  burn: number
  /** 现金跑道（月）= 现金 ÷ 月均净流出。 */
  runway: number
  /** 触及警戒线的月数。 */
  floorMonths: number
  floorDate: string
  monthlyInflow: number
  monthlyOutflow: number
  /** 与基准相比延长的月数（正数表示改善）。 */
  deltaMonths: number
}

export function selectRunwayScenario(
  assumptions: Assumptions,
  cash = CASH,
  floor = CASH_FLOOR
): RunwayScenario {
  const tail = MONTHLY.slice(-BURN_WINDOW_MONTHS)
  const monthlyOutflow =
    (tail.reduce((sum, point) => sum + point.cashOut, 0) / tail.length) * assumptions.costFactor
  const monthlyInflow =
    (tail.reduce((sum, point) => sum + point.cashIn, 0) / tail.length) * assumptions.revenueFactor
  const collectionLift =
    ((assumptions.collectionRate - 1) * RECEIVABLES_SUMMARY.total) / BURN_WINDOW_MONTHS

  const burn = monthlyOutflow - monthlyInflow - collectionLift
  const runway = burn <= 0 ? Number.POSITIVE_INFINITY : cash / burn
  const floorMonths = burn <= 0 ? Number.POSITIVE_INFINITY : (cash - floor) / burn
  const baselineBurn = Math.max(
    1,
    -tail.reduce((sum, point) => sum + point.cashNet, 0) / tail.length
  )

  return {
    burn,
    runway,
    floorMonths,
    floorDate: addDays(REFERENCE_DATE, floorMonths * 30.4),
    monthlyInflow,
    monthlyOutflow,
    deltaMonths: (runway === Number.POSITIVE_INFINITY ? 240 : runway) - cash / baselineBurn,
  }
}


/* -------------------------------------------------------------------------- */
/* 账户与交易对手                                                              */
/* -------------------------------------------------------------------------- */

export function selectAccountSummary() {
  return [...ACCOUNT_BALANCES]
    .map((account) => ({
      ...account,
      share: CASH === 0 ? 0 : (account.balance / CASH) * 100,
    }))
    .sort((a, b) => b.balance - a.balance)
}

export interface CounterpartyTotal {
  name: string
  amount: number
  count: number
  category: string
}

/** 按对手方汇总（支出默认口径：供应商付款）。 */
export function selectTopCounterparties(
  direction: "in" | "out" = "out",
  limit = 6,
  month?: MonthKey
): CounterpartyTotal[] {
  const rows = TRANSACTIONS.filter(
    (transaction) =>
      transaction.direction === direction &&
      transaction.kind !== "transfer" &&
      (!month || transaction.month === month)
  )

  const map = new Map<string, CounterpartyTotal>()
  for (const row of rows) {
    const entry = map.get(row.counterparty) ?? {
      name: row.counterparty,
      amount: 0,
      count: 0,
      category: row.category,
    }
    entry.amount += row.amount
    entry.count += 1
    map.set(row.counterparty, entry)
  }

  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, limit)
}

/* -------------------------------------------------------------------------- */
/* 交易检索                                                                    */
/* -------------------------------------------------------------------------- */

export interface TransactionFilters {
  search: string
  direction: "all" | "in" | "out"
  category: string
  accountId: string
  days: number
}

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = {
  search: "",
  direction: "all",
  category: "all",
  accountId: "all",
  days: 90,
}

/** 纯函数：筛选 + 排序，方便测试与复用。 */
export function selectTransactions(
  transactions: CashTransaction[],
  filters: TransactionFilters
): CashTransaction[] {
  const needle = filters.search.trim().toLowerCase()
  const since = addDays(REFERENCE_DATE, -filters.days)

  return transactions
    .filter((transaction) => {
      if (transaction.kind === "transfer" && filters.direction === "all" && false) return false
      if (transaction.date < since) return false
      if (filters.direction !== "all" && transaction.direction !== filters.direction) return false
      if (filters.category !== "all" && transaction.category !== filters.category) return false
      if (filters.accountId !== "all" && transaction.accountId !== filters.accountId) return false
      if (
        needle &&
        !`${transaction.counterparty} ${transaction.memo} ${transaction.voucher} ${transaction.category}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false
      }
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
}

/** 基准日之前的最近 N 天流水——总览的"最近交易"。 */
export function selectRecentTransactions(limit = 8): CashTransaction[] {
  return [...TRANSACTIONS]
    .filter((transaction) => transaction.date <= REFERENCE_DATE)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .slice(0, limit)
}

/** 某一天的流水（用于账本日历）。 */
export function selectTransactionsByMonth(month: MonthKey): CashTransaction[] {
  return TRANSACTIONS.filter((transaction) => transaction.month === month)
}

/* -------------------------------------------------------------------------- */
/* 数据口径说明                                                                */
/* -------------------------------------------------------------------------- */

export interface DataScope {
  workspace: typeof WORKSPACE
  months: number
  budgetQuarter: { from: MonthKey; to: MonthKey }
  transactionCount: number
  referenceDate: string
  /** 未回款应收 / 未付应付——"账上还有多少钱没到手"的答案。 */
  openReceivables: number
  scheduledPayables: number
  /** 内部调拨：说明它为什么不计入经营现金流。 */
  transferVolume: number
}

export const DATA_SCOPE: DataScope = {
  workspace: WORKSPACE,
  months: MONTHS.length,
  budgetQuarter: { from: MONTHS[MONTHS.length - 3], to: MONTHS[MONTHS.length - 1] },
  transactionCount: TRANSACTIONS.length,
  referenceDate: REFERENCE_DATE,
  openReceivables: RECEIVABLES_SUMMARY.total,
  scheduledPayables: PAYABLES.filter((bill) => bill.status === "scheduled").reduce(
    (sum, bill) => sum + bill.amount,
    0
  ),
  transferVolume: TRANSACTIONS.filter((transaction) => transaction.kind === "transfer").reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  ),
}

/** 基准月最后一天——用于"本月"这类文案。 */
export const MONTH_END: string = monthEnd(REFERENCE_MONTH)

/** 距基准日多少天（正数表示过去）。 */
export function daysAgo(iso: string): number {
  return daysBetween(iso, REFERENCE_DATE)
}
