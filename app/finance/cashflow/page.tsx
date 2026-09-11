"use client"

import { useRouter } from "next/navigation"
import { FinanceDataBoundary } from "../_components/finance-data-boundary"
import { CashRunwayHero } from "../_components/cash-runway-hero"
import {
  CashForecastDetail,
  ForecastAssumptions,
  ScheduledPayables,
} from "../_components/cash-forecast-view"
import { AccountBalances } from "../_components/overview-sections"

/** /finance/cashflow —— 现金跑道 + 13 周推演明细。 */
export default function CashflowPage() {
  const router = useRouter()

  return (
    <FinanceDataBoundary route="cashflow" variant="compact" ambient={false}>
      <div className="flex flex-col gap-8">
        <CashRunwayHero onOpenCashflow={() => router.push("/finance/cashflow")} />

        <CashForecastDetail />

        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-10">
          <AccountBalances />
          <ScheduledPayables />
        </div>

        <ForecastAssumptions />
      </div>
    </FinanceDataBoundary>
  )
}
