import type { Metadata } from "next"
import { NotFoundState } from "@/components/prototype/not-found-state"
import { messages } from "@/lib/i18n"

export const metadata: Metadata = { title: messages.notFound.crm.metaTitle }

const t = messages.notFound.crm

/**
 * /crm 段内的 404 —— 例如访问不存在的 /crm/reports。
 * 直接给出真实可用的下一步，而不是让用户卡在死胡同。
 */
export default function CrmNotFound() {
  return (
    <div className="mx-auto w-full max-w-dashboard px-gutter py-10 sm:px-8">
      <NotFoundState
        code="404"
        testId="crm-not-found"
        title={t.title}
        description={t.description}
        action={{ label: t.action, href: "/crm" }}
        suggestions={[
          { label: messages.nav.customers, href: "/crm/customers" },
          { label: messages.nav.tasks, href: "/crm/tasks" },
          { label: messages.nav.activities, href: "/crm/activities" },
        ]}
      />
    </div>
  )
}
