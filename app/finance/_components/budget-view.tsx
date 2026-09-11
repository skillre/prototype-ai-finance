"use client"

import { useMemo, useState } from "react"
import { ArrowUpRightIcon } from "lucide-react"
import { useMessages } from "@/components/i18n/locale-provider"
import { AnimatedNumber } from "@/components/motion/animated-number"
import { EmptyState } from "@/components/prototype/empty-state"
import { MetricItem, MetricStrip } from "@/components/prototype/metric-strip"
import { OpenSection } from "@/components/prototype/open-section"
import { SectionHeading } from "@/components/prototype/section-heading"
import { Button } from "@/components/ui/button"
import {
  MONTHLY,
  PREVIOUS_MONTH,
  selectBudgetExecution,
  selectDepartmentBudget,
  type BudgetRow,
} from "@/lib/finance-metrics"
import {
  formatCurrencyCompact,
  formatMonthKey,
  formatRatio,
} from "@/lib/format"
import { durations } from "@/lib/motion-presets"
import { cn } from "@/lib/utils"

/**
 * 预算执行 —— 按科目下达、按部门复核的季度预算。
 *
 * 构图只回答一个问题：**这一季的钱花到哪一步了？**
 *
 *   1. L1 —— 整体执行率（全页唯一的主角），预算总额与实际发生挂在同一条
 *      hairline 上，配一条执行条：预算线是刻度，超出的部分以危险色从刻度
 *      右侧长出来，而不是把条子截断在 100%。
 *   2. 科目执行明细 / 部门维度 —— 1.45fr : 1fr 的非对称双栏。左边是编辑式
 *      排行（一个科目一行，行本身是通往该科目分析的入口），右边是部门口径
 *      的紧凑复核；两者都不是"又一排等宽卡片"。
 *   3. L5 指标带 —— 本月收支与超支口径，用排版与竖分隔线收尾。同一屏里
 *      没有任何数字出现两次。
 */

/** 执行率读数：一位小数——99.0% 比 99% 更像一个可核对的口径。 */
const formatUsage = (value: number) => formatRatio(value, 1)

/** 状态标签的语气：绿=正常、黄=接近上限、红=已超支。 */
const STATUS_TONE: Record<BudgetRow["status"], string> = {
  "on-track": "bg-success-soft text-success",
  watch: "bg-warning-soft text-warning",
  over: "bg-danger-soft text-danger",
}

