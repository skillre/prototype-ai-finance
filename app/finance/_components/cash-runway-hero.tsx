"use client"

import { useCallback, useId, useMemo, useRef, useState } from "react"
import { motion } from "motion/react"
import { ArrowRightIcon, CrosshairIcon, GaugeIcon, RotateCcwIcon } from "lucide-react"
import { OpenSection } from "@/components/prototype/open-section"
import { AnimatedNumber } from "@/components/motion/animated-number"
import { useMessages } from "@/components/i18n/locale-provider"
import {
  formatCurrencyCompact,
  formatDateShort,
  formatMonthLabel,
  formatRatio,
  formatSignedPercent,
} from "@/lib/format"
import { durations, easings } from "@/lib/motion-presets"
import { cn } from "@/lib/utils"
import {
  BASE_ASSUMPTIONS,
  CASH,
  CASH_FLOOR,
  FORECAST_WEEKS,
  OPTIMIZED_ASSUMPTIONS,
  PREVIOUS_MONTH,
  STRESS_ASSUMPTIONS,
  selectCashForecast,
  selectRunwayScenario,
  type Assumptions,
} from "@/lib/finance-metrics"
import { REFERENCE_DATE } from "@/lib/finance-data"
import { useFinanceStore } from "@/stores/finance-store"

/**
 * 现金跑道仪表（Cash Runway Instrument）—— 全站的第一视觉。
 *
 * 它与"再画一条折线"的区别在于三件事：
 *
 *   1. **大数字长在图形上**。现金头寸、跑道月数与 90 天推演共用一块版面：
 *      数字在左、推演在右，底部是同一条地平线（运营备付金）。读数不是浮在
 *      旁边的 tooltip，而是图形的一部分。
 *   2. **区间是算出来的**。压力与优化两种情景各跑一遍同样的预测规则，
 *      两者之间就是那条带——它不是置信区间，是可复算的上下限。
 *   3. **假设可以被拖动**。收入达成率、成本系数、回款率三个滑杆直接改写
 *      跑道与警戒线日期，并同步改写洞察层。这是本产品唯一的签名交互。
 */
