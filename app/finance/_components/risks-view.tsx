"use client"

import { useMemo, useState } from "react"
import { ArrowUpRightIcon, TriangleAlertIcon } from "lucide-react"
import { useMessages } from "@/components/i18n/locale-provider"
import { AnimatedNumber } from "@/components/motion/animated-number"
import { EmptyState } from "@/components/prototype/empty-state"
import { OpenSection } from "@/components/prototype/open-section"
import { SectionHeading } from "@/components/prototype/section-heading"
import { Button } from "@/components/ui/button"
import { EXPENSE_CATEGORIES } from "@/lib/finance-data"
import { TRANSACTIONS, type CashTransaction, type ReceivableInvoice } from "@/lib/finance-ledger"
import {
  BUDGET,
  CURRENT_MONTH,
  MONTHLY,
  PREVIOUS_MONTH,
  RECEIVABLES_SUMMARY,
  type AgingBucketId,
} from "@/lib/finance-metrics"
import {
  formatCurrency,
  formatCurrencyCompact,
  formatISODate,
  formatPercent1,
  formatSignedPercent,
} from "@/lib/format"
import { durations } from "@/lib/motion-presets"
import { categoryName } from "@/stores/finance-store"
import { cn } from "@/lib/utils"

/**
 * 风险与异常 —— 一条主线的四个切口。
 *
 *   1. L1 —— 风险敞口合计（金额 × 逾期系数 × 客户回款纪律），逾期口径挂在
 *      同一条 hairline 上。敞口是**推出来的**：换掉账本里的金额或客户的
 *      回款纪律，这个数字自己会变。
 *   2. 应收账龄 —— 一条构成条 + 可点击图例，图例是真的筛选器：点一个桶，
 *      下面的敞口清单立刻只剩那个桶的发票。
 *   3. 风险敞口清单 / 异常支出 —— 记录层：前者按敞口排序，后者在组件里
 *      现算（单笔超过同科目近 6 个月均值 2.5 倍），两处每一行都能点进账本。
 *   4. 科目异动 + 预算超支 —— 1.2fr : 0.8fr 的双栏，各自是真实入口。
 *
 * 全部推导都是确定性的：没有随机数、没有联网、同输入同输出。
 */

/** 单笔付款超过同科目近 6 个月均值的这个倍数，才算"异常支出"。 */
const ANOMALY_RATIO = 2.5
/** 均值的统计窗口（月）。 */
const ANOMALY_WINDOW_MONTHS = 6
/** 异常支出默认展示条数，其余靠"展开"按钮放出来。 */
const ANOMALY_PREVIEW = 8
/** 敞口清单的条数——风险页是"最先处理哪几笔"，不是完整应收台账。 */
const EXPOSURE_PREVIEW = 8
/** 科目异动的门槛：环比增长超过这个百分比才上榜。 */
const SPIKE_THRESHOLD_PCT = 20

/** 账龄分桶的语气：未到期=品牌色，逾期越久越重，60 天以上直接危险色。 */
const BUCKET_TONE: Record<AgingBucketId, string> = {
  "not-due": "bg-brand/45",
  "d1-30": "bg-warning",
  "d31-60": "bg-danger/70",
  "d60-plus": "bg-danger",
}

const BUCKET_DOT: Record<AgingBucketId, string> = {
  "not-due": "bg-brand/60",
  "d1-30": "bg-warning",
  "d31-60": "bg-danger/70",
  "d60-plus": "bg-danger",
}

/** 敞口条的语气：逾期 60 天以上最重，30 天内次之，未到期用品牌色。 */
const SEVERITY_TONE = {
  high: { chip: "bg-danger-soft text-danger", bar: "bg-danger" },
  medium: { chip: "bg-warning-soft text-warning", bar: "bg-warning" },
} as const

/** 与 `selectReceivables()` 里的分桶规则保持一致——页面不另立口径。 */
function agingBucketOf(invoice: ReceivableInvoice): AgingBucketId {
  if (invoice.status !== "overdue") return "not-due"
  if (invoice.daysLate <= 30) return "d1-30"
  if (invoice.daysLate <= 60) return "d31-60"
  return "d60-plus"
}

function severityOf(invoice: ReceivableInvoice): "high" | "medium" | null {
  if (invoice.status !== "overdue") return null
  return invoice.daysLate > 30 ? "high" : "medium"
}

