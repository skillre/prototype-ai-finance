"use client"

import { useId, useMemo, useState } from "react"
import { BarChart3Icon, RotateCcwIcon } from "lucide-react"
import { OpenSection } from "@/components/prototype/open-section"
import { SectionHeading } from "@/components/prototype/section-heading"
import { EmptyState } from "@/components/prototype/empty-state"
import { Button } from "@/components/ui/button"
import { useMessages } from "@/components/i18n/locale-provider"
import type { Messages } from "@/lib/i18n"
import {
  CURRENT_MONTH,
  MONTHLY,
  selectCategorySlices,
  selectRevenueSlices,
  selectTopCounterparties,
  selectTrend,
} from "@/lib/finance-metrics"
import { EXPENSE_CATEGORIES, REVENUE_LINES } from "@/lib/finance-data"
import { TRANSACTIONS } from "@/lib/finance-ledger"
import {
  formatCurrency,
  formatDateShort,
  formatPercent1,
} from "@/lib/format"
import { categoryName } from "@/stores/finance-store"
import { cn } from "@/lib/utils"

/** 统计区间：真正决定参与合计的月份，而不是只换一个标题。 */
type RangeId = "month" | "quarter" | "year"

const RANGE_ORDER: RangeId[] = ["month", "quarter", "year"]

const RANGE_SIZE: Record<RangeId, number> = { month: 1, quarter: 3, year: 12 }

/** `MonthKey` → 矩阵列号。放模块级只算一次，避免每次渲染重复查找。 */
const MONTH_INDEX: Record<string, number> = Object.fromEntries(
  MONTHLY.map((point, index) => [point.month, index])
)

type TrendKey = "revenue" | "expense" | "net"

const TREND_ORDER: TrendKey[] = ["revenue", "expense", "net"]

/**
 * 收支分析。
 *
 * 三层，视觉权重依次递减：
 *   1. 收入结构 —— 一条构成条 + 可下钻的图例（先回答"钱从哪来"）
 *   2. 支出结构 —— 同一套视觉语言；选中科目后下钻到月度走势与当月凭证
 *   3. 交易对手排行 + 近 12 个月趋势 —— 视觉排行与共用时间轴的走势
 *
 * 统计区间是**真实状态**：切换本月 / 本季度 / 近 12 个月时，构成、图例与
 * 趋势都换成对应月份的合计——本季度对上一季度、近 12 个月对再往前 12 个月，
 * 走的是同一条公式，不是三个特例。
 *
 * 金额口径全部来自 `lib/finance-metrics`：`selectCategorySlices` /
 * `selectRevenueSlices` 给出科目定义与环比、`selectTrend` 给出月度序列，
 * 这里只做"把若干个月相加"这一件事，绝不另起一套数字。
 */
