"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { motion } from "motion/react"
import { ArrowRightIcon, ArrowUpRightIcon, CrosshairIcon } from "lucide-react"
import { OpenSection } from "@/components/prototype/open-section"
import { AnimatedNumber } from "@/components/motion/animated-number"
import type { PipelinePoint } from "@/lib/crm-data"
import { formatCurrencyCompact } from "@/lib/format"
import { durations, easings } from "@/lib/motion-presets"
import { useMessages } from "@/components/i18n/locale-provider"
import { cn } from "@/lib/utils"

/** 统计区间——真实切换图表数据，并重放一次绘制动画。 */
export type RangeKey = 12 | 6 | 3
const RANGES: RangeKey[] = [12, 6, 3]

/** 图形上方预留给读数面板的高度：读数浮在图形的空白区里，而不是浮在折线上。 */
const READOUT_BAND = 104

type RevenueHeroProps = {
  /** 完整 12 个月序列；组件按区间自行切片。 */
  series: PipelinePoint[]
  /** 合同总额（年度口径），页面唯一的 `text-metric`。 */
  revenue: number
  /** 本月环比上月增长（百分比，一位小数）。 */
  growth: number
  onGoToTasks: () => void
}

/**
 * Revenue Intelligence Hero —— 全页的第一视觉焦点。
 *
 * 与"BI 仪表盘"的区别不在特效，而在**数字与图形的关系**：
 *
 *   1. 图形没有容器。它不是一张卡，而是 Hero 区域本身的下半部分。
 *   2. 读数面板就长在图形里面。鼠标划过时，"9月 读数"在图形左上角
 *      直接读出当月已签约、在谈管道与覆盖倍数——数据读数与数据视觉
 *      占用同一个版面位置，而不是在旁边浮一个 tooltip。
 *   3. 点击可以**固定**读数（指针离开也不消失），「回到当月」把它放掉。
 *      于是读数对触屏与键盘用户同样可用，而不是只服务 hover。
 *   4. 图上的网格被遮罩裁切、只有一条光标线、一个 active dot、一处
 *      折线光晕——一屏一个光源，其余全部让位给数字。
 */
