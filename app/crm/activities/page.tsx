"use client"

import { useRouter } from "next/navigation"
import { CrmDataBoundary } from "../_components/crm-data-boundary"
import { ActivitiesView } from "../_components/activities-view"

/** /crm/activities —— 活动时间线路由。 */
export default function CrmActivitiesPage() {
  const router = useRouter()

  return (
    <CrmDataBoundary route="activities" loadingVariant="rows">
      <ActivitiesView
        onOpenCustomer={(customerId) => router.push(`/crm/customers/${customerId}`)}
      />
    </CrmDataBoundary>
  )
}
