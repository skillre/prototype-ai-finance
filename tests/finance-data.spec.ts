import { test, expect } from "@playwright/test"
import { auditLedger, ACCOUNT_BALANCES, RECEIVABLES, TRANSACTIONS, PAYABLES } from "../lib/finance-ledger"
import {
  BURN,
  CASH,
  FLOOR_CROSSING,
  FORECAST,
  MONTHLY,
  RECEIVABLES_SUMMARY,
  RUNWAY,
  BASE_ASSUMPTIONS,
  OPTIMIZED_ASSUMPTIONS,
  STRESS_ASSUMPTIONS,
  selectCashForecast,
  selectRunwayScenario,
} from "../lib/finance-metrics"
import { EXPENSE_CATEGORIES, CASH_FLOOR, REVENUE_LINES } from "../lib/finance-data"
import { selectInsights } from "../lib/finance-insights"

/**
 * 账本自洽性（data integrity）。
 *
 * 这一组测试不打开浏览器——它检查的是**财务产品的可信度前提**：
 * 同一份账本展开出来的每个数字之间必须对得上。任何一处对不上，
 * 页面上的数字就不再是"事实"，而只是"某个图表自己造的数"。
 *
 * 注意：这些是确定性的纯计算，因此这里断言的是**等式**，不是"大概接近"。
 */

test.describe("账本恒等式", () => {
  test("矩阵、流水、应收、应付四者对得上", () => {
    const audit = auditLedger()

    // 支出矩阵 = 已付供应商款 + 未付应付
    expect(audit.expensePayableDelta).toBe(0)
    // 收入矩阵 = 已收现金 + 未回款应收
    expect(audit.revenueReceivableDelta).toBe(0)
    // 内部调拨左右手互转，净额为 0
    expect(audit.transferNet).toBe(0)
  })

  test("账户期末余额 = 期初 + 全部收付", () => {
    const opening = ACCOUNT_BALANCES.reduce((sum, account) => sum + account.opening, 0)
    const net = CASH - opening
    const audit = auditLedger()
    expect(audit.netCashFlow).toBe(net)
    expect(audit.closingTotal).toBe(CASH)
    expect(ACCOUNT_BALANCES.reduce((sum, account) => sum + account.balance, 0)).toBe(CASH)
  })

  test("现金头寸落在 842 万，与第一视觉一致", () => {
    expect(CASH).toBe(8_420_000)
  })

  test("月度序列的期末现金收敛到现金头寸", () => {
    const last = MONTHLY[MONTHLY.length - 1]
    expect(last.closingCash).toBe(CASH)
  })

  test("每条收入线、每个科目都有 12 个月的完整矩阵", () => {
    for (const line of REVENUE_LINES) expect(line.monthly).toHaveLength(MONTHLY.length)
    for (const category of EXPENSE_CATEGORIES) expect(category.monthly).toHaveLength(MONTHLY.length)
  })

  test("应收是按账期规则生成的，状态与日期自洽", () => {
    expect(RECEIVABLES.length).toBeGreaterThan(24)
    for (const invoice of RECEIVABLES) {
      expect(invoice.amount).toBeGreaterThan(0)
      expect(invoice.dueDate > invoice.invoiceDate).toBe(true)
      if (invoice.status === "settled") {
        expect(invoice.settledDate).not.toBeNull()
      } else {
        expect(invoice.settledDate).toBeNull()
      }
      if (invoice.status === "overdue") expect(invoice.daysLate).toBeGreaterThan(0)
    }
  })

  test("应付账单要么已付、要么在排期中，且不早于开票日", () => {
    expect(PAYABLES.length).toBeGreaterThan(0)
    for (const bill of PAYABLES) {
      expect(bill.dueDate > bill.billDate).toBe(true)
      if (bill.status === "paid") expect(bill.paidDate).not.toBeNull()
      else expect(bill.paidDate).toBeNull()
    }
  })
})

