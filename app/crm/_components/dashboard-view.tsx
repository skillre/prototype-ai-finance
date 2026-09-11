"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "motion/react"
import { ArrowUpRightIcon, ListChecksIcon } from "lucide-react"
import { SectionHeading } from "@/components/prototype/section-heading"
import { MetricItem, MetricStrip } from "@/components/prototype/metric-strip"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PIPELINE_SERIES,
  STAGE_COLORS,
  STATUS_META,
  TASK_COLUMNS,
  type CustomerStatus,
} from "@/lib/crm-data"
import {
  selectKpis,
  selectMonthlySeries,
  useCrmStore,
} from "@/stores/crm-store"
import {
  selectGrowthInsight,
  selectOwnerRanking,
  selectRiskInsight,
  selectSpotlightDeals,
  selectStageComposition,
} from "@/lib/insights"
import {
  formatCurrencyCompact,
  formatDateShort,
  formatRelativeHours,
  personInitials,
} from "@/lib/format"
import { groupActivitiesByDay } from "@/lib/activity-groups"
import { durations, easings } from "@/lib/motion-presets"
import { useMessages } from "@/components/i18n/locale-provider"
import { cn } from "@/lib/utils"
import { useCrmShell } from "./crm-shell"
import { RevenueHero } from "./revenue-hero"
import { AiInsightLayer } from "./ai-insight-layer"
import { OpportunitySpotlight } from "./opportunity-spotlight"
import { LiveDataLayer } from "./live-data-layer"

type DashboardViewProps = {
  onOpenCustomer: (customerId: string) => void
  onGoToTasks: () => void
  /** KPI 下钻：进入客户列表并按状态预筛选。 */
  onGoToCustomers: (filter?: { status?: CustomerStatus }) => void
  /** 机会雷达的出口：完整机会列表。 */
  onGoToOpportunities: () => void
}

/**
 * 总览 —— AI Sales Command Center 的主屏。
 *
 * 这个页面的任务不是"把数据都放上来"，而是回答一个问题：
 * **第一眼应该看到什么？**
 *
 *   1. Revenue Intelligence Hero —— 合同总额 + 长在图形里的读数（唯一的主角）
 *   2. AI 洞察层 —— 产品开口说话：增长归因 + 风险预警
 *   3. 机会雷达 —— 下一步该推的三个机会（编辑式编号区块）
 *   4. 数据可视化 —— 管道构成 + 负责人排行（58 / 42，非对称）
 *   5. 次级指标带 —— 四个指标 + 真实迷你走势，没有卡片
 *   6. 实时数据流 + 最近动态 —— 正在发生的事
 *   7. 任务队列 + 高价值客户 —— 收尾的执行清单
 *
 * 全页只有 Hero 有自己的光源；其余区块靠留白、hairline 与字号层次建立结构，
 * 没有一处用 Card 包裹——需要 elevation 的只有浮层。
 */
