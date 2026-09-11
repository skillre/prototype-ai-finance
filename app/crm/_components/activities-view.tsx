"use client"

import { useMemo } from "react"
import { motion } from "motion/react"
import {
  CalendarIcon,
  MailIcon,
  PhoneIcon,
  RotateCcwIcon,
  StickyNoteIcon,
  ZapIcon,
} from "lucide-react"
import { SectionHeading } from "@/components/prototype/section-heading"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { EmptyState } from "@/components/prototype/empty-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CRM_OWNERS,
  type ActivityKind,
  type CrmActivity,
  type CrmOwner,
} from "@/lib/crm-data"
import { selectActivities, useCrmStore } from "@/stores/crm-store"
import { durations, easings } from "@/lib/motion-presets"
import { personInitials } from "@/lib/format"
import { groupActivitiesByDay } from "@/lib/activity-groups"
import { useMessages } from "@/components/i18n/locale-provider"
import { cn } from "@/lib/utils"

const KIND_ICON: Record<ActivityKind, typeof MailIcon> = {
  email: MailIcon,
  call: PhoneIcon,
  meeting: CalendarIcon,
  note: StickyNoteIcon,
  status: ZapIcon,
}

const KIND_ORDER: ActivityKind[] = ["email", "call", "meeting", "note", "status"]

type ActivitiesViewProps = {
  /** 点击企业名进入该客户详情页。 */
  onOpenCustomer: (customerId: string) => void
}

/**
 * 活动页。
 *
 * 这一页的视觉承诺是 **时间线**，所以它不该被包在一张卡片里：整条时间线
 * 直接落在页面上，靠一条连续导轨 + 按天分组建立节奏。筛选区同样收成开放
 * 的一行，于是页面从"卡片里的一段列表"变成"一张可以扫读的时间轴"。
 */
