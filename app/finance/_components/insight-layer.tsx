"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, SparklesIcon } from "lucide-react"
import { SectionHeading } from "@/components/prototype/section-heading"
import { StaggerContainer } from "@/components/motion/stagger-container"
import { useMessages } from "@/components/i18n/locale-provider"
import { selectInsights, summariseInsights, type FinanceInsight } from "@/lib/finance-insights"
import { RECEIVABLES } from "@/lib/finance-ledger"
import { cn } from "@/lib/utils"
import { useFinanceStore } from "@/stores/finance-store"
import { insightAction, insightImpact, insightSentence, insightTitle } from "./insight-copy"

/**
 * AI 洞察层 —— 产品"开口说话"的地方。
 *
 * 与聊天框的区别：这里每一条都是**推导出来的结论**，带着影响金额、置信度
 * 与依据条数，并且末端一定是一个真实去处（打开凭证 / 打开发票 / 跳到某个
 * 筛选好的页面）。它不联网，也不调用模型。
 */
export function InsightLayer({ limit = 3 }: { limit?: number }) {
  const t = useMessages()
  const router = useRouter()
  const assumptions = useFinanceStore((s) => s.assumptions)
  const openTransaction = useFinanceStore((s) => s.selectTransaction)
  const selectInvoice = useFinanceStore((s) => s.selectInvoice)

  const insights = useMemo(() => selectInsights(assumptions), [assumptions])
  const overview = useMemo(() => summariseInsights(insights), [insights])
  const visible = insights.slice(0, limit)

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

  if (insights.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        <SectionHeading
          eyebrow={t.finance.insight.layerEyebrow}
          title={t.finance.insight.layerTitle}
        />
        <p className="text-body-sm text-muted-foreground">{t.finance.insight.empty}</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4" data-testid="insight-layer">
      <SectionHeading
        eyebrow={t.finance.insight.layerEyebrow}
        title={t.finance.insight.layerTitle}
        description={t.finance.insight.layerDescription(overview.total, overview.evidence)}
        action={
          <button
            type="button"
            onClick={() => router.push("/finance/insights")}
            data-testid="insight-layer-more"
            className="group/more inline-flex cursor-pointer items-center gap-1.5 rounded-field py-1 text-body-sm font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {t.finance.overview.goToInsights}
            <ArrowRightIcon className="size-3.5 transition-transform duration-hover group-hover/more:translate-x-0.5" />
          </button>
        }
      />

      <StaggerContainer className="flex flex-col">
        {visible.map((insight, index) => (
          <InsightRow
            key={insight.id}
            insight={insight}
            ordinal={index + 1}
            onActivate={() => activate(insight)}
          />
        ))}
      </StaggerContainer>
    </section>
  )
}

/** 单条洞察：编辑式编号 + 严重度 + 结论 + 依据 + 真实去处。 */
export function InsightRow({
  insight,
  ordinal,
  onActivate,
}: {
  insight: FinanceInsight
  ordinal: number
  onActivate: () => void
}) {
  const t = useMessages()
  const title = insightTitle(t, insight)
  const sentence = insightSentence(t, insight)

  const tone =
    insight.severity === "high"
      ? "text-danger"
      : insight.severity === "medium"
        ? "text-warning"
        : "text-muted-foreground"

  return (
    <div
      data-testid={`insight-${insight.kind}`}
      className="flex flex-col gap-2.5 border-t border-hairline py-5 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <span className="numeric text-label text-muted-foreground/50">
          {String(ordinal).padStart(2, "0")}
        </span>
        <span className={cn("eyebrow", tone)}>{t.finance.insight.severity[insight.severity]}</span>
        <span className="text-label text-muted-foreground">
          {t.finance.insight.confidence(insight.confidence)} ·{" "}
          {t.finance.insight.evidence(insight.evidenceCount)}
        </span>
        {insight.impact > 0 ? (
          <span className="numeric ml-auto text-label text-muted-foreground">
            {t.finance.insights.exposureLabel} {insightImpact(insight.impact)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-heading">
          <SparklesIcon className={cn("size-3.5 shrink-0", tone)} />
          {title}
        </h3>
        <p className="max-w-text text-pretty text-body text-muted-foreground">{sentence}</p>
      </div>

      <button
        type="button"
        onClick={onActivate}
        className="group/action inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-field py-1 text-body-sm font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {insightAction(t, insight)}
        <ArrowRightIcon className="size-3.5 transition-transform duration-hover group-hover/action:translate-x-0.5" />
      </button>
    </div>
  )
}
