"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PlusIcon } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CRM_OWNERS,
  STATUS_ORDER,
  type CrmOwner,
  type CustomerStatus,
} from "@/lib/crm-data"
import { useCrmStore } from "@/stores/crm-store"
import { formatCurrency } from "@/lib/format"
import { useMessages } from "@/components/i18n/locale-provider"
import { cn } from "@/lib/utils"

const EMAIL_RE = /^\S+@\S+\.\S+$/
const DEFAULT_VALUE = "480000"

type AddCustomerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 创建成功后回调新建客户 id（用于自动打开详情抽屉）。 */
  onCreated?: (customerId: string) => void
}

/** 真实写入 store 的「添加客户」表单——校验、toast、KPI 联动都是真的。 */
export function AddCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: AddCustomerDialogProps) {
  const t = useMessages()
  const addCustomer = useCrmStore((s) => s.addCustomer)

  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [owner, setOwner] = useState<CrmOwner>(CRM_OWNERS[0])
  const [status, setStatus] = useState<CustomerStatus>("lead")
  const [value, setValue] = useState(DEFAULT_VALUE)
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const reset = () => {
    setName("")
    setCompany("")
    setEmail("")
    setPhone("")
    setOwner(CRM_OWNERS[0])
    setStatus("lead")
    setValue(DEFAULT_VALUE)
    setNotes("")
    setErrors({})
  }

  const validate = () => {
    const v = t.dialogs.addCustomer.validation
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = v.name
    if (!company.trim()) next.company = v.company
    if (!EMAIL_RE.test(email.trim())) next.email = v.email
    if (!phone.trim()) next.phone = v.phone
    if (Number.isNaN(Number(value)) || Number(value) < 0) next.value = v.value
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = () => {
    if (!validate()) return
    const created = addCustomer({
      name,
      company,
      email,
      phone,
      owner,
      status,
      value: Number(value),
      notes,
    })

    toast.success(t.dialogs.addCustomer.created(created.company), {
      description: `${created.name} · ${t.status[created.status]} · ${formatCurrency(created.value)}`,
    })

    onOpenChange(false)
    reset()
    onCreated?.(created.id)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent
        data-testid="add-customer-dialog"
        className="sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{t.dialogs.addCustomer.title}</DialogTitle>
          <DialogDescription className="text-pretty">
            {t.dialogs.addCustomer.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t.dialogs.addCustomer.name} error={errors.name}>
            <Input
              data-testid="add-customer-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.dialogs.addCustomer.placeholderName}
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field label={t.dialogs.addCustomer.company} error={errors.company}>
            <Input
              data-testid="add-customer-company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder={t.dialogs.addCustomer.placeholderCompany}
              aria-invalid={Boolean(errors.company)}
            />
          </Field>

          <Field label={t.dialogs.addCustomer.email} error={errors.email}>
            <Input
              data-testid="add-customer-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t.dialogs.addCustomer.placeholderEmail}
              aria-invalid={Boolean(errors.email)}
            />
          </Field>

          <Field label={t.dialogs.addCustomer.phone} error={errors.phone}>
            <Input
              data-testid="add-customer-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={t.dialogs.addCustomer.placeholderPhone}
              aria-invalid={Boolean(errors.phone)}
            />
          </Field>

          <Field label={t.dialogs.addCustomer.owner}>
            <Select value={owner} onValueChange={(next) => setOwner(next as CrmOwner)}>
              <SelectTrigger className="w-full" data-testid="add-customer-owner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRM_OWNERS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t.dialogs.addCustomer.status}>
            <Select
              value={status}
              onValueChange={(next) => setStatus(next as CustomerStatus)}
            >
              <SelectTrigger className="w-full" data-testid="add-customer-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t.status[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label={t.dialogs.addCustomer.value}
            error={errors.value}
            className="sm:col-span-2"
          >
            <Input
              data-testid="add-customer-value"
              type="number"
              min={0}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-invalid={Boolean(errors.value)}
              className="numeric"
            />
          </Field>

          <Field label={t.dialogs.addCustomer.notes} className="sm:col-span-2">
            <Textarea
              data-testid="add-customer-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t.dialogs.addCustomer.notesPlaceholder}
              rows={3}
            />
          </Field>
        </div>

        <DialogFooter showCloseButton={false}>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t.common.cancel}
          </DialogClose>
          <Button type="button" onClick={submit} data-testid="add-customer-submit">
            <PlusIcon />
            {t.dialogs.addCustomer.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-label font-medium text-muted-foreground">{label}</label>
      {children}
      {error ? (
        <span role="alert" className="text-label text-danger">
          {error}
        </span>
      ) : null}
    </div>
  )
}
