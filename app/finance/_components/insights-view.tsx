"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ScrollTextIcon } from "lucide-react"
import { SectionHeading } from "@/components/prototype/section-heading"
import { StaggerContainer } from "@/components/motion/stagger-container"
import { EmptyState } from "@/components/prototype/empty-state"
import { useMessages } from "@/components/i18n/locale-provider"
import { selectInsights, summariseInsights, type FinanceInsight } from "@/lib/finance-insights"
import { RECEIVABLES } from "@/lib/finance-ledger"
import { DATA_SCOPE } from "@/lib/finance-metrics"
import { cn } from "@/lib/utils"
import { useFinanceStore } from "@/stores/finance-store"
import { InsightRow } from "./insight-layer"
import { insightImpact } from "./insight-copy"

const SEVERITIES = ["all", "high", "medium", "low"] as const

/**
 * AI 财务洞察页。
 *
 * 它不只是把总览上的三条展开：每一条结论旁边都写明**判定规则**——
 * 财务人员可以复核这条规则，也可以否掉它。这正是"AI 不是聊天框"的落点：
 * 结论、依据、规则、去处，四件东西同时在场。
 */
export function InsightsView() {
  const t = useMessages()
  const router = useRouter()
  const severity = useFinanceStore((s) => s.insightSeverity)
  const setSeverity = useFinanceStore((s) => s.setInsightSeverity)
  const assumptions = useFinanceStore((s) => s.assumptions)
  const openTransaction = useFinanceStore((s) => s.selectTransaction)
  const selectInvoice = useFinanceStore((s) => s.selectInvoice)

  const insights = useMemo(() => selectInsights(assumptions), [assumptions])
  const overview = useMemo(() => summariseInsights(insights), [insights])
  const visible = severity === "all" ? insights : insights.filter((i) => i.severity === severity)

  const activate = (insight: FinanceInsight) => {
    const target = insight.target
    if (target.kind === "route") {
      router.push(target.href)
      return
    }
    if (target.kind === "transaction") {
      openTransaction(target.id)
      return
    }
    const invoice = RECEIVABLES.find((item) => item.id === target.id)
    if (invoice) selectInvoice(invoice)
  }

  const labelOf = (value: (typeof SEVERITIES)[number]) =>
    value === "all" ? t.finance.insights.filterAll : t.finance.insight.severity[value]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <SectionHeading
          eyebrow={t.finance.insight.layerEyebrow}
          title={t.finance.insights.feedTitle}
          description={t.finance.insights.feedDescription}
          action={
            <span className="numeric text-label text-muted-foreground">
              {t.finance.insights.exposureLabel} {insightImpact(overview.exposure)}
            </span>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <span className="text-body-sm text-muted-foreground" data-testid="insight-severity-counts">
            {t.finance.insights.countBySeverity(
              overview.high,
              overview.medium,
              overview.low
            )}
          </span>

          <div
            role="group"
            aria-label={t.finance.insights.filterSeverity}
            className="inline-flex items-center gap-0.5 rounded-field border border-border/60 bg-surface/70 p-0.5"
          >
            {SEVERITIES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={severity === value}
                data-testid={`insight-filter-${value}`}
                onClick={() => setSeverity(value)}
                className={cn(
                  "h-7 cursor-pointer rounded-[7px] px-2.5 text-label font-medium transition-colors duration-hover ease-standard outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  severity === value
                    ? "bg-brand text-brand-foreground shadow-subtle"
                    : "text-muted-foreground hover:bg-interactive hover:text-foreground"
                )}
              >
                {labelOf(value)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={ScrollTextIcon}
          title={t.finance.insights.empty}
          description={t.finance.insights.emptyHint}
        />
      ) : (
        <StaggerContainer className="flex flex-col">
          {visible.map((insight, index) => (
            <div key={insight.id} className="flex flex-col">
              <InsightRow insight={insight} ordinal={index + 1} onActivate={() => activate(insight)} />
              <p
                className="mb-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-field bg-muted/50 px-3 py-2 text-label text-muted-foreground"
                data-testid={`insight-rule-${insight.kind}`}
              >
                <span className="eyebrow text-muted-foreground/60">
                  {t.finance.insights.ruleTitle}
                </span>
                {t.finance.insights.rules[insight.kind]}
                <span className="text-muted-foreground/60">
                  · {t.finance.insights.ruleHint}
                </span>
              </p>
            </div>
          ))}
        </StaggerContainer>
      )}

      <p className="text-label text-muted-foreground">
        {t.finance.insight.layerDescription(overview.total, overview.evidence)} ·{" "}
        {t.finance.scope.reference(DATA_SCOPE.referenceDate)} · {t.finance.scope.standard}
      </p>
    </div>
  )
}
