"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { ArrowRightIcon, ShieldAlertIcon, SparklesIcon } from "lucide-react"
import { SectionHeading } from "@/components/prototype/section-heading"
import { AnimatedNumber } from "@/components/motion/animated-number"
import { useMessages } from "@/components/i18n/locale-provider"
import { formatCurrencyCompact } from "@/lib/format"
import { durations, easings } from "@/lib/motion-presets"
import type { GrowthInsight, RiskInsight } from "@/lib/insights"
import { cn } from "@/lib/utils"

/** "分析完成"的时点——短到不打断阅读，长到能被看见。 */
const ANALYSIS_MS = 520

type AiInsightLayerProps = {
  growth: GrowthInsight
  risk: RiskInsight | null
  /** 悬停贡献客户时同步高亮的记录 id（下方同名列表会跟上）。 */
  onHighlight: (customerId: string | null) => void
  highlightedId: string | null
  onOpenCustomer: (customerId: string) => void
  onGoToCustomers: (filter?: { status?: "active" }) => void
}

/**
 * AI 洞察层 —— 仪表盘的第二视觉层级。
 *
 * 这是"AI Sales"属性的落点：产品在第一屏就开口说话，而不是先给一堆图表让
 * 人自己看。但它不是一张"AI 卡片"：
 *
 *   • 形态是**编辑式版面**——一句陈述 + 三个被点名的客户实体，没有边框，
 *     没有头像，没有 CTA 按钮块。
 *   • 内容是**推导出来的**（`lib/insights.ts`）：换掉数据，公司名、金额、
 *     百分比与停滞天数都会变。不调用外部接口，也永远不会变成假文案。
 *   • 实体是可操作的：悬停同步高亮下方同名记录（签名交互之一），点击直达
 *     客户档案。
 *   • 进入有且只有一次揭示动画，其余时间保持静止——动效用来交代"它刚算完"，
 *     不是用来装饰。
 */
