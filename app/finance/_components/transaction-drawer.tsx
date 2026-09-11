"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownLeftIcon, ArrowUpRightIcon, CircleGaugeIcon } from "lucide-react"
import { DetailDrawer } from "@/components/prototype/detail-drawer"
import { EmptyState } from "@/components/prototype/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useMessages } from "@/components/i18n/locale-provider"
import { formatCurrency, formatPercent1 } from "@/lib/format"
import { ACCOUNT_BALANCES, RECEIVABLES, TRANSACTIONS } from "@/lib/finance-ledger"
import { CUSTOMERS } from "@/lib/finance-data"
import type { ReceivableInvoice } from "@/lib/finance-ledger"
import { categoryName, useFinanceStore } from "@/stores/finance-store"
import { cn } from "@/lib/utils"

/** 账本页——"同对手方近期记录"与"在流水中筛选"都落到这里。 */
const LEDGER_ROUTE = "/finance/transactions"

/** 同对手方最多列几条。 */
const RELATED_LIMIT = 4

const ACCOUNT_NAME = new Map(ACCOUNT_BALANCES.map((account) => [account.id, account.name]))

type TransactionDrawerProps = {
  /** 打开某笔现金流水（凭证视图）；与 invoiceId 二选一 */
  transactionId?: string
  /** 打开某张应收发票（发票视图）；与 transactionId 二选一 */
  invoiceId?: string
  onOpenChange: (open: boolean) => void
  /** 点击"查看风险/账龄"等次级动作时的真实跳转 */
  onOpenInvoiceRail: () => void
}

/**
 * 凭证 / 发票详情抽屉。
 *
 * 两个视图共用同一个抽屉壳体，因为它们是同一件事的两面：一笔钱**为什么收**
 * （发票）与这笔钱**什么时候到**（流水）。视图里的每个数字都来自账本，
 * 页面不自己算。
 *
 * 内部切换用 state 覆写而不是重新挂载抽屉：点"同对手方近期记录"时抽屉保持
 * 打开、内容原地替换，用户不会看到一次关闭 + 打开的闪动。
 */