export function RevenueHero({ series, revenue, growth, onGoToTasks }: RevenueHeroProps) {
  const t = useMessages()
  const [range, setRange] = useState<RangeKey>(12)
  const [hoverMonth, setHoverMonth] = useState<string | null>(null)
  const [pinnedMonth, setPinnedMonth] = useState<string | null>(null)

  const trend = useMemo(
    () => series.slice(Math.max(0, series.length - range)),
    [series, range]
  )

  /** 每个月的环比：读数面板要能说出"这个月比上个月涨了多少"。 */
  const monthDelta = useMemo(() => {
    const map = new Map<string, number>()
    series.forEach((point, index) => {
      const previous = series[index - 1]
      if (!previous || previous.won === 0) return
      map.set(point.month, ((point.won - previous.won) / previous.won) * 100)
    })
    return map
  }, [series])

  const current = trend[trend.length - 1]
  const readMonth = hoverMonth ?? pinnedMonth
  const readPoint = (readMonth ? trend.find((point) => point.month === readMonth) : null) ?? current
  const reading = readPoint.month !== current?.month
  const delta = monthDelta.get(readPoint.month)
  const coverage = readPoint.won > 0 ? readPoint.pipeline / readPoint.won : 0

  const changeRange = (value: RangeKey) => {
    setRange(value)
    setHoverMonth(null)
    setPinnedMonth(null)
  }

  /* 统一的读数回调：Tooltip 内容探针在激活/离开时上报当前月份。 */
  const read = useCallback((month: string | null) => setHoverMonth(month), [])

  return (
    <OpenSection
      ambient="hero"
      className="-mx-4 sm:-mx-6"
      contentClassName="flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"
    >
      {/* 顶栏：区块身份 + 区间切换 */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <span className="eyebrow text-muted-foreground/60">
          <span aria-hidden className="section-tick" />
          {t.dashboard.hero.sectionLabel}
        </span>

        <div
          role="group"
          aria-label={t.dashboard.hero.rangeLabel}
          className="inline-flex items-center gap-0.5 rounded-field border border-border/60 bg-surface/70 p-0.5"
        >
          {RANGES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={range === value}
              onClick={() => changeRange(value)}
              data-testid={`hero-range-${value}`}
              className={cn(
                "h-7 cursor-pointer rounded-[7px] px-2.5 text-label font-medium tabular-nums transition-colors duration-hover ease-standard outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                range === value
                  ? "bg-brand text-brand-foreground shadow-subtle"
                  : "text-muted-foreground hover:bg-interactive hover:text-foreground"
              )}
            >
              {t.dashboard.hero.range[`m${value}`]}
            </button>
          ))}
        </div>
      </div>

      {/* 第一视觉：合同总额 */}
      <div className="flex flex-col gap-3" data-testid="kpi-revenue">
        <span className="eyebrow text-muted-foreground/70">{t.dashboard.kpi.revenue}</span>

        <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
          <HeroNumber value={revenue} />
          <span className="inline-flex items-center gap-1 text-body font-medium text-success">
            <ArrowUpRightIcon className="size-4" />
            <span className="numeric">{signedPercent(growth)}</span>
            <span className="text-label font-normal text-muted-foreground">
              {t.dashboard.hero.growthLabel}
            </span>
          </span>
        </div>
      </div>

      {/* 图形 —— 不是 Card，是 Hero 的下半身 */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-body font-semibold">{t.dashboard.pipeline.title}</span>
          <span className="text-label text-muted-foreground">{t.dashboard.pipeline.description}</span>
        </div>

        <div className="relative -mx-4 sm:-mx-6">
          <motion.div
            key={range}
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 1 }}
            transition={{ duration: durations.normal, ease: easings.outExpo }}
            className="relative h-[318px] w-full sm:h-[400px]"
          >
            {/* 读数面板：长在图形里，不是浮在旁边的 tooltip */}
            <ChartReadout
              month={readPoint.month}
              won={readPoint.won}
              pipeline={readPoint.pipeline}
              delta={delta}
              coverage={coverage}
              reading={Boolean(reading)}
              /* 「回到当月」属于"固定"，不属于"悬停"：指针移开也必须还在。 */
              pinned={Boolean(pinnedMonth)}
              onReset={() => {
                setPinnedMonth(null)
                setHoverMonth(null)
              }}
            />

            <div
              className="absolute inset-0"
              data-testid="hero-chart"
              role="img"
              aria-label={t.dashboard.hero.chartLabel}
              onMouseDown={() => setPinnedMonth(readMonth ?? null)}
            >
              <HeroChart
                data={trend}
                rangeKey={range}
                onRead={read}
                topBand={READOUT_BAND}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* 落款：实时状态 + 唯一入口 */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-hairline pt-4">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2 shrink-0 items-center justify-center">
            <span
              aria-hidden
              className="absolute size-2 rounded-full bg-success/35 [animation:live-halo_3.2s_ease-out_infinite]"
            />
            <span className="relative size-1.5 rounded-full bg-success" />
          </span>
          <span className="text-label font-medium">{t.dashboard.hero.live}</span>
          <span className="hidden text-label text-muted-foreground sm:inline">
            {t.dashboard.hero.liveHint}
          </span>
        </div>

        <button
          type="button"
          onClick={onGoToTasks}
          aria-label={t.dashboard.kpi.viewSignedTasks}
          data-testid="kpi-revenue-action"
          className="group/cta inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-field py-1 text-body-sm font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {t.dashboard.hero.action}
          <ArrowRightIcon className="size-3.5 transition-transform duration-hover group-hover/cta:translate-x-0.5" />
        </button>
      </div>
    </OpenSection>
  )
}

/* -------------------------------------------------------------------------- */
/* 第一视觉的数字                                                              */
/* -------------------------------------------------------------------------- */

function HeroNumber({ value }: { value: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.enter, ease: easings.outExpo }}
      className="numeric text-metric"
    >
      <AnimatedNumber value={value} duration={durations.glacial} formatValue={formatCurrencyCompact} />
    </motion.span>
  )
}

/* -------------------------------------------------------------------------- */
/* 读数面板                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 图形内部的读数。
 *
 * 它占的是图形上方那条预留带——折线永远不会长到这里来——所以它既在图形
 * 里面，又从不遮挡数据。眉标会明确告诉你"正在读哪个月"，避免把月度读数
 * 误读成年度总额。
 */
