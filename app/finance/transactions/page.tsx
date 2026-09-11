"use client"

import { useRouter } from "next/navigation"
import { FinanceDataBoundary } from "../_components/finance-data-boundary"
import { TransactionsView } from "../_components/transactions-view"
import { useFinanceStore } from "@/stores/finance-store"

/** /finance/transactions —— 账本（筛选 + 分页 + 凭证抽屉）。 */
export default function TransactionsPage() {
  const router = useRouter()
  const selectTransaction = useFinanceStore((s) => s.selectTransaction)

  return (
    <FinanceDataBoundary route="transactions">
      <TransactionsView
        onOpenTransaction={(id) => {
          /* 打开凭证的同时把 id 写进 URL：分享链接与刷新都能回到同一条记录。 */
          router.push(`/finance/transactions?tx=${id}`)
          selectTransaction(id)
        }}
      />
    </FinanceDataBoundary>
  )
}