export function CashRunwayHero({ onOpenCashflow }: { onOpenCashflow: () => void }) {
  const t = useMessages()
  const assumptions = useFinanceStore((s) => s.assumptions)
  const setAssumption = useFinanceStore((s) => s.setAssumption)
  const applyAssumptions = useFinanceStore((s) => s.applyAssumptions)
  const resetAssumptions = useFinanceStore((s) => s.resetAssumptions)
  const assumptionsDirty = useFinanceStore((s) => s.assumptionsDirty)

  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null)

  const forecast = useMemo(() => selectCashForecast(assumptions), [assumptions])
  const scenario = useMemo(() => selectRunwayScenario(assumptions), [assumptions])

  const points = useMemo(
    () => [
      {
        index: -1,
        label: formatDateShort(REFERENCE_DATE),
        closing: CASH,
        stress: CASH,
        optimized: CASH,
        inflow: 0,
        outflow: 0,
        net: 0,
      },
      ...forecast.weeks.map((week) => ({
        index: week.index,
        label: week.label,
        closing: week.closing,
        stress: week.stress,
        optimized: week.optimized,
        inflow: week.inflow,
        outflow: week.outflow,
        net: week.net,
      })),
    ],
    [forecast]
  )

  const readoutIndex = hoverIndex ?? pinnedIndex
  const readout = readoutIndex === null ? null : points[readoutIndex]
  const runwayValue = scenario.runway === Number.POSITIVE_INFINITY ? 240 : scenario.runway
  const crossingLabel =
    scenario.floorMonths === Number.POSITIVE_INFINITY
      ? t.finance.hero.noCrossing
      : t.finance.hero.crossing(formatMonthLabel(scenario.floorDate))

  const deltaVsLastMonth = CASH - PREVIOUS_MONTH.closingCash

  const read = useCallback((index: number | null) => setHoverIndex(index), [])

  return (
    <OpenSection
      ambient="hero"
      className="-mx-4 sm:-mx-6"
      contentClassName="flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"
    >
      {/* 顶栏：区块身份 + 情景预设（全部是真实动作） */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <span className="eyebrow text-muted-foreground/60">
          <span aria-hidden className="section-tick" />
          {t.finance.hero.sectionLabel}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label={t.finance.scenario.presets}
            className="inline-flex items-center gap-0.5 rounded-field border border-border/60 bg-surface/70 p-0.5"
          >
            {(
              [
                ["base", BASE_ASSUMPTIONS, t.finance.scenario.presetBase],
                ["stress", STRESS_ASSUMPTIONS, t.finance.scenario.presetStress],
                ["optimized", OPTIMIZED_ASSUMPTIONS, t.finance.scenario.presetOptimized],
              ] as const
            ).map(([id, preset, label]) => {
              const active =
                Math.abs(preset.revenueFactor - assumptions.revenueFactor) < 0.001 &&
                Math.abs(preset.costFactor - assumptions.costFactor) < 0.001 &&
                Math.abs(preset.collectionRate - assumptions.collectionRate) < 0.001
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  data-testid={`runway-preset-${id}`}
                  onClick={() => applyAssumptions(preset)}
                  className={cn(
                    "h-7 cursor-pointer rounded-[7px] px-2.5 text-label font-medium transition-colors duration-hover ease-standard outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    active
                      ? "bg-brand text-brand-foreground shadow-subtle"
                      : "text-muted-foreground hover:bg-interactive hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {assumptionsDirty ? (
            <button
              type="button"
              onClick={() => resetAssumptions()}
              data-testid="runway-reset"
              className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-field px-2 text-label font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <RotateCcwIcon className="size-3" />
              {t.finance.scenario.reset}
            </button>
          ) : null}
        </div>
      </div>

      {/* L1：数字与图形共面 */}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:items-start lg:gap-10">
        <div className="order-1 flex flex-col gap-6 lg:col-start-1 lg:row-start-1">
          <div className="flex flex-col gap-2.5">
            <span className="eyebrow text-muted-foreground/70">{t.finance.hero.cashLabel}</span>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: durations.enter, ease: easings.outExpo }}
                className="numeric text-metric"
                data-testid="runway-cash"
              >
                <AnimatedNumber
                  value={CASH}
                  duration={durations.glacial}
                  formatValue={formatCurrencyCompact}
                />
              </motion.span>
              <span
                className={cn(
                  "numeric inline-flex items-center gap-1 text-body font-medium",
                  deltaVsLastMonth >= 0 ? "text-success" : "text-danger"
                )}
              >
                {formatSignedPercent((deltaVsLastMonth / PREVIOUS_MONTH.closingCash) * 100)}
              </span>
            </div>
            <span className="text-label text-muted-foreground">{t.finance.scope.standard}</span>
          </div>

          {/* 跑道：第二个数字，但层级明显低于现金头寸 */}
          <div className="flex flex-col gap-2 border-t border-hairline pt-5">
            <span className="eyebrow text-muted-foreground/70">{t.finance.hero.runwayLabel}</span>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="numeric text-numeric" data-testid="runway-months">
                {formatRatio(runwayValue)}
              </span>
              <span className="text-body font-medium text-muted-foreground">
                {t.finance.hero.runwayUnit}
              </span>
              <span
                data-testid="runway-delta"
                className={cn(
                  "text-label",
                  scenario.deltaMonths > 0.05
                    ? "text-success"
                    : scenario.deltaMonths < -0.05
                      ? "text-danger"
                      : "text-muted-foreground"
                )}
              >
                {scenario.deltaMonths > 0.05
                  ? t.finance.scenario.deltaLonger(formatRatio(scenario.deltaMonths))
                  : scenario.deltaMonths < -0.05
                    ? t.finance.scenario.deltaShorter(formatRatio(Math.abs(scenario.deltaMonths)))
                    : t.finance.scenario.deltaFlat}
              </span>
            </div>

            <p className="text-body-sm text-pretty text-muted-foreground" data-testid="runway-crossing">
              {crossingLabel}
            </p>

            <dl className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-label">
              <Fact
                label={t.finance.hero.burnLabel}
                value={formatCurrencyCompact(scenario.burn)}
                testId="runway-burn"
              />
              <span aria-hidden className="h-3 w-px bg-hairline" />
              <Fact label={t.finance.hero.floorLabel} value={formatCurrencyCompact(CASH_FLOOR)} />
              <span aria-hidden className="h-3 w-px bg-hairline" />
              <Fact
                label={t.finance.hero.forecastEndingLabel}
                value={formatCurrencyCompact(forecast.ending)}
                testId="runway-forecast-ending"
              />
            </dl>
          </div>

        </div>

        {/* 仪表本体：移动端紧跟在现金数字之后，桌面在右列并跨两行 */}
        <div className="order-2 flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-body font-semibold">{t.finance.hero.forecastLabel}</span>
            <span className="text-label text-muted-foreground">
              {t.finance.cashflow.weekCount(FORECAST_WEEKS)}
            </span>
          </div>

          <RunwayChart
            points={points}
            floor={CASH_FLOOR}
            summary={{ ending: forecast.ending, net: forecast.net, trough: forecast.trough.value }}
            readout={readout}
            reading={readoutIndex !== null}
            pinned={pinnedIndex !== null}
            onRead={read}
            onPin={(index) => setPinnedIndex((current) => (current === index ? null : index))}
            onReset={() => {
              setPinnedIndex(null)
              setHoverIndex(null)
            }}
          />

          <p className="text-label text-pretty text-muted-foreground">
            {t.finance.hero.chartCaption}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-hairline pt-4">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2 shrink-0 items-center justify-center">
                <span
                  aria-hidden
                  className="absolute size-2 rounded-full bg-success/35 [animation:live-halo_3.2s_ease-out_infinite]"
                />
                <span className="relative size-1.5 rounded-full bg-success" />
              </span>
              <span className="text-label font-medium">{t.finance.hero.live}</span>
              <span className="hidden text-label text-muted-foreground sm:inline">
                {t.finance.hero.liveHint}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenCashflow}
              data-testid="runway-action"
              className="group/cta inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-field py-1 text-body-sm font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {t.finance.hero.action}
              <ArrowRightIcon className="size-3.5 transition-transform duration-hover group-hover/cta:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* 假设面板：桌面在主视觉下方左列，移动端排在图形之后 */}
        <div className="order-3 lg:col-start-1 lg:row-start-2">
          <AssumptionPanel
            assumptions={assumptions}
            onChange={setAssumption}
            runwayMonths={runwayValue}
          />
        </div>
      </div>
    </OpenSection>
  )
}

