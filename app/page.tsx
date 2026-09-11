"use client"

import Link from "next/link"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CompassIcon,
  GaugeIcon,
  LineChartIcon,
  MousePointerClickIcon,
  type LucideIcon,
} from "lucide-react"
import { FadeIn } from "@/components/motion/fade-in"
import { StaggerContainer } from "@/components/motion/stagger-container"
import { AmbientBackdrop } from "@/components/prototype/ambient-backdrop"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useMessages } from "@/components/i18n/locale-provider"
import { BUDGET, CASH, RECEIVABLES_SUMMARY, RUNWAY } from "@/lib/finance-metrics"
import { formatCurrencyCompact, formatRatio } from "@/lib/format"

/** 图标与文案一一对应——文案在词典里，图标留在组件里。 */
const FEATURE_ICONS: LucideIcon[] = [GaugeIcon, CompassIcon, LineChartIcon, MousePointerClickIcon]

/**
 * 落地页。
 *
 * 它不讲"用了什么技术栈"，而是**先把产品的第一句话说出来**：能撑多久。
 * 右侧四个数字全部来自同一个账本，与进入应用后看到的完全一致——
 * 落地页也是产品的一部分，不是一张海报。
 */
export default function LandingPage() {
  const t = useMessages()
  const copy = t.landing

  const figures = [
    { label: t.finance.hero.cashLabel, value: formatCurrencyCompact(CASH) },
    {
      label: t.finance.hero.runwayLabel,
      value: `${formatRatio(RUNWAY)} ${t.finance.hero.runwayUnit}`,
    },
    { label: t.finance.metrics.budgetUsage, value: `${formatRatio(BUDGET.usage)}%` },
    {
      label: t.finance.metrics.receivables,
      value: formatCurrencyCompact(RECEIVABLES_SUMMARY.total),
    },
  ]

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero：一句话 + 四个真实数字 */}
      <section className="relative isolate overflow-hidden border-b">
        <AmbientBackdrop variant="hero" grid />
        <div className="relative mx-auto grid w-full max-w-content gap-10 px-gutter py-16 sm:py-24 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <FadeIn>
              <Badge variant="outline" className="gap-1.5 bg-surface/70 text-label tracking-normal">
                <GaugeIcon className="size-3.5" />
                {copy.badge}
              </Badge>
            </FadeIn>
            <FadeIn delay={0.08}>
              <h1 className="text-display text-balance">{copy.title}</h1>
            </FadeIn>
            <FadeIn delay={0.16}>
              <p className="max-w-xl text-pretty text-body text-muted-foreground sm:text-subtitle">
                {copy.description}
              </p>
            </FadeIn>
            <FadeIn delay={0.24} className="flex flex-wrap items-center gap-3">
              <Link href="/finance" className={buttonVariants({ size: "lg" })}>
                {copy.primaryCta}
                <ArrowRightIcon />
              </Link>
              <Link
                href="/finance/cashflow"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                {copy.secondaryCta}
              </Link>
              <Link href="#structure" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                {copy.tertiaryCta}
              </Link>
            </FadeIn>
          </div>

          <FadeIn delay={0.2}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-6 border-l border-hairline pl-6">
              {figures.map((figure) => (
                <div key={figure.label} className="flex flex-col gap-1.5">
                  <dt className="eyebrow text-muted-foreground/60">{figure.label}</dt>
                  <dd className="numeric text-title">{figure.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-label text-muted-foreground lg:pl-6">
              {t.finance.scope.reference("2026-09-11")} · {t.finance.scope.standard}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* 能力清单 */}
      <section className="border-b bg-muted/40">
        <StaggerContainer className="mx-auto grid w-full max-w-content grid-cols-2 gap-x-6 gap-y-3 px-gutter py-8 sm:grid-cols-3">
          {copy.highlights.map((item) => (
            <div key={item} className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <CheckCircle2Icon className="size-4 shrink-0 text-success" />
              <span>{item}</span>
            </div>
          ))}
        </StaggerContainer>
      </section>

      {/* 结构 */}
      <section id="structure" className="mx-auto w-full max-w-content px-gutter py-16 sm:py-20">
        <FadeIn className="mb-10 flex flex-col gap-2">
          <h2 className="text-title">{copy.stackTitle}</h2>
          <p className="max-w-lg text-pretty text-body text-muted-foreground">
            {copy.stackDescriptionPrefix}{" "}
            <code className="rounded-field bg-muted px-1.5 py-0.5 font-mono text-label">
              /finance
            </code>{" "}
            {copy.stackDescriptionSuffix}
          </p>
        </FadeIn>

        {/* 规格表：四块文字 + hairline，而不是四张一模一样的卡片 */}
        <StaggerContainer className="grid gap-x-10 gap-y-0 sm:grid-cols-2">
          {copy.features.map((item, index) => {
            const Icon = FEATURE_ICONS[index] ?? GaugeIcon
            return (
              <div key={item.title} className="flex gap-3.5 border-t border-hairline py-6">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-field bg-brand-soft text-brand">
                  <Icon className="size-4" />
                </span>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="text-body font-semibold">{item.title}</h3>
                  <p className="text-pretty text-body-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            )
          })}
        </StaggerContainer>
      </section>

      <footer className="border-t py-6">
        <p className="mx-auto w-full max-w-content px-gutter text-center text-label text-muted-foreground">
          {copy.footer}
        </p>
      </footer>
    </main>
  )
}