test.describe("派生指标与账本一致", () => {
  test("跑道 = 现金 ÷ 近三个月月均净流出", () => {
    const tail = MONTHLY.slice(-3)
    const burn = -tail.reduce((sum, point) => sum + point.cashNet, 0) / tail.length
    expect(Math.abs(BURN - burn)).toBeLessThan(1)
    expect(Math.abs(RUNWAY - CASH / BURN)).toBeLessThan(0.01)
    // 与第一视觉的读数一致：14.8 个月
    expect(RUNWAY.toFixed(1)).toBe("14.8")
  })

  test("警戒线日期 = （现金 − 备付金）÷ 月均净流出", () => {
    const months = (CASH - CASH_FLOOR) / BURN
    expect(Math.abs(FLOOR_CROSSING.months - months)).toBeLessThan(0.01)
    expect(FLOOR_CROSSING.date.startsWith("2027-")).toBe(true)
  })

  test("应收汇总 = 全部未结清发票", () => {
    const open = RECEIVABLES.filter((invoice) => invoice.status !== "settled")
    const total = open.reduce((sum, invoice) => sum + invoice.amount, 0)
    expect(RECEIVABLES_SUMMARY.total).toBe(total)
    expect(RECEIVABLES_SUMMARY.open.length).toBe(open.length)
    const bucketSum = RECEIVABLES_SUMMARY.buckets.reduce((sum, bucket) => sum + bucket.amount, 0)
    expect(bucketSum).toBe(total)
  })

  test("90 天预测的期末现金 = 起点 + 各周净额之和", () => {
    const net = FORECAST.weeks.reduce((sum, week) => sum + week.net, 0)
    expect(FORECAST.ending).toBe(CASH + net)
    expect(FORECAST.net).toBe(net)
    expect(FORECAST.weeks).toHaveLength(13)
  })
})

test.describe("同输入同输出（确定性）", () => {
  test("同一套假设重复计算两次，结果完全一致", () => {
    const first = selectCashForecast(BASE_ASSUMPTIONS)
    const second = selectCashForecast(BASE_ASSUMPTIONS)
    expect(second.ending).toBe(first.ending)
    expect(second.monthlyBurn).toBe(first.monthlyBurn)
    expect(second.weeks.map((week) => week.closing)).toEqual(
      first.weeks.map((week) => week.closing)
    )
  })

  test("洞察清单是确定的，并且能随假设变化", () => {
    const base = selectInsights(BASE_ASSUMPTIONS).map((insight) => insight.id)
    const again = selectInsights(BASE_ASSUMPTIONS).map((insight) => insight.id)
    expect(again).toEqual(base)

    // 压力情景必须给出更短的跑道——否则"情景推演"就是装饰。
    const stress = selectRunwayScenario(STRESS_ASSUMPTIONS)
    const optimized = selectRunwayScenario(OPTIMIZED_ASSUMPTIONS)
    expect(stress.runway).toBeLessThan(RUNWAY)
    expect(optimized.runway).toBeGreaterThan(RUNWAY)
  })

  test("每条洞察都带事实、依据与真实去处", () => {
    const insights = selectInsights()
    expect(insights.length).toBeGreaterThanOrEqual(5)
    for (const insight of insights) {
      expect(insight.facts.kind).toBe(insight.kind)
      expect(insight.evidenceCount).toBeGreaterThan(0)
      expect(insight.confidence).toBeGreaterThan(80)
      expect(insight.confidence).toBeLessThanOrEqual(97)
      if (insight.target.kind === "route") {
        expect(insight.target.href.startsWith("/finance")).toBe(true)
      }
    }
  })

  test("洞察里提到的科目与金额都能在账本里找到出处", () => {
    const insights = selectInsights()
    const spike = insights.find((insight) => insight.kind === "category-spike")
    expect(spike).toBeDefined()
    if (spike && spike.facts.kind === "category-spike") {
      // 洞察指向的科目必须真的存在，且金额与矩阵里的当月发生额一致
      const facts = spike.facts
      const category = EXPENSE_CATEGORIES.find((item) => item.id === facts.categoryId)
      expect(category).toBeDefined()
      expect(facts.amount).toBe(category?.monthly[MONTHLY.length - 1])
      expect(facts.deltaPct).toBeGreaterThan(40)
    }

    // 每条流水都必须属于某条收入线或某个支出科目（内部调拨除外）
    const known = new Set([
      ...REVENUE_LINES.map((line) => line.id),
      ...EXPENSE_CATEGORIES.map((category) => category.id),
      "transfer",
    ])
    for (const transaction of TRANSACTIONS) {
      expect(known.has(transaction.category)).toBe(true)
    }
  })
})
