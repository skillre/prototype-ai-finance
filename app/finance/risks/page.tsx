"use client"

import { useRouter } from "next/navigation"
import { FinanceDataBoundary } from "../_components/finance-data-boundary"
import { RisksView } from "../_components/risks-view"
import { RECEIVABLES } from "@/lib/finance-ledger"
import { useFinanceStore } from "@/stores/finance-store"

/**
 * /finance/risks —— 异常支出、预算超支与应收账龄。
 *
 * 发票详情由外壳承载（与流水凭证共用同一套抽屉）：这里只负责把选中的
 * 发票放进 store，因此从命令中心或账龄清单打开的是同一个界面。
 */
export default function RisksPage() {
  const router = useRouter()
  const selectInvoice = useFinanceStore((s) => s.selectInvoice)

  return (
    <FinanceDataBoundary route="risks">
      <RisksView
        onOpenInvoice={(invoiceId) => {
          const invoice = RECEIVABLES.find((item) => item.id === invoiceId)
          if (invoice) selectInvoice(invoice)
        }}
        onOpenCategory={(categoryId) => router.push(`/finance/analysis?category=${categoryId}`)}
        onOpenBudget={() => router.push("/finance/budget")}
      />
    </FinanceDataBoundary>
  )
}