export function TransactionDrawer({
  transactionId,
  invoiceId,
  onOpenChange,
  onOpenInvoiceRail,
}: TransactionDrawerProps) {
  const t = useMessages()
  const router = useRouter()

  // 用户在抽屉内点开的另一笔流水（覆写外部传入的 id）。
  const [overridden, setOverridden] = useState<{ id: string; key: string } | null>(null)

  // 外部换了单据时同步一次——派生 state 在渲染期同步，避免用 effect 造成
  // 一次"先显示旧记录"的中间帧。
  const incomingKey = `${transactionId ?? ""}|${invoiceId ?? ""}`
  const [seenKey, setSeenKey] = useState(incomingKey)
  if (seenKey !== incomingKey) {
    setSeenKey(incomingKey)
    setOverridden(null)
  }

  // 手工登记的流水只存在于 store 里，不在静态账本中；两个来源都要能查到。
  const manualTransactions = useFinanceStore((state) => state.manualTransactions)
  const activeOverride = overridden?.key === incomingKey ? overridden.id : null
  const activeTransactionId = activeOverride ?? transactionId ?? null

  const transaction = activeTransactionId
    ? TRANSACTIONS.find((item) => item.id === activeTransactionId) ??
      manualTransactions.find((item) => item.id === activeTransactionId) ??
      null
    : null

  const invoice = invoiceId ? RECEIVABLES.find((item) => item.id === invoiceId) ?? null : null

  const openLedger = () => router.push(LEDGER_ROUTE)

  if (transaction) {
    const isIn = transaction.direction === "in"
    const isTransfer = transaction.kind === "transfer"
    const amount = `${isIn ? "+" : "−"}${formatCurrency(transaction.amount)}`

    const related = TRANSACTIONS.filter(
      (item) => item.counterparty === transaction.counterparty && item.id !== transaction.id
    )
      .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
      .slice(0, RELATED_LIMIT)

    return (
      <DetailDrawer
        open
        onOpenChange={onOpenChange}
        title={t.finance.drawer.transactionTitle}
        description={transaction.counterparty}
        testId="transaction-drawer"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p
              className={cn(
                "numeric text-numeric",
                isIn ? "text-success" : "text-foreground"
              )}
            >
              {amount}
            </p>
            <span className="flex items-center gap-1.5">
              {isTransfer ? <Badge variant="outline">{t.finance.transactions.transferBadge}</Badge> : null}
              <span className="flex items-center gap-1 text-body-sm text-muted-foreground">
                {isIn ? (
                  <ArrowDownLeftIcon className="size-4 text-success" aria-hidden />
                ) : (
                  <ArrowUpRightIcon className="size-4" aria-hidden />
                )}
                {isIn ? t.finance.drawer.directionIn : t.finance.drawer.directionOut}
              </span>
            </span>
          </div>

          <dl className="flex flex-col">
            <FieldRow label={t.finance.drawer.date} value={transaction.date} numeric />
            <FieldRow
              label={t.finance.drawer.account}
              value={ACCOUNT_NAME.get(transaction.accountId) ?? transaction.accountId}
            />
            <FieldRow
              label={t.finance.drawer.category}
              value={categoryName(transaction.category)}
            />
            <FieldRow
              label={t.finance.drawer.counterparty}
              value={transaction.counterparty}
            />
            <FieldRow label={t.finance.drawer.method} value={transaction.method} />
            <FieldRow label={t.finance.drawer.voucher} value={transaction.voucher} mono />
            <FieldRow label={t.finance.drawer.memo} value={transaction.memo} className="border-b-0" />
          </dl>

          {isTransfer ? (
            <p className="border-l-2 border-warning/60 pl-3 text-body-sm text-muted-foreground">
              {t.finance.transactions.transferHint}
            </p>
          ) : null}

          <section className="flex flex-col gap-2">
            <h3 className="eyebrow text-muted-foreground">{t.finance.drawer.related}</h3>
            {related.length > 0 ? (
              <ul className="flex flex-col">
                {related.map((item) => (
                  <li key={item.id} className="border-b border-hairline last:border-b-0">
                    <button
                      type="button"
                      data-testid={`drawer-related-${item.id}`}
                      onClick={() => setOverridden({ id: item.id, key: incomingKey })}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors duration-hover ease-standard hover:text-brand"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-body-sm">{item.memo}</span>
                        <span className="truncate text-label text-muted-foreground">
                          {item.date} · {categoryName(item.category)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "numeric shrink-0 text-body-sm",
                          item.direction === "in" ? "text-success" : "text-foreground"
                        )}
                      >
                        {item.direction === "in" ? "+" : "−"}
                        {formatCurrency(item.amount)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-muted-foreground">{t.finance.drawer.relatedEmpty}</p>
            )}
          </section>

          <Button type="button" variant="outline" className="w-full" onClick={openLedger}>
            {t.finance.drawer.openLedger}
          </Button>
        </div>
      </DetailDrawer>
    )
  }

  if (invoice) {
    const discipline = CUSTOMERS.find((customer) => customer.id === invoice.customerId)?.discipline ?? null

    return (
      <DetailDrawer
        open
        onOpenChange={onOpenChange}
        title={t.finance.drawer.invoiceTitle}
        description={invoice.number}
        testId="transaction-drawer"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="numeric text-numeric">{formatCurrency(invoice.amount)}</p>
            <InvoiceStatus invoice={invoice} />
          </div>

          <dl className="flex flex-col">
            <FieldRow label={t.finance.drawer.invoiceNumber} value={invoice.number} mono />
            <FieldRow label={t.finance.drawer.customer} value={invoice.customerName} />
            <FieldRow label={t.finance.drawer.invoiceDate} value={invoice.invoiceDate} numeric />
            <FieldRow label={t.finance.drawer.dueDate} value={invoice.dueDate} numeric />
            <FieldRow
              label={t.finance.drawer.settledDate}
              value={invoice.settledDate ?? t.finance.drawer.unsettled}
              className="border-b-0"
              numeric={Boolean(invoice.settledDate)}
            />
          </dl>

          <p
            className={cn(
              "text-body-sm",
              invoice.daysLate > 0 ? "text-danger" : "text-success"
            )}
          >
            {invoice.daysLate > 0
              ? t.finance.drawer.daysLate(invoice.daysLate)
              : t.finance.drawer.onTime}
          </p>

          {/* 回款纪律就是这张发票为什么慢的原因，因此必须与金额同屏可见。 */}
          {discipline === null ? null : (
            <section className="flex flex-col gap-2 border-t border-hairline pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="eyebrow text-muted-foreground">{t.finance.drawer.customer}</h3>
                <span className="numeric text-body">{formatPercent1(discipline * 100)}</span>
              </div>
              <span
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(discipline * 100)}
                aria-label={formatPercent1(discipline * 100)}
                className="h-px w-full bg-hairline"
              >
                <span
                  aria-hidden
                  className="block h-px bg-brand"
                  style={{ width: `${Math.round(discipline * 100)}%` }}
                />
              </span>
            </section>
          )}

          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" className="w-full" onClick={onOpenInvoiceRail}>
              <CircleGaugeIcon />
              {t.finance.risks.openInvoice}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={openLedger}>
              {t.finance.drawer.openLedger}
            </Button>
          </div>
        </div>
      </DetailDrawer>
    )
  }

  return (
    <DetailDrawer
      open
      onOpenChange={onOpenChange}
      title={t.finance.drawer.transactionTitle}
      testId="transaction-drawer"
    >
      <EmptyState
        title={t.finance.transactions.empty}
        description={t.finance.transactions.emptyHint}
      />
    </DetailDrawer>
  )
}

/** 一条字段：eyebrow 标签 + 值，行之间只有一条 hairline。 */
function FieldRow({
  label,
  value,
  numeric = false,
  mono = false,
  className,
}: {
  label: string
  value: string
  numeric?: boolean
  mono?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 border-b border-hairline py-2.5", className)}>
      <dt className="eyebrow shrink-0 text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-right text-body-sm",
          numeric && "numeric",
          mono && "font-mono"
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/** 发票状态徽标——已回款 / 未到期 / 已逾期。 */
function InvoiceStatus({ invoice }: { invoice: ReceivableInvoice }) {
  const t = useMessages()

  if (invoice.status === "settled") {
    return <Badge className="bg-success-soft text-success ring-1 ring-success/25">{t.finance.drawer.status.settled}</Badge>
  }
  if (invoice.status === "overdue") {
    return <Badge variant="destructive">{t.finance.drawer.status.overdue}</Badge>
  }
  return <Badge variant="outline">{t.finance.drawer.status.open}</Badge>
}
