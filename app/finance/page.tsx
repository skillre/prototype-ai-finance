"use client"

import { useRouter } from "next/navigation"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMessages } from "@/components/i18n/locale-provider"
import { FinanceDataBoundary } from "./_components/finance-data-boundary"
import { useFinanceShell } from "./_components/finance-shell"
import { CashRunwayHero } from "./_components/cash-runway-hero"
import { InsightLayer } from "./_components/insight-layer"
import {
  AccountBalances,
  MonthlyBrief,
  OverBudgetCategories,
  RecentTransactions,
  ScopeNote,
} from "./_components/overview-sections"

/** /finance —— 财务总览。第一屏给跑道，然后产品开口说话，最后才是记录。 */
export default function FinanceOverviewPage() {
  const router = useRouter()
  const t = useMessages()
  const openAddTransaction = useFinanceShell().openAddTransaction

  return (
    <FinanceDataBoundary
      route="overview"
      /* 总览以跑道仪表开场：页头压成一行，环境光交给主视觉。 */
      variant="compact"
      ambient={false}
      actions={
        <Button
          type="button"
          size="sm"
          onClick={openAddTransaction}
          data-testid="overview-add-transaction"
        >
          <PlusIcon />
          {t.nav.addTransaction}
        </Button>
      }
    >
      <div className="flex flex-col gap-8">
        <CashRunwayHero onOpenCashflow={() => router.push("/finance/cashflow")} />

        <InsightLayer limit={3} />

        <MonthlyBrief />

        {/* 非对称构图：账户分布是 58，超支科目是 42 */}
        <div className="grid gap-8 lg:grid-cols-[1.38fr_1fr] lg:gap-10">
          <AccountBalances />
          <OverBudgetCategories />
        </div>

        <RecentTransactions limit={8} />

        <ScopeNote />
      </div>
    </FinanceDataBoundary>
  )
}
