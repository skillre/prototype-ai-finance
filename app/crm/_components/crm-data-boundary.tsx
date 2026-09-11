"use client"

import { PageContainer } from "@/components/layout/page-container"
import { PageTransition } from "@/components/motion/page-transition"
import { LoadingState } from "@/components/prototype/loading-state"
import { ErrorState } from "@/components/prototype/error-state"
import { useCrmStore } from "@/stores/crm-store"
import { useCrmPageMeta, type CrmRouteKey } from "./crm-shell"

type CrmDataBoundaryProps = {
  route: CrmRouteKey
  /** 覆盖页面标题（详情页等需要动态标题的场景）。 */
  title?: string
  description?: string
  /** 标题上方的小字（面包屑 / 分组）。 */
  eyebrow?: string
  actions?: React.ReactNode
  /** 加载骨架的形态。 */
  loadingVariant?: "cards" | "section" | "rows"
  /** 页头形态，见 PageContainer。总览用 compact（主视觉由 Hero 承担）。 */
  variant?: "full" | "compact" | "none"
  /** 页面自带主视觉时关掉全局环境光，避免两个光源互相抵消。 */
  ambient?: boolean
  children: React.ReactNode
}

/**
 * 每个 CRM 页面的统一外壳：页面标题 + loading / error / ready 三态。
 * 这样 4 个路由共享同一套状态呈现，不需要各自复制一遍。
 */
export function CrmDataBoundary({
  route,
  title,
  description,
  eyebrow,
  actions,
  loadingVariant = "cards",
  variant = "full",
  ambient = true,
  children,
}: CrmDataBoundaryProps) {
  const status = useCrmStore((s) => s.status)
  const errorMessage = useCrmStore((s) => s.errorMessage)
  const refresh = useCrmStore((s) => s.refresh)

  const meta = useCrmPageMeta()[route]

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
        <div data-testid="crm-error">
          <ErrorState description={errorMessage ?? undefined} onRetry={refresh} />
        </div>
      ) : status === "loading" ? (
        <div data-testid="crm-loading" className="flex flex-col gap-6">
          <LoadingState variant={loadingVariant} count={5} />
          <LoadingState variant="section" />
          <LoadingState variant="rows" count={3} />
        </div>
      ) : (
        <div data-testid="crm-content">
          <PageTransition transitionKey={route}>{children}</PageTransition>
        </div>
      )}
    </PageContainer>
  )
}