function Fact({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="numeric font-medium text-foreground/85" data-testid={testId}>
        {value}
      </dd>
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* 跑道图形                                                                    */
/* -------------------------------------------------------------------------- */

interface RunwayPoint {
  index: number
  label: string
  closing: number
  stress: number
  optimized: number
  inflow: number
  outflow: number
  net: number
}

/**
 * 手写 SVG 而不是再挂一个图表库实例。
 *
 * 理由不是"省依赖"，而是**这条图形需要三个库不直接支持的东西**：一条由两个
 * 情景夹出来的区间带、一条贯穿全宽的地平线（警戒线）、以及一个可以固定住的
 * 光标。三者都要共用同一套坐标，交给库反而要在库的抽象里绕一圈。
 *
 * 坐标一律用百分比（viewBox 0 0 100 100 + preserveAspectRatio="none"），
 * 因此文字绝不放进 SVG——文字用 HTML 叠在图上，不会被拉伸。
 */
const PLOT_HEIGHT = 100
const PAD_TOP = 8
const PAD_BOTTOM = 6

function RunwayChart({
  points,
  floor,
  summary,
  readout,
  reading,
  pinned,
  onRead,
  onPin,
  onReset,
}: {
  points: RunwayPoint[]
  floor: number
  /** 预测结论：不读数时，这条预留带回答"这一轮推演的结论是什么"。 */
  summary: { ending: number; net: number; trough: number }
  readout: RunwayPoint | null
  reading: boolean
  pinned: boolean
  onRead: (index: number | null) => void
  onPin: (index: number | null) => void
  onReset: () => void
}) {
  const t = useMessages()
  const gradientId = useId()
  const plotRef = useRef<HTMLDivElement>(null)

  const geometry = useMemo(() => {
    const values = points.flatMap((point) => [point.closing, point.stress, point.optimized])
    const min = Math.min(floor * 0.72, ...values)
    const max = Math.max(...values)
    const span = max - min || 1

    const x = (index: number) => (index / Math.max(1, points.length - 1)) * 100
    const y = (value: number) =>
      PAD_TOP + (1 - (value - min) / span) * (PLOT_HEIGHT - PAD_TOP - PAD_BOTTOM)

    const line = (pick: (point: RunwayPoint) => number) =>
      points
        .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(pick(point)).toFixed(2)}`)
        .join(" ")

    const band = `${line((point) => point.optimized)} L100,${y(points[points.length - 1].closing).toFixed(2)} L0,${y(points[0].closing).toFixed(2)} Z`

    return {
      x,
      y,
      base: line((point) => point.closing),
      stress: line((point) => point.stress),
      band,
      floorY: y(floor),
      area: `${line((point) => point.closing)} L100,${PLOT_HEIGHT} L0,${PLOT_HEIGHT} Z`,
      max,
      min,
    }
  }, [points, floor])

  /** 指针位置 → 最近的一周：读数跟着光标走，不是按固定步长跳。 */
  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = plotRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    onRead(Math.round(ratio * (points.length - 1)))
  }

  const activeIndex = readout
    ? points.findIndex((point) => point.index === readout.index)
    : -1
  const activeX = activeIndex >= 0 ? geometry.x(activeIndex) : 0
  const activeY = readout ? geometry.y(readout.closing) : 0

  return (
    <div className="flex flex-col gap-3">
      {/* 读数带：图形上方预留的位置，所以它永远不遮挡曲线 */}
      <div className="flex min-h-[3.75rem] flex-col gap-1.5">
        <span className="eyebrow flex items-center gap-2 text-muted-foreground/70">
          <CrosshairIcon
            className={cn(
              "size-3 transition-colors duration-hover",
              reading ? "text-brand" : "text-muted-foreground/50"
            )}
          />
          {reading && readout
            ? t.finance.hero.reading(readout.label)
            : pinned
              ? t.finance.hero.pinned
              : t.finance.hero.readHint}
        </span>

        {readout && reading ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1" data-testid="runway-readout">
            <span className="numeric text-numeric text-brand">
              {formatCurrencyCompact(readout.closing)}
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-muted-foreground">
              <span>
                {t.finance.hero.weekInflow}{" "}
                <span className="numeric text-foreground/80">{formatCurrencyCompact(readout.inflow)}</span>
              </span>
              <span>
                {t.finance.hero.weekOutflow}{" "}
                <span className="numeric text-foreground/80">{formatCurrencyCompact(readout.outflow)}</span>
              </span>
              <span>
                {t.finance.hero.weekNet}{" "}
                <span
                  className={cn(
                    "numeric",
                    readout.net >= 0 ? "text-success" : "text-danger"
                  )}
                >
                  {formatCurrencyCompact(readout.net)}
                </span>
              </span>
            </span>
            {pinned ? (
              <button
                type="button"
                onClick={onReset}
                data-testid="runway-readout-reset"
                className="cursor-pointer rounded-field py-1 text-label font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {t.finance.hero.reset}
              </button>
            ) : null}
          </div>
        ) : (
          /* 不读数时，这条预留带回答另一个问题：这一轮推演的结论是什么。 */
          <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-label text-muted-foreground">
            <span>
              {t.finance.cashflow.endingLabel}{" "}
              <span className="numeric text-foreground/80">
                {formatCurrencyCompact(summary.ending)}
              </span>
            </span>
            <span>
              {t.finance.cashflow.netLabel}{" "}
              <span className={cn("numeric", summary.net >= 0 ? "text-success" : "text-danger")}>
                {summary.net >= 0 ? "+" : "−"}
                {formatCurrencyCompact(Math.abs(summary.net))}
              </span>
            </span>
            <span>
              {t.finance.cashflow.troughLabel}{" "}
              <span className="numeric text-foreground/80">
                {formatCurrencyCompact(summary.trough)}
              </span>
            </span>
          </span>
        )}
      </div>

      <div className="relative">
        <div
          ref={plotRef}
          role="img"
          aria-label={t.finance.hero.chartLabel}
          data-testid="runway-chart"
          className="runway-rules relative h-[240px] w-full cursor-crosshair sm:h-[300px]"
          onPointerMove={handleMove}
          onPointerLeave={() => onRead(null)}
          onPointerDown={() => onPin(readout ? readout.index : null)}
        >
          <svg
            aria-hidden
            viewBox={`0 0 100 ${PLOT_HEIGHT}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
                <stop offset="55%" stopColor="var(--brand)" stopOpacity={0.08} />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* 压力—优化区间：由两种情景各跑一遍预测得到 */}
            <path d={geometry.band} fill="var(--runway-band)" />
            <path d={geometry.area} fill={`url(#${gradientId})`} />

            {/* 压力情景：虚线，用来回答"如果回款变慢会怎样" */}
            <path
              d={geometry.stress}
              fill="none"
              stroke="var(--data-risk)"
              strokeOpacity={0.5}
              strokeWidth={1.25}
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />

            {/* 基准预测：唯一一处光晕 */}
            <path
              d={geometry.base}
              fill="none"
              stroke="var(--brand)"
              strokeWidth={2}
              className="chart-glow"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 警戒线：贯穿全宽的地平线 */}
            <line
              x1={0}
              x2={100}
              y1={geometry.floorY}
              y2={geometry.floorY}
              stroke="var(--runway-floor)"
              strokeWidth={1}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />

            {/* 当前点 */}
            <circle
              cx={0}
              cy={geometry.y(points[0].closing)}
              r={3}
              fill="var(--brand)"
              stroke="var(--surface)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />

            {/* 光标 */}
            {readout ? (
              <>
                <line
                  x1={activeX}
                  x2={activeX}
                  y1={PAD_TOP - 4}
                  y2={PLOT_HEIGHT - PAD_BOTTOM + 2}
                  stroke="var(--brand)"
                  strokeOpacity={0.35}
                  strokeWidth={1}
                  strokeDasharray="3 4"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={activeX}
                  cy={activeY}
                  r={3.5}
                  fill="var(--brand)"
                  stroke="var(--surface)"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </>
            ) : null}
          </svg>

          {/* 警戒线的读数——它必须被看见，所以它有名字 */}
          <span
            className="pointer-events-none absolute right-0 -translate-y-1/2 rounded-field bg-surface/85 px-1.5 py-0.5 text-label text-danger backdrop-blur-sm"
            style={{ top: `${geometry.floorY}%` }}
          >
            {t.finance.cashflow.breachLabel} {formatCurrencyCompact(floor)}
          </span>

          {/* 时间轴刻度：每两周一个标签，最后一周必须出现 */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-5 flex justify-between text-label text-muted-foreground">
            {points
              .filter((_, index) => index % 2 === 0 || index === points.length - 1)
              .map((point) => (
                <span key={point.index} className="numeric -translate-x-1/2 first:translate-x-0 last:translate-x-0">
                  {point.label}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 假设面板                                                                    */
/* -------------------------------------------------------------------------- */

const SLIDERS = [
  { key: "revenueFactor", min: 0.6, max: 1.2, step: 0.01 },
  { key: "costFactor", min: 0.75, max: 1.25, step: 0.01 },
  { key: "collectionRate", min: 0.5, max: 1.4, step: 0.01 },
] as const

/**
 * 三个真实滑杆。
 *
 * 它们不是"演示控件"：每一次拖动都会重算跑道、警戒线日期、90 天曲线，
 * 以及洞察层里那条情景结论。滑杆用原生 `range`，样式只取令牌——
 * 没有为了一个控件引入新的滑块组件。
 */
function AssumptionPanel({
  assumptions,
  onChange,
  runwayMonths,
}: {
  assumptions: Assumptions
  onChange: (key: keyof Assumptions, value: number) => void
  runwayMonths: number
}) {
  const t = useMessages()

  const labelOf = (key: keyof Assumptions) =>
    key === "revenueFactor"
      ? t.finance.scenario.revenueFactor
      : key === "costFactor"
        ? t.finance.scenario.costFactor
        : t.finance.scenario.collectionRate

  const hintOf = (key: keyof Assumptions) =>
    key === "revenueFactor"
      ? t.finance.scenario.revenueHint
      : key === "costFactor"
        ? t.finance.scenario.costHint
        : t.finance.scenario.collectionHint

  return (
    <div className="flex flex-col gap-3.5 border-t border-hairline pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="eyebrow flex items-center gap-2 text-muted-foreground/70">
          <GaugeIcon className="size-3" />
          {t.finance.scenario.title}
        </span>
        <span className="text-label text-muted-foreground">
          {t.finance.scenario.runwayNow}{" "}
          <span className="numeric font-medium text-foreground/85">
            {t.finance.scenario.months(formatRatio(runwayMonths))}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {SLIDERS.map((slider) => (
          <label key={slider.key} className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-label font-medium">{labelOf(slider.key)}</span>
              <span className="numeric text-label text-brand">
                {assumptions[slider.key].toFixed(2)}
              </span>
            </span>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={assumptions[slider.key]}
              aria-label={labelOf(slider.key)}
              data-testid={`assumption-${slider.key}`}
              onChange={(event) => onChange(slider.key, Number(event.target.value))}
              className="assumption-slider"
            />
            <span className="text-[0.6875rem] leading-snug text-muted-foreground">
              {hintOf(slider.key)}
            </span>
          </label>
        ))}
      </div>

      <p className="text-label text-muted-foreground">{t.finance.hero.baselineNote}</p>
    </div>
  )
}
