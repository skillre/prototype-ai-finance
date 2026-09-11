"use client"

import { useMemo } from "react"
import { motion } from "motion/react"
import { toast } from "sonner"
import {
  ArrowRightIcon,
  Building2Icon,
  CalendarIcon,
  CopyIcon,
  MailIcon,
  PhoneIcon,
  StickyNoteIcon,
  UserIcon,
  ZapIcon,
} from "lucide-react"
import { DetailDrawer } from "@/components/prototype/detail-drawer"
import { AiSummaryPanel } from "@/components/prototype/ai-summary-panel"
import { EmptyState } from "@/components/prototype/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  STATUS_META,
  type ActivityKind,
  type CrmActivity,
} from "@/lib/crm-data"
import { selectActivities, useCrmStore } from "@/stores/crm-store"
import { formatCurrency, formatDate, formatRelativeHours } from "@/lib/format"
import { durations, easings } from "@/lib/motion-presets"
import { useMessages } from "@/components/i18n/locale-provider"
import { cn } from "@/lib/utils"

const KIND_ICON: Record<ActivityKind, typeof MailIcon> = {
  email: MailIcon,
  call: PhoneIcon,
  meeting: CalendarIcon,
  note: StickyNoteIcon,
  status: ZapIcon,
}

/**
 * 客户详情抽屉：资料、标签、备注、AI 摘要与活动时间线。
 *
 * `onViewAccount` 由 shell 注入：抽屉底部的「查看客户档案」会导航到真实的
 * /crm/customers/[id] 页面，而不是停留在提示性的 toast。
 */
export function CustomerDetailDrawer({
  onViewAccount,
}: {
  onViewAccount: (customerId: string) => void
}) {
  const t = useMessages()
  const selectedCustomerId = useCrmStore((s) => s.selectedCustomerId)
  const customers = useCrmStore((s) => s.customers)
  const activities = useCrmStore((s) => s.activities)
  const aiStatus = useCrmStore((s) => s.aiStatus)
  const aiSummary = useCrmStore((s) => s.aiSummary)
  const selectCustomer = useCrmStore((s) => s.selectCustomer)
  const generateAiSummary = useCrmStore((s) => s.generateAiSummary)

  const customer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  )

  // 该客户自己的时间线，按时间倒序。
  const timeline = useMemo(
    () =>
      customer
        ? selectActivities({
            activities: activities.filter((a) => a.customerId === customer.id),
            activityKindFilter: "all",
            activityOwnerFilter: "all",
          })
        : [],
    [activities, customer]
  )

  const open = Boolean(customer)

  const copyEmail = async () => {
    if (!customer) return
    try {
      await navigator.clipboard.writeText(customer.email)
      toast.success(t.toast.emailCopied, { description: customer.email })
    } catch {
      toast.error(t.toast.clipboardUnavailable, {
        description: t.toast.clipboardUnavailableDescription,
      })
    }
  }

  return (
    <DetailDrawer
      testId="customer-drawer"
      closeLabel={t.common.close}
      open={open}
      onOpenChange={(next) => {
        if (!next) selectCustomer(null)
      }}
      title={customer?.name}
      description={customer?.company}
      className="sm:data-[swipe-axis=x]:[--drawer-content-width:32rem]"
      footer={
        customer ? (
          <>
            <Button type="button" variant="outline" className="flex-1" onClick={copyEmail}>
              <CopyIcon />
              {t.customer.actions.copyEmail}
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => onViewAccount(customer.id)}
              data-testid="open-account"
            >
              {t.customer.actions.openAccount}
              <ArrowRightIcon />
            </Button>
          </>
        ) : null
      }
    >
      {customer ? (
        <div className="flex flex-col gap-5 pt-1">
          {/* 头部：状态 + 金额 */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-medium",
                STATUS_META[customer.status].chip
              )}
            >
              <span className={cn("size-1.5 rounded-full", STATUS_META[customer.status].dot)} />
              {t.status[customer.status]}
            </span>
            <Badge variant="outline">{t.plan[customer.plan]}</Badge>
            <span className="numeric ml-auto text-body font-semibold">
              {customer.value > 0 ? formatCurrency(customer.value) : t.common.notAvailable}
            </span>
          </div>

          {/* 资料 */}
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <InfoRow icon={UserIcon} label={t.customer.fields.owner} value={customer.owner} />
            <InfoRow icon={Building2Icon} label={t.customer.fields.title} value={customer.title} />
            <InfoRow icon={MailIcon} label={t.customer.fields.email} value={customer.email} />
            <InfoRow icon={PhoneIcon} label={t.customer.fields.phone} value={customer.phone} />
            <InfoRow
              icon={CalendarIcon}
              label={t.customer.fields.created}
              value={formatDate(customer.createdAt)}
            />
            <InfoRow
              icon={StickyNoteIcon}
              label={t.customer.fields.lastTouch}
              value={formatRelativeHours(customer.lastTouchHours)}
            />
          </dl>

          {/* 标签 */}
          {customer.tags.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-label text-muted-foreground">{t.customer.fields.tags}</span>
              <div className="flex flex-wrap gap-1.5">
                {customer.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {/* 备注 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-label text-muted-foreground">{t.customer.fields.notes}</span>
            <p className="text-body-sm leading-relaxed text-pretty text-muted-foreground">
              {customer.notes}
            </p>
          </div>

          <AiSummaryPanel
            testId="ai-summary"
            status={aiStatus}
            summary={aiSummary}
            onGenerate={() => generateAiSummary(customer.id)}
          />

          <Separator />

          {/* 活动时间线 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-label text-muted-foreground">
                {t.customer.sections.activities}
              </span>
              <span className="numeric text-label text-muted-foreground">
                {timeline.length} {t.common.unit.event}
              </span>
            </div>

            {timeline.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title={t.customer.empty.activities}
                description={t.customer.empty.activitiesDescription}
              />
            ) : (
              <ol className="flex flex-col">
                {timeline.map((event, index) => (
                  <TimelineRow
                    key={event.id}
                    event={event}
                    kindLabel={t.activities.kinds[event.kind]}
                    isLast={index === timeline.length - 1}
                  />
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : null}
    </DetailDrawer>
  )
}

function TimelineRow({
  event,
  kindLabel,
  isLast,
}: {
  event: CrmActivity
  kindLabel: string
  isLast: boolean
}) {
  const Icon = KIND_ICON[event.kind]
  return (
    <motion.li
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: durations.list, ease: easings.outExpo }}
      className="relative flex gap-3 pb-4 last:pb-0"
    >
      {/* 竖线 */}
      {!isLast ? (
        <span aria-hidden className="absolute top-8 left-[13px] h-[calc(100%-2rem)] w-px bg-border" />
      ) : null}

      <span
        className={cn(
          "relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface",
          event.kind === "status" ? "text-brand" : "text-muted-foreground"
        )}
      >
        <Icon className="size-3.5" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-body-sm font-medium">{event.title}</span>
          <span className="numeric shrink-0 text-label text-muted-foreground">{event.time}</span>
        </div>
        <span className="text-caption text-pretty text-muted-foreground">{event.detail}</span>
        <span className="text-label text-muted-foreground">
          {kindLabel} · {event.actor}
        </span>
      </div>
    </motion.li>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MailIcon
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-label text-muted-foreground">{label}</dt>
        <dd className="truncate text-body-sm font-medium">{value}</dd>
      </div>
    </div>
  )
}
