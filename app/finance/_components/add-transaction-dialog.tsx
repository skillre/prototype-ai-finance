"use client"

import { useId, useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useMessages } from "@/components/i18n/locale-provider"
import { formatCurrency } from "@/lib/format"
import type { CashTransaction } from "@/lib/finance-ledger"
import { FILTER_ACCOUNTS, FILTER_CATEGORIES, useFinanceStore } from "@/stores/finance-store"

type Direction = "in" | "out"

/**
 * `components/ui/radio-group` 的 `RadioGroup` 目前不是泛型组件（`Props<Value>`
 * 的默认参数落在 `any` 上），因此方向值在调用处会退化成 `any`。这里用一个
 * 局部包装补上 `Direction`，让表单里的方向仍然是严格类型。
 */
function DirectionRadioGroup({
  value,
  onValueChange,
  children,
}: {
  value: Direction
  onValueChange: (value: Direction) => void
  children: React.ReactNode
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onValueChange(next as Direction)}
      className="grid-cols-2"
    >
      {children}
    </RadioGroup>
  )
}

type AddTransactionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (transaction: CashTransaction) => void
}

/**
 * 登记一笔收支。
 *
 * 表单里唯一"聪明"的地方是科目下拉：它按方向切换（收入线 / 支出科目），
 * 因为账本里这两组 id 本来就不重叠——把它们混在一个列表里会让用户选出一个
 * 科目与方向互相矛盾的记录。其余全部是直白的手工录入，提交后走 store 的
 * `addTransaction`，与账本共用同一个写入路径。
 */
export function AddTransactionDialog({
  open,
  onOpenChange,
  onCreated,
}: AddTransactionDialogProps) {
  const t = useMessages()

  const [direction, setDirection] = useState<Direction>("out")
  const [counterparty, setCounterparty] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [accountId, setAccountId] = useState("")
  const [memo, setMemo] = useState("")
  const [errors, setErrors] = useState<{ counterparty?: boolean; amount?: boolean }>({})

  const counterpartyId = useId()
  const amountId = useId()
  const memoId = useId()

  /** 科目按方向过滤：收入 → 收入线，支出 → 支出科目。 */
  const categories = FILTER_CATEGORIES.filter((item) => item.track === direction)

  const reset = () => {
    setDirection("out")
    setCounterparty("")
    setAmount("")
    setCategory("")
    setAccountId("")
    setMemo("")
    setErrors({})
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  /** 切换方向会换掉整个科目列表，因此顺手清掉上一个方向的选择。 */
  const changeDirection = (next: Direction) => {
    setDirection(next)
    setCategory("")
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsedAmount = Number(amount)
    const nextErrors = {
      counterparty: counterparty.trim().length === 0,
      amount: !Number.isFinite(parsedAmount) || parsedAmount <= 0,
    }
    setErrors(nextErrors)
    if (nextErrors.counterparty || nextErrors.amount) return

    const transaction = useFinanceStore.getState().addTransaction({
      direction,
      counterparty: counterparty.trim(),
      amount: parsedAmount,
      category,
      accountId,
      memo: memo.trim(),
    })

    onCreated(transaction)
    toast.success(t.dialogs.addTransaction.successTitle, {
      description: t.dialogs.addTransaction.successDescription(
        transaction.counterparty,
        formatCurrency(transaction.amount)
      ),
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-testid="add-transaction-dialog"
        className="rounded-panel border-border/70 shadow-floating sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{t.dialogs.addTransaction.title}</DialogTitle>
          <DialogDescription className="text-pretty">
            {t.dialogs.addTransaction.description}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="eyebrow text-muted-foreground">
              {t.dialogs.addTransaction.direction}
            </legend>
            <DirectionRadioGroup value={direction} onValueChange={changeDirection}>
              {(
                [
                  { value: "in", label: t.dialogs.addTransaction.directionIn },
                  { value: "out", label: t.dialogs.addTransaction.directionOut },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-8 cursor-pointer items-center gap-2 rounded-field border border-input bg-surface/60 px-2.5 py-1 text-body-sm transition-colors duration-hover ease-standard has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40"
                >
                  <RadioGroupItem value={option.value} />
                  {option.label}
                </label>
              ))}
            </DirectionRadioGroup>
          </fieldset>

          <LabelledField
            label={t.dialogs.addTransaction.counterparty}
            htmlFor={counterpartyId}
            error={errors.counterparty ? t.dialogs.addTransaction.errors.counterparty : undefined}
          >
            <Input
              id={counterpartyId}
              data-testid="add-transaction-counterparty"
              value={counterparty}
              placeholder={t.dialogs.addTransaction.counterpartyPlaceholder}
              aria-invalid={errors.counterparty || undefined}
              onChange={(event) => {
                setCounterparty(event.target.value)
                if (errors.counterparty) setErrors((prev) => ({ ...prev, counterparty: false }))
              }}
            />
          </LabelledField>

          <LabelledField
            label={t.dialogs.addTransaction.amount}
            htmlFor={amountId}
            error={errors.amount ? t.dialogs.addTransaction.errors.amount : undefined}
          >
            <Input
              id={amountId}
              data-testid="add-transaction-amount"
              value={amount}
              inputMode="decimal"
              placeholder={t.dialogs.addTransaction.amountPlaceholder}
              aria-invalid={errors.amount || undefined}
              onChange={(event) => {
                setAmount(event.target.value)
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: false }))
              }}
              className="numeric"
            />
          </LabelledField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LabelledField label={t.dialogs.addTransaction.category}>
              <Select value={category || null} onValueChange={(value) => setCategory(value ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t.dialogs.addTransaction.categoryPlaceholder}>
                    {(value: string | null) =>
                      value
                        ? categories.find((item) => item.id === value)?.name ??
                          t.dialogs.addTransaction.categoryPlaceholder
                        : t.dialogs.addTransaction.categoryPlaceholder
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabelledField>

            <LabelledField label={t.dialogs.addTransaction.account}>
              <Select value={accountId || null} onValueChange={(value) => setAccountId(value ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t.dialogs.addTransaction.accountPlaceholder}>
                    {(value: string | null) =>
                      value
                        ? FILTER_ACCOUNTS.find((item) => item.id === value)?.name ??
                          t.dialogs.addTransaction.accountPlaceholder
                        : t.dialogs.addTransaction.accountPlaceholder
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FILTER_ACCOUNTS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabelledField>
          </div>

          <LabelledField label={t.dialogs.addTransaction.memo} htmlFor={memoId}>
            <Input
              id={memoId}
              value={memo}
              placeholder={t.dialogs.addTransaction.memoPlaceholder}
              onChange={(event) => setMemo(event.target.value)}
            />
          </LabelledField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" data-testid="add-transaction-submit">
              {t.dialogs.addTransaction.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** eyebrow 标签 + 控件 + 行内错误——三个字段共用同一种排版。 */
function LabelledField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="eyebrow text-muted-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-label text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
