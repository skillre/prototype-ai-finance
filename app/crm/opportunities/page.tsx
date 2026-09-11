"use client"

import { useRouter } from "next/navigation"
import { CrmDataBoundary } from "../_components/crm-data-boundary"
import { OpportunitiesView } from "../_components/opportunities-view"

/** /crm/opportunities —— 机会路由。 */
export default function CrmOpportunitiesPage() {
  const router = useRouter()

  return (
    <CrmDataBoundary route="opportunities" loadingVariant="rows">
      <OpportunitiesView
        onOpenCustomer={(customerId) => router.push(`/crm/customers/${customerId}`)}
      />
    </CrmDataBoundary>
  )
}
