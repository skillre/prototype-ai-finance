"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, ArrowUpRightIcon, MinusIcon, TrendingDownIcon } from "lucide-react"
import { OpenSection } from "@/components/prototype/open-section"
import { SectionHeading } from "@/components/prototype/section-heading"
import { EmptyState } from "@/components/prototype/empty-state"
import { useMessages } from "@/components/i18n/locale-provider"
import {
  BUDGET,
  DATA_SCOPE,
  RECEIVABLES_SUMMARY,
  selectAccountSummary,
  selectRecentTransactions,
  selectTrend,
} from "@/lib/finance-metrics"
import { selectExecutiveFacts } from "@/lib/finance-insights"
import {
  formatCurrency,
  formatCurrencyCompact,
  formatRatio,
  formatSignedPercent,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import { categoryName, useFinanceStore } from "@/stores/finance-store"

/**
 * 总览页的记录层与口径层。
 *
 * 顺序即重量：Hero（跑道）→ 洞察（产品说的话）→ 本月结论 → 账户与超支
 * → 最近交易 → 数据口径。越往下越接近"账本原貌"。
 */

/* -------------------------------------------------------------------------- */
/* 本月结论 —— 一句话结论，句子由事实拼出来                                      */
/* -------------------------------------------------------------------------- */

export function MonthlyBrief() {
  const t = useMessages()
  const facts = useMemo(() => selectExecutiveFacts(), [])
  const brief = t.finance.insight.brief

  const lines = [
    brief.line1({
      monthLabel: facts.monthLabel,
      revenue: formatCurrencyCompact(facts.revenue),
      expense: formatCurrencyCompact(facts.expense),
      net: formatCurrencyCompact(Math.abs(facts.net)),
    }),
    brief.line2({
      cash: formatCurrencyCompact(facts.cash),
      runwayMonths: Number(formatRatio(facts.runwayMonths)),
    }),
    brief.line3({
      overBudgetCount: facts.overBudgetCount,
      overdueCount: facts.highRiskCount,
      overdueTotal: formatCurrencyCompact(facts.overdueTotal),
    }),
    brief.line4({ forecastEnding: formatCurrencyCompact(facts.forecastEnding) }),
  ]

  return (
    <div data-testid="monthly-brief">
      <OpenSection
        ambient="wash"
        className="-mx-4 px-4 py-5 sm:-mx-6 sm:px-6"
        contentClassName="flex flex-col gap-3.5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <span className="eyebrow text-muted-foreground/60">
            <span aria-hidden className="section-tick" />
            {brief.title}
          </span>
          <span className="text-label text-muted-foreground">{brief.generatedFrom}</span>
        </div>

        <ul className="flex flex-col gap-2">
          {lines.map((line, index) => (
            <li key={index} className="flex gap-3 text-body text-pretty text-foreground/85">
              <span aria-hidden className="mt-[0.55em] size-1 shrink-0 rounded-full bg-brand/60" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </OpenSection>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 账户与余额                                                                  */
/* -------------------------------------------------------------------------- */

export function AccountBalances({ className }: { className?: string }) {
  const t = useMessages()
  const router = useRouter()
  const accounts = useMemo(() => selectAccountSummary(), [])

  return (
    <div className={cn("flex flex-col gap-4", className)} data-testid="account-balances">
      <SectionHeading
        title={t.finance.overview.accountsTitle}
        description={t.finance.overview.accountsDescription}
        action={
          <button
            type="button"
            onClick={() => router.push("/finance/cashflow")}
            className="group/accounts inline-flex cursor-pointer items-center gap-1.5 rounded-field py-1 text-body-sm font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {t.finance.overview.goToCashflow}
            <ArrowRightIcon className="size-3.5 transition-transform duration-hover group-hover/accounts:translate-x-0.5" />
          </button>
        }
      />

      <ul className="flex flex-col">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="flex flex-col gap-2 border-t border-hairline py-3.5 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body font-medium">{account.name}</span>
                <span className="text-label text-muted-foreground">{account.bank}</span>
              </span>
              <span className="numeric text-body font-semibold">
                {formatCurrency(account.balance)}
              </span>
            </div>
            {/* 占比条：账户之间的大小关系用长度表达，而不是用第二个数字 */}
            <span className="flex items-center gap-3">
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-brand/70"
                  style={{ width: `${Math.max(2, account.share)}%` }}
                />
              </span>
              <span className="numeric w-12 shrink-0 text-right text-label text-muted-foreground">
                {account.share.toFixed(1)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 超支科目                                                                    */
/* -------------------------------------------------------------------------- */

export function OverBudgetCategories({ className }: { className?: string }) {
  const t = useMessages()
  const router = useRouter()
  const over = useMemo(() => BUDGET.rows.filter((row) => row.status === "over"), [])

  return (
    <div className={cn("flex flex-col gap-4", className)} data-testid="over-budget">
      <SectionHeading
        title={t.finance.overview.categoryTitle}
        description={t.finance.overview.categoryDescription}
        action={
          <button
            type="button"
            onClick={() => router.push("/finance/budget")}
            className="group/budget inline-flex cursor-pointer items-center gap-1.5 rounded-field py-1 text-body-sm font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {t.nav.budget}
            <ArrowRightIcon className="size-3.5 transition-transform duration-hover group-hover/budget:translate-x-0.5" />
          </button>
        }
      />

      {over.length === 0 ? (
        <EmptyState title={t.finance.budget.empty} />
      ) : (
        <ul className="flex flex-col">
          {over.map((row) => (
            <li key={row.id} className="border-t border-hairline first:border-t-0 first:pt-0">
              <button
                type="button"
                onClick={() => router.push(`/finance/analysis?category=${row.id}`)}
                data-testid={`over-budget-${row.id}`}
                className="group/row flex w-full cursor-pointer flex-col gap-2 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="text-body font-medium">{row.name}</span>
                    <span className="text-label text-muted-foreground">{row.department}</span>
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="numeric text-body font-semibold text-danger">
                      {formatRatio(row.usage)}%
                    </span>
                    <span className="numeric text-label text-muted-foreground">
                      {t.finance.budget.overrunAmount(formatCurrencyCompact(Math.abs(row.remaining)))}
                    </span>
                  </span>
                </span>
                <span className="h-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-danger/80"
                    style={{ width: `${Math.min(100, row.usage)}%` }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 最近交易                                                                    */
/* -------------------------------------------------------------------------- */

export function RecentTransactions({ limit = 8 }: { limit?: number }) {
  const t = useMessages()
  const router = useRouter()
  const openTransaction = useFinanceStore((s) => s.selectTransaction)
  const rows = useMemo(() => selectRecentTransactions(limit), [limit])

  return (
    <div className="flex flex-col gap-4" data-testid="recent-transactions">
      <SectionHeading
        title={t.finance.overview.recentTitle}
        description={t.finance.overview.recentDescription}
        action={
          <button
            type="button"
            onClick={() => router.push("/finance/transactions")}
            data-testid="recent-more"
            className="group/ledger inline-flex cursor-pointer items-center gap-1.5 rounded-field py-1 text-body-sm font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {t.finance.overview.goToLedger}
            <ArrowRightIcon className="size-3.5 transition-transform duration-hover group-hover/ledger:translate-x-0.5" />
          </button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState title={t.finance.overview.recentEmpty} />
      ) : (
        <ul className="flex flex-col">
          {rows.map((transaction) => (
            <li key={transaction.id} className="border-t border-hairline first:border-t-0">
              <button
                type="button"
                onClick={() => openTransaction(transaction.id)}
                data-testid={`recent-transaction-${transaction.id}`}
                className="group/tx flex w-full cursor-pointer items-center gap-3 py-3 text-left outline-none transition-colors duration-hover hover:bg-interactive/40 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="numeric w-[4.5rem] shrink-0 text-label text-muted-foreground">
                  {transaction.date.slice(5)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium">{transaction.counterparty}</span>
                  <span className="truncate text-label text-muted-foreground">
                    {categoryName(transaction.category)} · {transaction.memo}
                  </span>
                </span>
                <span
                  className={cn(
                    "numeric shrink-0 text-body font-semibold",
                    transaction.direction === "in" ? "text-success" : "text-foreground/85"
                  )}
                >
                  {transaction.direction === "in" ? "+" : "−"}
                  {formatCurrency(transaction.amount)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 数据口径                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 口径说明。
 *
 * 财务产品最容易失去信任的地方是"这个数字从哪来"。这里把账本覆盖的期间、
 * 记录条数、基准日与未落地的应收应付一次性说清楚——可信度本身就是设计。
 */
export function ScopeNote() {
  const t = useMessages()
  const scope = t.finance.scope

  const items = [
    scope.months(DATA_SCOPE.months),
    scope.transactions(DATA_SCOPE.transactionCount),
    scope.reference(DATA_SCOPE.referenceDate),
    scope.receivable(formatCurrencyCompact(RECEIVABLES_SUMMARY.total)),
    scope.payable(formatCurrencyCompact(DATA_SCOPE.scheduledPayables)),
    scope.transfer(formatCurrencyCompact(DATA_SCOPE.transferVolume)),
    scope.standard,
  ]

  return (
    <div className="flex flex-col gap-3" data-testid="scope-note">
      <span className="eyebrow text-muted-foreground/60">
        <span aria-hidden className="section-tick" />
        {scope.title}
      </span>
      <ul className="flex flex-wrap gap-x-6 gap-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-1.5 text-label text-muted-foreground">
            <span aria-hidden className="size-1 rounded-full bg-muted-foreground/40" />
            {item}
          </li>
        ))}
      </ul>
      <p className="text-label text-muted-foreground">{t.finance.transactions.transferHint}</p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 迷你走势：本月净现金 vs 上月                                                 */
/* -------------------------------------------------------------------------- */

export function CashTrendNote() {
  const trend = useMemo(() => selectTrend("cashNet", 6), [])
  const latest = trend[trend.length - 1]
  const previous = trend[trend.length - 2]
  const delta = previous === 0 ? 0 : ((latest - previous) / Math.abs(previous)) * 100
  const Icon = delta >= 0 ? ArrowUpRightIcon : delta < 0 ? TrendingDownIcon : MinusIcon

  return (
    <span
      className={cn(
        "numeric inline-flex items-center gap-1 text-label font-medium",
        delta >= 0 ? "text-success" : "text-danger"
      )}
      data-testid="cash-trend-note"
    >
      <Icon className="size-3" />
      {formatSignedPercent(delta)}
    </span>
  )
}
