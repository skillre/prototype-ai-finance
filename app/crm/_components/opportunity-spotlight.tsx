"use client"

import { ArrowRightIcon } from "lucide-react"
import { motion } from "motion/react"
import { SectionHeading } from "@/components/prototype/section-heading"
import { formatCurrencyCompact } from "@/lib/format"
import { durations, easings } from "@/lib/motion-presets"
import { useMessages } from "@/components/i18n/locale-provider"
import type { SpotlightDeal } from "@/lib/insights"
import { cn } from "@/lib/utils"

type OpportunitySpotlightProps = {
  deals: SpotlightDeal[]
  onOpenCustomer: (customerId: string) => void
  onViewAll: () => void
}

/**
 * 机会雷达 —— 目标六要求的 Intelligence Module。
 *
 * 刻意**不是**一张卡片，也不是第二个表格：三个机会横向铺开，用编辑式的大号
 * 序号（01 / 02 / 03）承担节奏，用竖 hairline 分栏。这样它读起来像一页
 * "本期重点"，而不是又一段可以搬进 BI 报表的行。
 *
 * 排序轴是**紧迫度**而不是金额：贵且卡住的机会排在更贵但一直在推进的前面。
 * 排名规则写在 `selectSpotlightDeals` 里，界面只负责呈现。
 */
export function OpportunitySpotlight({
  deals,
  onOpenCustomer,
  onViewAll,
}: OpportunitySpotlightProps) {
  const t = useMessages()

  return (
    <section className="flex min-w-0 flex-col gap-4" data-testid="opportunity-spotlight">
      <SectionHeading
        eyebrow={t.dashboard.spotlight.sectionLabel}
        title={t.dashboard.spotlight.title}
        description={t.dashboard.spotlight.description}
        action={
          <button
            type="button"
            onClick={onViewAll}
            data-testid="spotlight-view-all"
            className="group/cta inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-field py-1 text-body-sm font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {t.dashboard.spotlight.allOpportunities}
            <ArrowRightIcon className="size-3.5 transition-transform duration-hover group-hover/cta:translate-x-0.5" />
          </button>
        }
      />

      <ul className="grid grid-cols-1 gap-y-6 sm:grid-cols-3 sm:gap-x-8">
        {deals.map((deal, index) => {
          const note =
            deal.note.kind === "stale"
              ? t.dashboard.spotlight.noteStale(deal.note.days)
              : deal.note.kind === "recent"
                ? t.dashboard.spotlight.noteRecent(deal.note.days)
                : t.dashboard.spotlight.noteFresh(deal.note.hours)
          const value = formatCurrencyCompact(deal.customer.value)

          return (
            <motion.li
              key={deal.customer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: durations.list,
                ease: easings.outExpo,
                delay: index * 0.05,
              }}
              className={cn(
                "relative min-w-0 border-hairline",
                "border-t pt-5 sm:border-t-0 sm:pt-0",
                index > 0 && "sm:border-l sm:pl-8"
              )}
            >
              {/* 分栏靠竖 hairline，不靠边框盒；hover 时序号与标题一起走到品牌色。 */}
              <button
                type="button"
                onClick={() => onOpenCustomer(deal.customer.id)}
                aria-label={t.dashboard.spotlight.open(deal.customer.company, value, note)}
                data-testid={`spotlight-deal-${deal.customer.id}`}
                className="group/opp flex w-full cursor-pointer flex-col gap-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span
                  aria-hidden
                  className="numeric text-subtitle font-normal text-muted-foreground/30 transition-colors duration-hover group-hover/opp:text-brand/60"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="truncate text-body font-semibold transition-colors duration-hover group-hover/opp:text-brand">
                  {deal.customer.company}
                </span>

                <span className="numeric text-numeric">{value}</span>

                <span
                  className={cn(
                    "pt-0.5 text-label",
                    deal.note.kind === "stale" ? "text-warning" : "text-muted-foreground"
                  )}
                >
                  {note}
                </span>
              </button>
            </motion.li>
          )
        })}
      </ul>
    </section>
  )
}