export function AnalysisView(props: {
  /** 已选科目（来自 URL ?category=），可为 null */
  category: string | null
  /** 选中 / 清除科目筛选 */
  onSelectCategory: (categoryId: string | null) => void
  /** 在流水中筛选某对手方 */
  onOpenCounterparty: (name: string) => void
}) {
  const t = useMessages()
  const [range, setRange] = useState<RangeId>("month")

  /* ---- 区间窗口：参与合计的月份 ---------------------------------------- */

  const window = useMemo(() => {
    const size = RANGE_SIZE[range]
    const points = MONTHLY.slice(-size)
    return {
      size,
      points,
      months: points.map((point) => point.month),
      first: points[0].label,
      last: points[points.length - 1].label,
    }
  }, [range])

  /* ---- 构成：区间内各月相加，环比对齐上一个等长区间 ---------------------- */

  const composition = useMemo(() => {
    const from = Math.max(0, MONTHLY.length - window.size)
    const previousFrom = Math.max(0, MONTHLY.length - window.size * 2)

    const expenseDelta = new Map<string, number>()
    for (const month of MONTHLY.slice(previousFrom, from)) {
      for (const slice of selectCategorySlices(month.month).slices) {
        expenseDelta.set(slice.id, (expenseDelta.get(slice.id) ?? 0) + slice.amount)
      }
    }

    const revenueDelta = new Map<string, number>()
    for (const month of MONTHLY.slice(previousFrom, from)) {
      for (const slice of selectRevenueSlices(month.month).slices) {
        revenueDelta.set(slice.id, (revenueDelta.get(slice.id) ?? 0) + slice.amount)
      }
    }

    /** 同一条公式：环比 =（本期 − 上期）÷ 上期。 */
    const growth = (current: number, previous: number) =>
      previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : 0

    const expenses = EXPENSE_CATEGORIES.map((category) => {
      const amount = window.months.reduce(
        (sum, month) => sum + category.monthly[MONTH_INDEX[month]],
        0
      )
      return {
        id: category.id,
        name: category.name,
        hint: category.department,
        amount,
        share: 0,
        delta: growth(amount, expenseDelta.get(category.id) ?? 0),
      }
    })

    const revenues = REVENUE_LINES.map((line) => {
      const amount = window.months.reduce((sum, month) => sum + line.monthly[MONTH_INDEX[month]], 0)
      return {
        id: line.id,
        name: line.name,
        hint: null,
        amount,
        share: 0,
        delta: growth(amount, revenueDelta.get(line.id) ?? 0),
      }
    })

    const withShare = <T extends { amount: number }>(rows: T[]) => {
      const total = rows.reduce((sum, row) => sum + row.amount, 0)
      return {
        total,
        rows: [...rows]
          .sort((a, b) => b.amount - a.amount)
          .map((row) => ({ ...row, share: total === 0 ? 0 : (row.amount / total) * 100 })),
      }
    }

    const expense = withShare(expenses)
    const revenue = withShare(revenues)

    return {
      expansions: expense.rows,
      revenues: revenue.rows,
      expenseTotal: expense.total,
      revenueTotal: revenue.total,
    }
  }, [window])

  /* ---- 交易对手排行：支出方向，当月口径 --------------------------------- */

  const counterparties = useMemo(() => {
    const rows = selectTopCounterparties("out", 8, CURRENT_MONTH.month)
    const max = rows.reduce((highest, row) => Math.max(highest, row.amount), 0)
    const total = rows.reduce((sum, row) => sum + row.amount, 0)
    return rows.map((row, index) => ({
      ...row,
      rank: index + 1,
      width: max === 0 ? 0 : (row.amount / max) * 100,
      share: total === 0 ? 0 : (row.amount / total) * 100,
    }))
  }, [])

  /* ---- 下钻：科目的逐月走势 + 当月凭证 ---------------------------------- */

  const drilldown = useMemo(() => {
    if (!props.category) return null
    const series = monthlySeriesOf(props.category)
    if (!series) return null

    const vouchers = TRANSACTIONS.filter(
      (transaction) =>
        transaction.category === props.category &&
        transaction.month === CURRENT_MONTH.month &&
        transaction.kind !== "transfer"
    )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)

    const total = series.values.reduce((sum, value) => sum + value, 0)

    return {
      id: props.category,
      name: categoryName(props.category),
      months: series.months,
      values: series.values,
      total,
      vouchers,
    }
  }, [props.category])

  const rangeLabels: Record<RangeId, string> = {
    month: t.finance.analysis.rangeMonth,
    quarter: t.finance.analysis.rangeQuarter,
    year: t.finance.analysis.rangeYear,
  }

  const windowLabel =
    window.size <= 1 ? window.first : `${window.first} – ${window.last}`

  return (
    <div className="flex flex-col gap-10 sm:gap-12" data-testid="analysis-view">
      {/* ================================================================ */}
      {/* 统计区间                                                          */}
      {/* ================================================================ */}
      <OpenSection ambient="wash" contentClassName="flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="eyebrow text-muted-foreground/60">
              <span aria-hidden className="section-tick" />
              {t.finance.analysis.rangeTitle}
            </span>
            <p className="text-body-sm text-muted-foreground">{windowLabel}</p>
          </div>

          <div
            role="group"
            aria-label={t.finance.analysis.rangeTitle}
            className="flex items-center gap-1 rounded-field bg-surface/80 p-0.5 ring-1 ring-border/60"
          >
            {RANGE_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                data-testid={`analysis-range-${id}`}
                aria-pressed={range === id}
                onClick={() => setRange(id)}
                className={cn(
                  "h-7 cursor-pointer rounded-field px-3 text-body-sm font-medium whitespace-nowrap outline-none",
                  "transition-colors duration-hover ease-standard focus-visible:ring-2 focus-visible:ring-ring/50",
                  range === id
                    ? "bg-brand text-brand-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {rangeLabels[id]}
              </button>
            ))}
          </div>
        </div>

        <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-hairline pt-4">
          <div className="flex flex-col gap-0.5">
            <dt className="eyebrow text-muted-foreground/60">
              {t.finance.composition.revenueTitle}
            </dt>
            <dd className="numeric text-subtitle font-semibold">
              {formatCurrency(composition.revenueTotal)}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="eyebrow text-muted-foreground/60">
              {t.finance.composition.expenseTitle}
            </dt>
            <dd className="numeric text-subtitle font-semibold">
              {formatCurrency(composition.expenseTotal)}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="eyebrow text-muted-foreground/60">{t.finance.transactions.net}</dt>
            <dd
              className={cn(
                "numeric text-subtitle font-semibold",
                composition.revenueTotal - composition.expenseTotal >= 0
                  ? "text-success"
                  : "text-danger"
              )}
            >
              {formatCurrency(composition.revenueTotal - composition.expenseTotal)}
            </dd>
          </div>
        </dl>
      </OpenSection>

      {/* ================================================================ */}
      {/* 收入结构                                                          */}
      {/* ================================================================ */}
      <OpenSection
        as="section"
        className="flex flex-col gap-5"
        contentClassName="flex flex-col gap-5"
      >
        <SectionHeading
          title={t.finance.composition.revenueTitle}
          description={t.finance.composition.revenueDescription(
            windowLabel,
            formatCurrency(composition.revenueTotal)
          )}
        />

        <CompositionBar
          slices={composition.revenues}
          palette="income"
          selectedId={props.category}
          testId="analysis-bar-revenue"
          onSelect={(id) => props.onSelectCategory(props.category === id ? null : id)}
        />

        <ul className="flex flex-col" data-testid="analysis-legend-revenue">
          {composition.revenues.map((slice, index) => (
            <LegendRow
              key={slice.id}
              rank={index + 1}
              name={slice.name}
              amount={slice.amount}
              share={slice.share}
              delta={slice.delta}
              tone="income"
              index={index}
              pressed={props.category === slice.id}
              onSelect={() => props.onSelectCategory(props.category === slice.id ? null : slice.id)}
            />
          ))}
        </ul>
      </OpenSection>

      {/* ================================================================ */}
      {/* 支出结构                                                          */}
      {/* ================================================================ */}
      <OpenSection
        as="section"
        className="flex flex-col gap-5"
        contentClassName="flex flex-col gap-5"
      >
        <SectionHeading
          title={t.finance.composition.expenseTitle}
          description={t.finance.composition.expenseDescription(
            windowLabel,
            formatCurrency(composition.expenseTotal)
          )}
        />

        <CompositionBar
          slices={composition.expansions}
          palette="expense"
          selectedId={props.category}
          testId="analysis-bar-expense"
          onSelect={(id) => props.onSelectCategory(props.category === id ? null : id)}
        />

        <ul className="flex flex-col" data-testid="analysis-legend-expense">
          {composition.expansions.map((slice, index) => (
            <LegendRow
              key={slice.id}
              rank={index + 1}
              name={slice.name}
              hint={slice.hint ?? undefined}
              amount={slice.amount}
              share={slice.share}
              delta={slice.delta}
              tone="expense"
              index={index}
              pressed={props.category === slice.id}
              onSelect={() => props.onSelectCategory(props.category === slice.id ? null : slice.id)}
            />
          ))}
        </ul>

        <p className="text-label text-muted-foreground/70">{t.finance.composition.legendHint}</p>
      </OpenSection>

      {/* ================================================================ */}
      {/* 科目下钻 —— 只在有 ?category= 时出现                                */}
      {/* ================================================================ */}
      {drilldown ? (
        <OpenSection ambient="wash" contentClassName="p-4 sm:p-5">
          <div
            data-testid="analysis-drilldown"
            className="flex flex-col gap-5"
          >
            <SectionHeading
              eyebrow={t.finance.analysis.selectedCategory(drilldown.name)}
              title={t.finance.analysis.categoryTitle}
              description={t.finance.analysis.voucherHint}
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => props.onSelectCategory(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcwIcon />
                  {t.finance.analysis.clearCategory}
                </Button>
              }
            />

            <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
              <div className="flex flex-col gap-0.5">
                <dt className="eyebrow text-muted-foreground/60">
                  {t.finance.composition.rankTitle}
                </dt>
                <dd className="numeric text-subtitle font-semibold">
                  {formatCurrency(drilldown.total)}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="eyebrow text-muted-foreground/60">{CURRENT_MONTH.label}</dt>
                <dd className="numeric text-subtitle font-semibold">
                  {formatCurrency(drilldown.values[drilldown.values.length - 1])}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2">
              <span className="eyebrow text-muted-foreground/60">
                {t.finance.analysis.trendTitle}
              </span>
              <CategorySparkline months={drilldown.months} values={drilldown.values} />
            </div>

            <div className="flex flex-col gap-2 border-t border-hairline pt-4">
              <span className="eyebrow text-muted-foreground/60">
                {t.finance.analysis.voucherTitle}
              </span>

              {drilldown.vouchers.length > 0 ? (
                <ul className="flex flex-col" data-testid="analysis-drilldown-vouchers">
                  {drilldown.vouchers.map((voucher) => (
                    <li
                      key={voucher.id}
                      className="flex flex-col gap-1 border-b border-hairline py-2.5 last:border-b-0"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-body-sm font-medium">
                          {voucher.counterparty}
                        </span>
                        <span className="numeric shrink-0 text-body-sm font-semibold">
                          {formatCurrency(voucher.amount)}
                        </span>
                      </span>
                      <span className="flex items-baseline justify-between gap-3 text-label text-muted-foreground">
                        <span className="min-w-0 truncate">
                          {formatDateShort(voucher.date)} · {voucher.memo}
                        </span>
                        <span className="numeric shrink-0">{voucher.voucher}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={BarChart3Icon}
                  title={t.finance.analysis.categoryEmpty}
                  className="py-6"
                />
              )}
            </div>
          </div>
        </OpenSection>
      ) : null}

      {/* ================================================================ */}
      {/* 交易对手排行 + 近 12 个月趋势                                      */}
      {/* ================================================================ */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <OpenSection
          as="section"
          className="flex min-w-0 flex-col gap-5"
          contentClassName="flex flex-col gap-5"
        >
          <SectionHeading
            title={t.finance.analysis.counterpartyTitle}
            description={t.finance.analysis.counterpartyHint}
          />

          <ul className="flex flex-col" data-testid="analysis-counterparties">
            {counterparties.map((row) => (
              <li key={row.name}>
                <button
                  type="button"
                  onClick={() => props.onOpenCounterparty(row.name)}
                  aria-label={`${row.name} · ${formatCurrency(row.amount)}`}
                  className={cn(
                    "group/cp flex w-full cursor-pointer flex-col gap-2 border-b border-hairline py-2.5 text-left outline-none",
                    "transition-colors duration-hover ease-standard last:border-b-0",
                    "hover:bg-brand-soft/35 focus-visible:ring-2 focus-visible:ring-ring/50"
                  )}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="numeric shrink-0 text-label text-muted-foreground/45">
                        {String(row.rank).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 truncate text-body-sm font-medium">{row.name}</span>
                    </span>
                    <span className="numeric shrink-0 text-body-sm font-semibold">
                      {formatCurrency(row.amount)}
                    </span>
                  </span>

                  <span className="flex items-center gap-3 pl-7">
                    <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border/40">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-data-expense transition-[width] duration-slow ease-out-expo"
                        style={{ width: `${row.width}%` }}
                      />
                    </span>
                    <span className="numeric w-12 shrink-0 text-right text-label text-muted-foreground">
                      {formatPercent1(row.share)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </OpenSection>

        <OpenSection
          as="section"
          className="flex min-w-0 flex-col gap-5"
          contentClassName="flex flex-col gap-5"
        >
          <SectionHeading
            title={t.finance.analysis.trendTitle}
            description={t.finance.analysis.trendDescription}
            action={
              <span className="numeric text-label text-muted-foreground">
                {window.size}
                {t.common.unit.month}
              </span>
            }
          />

          <TrendChart size={window.size} months={window.points.map((point) => point.shortLabel)} />
        </OpenSection>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 构成条 + 图例                                                               */
/* -------------------------------------------------------------------------- */

/**
 * 一条按金额切分的构成条。
 *
 * 报表的形状是"每行一个条 + 右侧金额"；把它们压成**一条**之后，"这笔钱主要
 * 由什么构成"变成一眼可读的事实，而每个片段仍然可以单独点击下钻（片段与
 * 图例行共用同一个回调，都是真实入口）。
 */
function CompositionBar({
  slices,
  palette,
  selectedId,
  testId,
  onSelect,
}: {
  slices: { id: string; name: string; share: number }[]
  palette: "income" | "expense"
  selectedId: string | null
  testId: string
  onSelect: (id: string) => void
}) {
  const visible = slices.filter((slice) => slice.share > 0)

  return (
    <div
      data-testid={testId}
      className="flex h-3 w-full gap-px overflow-hidden rounded-full bg-border/40"
    >
      {visible.map((slice, index) => (
        <button
          key={slice.id}
          type="button"
          onClick={() => onSelect(slice.id)}
          aria-pressed={selectedId === slice.id}
          aria-label={slice.name}
          title={slice.name}
          style={{
            flexGrow: slice.share,
            background: sliceColor(palette, index),
          }}
          className={cn(
            "h-full min-w-[3px] cursor-pointer outline-none transition-opacity duration-hover ease-standard",
            "hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring/50",
            selectedId !== null && selectedId !== slice.id && "opacity-30"
          )}
        />
      ))}
    </div>
  )
}

/**
 * 图例行：一个真正的按钮。
 *
 * 名称 / 金额 / 占比 / 环比全部是真实值——环比文案由词典给（`deltaUp` /
 * `deltaDown` / `deltaFlat`），数字由代码算。移动端折成两行（名称一行、
 * 金额与环比一行），桌面端一行四个字段对齐。
 */
function LegendRow({
  rank,
  name,
  hint,
  amount,
  share,
  delta,
  tone,
  index,
  pressed,
  onSelect,
}: {
  rank: number
  name: string
  hint?: string
  amount: number
  share: number
  delta: number
  tone: "income" | "expense"
  index: number
  pressed: boolean
  onSelect: () => void
}) {
  const t = useMessages()

  /** `|delta| < 0.05` 才算"持平"——0.1 个百分点的变化不该被说成"持平"。 */
  const flat = Math.abs(delta) < 0.05
  const deltaText = flat
    ? t.finance.composition.deltaFlat
    : delta > 0
      ? t.finance.composition.deltaUp(delta)
      : t.finance.composition.deltaDown(delta)

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={pressed}
        className={cn(
          "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5 border-b border-hairline py-2.5 text-left outline-none",
          "md:grid-cols-[minmax(0,1fr)_4.5rem_7rem_7rem] md:items-center md:gap-y-0",
          "transition-colors duration-hover ease-standard last:border-b-0 hover:bg-brand-soft/35 focus-visible:ring-2 focus-visible:ring-ring/50",
          pressed && "bg-brand-soft/45"
        )}
      >
        {/* 名称 */}
        <span className="col-span-2 flex min-w-0 items-center gap-2 md:col-span-1">
          <span
            aria-hidden
            className={cn("size-2 shrink-0 rounded-full", dotClass(tone, index))}
          />
          <span className="numeric shrink-0 text-label text-muted-foreground/45">
            {String(rank).padStart(2, "0")}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-body-sm font-medium">{name}</span>
            {hint ? (
              <span className="truncate text-label text-muted-foreground/70">{hint}</span>
            ) : null}
          </span>
        </span>

        {/* 金额 + 占比 + 环比（移动端同占一行） */}
        <span className="flex items-baseline gap-3 md:contents">
          <span className="numeric text-body-sm font-semibold md:text-right">{formatCurrency(amount)}</span>
          <span className="numeric ml-auto text-label text-muted-foreground md:ml-0 md:text-right">
            {formatPercent1(share)}
          </span>
          <span
            className={cn(
              "numeric ml-auto text-label whitespace-nowrap md:ml-0 md:text-right",
              flat ? "text-muted-foreground" : delta > 0 ? "text-success" : "text-danger"
            )}
          >
            {deltaText}
          </span>
        </span>
      </button>
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/* 趋势                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 三条对齐的走势，共用一条时间轴。
 *
 * 比"一张三线图"更适合财务：收入、支出、净额的量级差得远（净额可以是负的），
 * 叠在一起只会互相压扁；分开画、对齐月份之后每条线的形状反而更容易读。
 * 每格只画真实数据，读数是真实末值。
 */
function TrendChart({ months, size }: { months: string[]; size: number }) {
  const t = useMessages()

  return (
    <div className="flex flex-col gap-3" data-testid="analysis-trend">
      {TREND_ORDER.map((key) => (
        <div key={key} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3">
          <span className="text-label text-muted-foreground">{trendLabel(t, key)}</span>
          <MiniSparkline
            data={selectTrend(key, size)}
            tone={key === "expense" ? "expense" : "income"}
            label={trendLabel(t, key)}
          />
        </div>
      ))}

      {/* 共用时间轴：首 / 中 / 尾各一个标签，窄屏也不会叠字 */}
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3">
        <span aria-hidden />
        <div className="flex items-baseline justify-between gap-2 text-label text-muted-foreground/70">
          <span className="numeric">{months[0]}</span>
          {months.length > 2 ? (
            <span className="numeric">{months[Math.floor(months.length / 2)]}</span>
          ) : null}
          <span className="numeric">{months[months.length - 1]}</span>
        </div>
      </div>
    </div>
  )
}

/** 手写 SVG 迷你走势：`preserveAspectRatio="none"` 让它随列宽伸展。 */
function MiniSparkline({
  data,
  tone,
  label,
}: {
  data: number[]
  tone: "income" | "expense"
  label: string
}) {
  const gradientId = useId()
  const height = 26
  const { line, area } = buildPath(data, height, 6)

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="h-[26px] w-full"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={seriesColor(tone)} stopOpacity={0.16} />
          <stop offset="100%" stopColor={seriesColor(tone)} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={seriesColor(tone)}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** 科目下钻的走势：面积 + 折线，末点带一个真实读数。 */
function CategorySparkline({ months, values }: { months: string[]; values: number[] }) {
  const gradientId = useId()
  const height = 88
  const { line, area, points } = buildPath(values, height, 6)
  const last = points[points.length - 1]

  return (
    <div className="flex flex-col gap-2">
      <svg
        role="img"
        aria-label={months.join(" ")}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="h-[88px] w-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {last ? <circle cx={last[0]} cy={last[1]} r={2.5} fill="var(--brand)" /> : null}
      </svg>

      <div className="flex items-baseline justify-between gap-2 text-label text-muted-foreground/70">
        <span className="numeric">{months[0]}</span>
        {months.length > 2 ? (
          <span className="numeric">{months[Math.floor(months.length / 2)]}</span>
        ) : null}
        <span className="numeric">{months[months.length - 1]}</span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 工具                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 12 个点的正常化路径：x 均匀铺满 0–100，y 按最小 / 最大值铺满可用高度。
 * `inset` 让曲线不贴到上下边缘——贴边的线看起来像被裁掉了。
 */
function buildPath(data: number[], height: number, inset: number) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const usable = height - inset * 2
  const points = data.map((value, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100
    const y = inset + (usable - ((value - min) / span) * usable)
    return [x, y] as const
  })
  const line = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ")
  return { points, line, area: `${line} L100,${height} L0,${height} Z` }
}

/** 某科目的 12 个月序列——支出科目取矩阵行，收入线取收入线矩阵行。 */
function monthlySeriesOf(categoryId: string): { months: string[]; values: number[] } | null {
  const expense = EXPENSE_CATEGORIES.find((category) => category.id === categoryId)
  const revenue = REVENUE_LINES.find((line) => line.id === categoryId)
  const values = expense?.monthly ?? revenue?.monthly
  if (!values) return null
  return { months: MONTHLY.map((point) => point.shortLabel), values }
}

/** 同族色的不透明度阶梯：构成条与图例共用同一个索引，颜色必然对上。 */
const INCOME_OPACITIES = [100, 78, 60, 46, 36] as const
const EXPENSE_OPACITIES = [100, 82, 68, 56, 46, 40, 34, 30] as const

function sliceOpacity(palette: "income" | "expense", index: number): number {
  const ladder = palette === "income" ? INCOME_OPACITIES : EXPENSE_OPACITIES
  return ladder[index] ?? 25
}

function sliceColor(palette: "income" | "expense", index: number): string {
  const token = palette === "income" ? "--data-income" : "--data-expense"
  return `color-mix(in oklab, var(${token}) ${sliceOpacity(palette, index)}%, transparent)`
}

/** 图例色点——与构成条同一套色阶（Tailwind 需要字面量 class，故此处枚举）。 */
function dotClass(palette: "income" | "expense", index: number): string {
  if (palette === "income") {
    return (
      ["bg-data-income", "bg-data-income/85", "bg-data-income/70", "bg-data-income/55", "bg-data-income/40"][index] ??
      "bg-data-income/30"
    )
  }
  return (
    [
      "bg-data-expense",
      "bg-data-expense/85",
      "bg-data-expense/70",
      "bg-data-expense/55",
      "bg-data-expense/45",
      "bg-data-expense/38",
      "bg-data-expense/30",
      "bg-data-expense/24",
    ][index] ?? "bg-data-expense/20"
  )
}

function seriesColor(tone: "income" | "expense"): string {
  return tone === "income" ? "var(--data-income)" : "var(--data-expense)"
}

function trendLabel(t: Messages, key: TrendKey): string {
  switch (key) {
    case "revenue":
      return t.finance.metrics.revenue
    case "expense":
      return t.finance.metrics.expense
    default:
      return t.finance.transactions.net
  }
}
