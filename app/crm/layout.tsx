import type { Metadata } from "next"
import { CrmShell } from "./_components/crm-shell"
import { messages } from "@/lib/i18n"

export const metadata: Metadata = {
  title: messages.brand.metaTitle,
  description: messages.brand.metaDescription,
}

export default function CrmLayout({ children }: LayoutProps<"/crm">) {
  return <CrmShell>{children}</CrmShell>
}