export function DashboardView({
  onOpenCustomer,
  onGoToTasks,
  onGoToCustomers,
  onGoToOpportunities,
}: DashboardViewProps) {
  const t = useMessages()
  const customers = useCrmStore((s) => s.customers)
  const activities = useCrmStore((s) => s.activities)
  const tasks = useCrmStore((s) => s.tasks)
  const syncing = useCrmStore((s) => s.status === "loading")

  const { focusRequest, clearFocus } = useCrmShell()

  /** 悬停 AI 洞察里的客户实体时，同名记录在下方同步高亮（签名交互之二）。 */
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  /* ---- 派生数据：全部来自真实 customers / activities -------------------- */

  const kpis = useMemo(() => selectKpis(customers), [customers])
  const growth = useMemo(() => selectGrowthInsight(PIPELINE_SERIES, customers), [customers])
  const risk = useMemo(() => selectRiskInsight(customers), [customers])
  const spotlight = useMemo(() => selectSpotlightDeals(customers, 3), [customers])
  const composition = useMemo(() => selectStageComposition(customers), [customers])
  const ownerRanking = useMemo(() => selectOwnerRanking(customers), [customers])
  const monthly = useMemo(() => selectMonthlySeries(customers, 12), [customers])

  /* ---- 最近动态：开放时间线，并按真实时间戳分组 ------------------------- */

  const activityGroups = useMemo(() => {
    const sorted = [...activities].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7)
    return groupActivitiesByDay(sorted).map((group) => ({
      ...group,
      items: group.items.map((event) => ({
        ...event,
        company: customers.find((c) => c.id === event.customerId)?.company ?? t.common.notAvailable,
      })),
    }))
  }, [activities, customers, t])

  /* ---- 任务：按到期时间排序的优先队列 ----------------------------------- */

  const openTasks = useMemo(
    () =>
      TASK_COLUMNS.map((column) => ({
        column,
        meta: t.tasks.columns[column.id],
        items: tasks[column.id] ?? [],
      })),
    [tasks, t]
  )

  const taskQueue = useMemo(
    () =>
      openTasks
        .flatMap(({ column, meta, items }) => items.map((task) => ({ task, column, meta })))
        .sort((a, b) => a.task.due.localeCompare(b.task.due))
        .slice(0, 5),
    [openTasks]
  )

  const totalOpen = openTasks.reduce((sum, group) => sum + group.items.length, 0)
  const dueThisWeek = openTasks
    .flatMap((group) => group.items)
    .filter((task) => task.due <= "2026-09-14").length

  const topAccounts = useMemo(
    () => [...customers].sort((a, b) => b.value - a.value).slice(0, 5),
    [customers]
  )

  /* ---- 侧栏「销售洞察」的落点：滚动到洞察层并短暂点亮 ------------------- */

  const insightRef = useRef<HTMLDivElement | null>(null)
  const [focused, setFocused] = useState(false)
  const flashTimers = useRef<number[]>([])

  // 卸载时清掉闪动计时器，避免对已经离开的页面写状态。
  useEffect(
    () => () => flashTimers.current.forEach((timer) => window.clearTimeout(timer)),
    []
  )

  useEffect(() => {
    if (focusRequest?.target !== "insight") return
    insightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    clearFocus()

    // 闪动是"我到了"的确认：亮起 1.8 秒后自行熄灭。计时器挂在 ref 上，
    // 这样 focusRequest 归零引起的 effect 重跑不会把它取消掉。
    flashTimers.current.forEach((timer) => window.clearTimeout(timer))
    flashTimers.current = [
      window.setTimeout(() => setFocused(true), 0),
      window.setTimeout(() => setFocused(false), 1800),
    ]
  }, [focusRequest, clearFocus])

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      {/* ================================================================ */}
      {/* 1. HERO —— 全页唯一的主角                                        */}
      {/* ================================================================ */}
      <RevenueHero
        series={PIPELINE_SERIES}
        revenue={kpis.revenue}
        growth={growth.growth}
        onGoToTasks={onGoToTasks}
      />

      {/* ================================================================ */}
      {/* 2. AI 洞察层                                                     */}
      {/* ================================================================ */}
      <div
        ref={insightRef}
        className={cn(
          "rounded-panel transition-shadow duration-slow ease-standard",
          focused && "ring-2 ring-brand/30 ring-offset-4 ring-offset-background"
        )}
      >
        <AiInsightLayer
          growth={growth}
          risk={risk}
          highlightedId={highlightedId}
          onHighlight={setHighlightedId}
          onOpenCustomer={onOpenCustomer}
          onGoToCustomers={onGoToCustomers}
        />
      </div>

      {/* ================================================================ */}
      {/* 3. 机会雷达                                                      */}
      {/* ================================================================ */}
      <OpportunitySpotlight
        deals={spotlight}
        onOpenCustomer={onOpenCustomer}
        onViewAll={onGoToOpportunities}
      />

      {/* ================================================================ */}
      {/* 4. 数据可视化 58 / 42                                            */}
      {/* ================================================================ */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {/* 管道构成：一条构成条 + 可下钻的图例，取代"行 + 右值" */}
        <section className="flex min-w-0 flex-col gap-4">
          <SectionHeading
            title={t.dashboard.stage.title}
            description={t.dashboard.stage.description}
            action={
              <span className="flex items-baseline gap-2">
                <span className="eyebrow text-muted-foreground/60">
                  {t.dashboard.stage.total}
                </span>
                <span className="numeric text-body font-semibold">
                  {formatCurrencyCompact(composition.total)}
                </span>
              </span>
            }
          />

          <StageComposition
            slices={composition.slices}
            onDrilldown={(status) => onGoToCustomers({ status })}
            highlightedId={highlightedId}
            customers={customers}
          />
        </section>

        {/* 负责人排行：竖向视觉排行，取代头像行 + 进度条 */}
        <section className="flex min-w-0 flex-col gap-4">
          <SectionHeading
            eyebrow={t.dashboard.owners.sectionLabel}
            title={t.dashboard.owners.title}
            description={t.dashboard.owners.description}
          />

          <ul className="flex items-end gap-2 sm:gap-4" data-testid="owner-ranking">
            {ownerRanking.map((owner, index) => {
              const max = Math.max(1, ...ownerRanking.map((entry) => entry.value))
              const height = Math.max(6, (owner.value / max) * 100)
              return (
                <li key={owner.owner} className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="numeric truncate text-center text-label font-semibold">
                    {formatCurrencyCompact(owner.value)}
                  </span>

                  <span
                    className="relative flex h-24 w-full items-end overflow-hidden rounded-t-[5px] bg-border/40 sm:h-32"
                    title={t.dashboard.owners.rank(index + 1)}
                  >
                    <motion.span
                      className={cn(
                        "w-full rounded-t-[5px] bg-brand",
                        index === 1 && "bg-brand/70",
                        index === 2 && "bg-brand/50",
                        index === 3 && "bg-brand/35",
                        index >= 4 && "bg-brand/25"
                      )}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{
                        duration: durations.slow,
                        ease: easings.outExpo,
                        delay: index * 0.06,
                      }}
                    />
                  </span>

                  <span className="flex min-w-0 flex-col items-center gap-0.5">
                    <span className="w-full truncate text-center text-label font-medium">
                      {owner.owner}
                    </span>
                    <span className="numeric text-[0.6875rem] text-muted-foreground">
                      {t.dashboard.owners.deals(owner.count)}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {/* ================================================================ */}
      {/* 5. 次级指标 —— 没有卡片，只有排版、竖分隔线与真实迷你走势          */}
      {/* ================================================================ */}
      <MetricStrip label={t.dashboard.metrics.sectionLabel}>
        <MetricItem
          label={t.dashboard.kpi.totalCustomers}
          value={kpis.totalCustomers}
          trend={monthly.map((point) => point.cumulative)}
          trendLabel={t.dashboard.metrics.trend(t.dashboard.kpi.totalCustomers)}
          hint={t.dashboard.metrics.cumulativeHint}
          testId="kpi-total-customers"
          activateLabel={t.dashboard.kpi.viewAllCustomers}
          onActivate={() => onGoToCustomers()}
        />
        <MetricItem
          label={t.dashboard.kpi.newThisMonth}
          value={kpis.newThisMonth}
          delta={18.2}
          deltaLabel={t.dashboard.kpi.vsLastMonth}
          trend={monthly.map((point) => point.added)}
          trendLabel={t.dashboard.metrics.trend(t.dashboard.kpi.newThisMonth)}
          testId="kpi-new-this-month"
          activateLabel={t.dashboard.kpi.viewAllCustomers}
          onActivate={() => onGoToCustomers()}
        />
        <MetricItem
          label={t.dashboard.kpi.activeDeals}
          value={kpis.activeDeals}
          trend={monthly.map((point) => point.openDeals)}
          trendLabel={t.dashboard.metrics.trend(t.dashboard.kpi.activeDeals)}
          hint={t.dashboard.kpi.viewOpenLeads}
          testId="kpi-active-deals"
          activateLabel={t.dashboard.kpi.viewOpenLeads}
          onActivate={() => onGoToCustomers({ status: "lead" })}
        />
        <MetricItem
          label={t.dashboard.kpi.conversionRate}
          value={kpis.conversionRate}
          format="percent"
          delta={2.1}
          deltaLabel={t.dashboard.kpi.closedWonShare}
          trend={monthly.map((point) => point.conversion)}
          trendLabel={t.dashboard.metrics.trend(t.dashboard.kpi.conversionRate)}
          testId="kpi-conversion-rate"
          activateLabel={t.dashboard.kpi.viewActive}
          onActivate={() => onGoToCustomers({ status: "active" })}
        />
      </MetricStrip>

      {/* ================================================================ */}
      {/* 6. 实时数据流 42 / 动态 58                                        */}
      {/* ================================================================ */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {/* 最近动态：开放时间线，按天分组 */}
        <section className="flex min-w-0 flex-col gap-4">
          <SectionHeading
            title={t.dashboard.recentActivity.title}
            description={t.dashboard.recentActivity.description}
          />

          <div className="flex flex-col gap-4">
            {activityGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-1">
                <span className="eyebrow pb-1 text-muted-foreground/50">
                  {t.common.activityGroups[group.key]}
                </span>

                <ul className="flex flex-col">
                  {group.items.map((event, index) => (
                    <li key={event.id} className="relative">
                      {/* 时间线导轨：只在组内相邻条目之间绘制。 */}
                      {index < group.items.length - 1 ? (
                        <span
                          aria-hidden
                          className="absolute top-6 left-[9px] h-[calc(100%-0.5rem)] w-px bg-muted-foreground/20"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onOpenCustomer(event.customerId)}
                        aria-label={t.dashboard.recentActivity.open(event.company, event.title)}
                        className="group/row relative flex w-full cursor-pointer items-start gap-3 rounded-field py-2 pr-2 pl-0 text-left outline-none transition-colors duration-hover ease-standard hover:bg-brand-soft/35 focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <span className="relative z-10 mt-1 flex size-[19px] shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface text-[7px] font-semibold text-muted-foreground transition-colors duration-hover group-hover/row:border-brand/40 group-hover/row:bg-brand-soft group-hover/row:text-brand">
                          {personInitials(event.actor, 1)}
                        </span>

                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-body-sm font-medium">{event.title}</span>
                          <span className="truncate text-label text-muted-foreground">
                            {event.company} · {event.actor} · {event.time}
                          </span>
                        </span>

                        <ArrowUpRightIcon className="mt-1.5 size-3.5 shrink-0 text-muted-foreground/0 transition-all duration-hover group-hover/row:-translate-y-0.5 group-hover/row:translate-x-0.5 group-hover/row:text-brand" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 实时数据流：真实事件按节奏推入 */}
        <LiveDataLayer
          activities={activities}
          customers={customers}
          syncing={syncing}
          onOpenCustomer={onOpenCustomer}
        />
      </div>

      {/* ================================================================ */}
      {/* 7. 任务队列 58 / 高价值客户 42                                    */}
      {/* ================================================================ */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section className="flex min-w-0 flex-col gap-4">
          <SectionHeading
            title={t.dashboard.tasksOverview.title}
            description={t.dashboard.tasksOverview.summary(totalOpen, dueThisWeek)}
            action={
              <Button type="button" variant="outline" size="sm" onClick={onGoToTasks}>
                {t.dashboard.tasksOverview.openBoard}
              </Button>
            }
          />

          <ul className="flex flex-col" data-testid="task-queue">
            {taskQueue.map(({ task, meta }) => {
              const overdue = task.due < "2026-09-10"
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={onGoToTasks}
                    aria-label={t.dashboard.tasksOverview.openColumn(meta.title)}
                    className="group/task flex w-full cursor-pointer items-center gap-3 border-b border-hairline py-2.5 text-left outline-none transition-colors duration-hover ease-standard last:border-b-0 hover:bg-brand-soft/35 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span
                      className={cn(
                        "numeric w-16 shrink-0 text-label font-medium whitespace-nowrap",
                        overdue ? "text-warning" : "text-muted-foreground"
                      )}
                    >
                      {formatDateShort(task.due)}
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-body-sm font-medium">{task.title}</span>
                      <span className="flex items-center gap-2">
                        <span className="relative h-0.5 w-12 shrink-0 overflow-hidden rounded-full bg-border/70">
                          <span
                            className={cn(
                              "absolute inset-y-0 left-0 rounded-full",
                              overdue ? "bg-warning" : "bg-brand"
                            )}
                            style={{ width: `${task.progress}%` }}
                          />
                        </span>
                        <span className="truncate text-label text-muted-foreground">
                          {task.company}
                        </span>
                      </span>
                    </span>

                    <Badge
                      variant="outline"
                      className="hidden shrink-0 text-label font-normal text-muted-foreground sm:inline-flex"
                    >
                      {meta.title}
                    </Badge>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* 洞察块：品牌左轨 + 排版，不是又一个色块 */}
          <div className="mt-1 flex items-start gap-3 border-l-2 border-brand/45 pl-3.5">
            <ListChecksIcon className="mt-0.5 size-3.5 shrink-0 text-brand" />
            <p className="text-caption text-pretty text-muted-foreground">
              {t.dashboard.tasksOverview.insight(dueThisWeek, t.tasks.columns["follow-up"].title)}
            </p>
          </div>
        </section>

        {/* 高价值客户：编号排版排行，而不是又一张表格 */}
        <section className="flex min-w-0 flex-col gap-4">
          <SectionHeading
            title={t.dashboard.accounts.title}
            description={t.dashboard.accounts.description}
            action={
              <span className="numeric text-label text-muted-foreground">
                {t.dashboard.accounts.showingTop(topAccounts.length, customers.length)}
              </span>
            }
          />

          <ul className="flex flex-col" data-testid="top-accounts">
            {topAccounts.map((customer, index) => {
              const meta = STATUS_META[customer.status]
              const value =
                customer.value > 0 ? formatCurrencyCompact(customer.value) : t.common.notAvailable
              const highlighted = highlightedId === customer.id

              return (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => onOpenCustomer(customer.id)}
                    onMouseEnter={() => setHighlightedId(customer.id)}
                    onMouseLeave={() => setHighlightedId(null)}
                    aria-label={t.dashboard.accounts.open(customer.company, value)}
                    className={cn(
                      "group/acct relative flex w-full cursor-pointer items-center gap-3 border-b border-hairline py-3 pr-1 pl-3 text-left outline-none",
                      "transition-colors duration-hover ease-standard last:border-b-0 hover:bg-brand-soft/35 focus-visible:ring-2 focus-visible:ring-ring/50",
                      highlighted && "bg-brand-soft/50"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-1.5 left-0 w-[2px] origin-center rounded-r-full bg-brand transition-transform duration-hover ease-standard",
                        highlighted ? "scale-y-100" : "scale-y-0 group-hover/acct:scale-y-100"
                      )}
                    />

                    <span className="numeric w-6 shrink-0 text-label text-muted-foreground/45">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate text-body-sm font-semibold">
                        {customer.company}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
                        <span className="truncate text-label text-muted-foreground">
                          {t.status[customer.status]} · {customer.owner} ·{" "}
                          {formatRelativeHours(customer.lastTouchHours)}
                        </span>
                      </span>
                    </span>

                    <span className="numeric shrink-0 text-subtitle font-semibold">{value}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 管道构成                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 阶段分布 —— 一条构成条 + 可下钻的图例。
 *
 * 原来的"每一行一个条 + 右侧金额"是报表的形状；把它压成**一条**按金额切分
 * 的构成条之后，"管道由什么组成"变成一眼可读的事实，而每个阶段仍然可以
 * 单独点击下钻（构成条片段与图例行都是真实入口）。
 */
function StageComposition({
  slices,
  onDrilldown,
  highlightedId,
  customers,
}: {
  slices: { status: CustomerStatus; count: number; value: number; share: number }[]
  onDrilldown: (status: CustomerStatus) => void
  highlightedId: string | null
  customers: { id: string; status: CustomerStatus }[]
}) {
  const t = useMessages()
  const visible = slices.filter((slice) => slice.share > 0 && slice.status !== "churned")

  /** 高亮的客户落在哪个阶段——构成条上对应的片段随即被点亮。 */
  const highlightedStage = highlightedId
    ? customers.find((customer) => customer.id === highlightedId)?.status
    : undefined

  return (
    <div className="flex flex-col gap-5" data-testid="stage-breakdown">
      <div className="flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-border/40">
        {visible.map((slice) => (
          <button
            key={slice.status}
            type="button"
            onClick={() => onDrilldown(slice.status)}
            aria-label={t.dashboard.stage.drilldown(t.status[slice.status])}
            style={{
              flexGrow: slice.share,
              background: STAGE_COLORS[slice.status],
            }}
            className={cn(
              "h-full cursor-pointer outline-none transition-opacity duration-hover ease-standard",
              "hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50",
              highlightedStage && highlightedStage !== slice.status && "opacity-35"
            )}
          />
        ))}
      </div>

      <ul className="flex flex-col">
        {slices.map((slice) => {
          const meta = STATUS_META[slice.status]
          const dimmed = highlightedStage !== undefined && highlightedStage !== slice.status
          return (
            <li key={slice.status}>
              <button
                type="button"
                onClick={() => onDrilldown(slice.status)}
                aria-label={t.dashboard.stage.drilldown(t.status[slice.status])}
                className={cn(
                  "group/stage flex w-full cursor-pointer items-center gap-3 border-b border-hairline py-2.5 text-left outline-none",
                  "transition-colors duration-hover ease-standard last:border-b-0 hover:bg-brand-soft/35 focus-visible:ring-2 focus-visible:ring-ring/50",
                  dimmed && "opacity-45"
                )}
              >
                <span className="flex w-24 shrink-0 items-center gap-2">
                  <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
                  <span className="truncate text-body-sm font-medium">{t.status[slice.status]}</span>
                </span>

                <span className="numeric flex-1 text-label text-muted-foreground">
                  {t.dashboard.stage.shareOf(Math.round(slice.share))}
                </span>

                <span className="numeric w-20 shrink-0 text-right text-body-sm font-semibold sm:w-24">
                  {slice.value > 0 ? formatCurrencyCompact(slice.value) : t.common.notAvailable}
                </span>

                <span className="numeric w-14 shrink-0 text-right text-label text-muted-foreground">
                  {t.dashboard.stage.countUnit(slice.count)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="text-label text-muted-foreground/70">{t.dashboard.stage.excludeHint}</p>
    </div>
  )
}