function ChartReadout({
  month,
  won,
  pipeline,
  delta,
  coverage,
  reading,
  pinned,
  onReset,
}: {
  month: string
  won: number
  pipeline: number
  delta?: number
  coverage: number
  reading: boolean
  pinned: boolean
  onReset: () => void
}) {
  const t = useMessages()

  return (
    <div className="pointer-events-none absolute inset-x-4 top-0 z-10 sm:inset-x-6">
      <div className="flex max-w-[24rem] flex-col gap-2" data-testid="hero-readout">
        <span className="eyebrow flex items-center gap-2 text-muted-foreground/70">
          <CrosshairIcon
            className={cn("size-3 transition-colors duration-hover", reading ? "text-brand" : "text-muted-foreground/50")}
          />
          {reading ? t.dashboard.hero.reading(month) : t.dashboard.hero.readingHint}
        </span>

        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className={cn("numeric text-numeric", reading && "text-brand")}>
            <AnimatedNumber value={won} duration={durations.list} formatValue={formatCurrencyCompact} />
          </span>
          {delta !== undefined ? (
            <span
              className={cn(
                "numeric inline-flex items-center gap-0.5 text-label font-medium",
                delta >= 0 ? "text-success" : "text-danger"
              )}
            >
              <ArrowUpRightIcon className={cn("size-3", delta < 0 && "rotate-90")} />
              {signedPercent(delta)}
            </span>
          ) : null}
          <span className="text-label text-muted-foreground">{t.dashboard.hero.growthLabel}</span>
        </div>

        {/* 大数字本身就是"已签约"，这里不再重复一遍——一屏内同一个数字
            出现两次，读者会先怀疑哪个才是重点。 */}
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label">
          <ReadoutFact label={t.dashboard.hero.pipeline} value={formatCurrencyCompact(pipeline)} />
          <span aria-hidden className="h-3 w-px bg-hairline" />
          <ReadoutFact
            label={t.dashboard.hero.coverage}
            value={t.dashboard.hero.coverageValue(coverage.toFixed(1))}
          />
        </dl>

        {pinned ? (
          <button
            type="button"
            onClick={onReset}
            data-testid="hero-readout-reset"
            className="pointer-events-auto mt-0.5 w-fit cursor-pointer rounded-field py-1 text-label font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {t.dashboard.hero.reset}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function ReadoutFact({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="numeric font-medium text-foreground/80">{value}</dd>
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* 图形                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 近 12/6/3 个月已签约金额与在谈管道。
 *
 * `topBand` 是读数面板的预留高度——图形从它下面开始画，于是读数与折线
 * 共享同一块版面而永不相撞。这是"数字与数据视觉融合"能成立的技术前提。
 */
function HeroChart({
  data,
  rangeKey,
  onRead,
  topBand,
}: {
  data: PipelinePoint[]
  rangeKey: number
  onRead: (month: string | null) => void
  topBand: number
}) {
  const current = data[data.length - 1]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        key={rangeKey}
        data={data}
        margin={{ top: topBand, right: 22, left: 4, bottom: 0 }}
      >
        <defs>
          <linearGradient id="hero-won-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
            <stop offset="48%" stopColor="var(--chart-1)" stopOpacity={0.13} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.01} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" vertical={false} opacity={0.6} />

        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickMargin={9}
          interval="preserveStartEnd"
          minTickGap={14}
        />
        <YAxis
          orientation="right"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={(value: number) => formatCurrencyCompact(value)}
          width={50}
          domain={[0, niceCeiling(Math.max(...data.map((point) => point.pipeline)))]}
          tickCount={4}
        />

        {/*
          读数探针：不渲染任何可见内容，只把"光标当前在哪个月"上报给 Hero。
          recharts 的浮层在这里被刻意去掉——读数属于构图，不属于浮层。
        */}
        <Tooltip
          content={<ChartProbe onRead={onRead} />}
          cursor={{ stroke: "var(--brand)", strokeWidth: 1, strokeDasharray: "3 4" }}
        />

        {/* 在谈管道：虚线 + 品牌青，作为"潜力"的参照系 */}
        <Area
          type="monotone"
          dataKey="pipeline"
          stroke="var(--data-accent)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          fill="transparent"
          dot={false}
          activeDot={{ r: 3, fill: "var(--data-accent)", strokeWidth: 0 }}
          animationDuration={durations.glacial * 1000}
          animationEasing="ease-out"
        />

        {/* 已签约：实线 + 品牌渐变 + 唯一的一处光晕 */}
        <Area
          type="monotone"
          dataKey="won"
          stroke="var(--chart-1)"
          strokeWidth={2}
          className="chart-glow"
          fill="url(#hero-won-fill)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--surface)", strokeWidth: 2 }}
          animationDuration={durations.glacial * 1000}
          animationEasing="ease-out"
        />

        {/* 当前月：静止状态下的锚点，让"最新"这件事不依赖悬停 */}
        {current ? (
          <ReferenceDot
            x={current.month}
            y={current.won}
            r={4}
            fill="var(--chart-1)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ) : null}
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** 把 recharts 的悬停状态翻译成"当前月份"，其余一概不管。 */
function ChartProbe({
  active,
  payload,
  onRead,
}: {
  active?: boolean
  payload?: { payload?: PipelinePoint }[]
  onRead: (month: string | null) => void
}) {
  const month = active ? (payload?.[0]?.payload?.month ?? null) : null

  useEffect(() => {
    if (!month) return
    onRead(month)
    return () => onRead(null)
  }, [month, onRead])

  return null
}

/** 带符号的一位小数百分比："9.8" → "+9.8%"，"-2.4" → "-2.4%"。 */
function signedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

/**
 * 取一个"整洁"的 Y 轴上界：1.5 的倍数（¥150万 一档），并且刚好包住峰值。
 * 刻意**不加**额外余量——加了余量就会跳到下一档（438万 → 600万），
 * 两条曲线被压到下半屏，Hero 反而空了一半。
 */
function niceCeiling(max: number): number {
  const step = 1_500_000
  return Math.max(step, Math.ceil(max / step) * step)
}
