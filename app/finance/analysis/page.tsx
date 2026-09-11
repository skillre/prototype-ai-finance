"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LoadingState } from "@/components/prototype/loading-state"
import { FinanceDataBoundary } from "../_components/finance-data-boundary"
import { AnalysisView } from "../_components/analysis-view"

/**
 * /finance/analysis —— 收入 / 支出分析。
 *
 * 科目筛选放在 URL 上（?category=software）：洞察、预算与命令中心都能
 * 深链到同一个视图，而不是各自造一个"筛选后的页面"。
 */
function AnalysisRoute() {
  const router = useRouter()
  const params = useSearchParams()

  return (
    <FinanceDataBoundary route="analysis">
      <AnalysisView
        category={params.get("category")}
        onSelectCategory={(categoryId) =>
          router.push(categoryId ? `/finance/analysis?category=${categoryId}` : "/finance/analysis")
        }
        onOpenCounterparty={(name) =>
          router.push(`/finance/transactions?q=${encodeURIComponent(name)}`)
        }
      />
    </FinanceDataBoundary>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<LoadingState variant="section" />}>
      <AnalysisRoute />
    </Suspense>
  )
}
