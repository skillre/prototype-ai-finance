"use client"

import { use, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion } from "motion/react"
import {
  ArrowLeftIcon,
  Building2Icon,
  CalendarIcon,
  CopyIcon,
  KanbanSquareIcon,
  MailIcon,
  PhoneIcon,
  StickyNoteIcon,
  UserIcon,
  ZapIcon,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SectionHeading } from "@/components/prototype/section-heading"
import { EmptyState } from "@/components/prototype/empty-state"
import { NotFoundState } from "@/components/prototype/not-found-state"
import { AiSummaryPanel } from "@/components/prototype/ai-summary-panel"
import { CrmDataBoundary } from "../../_components/crm-data-boundary"
import { TASK_COLUMNS, STATUS_META, type ActivityKind } from "@/lib/crm-data"
import { selectActivities, useCrmStore } from "@/stores/crm-store"
import { formatCurrency, formatDate, formatDateShort, personInitials } from "@/lib/format"
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
 * 客户档案页。
 *
 * V3：六个 Card 换成开放式区块。这一页的信息本身就是一个**档案**——
 * 它应该读起来像一页排版好的资料，而不是六个各自带标题栏的盒子。
 * 区块之间靠 hairline 与留白分隔，字号负责层级；只有账户金额保留
 * 独立的视觉重量（它是这一页的数字主角）。
 */
