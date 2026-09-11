"use client"

import { useRouter } from "next/navigation"
import { FinanceDataBoundary } from "../_components/finance-data-boundary"
import { BudgetView } from "../_components/budget-view"

/** /finance/budget —— 季度预算执行。 */
export default function BudgetPage() {
  const router = useRouter()

  return (
    <FinanceDataBoundary route="budget">
      <BudgetView
        onOpenCategory={(categoryId) => router.push(`/finance/analysis?category=${categoryId}`)}
        onOpenLedger={() => router.push("/finance/transactions")}
      />
    </FinanceDataBoundary>
  )
}
