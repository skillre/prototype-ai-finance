"use client"

import { Suspense, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { CrmDataBoundary } from "../_components/crm-data-boundary"
import { useCrmShell } from "../_components/crm-shell"
import { CustomersView } from "../_components/customers-view"
import { useCrmStore } from "@/stores/crm-store"
import { STATUS_ORDER, type CustomerStatus } from "@/lib/crm-data"

/**
 * 把 ?status= 深链接应用到过滤器（Dashboard KPI 下钻用）。
 *
 * 必须单独成组件并包在 <Suspense> 内：useSearchParams 会触发 CSR bailout，
 * Next 在静态预渲染时要求存在 suspense 边界，否则 build 直接失败。
 */
function StatusFilterFromUrl() {
  const searchParams = useSearchParams()
  const setStatusFilter = useCrmStore((s) => s.setStatusFilter)

  const statusParam = searchParams.get("status")

  useEffect(() => {
    if (!statusParam) return
    if (!STATUS_ORDER.includes(statusParam as CustomerStatus)) return
    setStatusFilter(statusParam as CustomerStatus)
  }, [statusParam, setStatusFilter])

  return null
}

/** /crm/customers —— 客户列表路由。 */
export default function CrmCustomersPage() {
  const selectCustomer = useCrmStore((s) => s.selectCustomer)
  const openAddCustomer = useCrmShell().openAddCustomer

  return (
    <CrmDataBoundary route="customers" loadingVariant="rows">
      <Suspense fallback={null}>
        <StatusFilterFromUrl />
      </Suspense>
      <CustomersView
        onAddCustomer={openAddCustomer}
        // 列表内点击行 = 就地快速查看；抽屉里的「Open account」再进入完整记录页。
        onOpenCustomer={selectCustomer}
      />
    </CrmDataBoundary>
  )
}