export function BudgetView({
  onOpenCategory,
  onOpenLedger,
}: {
  /** 跳转：按科目筛选的收支分析页 */
  onOpenCategory: (categoryId: string) => void
  /** 跳转到交易流水 */
  onOpenLedger: () => void
}) {
  const t = useMessages()
  /** 只看超支科目——本地状态，过滤的是同一份 BUDGET.rows。 */
  const [onlyOver, setOnlyOver] = useState(false)

  // 季度窗口来自月度序列本身：预算页与现金流、分析页读同一份 12 个月，
  // 于是"2026 Q3"不是一个写死的标签，而是 MONTHS 的最后三个月。
  const quarterMonths = useMemo(() => MONTHLY.slice(-3).map((point) => point.month), [])
  const budget = useMemo(() => selectBudgetExecution(quarterMonths), [quarterMonths])
  const departments = useMemo(() => selectDepartmentBudget(), [])

  const rows = useMemo(
    () => (onlyOver ? budget.rows.filter((row) => row.status === "over") : budget.rows),
    [budget.rows, onlyOver]
  )

  const expenseTrend = useMemo(() => MONTHLY.map((point) => point.expense), [])
  const currentExpense = MONTHLY[MONTHLY.length - 1].expense
  const expenseDelta =
    PREVIOUS_MONTH.expense === 0
      ? 0
      : Math.round(((currentExpense - PREVIOUS_MONTH.expense) / PREVIOUS_MONTH.expense) * 1000) / 10
  const revenueDelta =
    PREVIOUS_MONTH.revenue === 0
      ? 0
      : Math.round(
          ((MONTHLY[MONTHLY.length - 1].revenue - PREVIOUS_MONTH.revenue) / PREVIOUS_MONTH.revenue) *
            1000
        ) / 10

  const quarterLabel = `${formatMonthKey(quarterMonths[0])} – ${formatMonthKey(
    quarterMonths[quarterMonths.length - 1]
  )}`
  const remaining = budget.budget - budget.actual

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      {/* ================================================================== */}
      {/* 1. L1 —— 整体执行率                                                */}
      {/* ================================================================== */}
      <OpenSection
        ambient="hero"
        className="-mx-4 sm:-mx-6"
        contentClassName="flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <span className="eyebrow text-muted-foreground/60">
            <span aria-hidden className="section-tick" />
            {t.finance.budget.summaryTitle}
          </span>
          {/* 季度区间里有中文量词（年月），因此不吃 `.numeric` 的负字距。 */}
          <span className="text-label text-muted-foreground">{quarterLabel}</span>
        </div>

        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="flex flex-col gap-2" data-testid="budget-usage">
            <span className="eyebrow text-muted-foreground/70">
              {t.finance.budget.summaryUsage}
            </span>
            <span className="flex items-baseline gap-1">
              <AnimatedNumber
                value={budget.usage}
                duration={durations.slow}
                formatValue={formatUsage}
                className="text-metric numeric"
              />
              <span className="text-numeric font-semibold text-muted-foreground">%</span>
            </span>
          </div>

          {/* 预算总额 / 实际发生：与指标带共用 hairline + 排版的做法，不加边框。 */}
          <dl className="flex flex-wrap items-start gap-x-10 gap-y-4 border-hairline lg:border-l lg:pl-10">
            <div className="flex flex-col gap-1">
              <dt className="eyebrow text-muted-foreground/60">
                {t.finance.budget.summaryBudget}
              </dt>
              <dd className="numeric text-numeric">{formatCurrencyCompact(budget.budget)}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="eyebrow text-muted-foreground/60">
                {t.finance.budget.summaryActual}
              </dt>
              <dd className="numeric text-numeric">{formatCurrencyCompact(budget.actual)}</dd>
            </div>
          </dl>
        </div>

        {/* 一条执行条：预算线是刻度，超出部分以危险色从刻度右侧长出来。 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <UsageBar
            usage={budget.usage}
            thickness="hero"
            className="min-w-0 flex-1"
            label={`${t.finance.budget.summaryUsage} ${formatRatio(budget.usage)}%`}
          />
          {budget.overrun > 0 ? (
            <span className="shrink-0 text-label font-medium text-danger">
              {t.finance.budget.overrunAmount(formatCurrencyCompact(budget.overrun))}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-hairline pt-4">
          <span className="text-label text-muted-foreground/80">{t.finance.scope.standard}</span>
          <button
            type="button"
            onClick={onOpenLedger}
            data-testid="budget-open-ledger"
            className="group/cta inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-field py-1 text-body-sm font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {t.finance.overview.goToLedger}
            <ArrowUpRightIcon className="size-3.5 transition-transform duration-hover group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5" />
          </button>
        </div>
      </OpenSection>

      {budget.rows.length === 0 ? (
        <EmptyState title={t.finance.budget.empty} />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-12">
          {/* ============================================================== */}
          {/* 2. 科目执行明细 —— 编辑式排行，行本身是一个真实入口             */}
          {/* ============================================================== */}
          <section className="flex min-w-0 flex-col gap-4" data-testid="budget-rows">
            <SectionHeading
              title={t.finance.budget.rowsTitle}
              action={
                budget.overCount > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-pressed={onlyOver}
                    data-testid="budget-only-over"
                    onClick={() => setOnlyOver((value) => !value)}
                  >
                    {onlyOver ? t.finance.budget.showAll : t.finance.budget.onlyOver}
                  </Button>
                ) : null
              }
            />

            <div className="flex flex-col">
              {/* 列头：轻到只提供读法，不与行抢视觉重量。 */}
              <div className="hidden items-center gap-x-5 pb-2 sm:flex">
                <span aria-hidden className="w-6 shrink-0" />
                <span className="eyebrow flex-1 text-muted-foreground/50">
                  {t.finance.budget.columnCategory} · {t.finance.budget.columnDepartment}
                </span>
                <span className="eyebrow w-36 shrink-0 text-muted-foreground/50 lg:w-44">
                  {t.finance.budget.columnUsage}
                </span>
                <span className="eyebrow w-32 shrink-0 text-right text-muted-foreground/50 lg:w-36">
                  {t.finance.budget.columnActual} / {t.finance.budget.columnBudget}
                </span>
                <span aria-hidden className="w-20 shrink-0" />
              </div>

              <ul className="flex flex-col">
                {rows.map((row, index) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onOpenCategory(row.id)}
                      data-testid={`budget-row-${row.id}`}
                      aria-label={t.finance.budget.progressLabel(row.name, row.usage)}
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
                          {row.name}
                        </span>
                        <span className="truncate text-label text-muted-foreground">
                          {row.department}
                        </span>
                      </span>

                      <span className="order-last flex w-full min-w-0 items-center gap-2.5 sm:order-none sm:w-36 lg:w-44">
                        <UsageBar usage={row.usage} className="min-w-0 flex-1" />
                        <span
                          className={cn(
                            "numeric w-12 shrink-0 text-right text-label font-medium",
                            row.status === "over" ? "text-danger" : "text-muted-foreground"
                          )}
                        >
                          {formatUsage(row.usage)}%
                        </span>
                      </span>

                      <span className="numeric flex w-full shrink-0 items-baseline gap-1 text-body-sm sm:w-32 sm:justify-end lg:w-36">
                        <span className="font-semibold">{formatCurrencyCompact(row.actual)}</span>
                        <span className="text-muted-foreground">
                          / {formatCurrencyCompact(row.budget)}
                        </span>
                      </span>

                      <span className="flex w-20 shrink-0 justify-end">
                        <StatusChip status={row.status} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ============================================================== */}
          {/* 3. 部门维度 —— 同一份预算换一个归口口径复核                     */}
          {/* ============================================================== */}
          <section className="flex min-w-0 flex-col gap-4" data-testid="budget-departments">
            <SectionHeading
              title={t.finance.budget.departmentTitle}
              description={t.finance.budget.departmentHint}
            />

            <ul className="flex flex-col">
              {departments.map((department) => (
                <li
                  key={department.department}
                  className="flex flex-col gap-2 border-t border-hairline py-3.5 first:border-t-0 first:pt-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="truncate text-body-sm font-medium">
                      {department.department}
                    </span>
                    <span
                      className={cn(
                        "numeric text-body-sm font-semibold",
                        department.usage > 100 && "text-danger"
                      )}
                    >
                      {formatUsage(department.usage)}%
                    </span>
                  </div>

                  <UsageBar usage={department.usage} />

                  <span className="numeric text-label text-muted-foreground">
                    {formatCurrencyCompact(department.actual)} /{" "}
                    {formatCurrencyCompact(department.budget)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* ================================================================== */}
      {/* 4. L5 指标带 —— 收尾用排版 + 竖分隔线，不再开卡片                   */}
      {/* ================================================================== */}
      <MetricStrip label={t.finance.metrics.label}>
        <MetricItem
          label={t.finance.metrics.expense}
          value={currentExpense}
          format="currency"
          trend={expenseTrend}
          trendLabel={t.finance.analysis.trendTitle}
          hint={
            expenseDelta > 0
              ? t.finance.composition.deltaUp(expenseDelta)
              : expenseDelta < 0
                ? t.finance.composition.deltaDown(expenseDelta)
                : t.finance.composition.deltaFlat
          }
        />
        <MetricItem
          label={t.finance.metrics.revenue}
          value={MONTHLY[MONTHLY.length - 1].revenue}
          format="currency"
          hint={
            revenueDelta > 0
              ? t.finance.composition.deltaUp(revenueDelta)
              : revenueDelta < 0
                ? t.finance.composition.deltaDown(revenueDelta)
                : t.finance.composition.deltaFlat
          }
        />
        <MetricItem label={t.finance.budget.summaryOverCount} value={budget.overCount} />
        <MetricItem
          label={t.finance.budget.columnRemaining}
          value={remaining}
          format="currency"
        />
      </MetricStrip>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 执行条                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 执行条。
 *
 * 一条横条同时表达两件事：**已经用了多少**（品牌色）与**超出多少**（危险色）。
 * 刻度按 max(100, usage) 归一化，于是预算线永远落在 `100 / scale` 处：
 * 超支时条子不会被截断在 100%，而是从预算刻度右侧继续长出去——"超了多少"
 * 变成一眼可见的长度差，而不是一个要读出来的百分比。
 */
function UsageBar({
  usage,
  thickness = "hairline",
  label,
  className,
}: {
  usage: number
  /** `hero` 是 L1 的那一条；`hairline` 用于行内。 */
  thickness?: "hero" | "hairline"
  /** 传了才成为有名字的图形；行内条已经被行按钮的 aria-label 覆盖。 */
  label?: string
  className?: string
}) {
  const scale = Math.max(100, usage)
  const usedWidth = (Math.min(100, usage) / scale) * 100
  const overflowWidth = (Math.max(0, usage - 100) / scale) * 100

  return (
    <span
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn(
        "relative block w-full overflow-hidden rounded-full bg-border/45",
        thickness === "hero" ? "h-2.5" : "h-[3px]",
        className
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 rounded-full bg-brand"
        style={{ width: `${usedWidth}%` }}
      />
      {overflowWidth > 0 ? (
        <span
          aria-hidden
          className="absolute inset-y-0 rounded-full bg-danger"
          style={{ left: `${usedWidth}%`, width: `${overflowWidth}%` }}
        />
      ) : null}
      {thickness === "hero" ? (
        /* 预算刻度：条子上唯一的辅助线，说明"超过这里就是超支"。 */
        <span
          aria-hidden
          className="absolute -top-1 -bottom-1 w-px bg-foreground/35"
          style={{ left: `${usedWidth}%` }}
        />
      ) : null}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* 状态标签                                                                    */
/* -------------------------------------------------------------------------- */

function StatusChip({ status }: { status: BudgetRow["status"] }) {
  const t = useMessages()
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-4xl px-2 text-label font-medium",
        STATUS_TONE[status]
      )}
    >
      {t.finance.budget.status[status]}
    </span>
  )
}