interface AnomalyRow {
  transaction: CashTransaction
  /** 同科目近 6 个月的单笔均值。 */
  average: number
  /** 超出均值的金额（正数）。 */
  excess: number
  ratio: number
}

export function RisksView({
  onOpenInvoice,
  onOpenCategory,
  onOpenBudget,
}: {
  /** 打开一张应收发票（详情抽屉由外壳承载） */
  onOpenInvoice: (invoiceId: string) => void
  /** 跳到按科目筛选的收支分析 */
  onOpenCategory: (categoryId: string) => void
  /** 跳到预算执行页 */
  onOpenBudget: () => void
}) {
  const t = useMessages()
  /** 账龄图例选中的桶——null 表示"全部"。 */
  const [bucket, setBucket] = useState<AgingBucketId | null>(null)
  /** 异常支出默认只放前 8 条，展开是真实动作。 */
  const [anomalyExpanded, setAnomalyExpanded] = useState(false)

  const exposureTotal = useMemo(
    () => RECEIVABLES_SUMMARY.atRisk.reduce((sum, entry) => sum + entry.score, 0),
    []
  )
  const maxScore = RECEIVABLES_SUMMARY.atRisk[0]?.score ?? 0

  const exposureRows = useMemo(
    () =>
      RECEIVABLES_SUMMARY.atRisk
        .filter((entry) => bucket === null || agingBucketOf(entry.invoice) === bucket)
        .slice(0, EXPOSURE_PREVIEW),
    [bucket]
  )

  /**
   * 异常支出 —— 在这里现算，不预先写死在数据文件里。
   *
   * 口径：同一科目在近 6 个月内的**单笔均值**，一笔超过它的 2.5 倍即为异常。
   * 内部资金调拨不是付款，不参与统计。
   */
  const anomalies = useMemo<AnomalyRow[]>(() => {
    const window = new Set(MONTHLY.slice(-ANOMALY_WINDOW_MONTHS).map((point) => point.month))
    const pool = TRANSACTIONS.filter(
      (transaction) =>
        transaction.direction === "out" &&
        transaction.kind !== "transfer" &&
        window.has(transaction.month)
    )

    const totals = new Map<string, { sum: number; count: number }>()
    for (const transaction of pool) {
      const entry = totals.get(transaction.category) ?? { sum: 0, count: 0 }
      entry.sum += transaction.amount
      entry.count += 1
      totals.set(transaction.category, entry)
    }

    return pool
      .map((transaction) => {
        const entry = totals.get(transaction.category)
        const average = entry && entry.count > 0 ? entry.sum / entry.count : 0
        return {
          transaction,
          average,
          excess: transaction.amount - average,
          ratio: average > 0 ? transaction.amount / average : 0,
        }
      })
      .filter((row) => row.ratio > ANOMALY_RATIO)
      .sort((a, b) => b.excess - a.excess)
  }, [])

  const visibleAnomalies = anomalyExpanded ? anomalies : anomalies.slice(0, ANOMALY_PREVIEW)

  /** 科目异动：当月 vs 上月，环比增长超过门槛的科目，按增幅排序。 */
  const spikes = useMemo(
    () =>
      EXPENSE_CATEGORIES.map((category) => {
        const amount = CURRENT_MONTH.categories[category.id]
        const previous = PREVIOUS_MONTH.categories[category.id]
        return {
          id: category.id,
          name: category.name,
          amount,
          previous,
          growth: previous > 0 ? ((amount - previous) / previous) * 100 : 0,
        }
      })
        .filter((row) => row.growth > SPIKE_THRESHOLD_PCT)
        .sort((a, b) => b.growth - a.growth),
    []
  )

  const overBudgetRows = useMemo(
    () => BUDGET.rows.filter((row) => row.status === "over"),
    []
  )

  const openCount = RECEIVABLES_SUMMARY.open.length
  const agingLabel = `${t.finance.risks.agingTitle} · ${RECEIVABLES_SUMMARY.buckets
    .filter((entry) => entry.share > 0)
    .map((entry) => `${t.finance.risks.bucket[entry.id]} ${formatPercent1(entry.share)}`)
    .join(" · ")}`

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      {/* ================================================================== */}
      {/* 1. L1 —— 风险敞口合计                                              */}
      {/* ================================================================== */}
      <OpenSection
        ambient="hero"
        className="-mx-4 sm:-mx-6"
        contentClassName="flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <span className="eyebrow text-muted-foreground/60">
            <span aria-hidden className="section-tick" />
            {t.finance.risks.exposureTitle}
          </span>
          <span className="text-label text-muted-foreground/80">
            {t.finance.risks.exposureHint}
          </span>
        </div>

        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <span data-testid="risk-exposure" className="flex flex-col gap-2">
            <AnimatedNumber
              value={exposureTotal}
              duration={durations.slow}
              formatValue={formatCurrencyCompact}
              className="text-metric numeric"
            />
          </span>

          <dl className="flex flex-wrap items-start gap-x-10 gap-y-4 border-hairline lg:border-l lg:pl-10">
            <div className="flex flex-col gap-1">
              <dt className="eyebrow text-muted-foreground/60">
                {t.finance.drawer.status.overdue}
              </dt>
              <dd className="flex flex-col gap-0.5">
                <span className="text-body font-medium">
                  {t.finance.risks.itemsCount(RECEIVABLES_SUMMARY.overdueCount)}
                </span>
                <span className="numeric text-label text-muted-foreground">
                  {formatCurrency(RECEIVABLES_SUMMARY.overdueTotal)}
                </span>
              </dd>
            </div>

            <div className="flex flex-col gap-1">
              <dt className="eyebrow text-muted-foreground/60">{t.finance.metrics.receivables}</dt>
              <dd className="flex flex-col gap-0.5">
                <span className="numeric text-body font-medium">
                  {formatCurrencyCompact(RECEIVABLES_SUMMARY.total)}
                </span>
                <span className="text-label text-muted-foreground">
                  {t.finance.risks.itemsCount(openCount)}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </OpenSection>

      {/* ================================================================== */}
      {/* 2. 应收账龄 —— 一条构成条 + 可点击的图例（真实筛选器）              */}
      {/* ================================================================== */}
      <section className="flex min-w-0 flex-col gap-4" data-testid="aging-section">
        <SectionHeading
          title={t.finance.risks.agingTitle}
          description={t.finance.risks.agingDescription}
          action={
            bucket ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-testid="aging-clear"
                onClick={() => setBucket(null)}
              >
                {t.common.clearFilters}
              </Button>
            ) : null
          }
        />

        {openCount === 0 ? (
          <EmptyState title={t.finance.risks.agingEmpty} />
        ) : (
          <div className="flex flex-col gap-5">
            <div
              role="img"
              aria-label={agingLabel}
              className="flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-border/40"
            >
              {RECEIVABLES_SUMMARY.buckets
                .filter((entry) => entry.share > 0)
                .map((entry) => (
                  <span
                    key={entry.id}
                    style={{ flexGrow: entry.share }}
                    className={cn(
                      "h-full transition-opacity duration-hover ease-standard",
                      BUCKET_TONE[entry.id],
                      bucket !== null && bucket !== entry.id && "opacity-35"
                    )}
                  />
                ))}
            </div>

            <ul className="grid grid-cols-1 gap-x-8 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-4">
              {RECEIVABLES_SUMMARY.buckets.map((entry) => {
                const active = bucket === entry.id
                const dimmed = bucket !== null && !active
                const body = (
                  <>
                    <span
                      aria-hidden
                      className={cn("size-1.5 shrink-0 rounded-full", BUCKET_DOT[entry.id])}
                    />
                    <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                      {t.finance.risks.bucket[entry.id]}
                    </span>
                    <span className="numeric shrink-0 text-label text-muted-foreground">
                      {formatPercent1(entry.share)}
                    </span>
                    <span className="shrink-0 text-label text-muted-foreground">
                      {t.finance.risks.bucketCount(entry.count)}
                    </span>
                  </>
                )

                /* 空桶没有可筛的内容，因此不做成按钮——不留假的可点击件。 */
                return (
                  <li key={entry.id}>
                    {entry.count > 0 ? (
                      <button
                        type="button"
                        aria-pressed={active}
                        data-testid={`aging-legend-${entry.id}`}
                        onClick={() => setBucket(active ? null : entry.id)}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2.5 rounded-field py-1.5 pr-2 text-left outline-none transition-colors duration-hover ease-standard hover:bg-brand-soft/35 focus-visible:ring-2 focus-visible:ring-ring/50",
                          active && "bg-brand-soft/45",
                          dimmed && "opacity-55"
                        )}
                      >
                        {body}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2.5 py-1.5 pr-2 opacity-45">{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      {/* ================================================================== */}
      {/* 3. 风险敞口清单 —— 图例筛选的对象，行点击打开发票抽屉              */}
      {/* ================================================================== */}
      {openCount > 0 ? (
        <section className="flex min-w-0 flex-col gap-4" data-testid="exposure-list">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-hairline pb-3.5">
            <span className="eyebrow text-muted-foreground/60">
              <span aria-hidden className="section-tick" />
              {t.finance.risks.exposureTitle}
            </span>
            <span className="flex items-center gap-2.5">
              {/* 筛选生效时先说清"现在看的是哪一桶"，再说条数。 */}
              {bucket ? (
                <span className="text-label font-medium text-foreground">
                  {t.finance.risks.bucket[bucket]}
                </span>
              ) : null}
              <span className="text-label text-muted-foreground">
                {t.finance.risks.itemsCount(exposureRows.length)}
              </span>
            </span>
          </div>

          <ul className="flex flex-col">
            {exposureRows.map((entry, index) => {
              const { invoice } = entry
              const severity = severityOf(invoice)
              return (
                <li key={invoice.id}>
                  <button
                    type="button"
                    onClick={() => onOpenInvoice(invoice.id)}
                    data-testid={`risk-invoice-${invoice.id}`}
                    aria-label={`${t.finance.risks.openInvoice} ${invoice.number}`}
                    className="group/row flex w-full cursor-pointer flex-wrap items-center gap-x-5 gap-y-2 border-b border-hairline py-3 text-left outline-none transition-colors duration-hover ease-standard last:border-b-0 hover:bg-brand-soft/35 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span
                      aria-hidden
                      className="numeric w-6 shrink-0 text-label text-muted-foreground/45"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate text-body-sm font-semibold transition-colors duration-hover group-hover/row:text-brand">
                          {invoice.customerName}
                        </span>
                        {severity ? (
                          <span
                            className={cn(
                              "inline-flex h-5 shrink-0 items-center rounded-4xl px-2 text-label font-medium",
                              SEVERITY_TONE[severity].chip
                            )}
                          >
                            {t.finance.insight.severity[severity]}
                          </span>
                        ) : null}
                      </span>

                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-label text-muted-foreground">
                        <span className="numeric">{invoice.number}</span>
                        <span aria-hidden>·</span>
                        <span className={cn(severity && "text-danger")}>
                          {invoice.daysLate > 0
                            ? t.finance.risks.overdueDays(invoice.daysLate)
                            : t.finance.drawer.status.open}
                        </span>
                        <span aria-hidden>·</span>
                        {/* "…到期"带中文量词，不加 `.numeric`：负字距只留给纯数字。 */}
                        <span>{t.finance.risks.dueDate(formatISODate(invoice.dueDate))}</span>
                      </span>

                      {/* 进度式敞口条：长度为该笔相对最高敞口的比例。 */}
                      <span
                        aria-hidden
                        className="relative block h-[3px] w-full max-w-40 overflow-hidden rounded-full bg-border/45"
                      >
                        <span
                          className={cn(
                            "absolute inset-y-0 left-0 rounded-full",
                            severity ? SEVERITY_TONE[severity].bar : "bg-brand/60"
                          )}
                          style={{
                            width: `${maxScore > 0 ? (entry.score / maxScore) * 100 : 0}%`,
                          }}
                        />
                      </span>
                    </span>

                    <span className="numeric shrink-0 text-body-sm font-semibold sm:w-28 sm:text-right">
                      {formatCurrency(invoice.amount)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {/* ================================================================== */}
      {/* 4. 异常支出 —— 在组件里现算的口径，行点击进该科目分析               */}
      {/* ================================================================== */}
      <section className="flex min-w-0 flex-col gap-4" data-testid="anomaly-detail">
        <SectionHeading
          title={t.finance.risks.anomalyTitle}
          description={t.finance.risks.anomalyDescription}
          action={
            anomalies.length > ANOMALY_PREVIEW ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={anomalyExpanded}
                data-testid="anomaly-toggle"
                onClick={() => setAnomalyExpanded((value) => !value)}
              >
                {anomalyExpanded ? t.common.showLess : t.common.showMore}
              </Button>
            ) : null
          }
        />

        {anomalies.length === 0 ? (
          <EmptyState icon={TriangleAlertIcon} title={t.finance.risks.anomalyEmpty} />
        ) : (
          <ul className="flex flex-col">
            {visibleAnomalies.map((row, index) => (
              <li key={row.transaction.id}>
                <button
                  type="button"
                  onClick={() => onOpenCategory(row.transaction.category)}
                  data-testid={`anomaly-row-${row.transaction.id}`}
                  className="group/row flex w-full cursor-pointer flex-wrap items-center gap-x-5 gap-y-2 border-b border-hairline py-3 text-left outline-none transition-colors duration-hover ease-standard last:border-b-0 hover:bg-brand-soft/35 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <span
                    aria-hidden
                    className="numeric w-6 shrink-0 text-label text-muted-foreground/45"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-body-sm font-semibold transition-colors duration-hover group-hover/row:text-brand">
                      {row.transaction.counterparty}
                    </span>
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-label text-muted-foreground">
                      <span className="truncate">{categoryName(row.transaction.category)}</span>
                      <span aria-hidden>·</span>
                      <span className="numeric">{formatISODate(row.transaction.date)}</span>
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                    <span className="numeric text-body-sm font-semibold">
                      {formatCurrency(row.transaction.amount)}
                    </span>
                    <span className="text-label text-danger">
                      {t.finance.risks.amountVsAverage(formatCurrency(row.excess))}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ================================================================== */}
      {/* 5. 科目异动 1.2fr : 预算超支 0.8fr                                  */}
      {/* ================================================================== */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-12">
        <section className="flex min-w-0 flex-col gap-4" data-testid="risk-spikes">
          <SectionHeading title={t.finance.risks.spikeTitle} />

          {spikes.length === 0 ? (
            <EmptyState icon={TriangleAlertIcon} title={t.finance.insights.empty} />
          ) : (
            <ul className="flex flex-col">
              {spikes.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onOpenCategory(row.id)}
                    data-testid={`spike-row-${row.id}`}
                    className="group/row flex w-full cursor-pointer items-center gap-x-4 border-b border-hairline py-3 text-left outline-none transition-colors duration-hover ease-standard last:border-b-0 hover:bg-brand-soft/35 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-body-sm font-semibold transition-colors duration-hover group-hover/row:text-brand">
                        {row.name}
                      </span>
                      <span className="numeric text-label text-muted-foreground">
                        {formatCurrencyCompact(row.previous)} → {formatCurrencyCompact(row.amount)}
                      </span>
                    </span>

                    <span className="numeric shrink-0 text-body-sm font-semibold text-warning">
                      {formatSignedPercent(row.growth)}
                    </span>

                    <ArrowUpRightIcon
                      aria-hidden
                      className="size-3.5 shrink-0 text-muted-foreground/0 transition-all duration-hover group-hover/row:-translate-y-0.5 group-hover/row:translate-x-0.5 group-hover/row:text-brand"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-4" data-testid="risk-over-budget">
          <SectionHeading title={t.finance.risks.budgetTitle} />

          {overBudgetRows.length === 0 ? (
            <EmptyState title={t.common.none} />
          ) : (
            <ul className="flex flex-col">
              {overBudgetRows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={onOpenBudget}
                    data-testid={`over-budget-${row.id}`}
                    className="group/row flex w-full cursor-pointer items-center gap-x-4 border-b border-hairline py-3 text-left outline-none transition-colors duration-hover ease-standard last:border-b-0 hover:bg-brand-soft/35 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-body-sm font-semibold transition-colors duration-hover group-hover/row:text-brand">
                        {row.name}
                      </span>
                      <span className="numeric text-label text-muted-foreground">
                        {formatPercent1(row.usage)}
                      </span>
                    </span>

                    <span className="shrink-0 text-body-sm font-semibold text-danger">
                      {t.finance.budget.overrunAmount(formatCurrencyCompact(Math.abs(row.remaining)))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
