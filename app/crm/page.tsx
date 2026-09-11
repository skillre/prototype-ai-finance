"use client"

import { useRouter } from "next/navigation"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMessages } from "@/components/i18n/locale-provider"
import { CrmDataBoundary } from "./_components/crm-data-boundary"
import { useCrmShell } from "./_components/crm-shell"
import { DashboardView } from "./_components/dashboard-view"

/** /crm —— 总览路由。 */
export default function CrmDashboardPage() {
  const router = useRouter()
  const t = useMessages()
  const openAddCustomer = useCrmShell().openAddCustomer

  // 总览是跨场景跳转：直接进入客户记录页，而不是在总览上盖一层抽屉。
  const openCustomer = (customerId: string) => {
    router.push(`/crm/customers/${customerId}`)
  }

  return (
    <CrmDataBoundary
      route="dashboard"
      /* 总览以 Hero 开场：页头压成一行小标题，环境光交给 Hero。 */
      variant="compact"
      ambient={false}
      actions={
        <Button type="button" size="sm" onClick={openAddCustomer} data-testid="dashboard-add-customer">
          <PlusIcon />
          {t.nav.addCustomer}
        </Button>
      }
    >
      <DashboardView
        onOpenCustomer={openCustomer}
        onGoToTasks={() => router.push("/crm/tasks")}
        onGoToOpportunities={() => router.push("/crm/opportunities")}
        onGoToCustomers={(filter) => {
          const query = filter?.status ? `?status=${filter.status}` : ""
          router.push(`/crm/customers${query}`)
        }}
      />
    </CrmDataBoundary>
  )
}
