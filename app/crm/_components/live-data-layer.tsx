"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowUpRightIcon, RotateCcwIcon } from "lucide-react"
import { SectionHeading } from "@/components/prototype/section-heading"
import { durations, easings } from "@/lib/motion-presets"
import { useMessages } from "@/components/i18n/locale-provider"
import type { CrmActivity, CrmCustomer } from "@/lib/crm-data"
import { cn } from "@/lib/utils"

/** 初始可见条数与上限——一次只多出一条，永不变成一堵墙。 */
const SEED_COUNT = 3
const MAX_COUNT = 5
/** 新事件插入的节奏。慢到不打扰阅读，快到能在一次演示里被看见。 */
const STREAM_MS = 8000
/** 时钟刷新间隔。 */
const CLOCK_MS = 20_000

type LiveDataLayerProps = {
  activities: CrmActivity[]
  customers: CrmCustomer[]
  /** 数据同步中（store 处于 loading）时，指示灯切换为"正在同步"。 */
  syncing: boolean
  onOpenCustomer: (customerId: string) => void
}

/**
 * 实时数据层。
 *
 * "实时"这件事必须是真的，否则它只是又一个会呼吸的圆点：
 *
 *   • 事件来自**真实的活动数据**（`activities`），按时间倒序排队，每 8 秒
 *     推入一条，插入时做一次轻微的上浮——这是整页唯一一处持续动效。
 *   • 时钟是**真实时钟**，在客户端挂载后才渲染，避免服务端/客户端水合不一致。
 *   • 「重新播放」是真实动作：清空、复位到种子状态、重新开始推送。
 *   • 队列走完就停下并明说"已同步到最新一条"，而不是无限循环假装有数据。
 *
 * 它不是 Card：只有一条 hairline 标题栏 + 时间线式行列表，与右侧的动态
 * 时间线共用同一套语言，但节奏完全不同（一个是滚动流，一个是按天归档）。
 */
export function LiveDataLayer({
  activities,
  customers,
  syncing,
  onOpenCustomer,
}: LiveDataLayerProps) {
  const t = useMessages()

  const queue = useMemo(
    () => [...activities].sort((a, b) => b.at.localeCompare(a.at)),
    [activities]
  )

  /** 已经推入的事件总数——可以超过 MAX_COUNT，但那样只保留最新的几条。 */
  const [streamed, setStreamed] = useState(SEED_COUNT)
  const [clock, setClock] = useState<string | null>(null)
  const [runId, setRunId] = useState(0)

  // 真实时钟：挂载后才写，避免水合不一致。
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      )
    tick()
    const timer = window.setInterval(tick, CLOCK_MS)
    return () => window.clearInterval(timer)
  }, [])

  // 事件推送：一次一条，直到把队列走完（走完就停下并明说）。
  useEffect(() => {
    if (streamed >= queue.length) return
    const timer = window.setTimeout(() => setStreamed((count) => count + 1), STREAM_MS)
    return () => window.clearTimeout(timer)
  }, [streamed, queue.length, runId])

  const rows = useMemo(
    () =>
      queue.slice(0, Math.min(streamed, MAX_COUNT)).map((activity) => ({
        activity,
        company:
          customers.find((customer) => customer.id === activity.customerId)?.company ??
          t.common.notAvailable,
      })),
    [queue, streamed, customers, t]
  )

  const received = Math.max(0, Math.min(streamed, queue.length) - SEED_COUNT)
  const exhausted = streamed >= queue.length

  return (
    <section className="flex min-w-0 flex-col gap-4" data-testid="live-data-layer">
      <SectionHeading
        eyebrow={t.dashboard.live.sectionLabel}
        title={t.dashboard.live.title}
        description={t.dashboard.live.description}
        action={
          <span className="flex items-center gap-2" data-testid="live-status">
            <span className="relative flex size-2 shrink-0 items-center justify-center">
              <span
                aria-hidden
                className={cn(
                  "absolute size-2 rounded-full",
                  syncing
                    ? "animate-pulse bg-brand/40"
                    : "bg-success/35 [animation:live-halo_3.2s_ease-out_infinite]"
                )}
              />
              <span
                className={cn("relative size-1.5 rounded-full", syncing ? "bg-brand" : "bg-success")}
              />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-label font-medium">
                {syncing ? t.dashboard.live.syncing : t.shell.live}
              </span>
              {!syncing && clock ? (
                <span className="numeric text-label text-muted-foreground">
                  {t.dashboard.live.updatedAt(clock)}
                </span>
              ) : null}
            </span>
          </span>
        }
      />

      <ul className="flex flex-col" aria-live="polite">
        <AnimatePresence initial={false}>
          {rows.map(({ activity, company }) => (
            <motion.li
              key={activity.id}
              layout="position"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: durations.list, ease: easings.outExpo }}
              className="border-b border-hairline last:border-b-0"
            >
              <button
                type="button"
                onClick={() => onOpenCustomer(activity.customerId)}
                aria-label={t.dashboard.live.open(company, activity.title)}
                className="group/live flex w-full cursor-pointer items-start gap-2.5 py-2.5 pr-1 text-left outline-none transition-colors duration-hover ease-standard hover:bg-brand-soft/35 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-body-sm font-medium">{company}</span>
                    <span className="numeric shrink-0 text-label text-muted-foreground/70">
                      {activity.time}
                    </span>
                  </span>
                  <span className="truncate text-label text-muted-foreground">
                    {activity.title}
                  </span>
                </span>

                <ArrowUpRightIcon className="mt-1 size-3.5 shrink-0 text-muted-foreground/0 transition-all duration-hover group-hover/live:-translate-y-0.5 group-hover/live:translate-x-0.5 group-hover/live:text-brand" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="numeric text-label text-muted-foreground">
          {exhausted ? t.dashboard.live.exhausted : t.dashboard.live.counter(received)}
        </span>

        <button
          type="button"
          onClick={() => {
            setStreamed(SEED_COUNT)
            setRunId((id) => id + 1)
          }}
          data-testid="live-replay"
          className="group/cta inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-field py-1 text-label font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <RotateCcwIcon className="size-3 transition-transform duration-hover group-hover/cta:-rotate-90" />
          {t.dashboard.live.replay}
        </button>
      </div>
    </section>
  )
}