export function AiInsightLayer({
  growth,
  risk,
  onHighlight,
  highlightedId,
  onOpenCustomer,
  onGoToCustomers,
}: AiInsightLayerProps) {
  const t = useMessages()
  const [analyzed, setAnalyzed] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setAnalyzed(true), ANALYSIS_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <section className="flex min-w-0 flex-col gap-4" data-testid="ai-insight">
      <SectionHeading
        eyebrow={t.dashboard.insight.sectionLabel}
        title={t.dashboard.insight.title}
        description={t.dashboard.insight.analysisWindow(growth.sampleSize)}
        action={
          <span className="flex items-center gap-2" data-testid="ai-insight-status">
            <span className="relative flex size-2 shrink-0 items-center justify-center">
              <span
                aria-hidden
                className={cn(
                  "absolute size-2 rounded-full bg-brand/35",
                  analyzed ? "[animation:live-halo_3.2s_ease-out_infinite]" : "animate-pulse"
                )}
              />
              <span className="relative size-1.5 rounded-full bg-brand" />
            </span>
            <span className="text-label font-medium text-brand">
              {analyzed ? t.dashboard.insight.confidence(growth.confidence) : t.dashboard.insight.analyzing}
            </span>
          </span>
        }
      />

      <div className="grid gap-9 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-10">
        {/* 增长归因 —— 编辑式陈述，客户是被点名的实体，不是一行行数据 */}
        <div className="flex min-w-0 flex-col gap-4">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.enter, ease: easings.outExpo }}
            className="max-w-[38rem] text-pretty text-body text-muted-foreground"
          >
            <InsightSentence
              template={t.dashboard.insight.attribution("{growth}")}
              growth={growth.growth}
            />
          </motion.p>

          <ul className="flex flex-wrap items-center gap-x-2 gap-y-2" data-testid="ai-insight-contributors">
            {growth.contributors.map((customer, index) => {
              const active = highlightedId === customer.id
              return (
                <motion.li
                  key={customer.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: durations.list,
                    ease: easings.outExpo,
                    delay: ANALYSIS_MS / 1000 / 4 + index * 0.06,
                  }}
                >
                  <button
                    type="button"
                    onMouseEnter={() => onHighlight(customer.id)}
                    onMouseLeave={() => onHighlight(null)}
                    onFocus={() => onHighlight(customer.id)}
                    onBlur={() => onHighlight(null)}
                    onClick={() => onOpenCustomer(customer.id)}
                    aria-label={t.dashboard.insight.openCustomer(
                      customer.company,
                      formatCurrencyCompact(customer.value)
                    )}
                    data-testid={`insight-contributor-${customer.id}`}
                    className={cn(
                      "group/entity inline-flex cursor-pointer items-baseline gap-2 rounded-field border px-2.5 py-1.5 text-left outline-none",
                      "transition-colors duration-hover ease-standard focus-visible:ring-2 focus-visible:ring-ring/50",
                      active
                        ? "border-brand/40 bg-brand-soft text-brand"
                        : "border-hairline bg-surface/60 hover:border-brand/30 hover:bg-brand-soft/50 hover:text-brand"
                    )}
                  >
                    <span className="text-body-sm font-semibold">{customer.company}</span>
                    <span className="numeric text-label text-muted-foreground">
                      {formatCurrencyCompact(customer.value)}
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="numeric text-label text-muted-foreground">
              {t.dashboard.insight.contributorShare(String(growth.share))}
            </span>
            <span aria-hidden className="hidden h-3 w-px bg-hairline sm:block" />
            <span className="hidden text-label text-muted-foreground sm:inline">
              {t.dashboard.insight.highlightHint}
            </span>
            <button
              type="button"
              onClick={() => onGoToCustomers({ status: "active" })}
              data-testid="insight-view-key-accounts"
              className="group/cta ml-auto inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-field py-1 text-body-sm font-medium text-brand outline-none transition-colors duration-hover hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {t.dashboard.insight.viewKeyAccounts}
              <ArrowRightIcon className="size-3.5 transition-transform duration-hover group-hover/cta:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* 风险预警 —— 同一层级的第二句陈述，仍然不是卡片 */}
        {risk ? (
          <div
            className="flex min-w-0 flex-col gap-3 border-t border-hairline pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10"
            data-testid="ai-insight-risk"
          >
            <span className="eyebrow flex items-center gap-2 text-warning">
              <ShieldAlertIcon className="size-3" />
              {t.dashboard.insight.riskTitle}
            </span>

            <p className="text-pretty text-body text-muted-foreground">
              {t.dashboard.insight.risk(
                risk.customer.company,
                risk.staleDays,
                formatCurrencyCompact(risk.customer.value)
              )}
            </p>

            <p className="numeric text-label text-muted-foreground">
              {t.dashboard.insight.riskSummary(
                risk.otherCount,
                formatCurrencyCompact(risk.otherValue)
              )}
            </p>

            <button
              type="button"
              onClick={() => onOpenCustomer(risk.customer.id)}
              data-testid="insight-risk-action"
              className="group/cta inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-field py-1 text-body-sm font-medium text-warning outline-none transition-colors duration-hover hover:text-warning/80 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <SparklesIcon className="size-3.5" />
              {t.dashboard.insight.riskAction(risk.customer.company)}
              <ArrowRightIcon className="size-3.5 transition-transform duration-hover group-hover/cta:translate-x-0.5" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

/**
 * 把模板里的 `{growth}` 换成真实数字。
 *
 * 用的是**局部强调**而不是整句变色：读到百分号时眼睛自然会慢下来，
 * 这就是数据叙事想要的节奏。被点名的三家客户由下方实体块承担，
 * 句子里不再重复一遍——同一屏上同一个名字出现两次是排版事故。
 */
function InsightSentence({ template, growth }: { template: string; growth: number }) {
  const [head, tail] = template.split("{growth}")

  return (
    <span data-testid="ai-insight-sentence">
      {head}
      {/* 百分号由词典模板提供——组件只负责数字本身。 */}
      <span className="numeric font-semibold text-foreground">
        <AnimatedNumber
          value={growth}
          duration={durations.glacial}
          formatValue={(value) => value.toFixed(1)}
        />
      </span>
      {tail}
    </span>
  )
}