export function ActivitiesView({ onOpenCustomer }: ActivitiesViewProps) {
  const t = useMessages()
  const activities = useCrmStore((s) => s.activities)
  const customers = useCrmStore((s) => s.customers)
  const kindFilter = useCrmStore((s) => s.activityKindFilter)
  const ownerFilter = useCrmStore((s) => s.activityOwnerFilter)
  const setKindFilter = useCrmStore((s) => s.setActivityKindFilter)
  const setOwnerFilter = useCrmStore((s) => s.setActivityOwnerFilter)

  const companyOf = useMemo(() => {
    const map = new Map<string, { company: string; id: string }>()
    for (const customer of customers) {
      map.set(customer.id, { company: customer.company, id: customer.id })
    }
    return map
  }, [customers])

  const visible = useMemo(
    () =>
      selectActivities({
        activities,
        activityKindFilter: kindFilter,
        activityOwnerFilter: ownerFilter,
      }),
    [activities, kindFilter, ownerFilter]
  )

  const groups = useMemo(() => groupActivitiesByDay(visible), [visible])

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: activities.length }
    for (const kind of KIND_ORDER) {
      base[kind] = activities.filter((a) => a.kind === kind).length
    }
    return base
  }, [activities])

  const hasFilters = kindFilter !== "all" || ownerFilter !== "all"

  return (
    <div className="flex flex-col gap-6">
      {/* 筛选区：开放式的一行，不再是压在时间线上方的一块面板。 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline pb-3">
        <Select
          value={kindFilter}
          onValueChange={(value) => setKindFilter(value as ActivityKind | "all")}
        >
          <SelectTrigger size="sm" className="w-32" data-testid="activity-filter-kind">
            <SelectValue>
              {(value) => (
                <span className="truncate">
                  {value && value !== "all"
                    ? t.activities.kinds[value as ActivityKind]
                    : t.activities.allTypes}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.activities.allTypes}</SelectItem>
            {KIND_ORDER.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {t.activities.kinds[kind]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={ownerFilter}
          onValueChange={(value) => setOwnerFilter(value as CrmOwner | "all")}
        >
          <SelectTrigger size="sm" className="w-32" data-testid="activity-filter-owner">
            <SelectValue>
              {(value) => (
                <span className="truncate">
                  {value && value !== "all" ? String(value) : t.activities.allOwners}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.activities.allOwners}</SelectItem>
            {CRM_OWNERS.map((owner: CrmOwner) => (
              <SelectItem key={owner} value={owner}>
                {owner}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="numeric text-caption text-muted-foreground">
          {t.activities.resultCaption(visible.length, activities.length)}
        </span>

        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground hover:text-foreground"
            onClick={() => {
              setKindFilter("all")
              setOwnerFilter("all")
            }}
          >
            <RotateCcwIcon />
            {t.activities.resetFilters}
          </Button>
        ) : null}
      </div>

      {/* 类型分布：可点击的真实筛选器，同时充当各类型的计数读数。 */}
      <div className="flex flex-wrap gap-2">
        {KIND_ORDER.map((kind) => {
          const Icon = KIND_ICON[kind]
          const active = kindFilter === kind
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={active}
              onClick={() => setKindFilter(active ? "all" : kind)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-4xl border px-2.5 py-1 text-label font-medium whitespace-nowrap transition-[color,background-color,border-color] duration-hover ease-standard outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active
                  ? "border-transparent bg-brand-soft text-brand"
                  : "border-border/70 text-muted-foreground hover:bg-interactive hover:text-foreground"
              )}
            >
              <Icon className="size-3" />
              {t.activities.kinds[kind]}
              <span className="numeric opacity-70">{counts[kind]}</span>
            </button>
          )
        })}
      </div>

      <section className="flex flex-col gap-5">
        <SectionHeading
          title={t.activities.timelineTitle}
          description={t.activities.timelineDescription}
        />

        {visible.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title={t.activities.empty.title}
            description={t.activities.empty.description}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setKindFilter("all")
                  setOwnerFilter("all")
                }}
              >
                <RotateCcwIcon />
                {t.common.clearFilters}
              </Button>
            }
          />
        ) : (
          /* 时间线容器只有一个 testid：分组头在 <ol> 之外，
             所以 `activity-timeline li` 仍然是"全部活动条目"这一个含义。 */
          <div className="flex flex-col gap-7" data-testid="activity-timeline">
            {groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-1.5">
                <span className="eyebrow text-muted-foreground/50">
                  {t.common.activityGroups[group.key]}
                </span>

                <ol className="flex flex-col">
                  {group.items.map((event, index) => (
                    <TimelineItem
                      key={event.id}
                      event={event}
                      kindLabel={t.activities.kinds[event.kind]}
                      company={companyOf.get(event.customerId)?.company ?? t.common.notAvailable}
                      isLast={index === group.items.length - 1}
                      onOpen={() => onOpenCustomer(event.customerId)}
                    />
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function TimelineItem({
  event,
  kindLabel,
  company,
  isLast,
  onOpen,
}: {
  event: CrmActivity
  kindLabel: string
  company: string
  isLast: boolean
  onOpen: () => void
}) {
  const Icon = KIND_ICON[event.kind]

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.list, ease: easings.outExpo }}
      className="group/item relative flex gap-3.5 py-3"
    >
      {/* 连续导轨：把同一组内的条目串成一条时间轴。 */}
      {!isLast ? (
        <span
          aria-hidden
          className="absolute top-11 left-[15px] h-[calc(100%-2.25rem)] w-px bg-muted-foreground/20 transition-colors duration-hover group-hover/item:bg-brand/35"
        />
      ) : null}

      <span
        className={cn(
          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-hover",
          event.kind === "status"
            ? "border-brand/30 bg-brand-soft text-brand"
            : "border-border/70 bg-surface text-muted-foreground group-hover/item:border-brand/25 group-hover/item:text-brand"
        )}
      >
        <Icon className="size-3.5" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-body-sm font-medium">{event.title}</span>
          <Badge variant="outline" className="h-5 px-1.5 text-label font-normal">
            {kindLabel}
          </Badge>
          <span className="numeric ml-auto shrink-0 text-label text-muted-foreground">
            {event.time}
          </span>
        </div>

        <p className="text-caption leading-relaxed text-pretty text-muted-foreground">
          {event.detail}
        </p>

        <div className="flex items-center gap-2">
          <Avatar size="sm" className="size-5">
            <AvatarFallback className="text-[9px]">{personInitials(event.actor, 1)}</AvatarFallback>
          </Avatar>
          <span className="text-label text-muted-foreground">{event.actor}</span>
          <span aria-hidden className="text-label text-muted-foreground/40">
            ·
          </span>
          <button
            type="button"
            onClick={onOpen}
            className="-my-1 cursor-pointer rounded-sm py-1 text-label text-muted-foreground underline-offset-4 outline-none transition-colors duration-hover hover:text-brand hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {company}
          </button>
        </div>
      </div>
    </motion.li>
  )
}