export default function CrmCustomerDetailPage({ params }: PageProps<"/crm/customers/[id]">) {
  // Next.js 16：params 是 Promise，用 React.use() 解包。
  const { id } = use(params)
  const t = useMessages()

  const customers = useCrmStore((s) => s.customers)
  const activities = useCrmStore((s) => s.activities)
  const tasks = useCrmStore((s) => s.tasks)
  const status = useCrmStore((s) => s.status)
  const aiStatus = useCrmStore((s) => s.aiStatus)
  const aiSummary = useCrmStore((s) => s.aiSummary)
  const selectCustomer = useCrmStore((s) => s.selectCustomer)
  const generateAiSummary = useCrmStore((s) => s.generateAiSummary)
  const router = useRouter()

  const customer = useMemo(() => customers.find((c) => c.id === id) ?? null, [customers, id])

  const timeline = useMemo(
    () =>
      selectActivities({
        activities: activities.filter((a) => a.customerId === id),
        activityKindFilter: "all",
        activityOwnerFilter: "all",
      }),
    [activities, id]
  )

  const relatedTasks = useMemo(
    () =>
      TASK_COLUMNS.flatMap((column) =>
        (tasks[column.id] ?? [])
          .filter((task) => task.company === customer?.company)
          .map((task) => ({ task, column }))
      ),
    [tasks, customer]
  )

  // 数据尚未加载完成时不要误报 404。
  if (status === "ready" && !customer) {
    return (
      <CrmDataBoundary
        route="customers"
        eyebrow={t.customer.eyebrow}
        title={t.customer.notFound.pageTitle}
        loadingVariant="rows"
      >
        <NotFoundState
          code="404"
          testId="customer-not-found"
          title={t.customer.notFound.title}
          description={t.customer.notFound.description(id)}
          action={{ label: t.customer.notFound.back, href: "/crm/customers" }}
          suggestions={[{ label: t.customer.notFound.dashboard, href: "/crm" }]}
        />
      </CrmDataBoundary>
    )
  }

  return (
    <CrmDataBoundary
      route="customers"
      eyebrow={t.customer.eyebrow}
      title={customer?.company ?? t.customer.eyebrow}
      description={customer ? `${customer.name} · ${customer.title}` : t.common.loading}
      loadingVariant="rows"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/crm/customers"
            data-testid="back-to-customers"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeftIcon />
            {t.customer.actions.back}
          </Link>
          {customer ? (
            <Button
              size="sm"
              variant="outline"
              data-testid="detail-open-drawer"
              onClick={() => {
                selectCustomer(customer.id)
                router.push("/crm/customers")
              }}
            >
              {t.customer.actions.openInList}
            </Button>
          ) : null}
        </div>
      }
    >
      {customer ? (
        <div className="flex flex-col gap-8">
          {/* 账户抬头：状态读数 + 合同金额，开放式，无面板 */}
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-hairline pb-4">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-body-sm",
                  STATUS_META[customer.status].text
                )}
              >
                <span
                  className={cn("size-1.5 rounded-full", STATUS_META[customer.status].dot)}
                />
                {t.status[customer.status]}
              </span>
              <span aria-hidden className="text-muted-foreground/30">
                |
              </span>
              <Badge variant="outline" className="font-normal">
                {t.plan[customer.plan]}
              </Badge>
              {customer.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="font-normal">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex flex-col items-start gap-0.5 sm:items-end">
              <span className="eyebrow text-muted-foreground/60">
                {t.customer.windowLabel}
              </span>
              <span className="numeric text-numeric">
                {customer.value > 0 ? formatCurrency(customer.value) : t.common.notAvailable}
              </span>
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-12">
            {/* 左列：资料 + AI + 时间线 */}
            <div className="flex flex-col gap-8">
              <section className="flex flex-col gap-4">
                <SectionHeading
                  title={t.customer.sections.account}
                  description={t.customer.sections.accountDescription}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(customer.email)
                          toast.success(t.toast.emailCopied, { description: customer.email })
                        } catch {
                          toast.error(t.toast.clipboardUnavailable)
                        }
                      }}
                      data-testid="detail-copy-email"
                    >
                      <CopyIcon />
                      {t.customer.actions.copyEmail}
                    </Button>
                  }
                />

                <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                  <InfoRow icon={UserIcon} label={t.customer.fields.contact} value={customer.name} />
                  <InfoRow
                    icon={Building2Icon}
                    label={t.customer.fields.title}
                    value={customer.title}
                  />
                  <InfoRow icon={MailIcon} label={t.customer.fields.email} value={customer.email} />
                  <InfoRow icon={PhoneIcon} label={t.customer.fields.phone} value={customer.phone} />
                  <InfoRow
                    icon={UserIcon}
                    label={t.customer.fields.owner}
                    value={customer.owner}
                  />
                  <InfoRow
                    icon={CalendarIcon}
                    label={t.customer.fields.since}
                    value={formatDate(customer.createdAt)}
                  />
                </dl>

                <Separator className="my-1" />

                <div className="flex flex-col gap-1.5">
                  <span className="eyebrow text-muted-foreground/60">
                    {t.customer.fields.notes}
                  </span>
                  <p className="text-body-sm leading-relaxed text-pretty text-muted-foreground">
                    {customer.notes}
                  </p>
                </div>
              </section>

              <AiSummaryPanel
                testId="ai-summary-page"
                status={aiStatus}
                summary={aiSummary}
                onGenerate={() => generateAiSummary(customer.id)}
              />

              <section className="flex flex-col gap-4">
                <SectionHeading
                  title={t.customer.sections.activities}
                  description={t.customer.sections.activitiesDescription(timeline.length)}
                />

                {timeline.length === 0 ? (
                  <EmptyState
                    icon={CalendarIcon}
                    title={t.customer.empty.activities}
                    description={t.customer.empty.activitiesDescription}
                    action={
                      <Link
                        href="/crm/activities"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        {t.customer.empty.browseActivities}
                      </Link>
                    }
                  />
                ) : (
                  <ol className="flex flex-col" data-testid="detail-timeline">
                    {timeline.map((event, index) => {
                      const Icon = KIND_ICON[event.kind]
                      return (
                        <motion.li
                          key={event.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: durations.list, ease: easings.outExpo }}
                          className="group/item relative flex gap-3.5 py-3"
                        >
                          {index !== timeline.length - 1 ? (
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
                              <Badge
                                variant="outline"
                                className="h-5 px-1.5 text-label font-normal"
                              >
                                {t.activities.kinds[event.kind]}
                              </Badge>
                              <span className="numeric ml-auto shrink-0 text-label text-muted-foreground">
                                {event.time}
                              </span>
                            </div>
                            <p className="text-caption leading-relaxed text-pretty text-muted-foreground">
                              {event.detail}
                            </p>
                            <span className="text-label text-muted-foreground">
                              {event.actor}
                            </span>
                          </div>
                        </motion.li>
                      )
                    })}
                  </ol>
                )}
              </section>
            </div>

            {/* 右列：相关任务 + 负责人 + 备注 */}
            <div className="flex flex-col gap-8">
              <section className="flex flex-col gap-4">
                <SectionHeading
                  title={t.customer.sections.openTasks}
                  description={t.customer.sections.openTasksDescription}
                />

                {relatedTasks.length === 0 ? (
                  <EmptyState
                    icon={KanbanSquareIcon}
                    title={t.customer.empty.tasks}
                    description={t.customer.empty.tasksDescription}
                    action={
                      <Link
                        href="/crm/tasks"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        {t.customer.empty.openBoard}
                      </Link>
                    }
                  />
                ) : (
                  <ul className="flex flex-col">
                    {relatedTasks.map(({ task, column }) => (
                      <li
                        key={task.id}
                        className="flex flex-col gap-1.5 border-b border-hairline py-3 last:border-b-0"
                      >
                        <span className="text-body-sm font-medium">{task.title}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="h-5 px-1.5 text-label font-normal">
                            {t.tasks.columns[column.id].title}
                          </Badge>
                          <span className="numeric inline-flex items-center gap-1 text-label text-muted-foreground">
                            <CalendarIcon className="size-3" />
                            {formatDateShort(task.due)}
                          </span>
                        </div>
                      </li>
                    ))}
                    <li className="pt-4">
                      <Link
                        href="/crm/tasks"
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                          className: "w-full",
                        })}
                      >
                        {t.customer.empty.openBoard}
                      </Link>
                    </li>
                  </ul>
                )}
              </section>

              <section className="flex flex-col gap-4">
                <SectionHeading
                  title={t.customer.sections.owner}
                  description={t.customer.sections.ownerDescription}
                />
                <div className="flex items-center gap-2.5">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-brand-soft text-brand">
                      {personInitials(customer.owner, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-body-sm font-medium">{customer.owner}</span>
                    <span className="truncate text-label text-muted-foreground">
                      {t.brand.name}
                    </span>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <SectionHeading
                  title={t.customer.sections.notes}
                  description={t.customer.sections.notesDescription}
                />
                <div className="flex items-start gap-2.5 border-l-2 border-brand/40 pl-3.5">
                  <StickyNoteIcon className="mt-0.5 size-3.5 shrink-0 text-brand" />
                  <p className="text-caption leading-relaxed text-pretty text-muted-foreground">
                    {customer.notes}
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </CrmDataBoundary>
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
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="eyebrow text-muted-foreground/60">{label}</dt>
        <dd className="truncate text-body font-medium">{value}</dd>
      </div>
    </div>
  )
}
