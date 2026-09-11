import type { Metadata } from "next"
import { FinanceShell } from "./_components/finance-shell"
import { messages } from "@/lib/i18n"

export const metadata: Metadata = {
  title: messages.brand.metaTitle,
  description: messages.brand.metaDescription,
}

export default function FinanceLayout({ children }: LayoutProps<"/finance">) {
  return <FinanceShell>{children}</FinanceShell>
}
