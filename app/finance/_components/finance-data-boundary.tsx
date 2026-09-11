"use client"

import { PageContainer } from "@/components/layout/page-container"
import { PageTransition } from "@/components/motion/page-transition"
import { LoadingState } from "@/components/prototype/loading-state"
import { ErrorState } from "@/components/prototype/error-state"
import { useMessages } from "@/components/i18n/locale-provider"
import { useFinanceStore } from "@/stores/finance-store"
import { useFinancePageMeta, type FinanceRouteKey } from "./finance-shell"

type FinanceDataBoundaryProps = {
  route: FinanceRouteKey
  /** 覆盖页面标题（详情页等需要动态标题的场景）。 */
  title?: string
  description?: string
  /** 标题上方的小字（分组 / 期间）。 */
  eyebrow?: string
  actions?: React.ReactNode
  loadingVariant?: "cards" | "section" | "rows"
  /** 页头形态：总览用 compact（主视觉由跑道仪表承担）。 */
  variant?: "full" | "compact" | "none"
  /** 页面自带主视觉时关掉全局环境光，避免两个光源互相抵消。 */
  ambient?: boolean
  children: React.ReactNode
}

/**
 * 每个财务页面的统一外壳：页面标题 + loading / error / ready 三态。
 * 七个路由共享同一套状态呈现，不需要各自复制一遍。
 */
export function FinanceDataBoundary({
  route,
  title,
  description,
  eyebrow,
  actions,
  loadingVariant = "cards",
  variant = "full",
  ambient = true,
  children,
}: FinanceDataBoundaryProps) {
  const t = useMessages()
  const status = useFinanceStore((s) => s.status)
  const errorMessage = useFinanceStore((s) => s.errorMessage)
  const refresh = useFinanceStore((s) => s.refresh)
  const meta = useFinancePageMeta()[route]

  return (
    <PageContainer
      eyebrow={eyebrow ?? meta.eyebrow}
      title={title ?? meta.title}
      description={description ?? meta.description}
      actions={actions}
      variant={variant}
      ambient={ambient}
    >
      {status === "error" ? (
        <div data-testid="finance-error" className="flex flex-col gap-4">
          <ErrorState
            title={t.finance.state.errorTitle}
            description={errorMessage ?? t.finance.state.errorHint}
            onRetry={refresh}
          />
        </div>
      ) : status === "loading" ? (
        <div data-testid="finance-loading" className="flex flex-col gap-6">
          <p className="text-body-sm text-muted-foreground">
            {t.finance.state.loadingTitle} · {t.finance.state.loadingHint}
          </p>
          <LoadingState variant={loadingVariant} count={4} />
          <LoadingState variant="section" />
          <LoadingState variant="rows" count={3} />
        </div>
      ) : (
        <div data-testid="finance-content">
          <PageTransition transitionKey={route}>{children}</PageTransition>
        </div>
      )}
    </PageContainer>
  )
}
