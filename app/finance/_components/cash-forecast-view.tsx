"use client"

import { useMemo } from "react"
import { SectionHeading } from "@/components/prototype/section-heading"
import { EmptyState } from "@/components/prototype/empty-state"
import { useMessages } from "@/components/i18n/locale-provider"
import { CASH_FLOOR, DATA_SCOPE, selectCashForecast } from "@/lib/finance-metrics"
import { PAYABLES } from "@/lib/finance-ledger"
import { formatCurrency, formatCurrencyCompact, formatRatio } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useFinanceStore } from "@/stores/finance-store"

/**
 * 现金流页的推演层。
 *
 * 第一视觉由跑道仪表承担（同一个组件，不是复制一份）；这里补的是
 * **可以逐周核对的明细**：13 周的流入、流出、净额与期末现金，
 * 以及预测所依据的四条口径。财务人不会只信一条线。
 */
export function CashForecastDetail() {
  const t = useMessages()
  const assumptions = useFinanceStore((s) => s.assumptions)
  const forecast = useMemo(() => selectCashForecast(assumptions), [assumptions])

  const weeks = forecast.weeks
  const maxFlow = Math.max(...weeks.map((week) => Math.max(week.inflow, week.outflow)), 1)

  return (
    <section className="flex flex-col gap-4" data-testid="cash-forecast-detail">
      <SectionHeading
        title={t.finance.cashflow.forecastTitle}
        description={t.finance.cashflow.forecastDescription(
          weeks[0]?.start ?? "",
          weeks[weeks.length - 1]?.end ?? ""
        )}
        action={
          <dl className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-label sm:w-auto">
            <span className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">{t.finance.cashflow.endingLabel}</dt>
              <dd className="numeric font-medium" data-testid="forecast-ending">
                {formatCurrencyCompact(forecast.ending)}
              </dd>
            </span>
            <span className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">{t.finance.cashflow.netLabel}</dt>
              <dd
                className={cn(
                  "numeric font-medium",
                  forecast.net >= 0 ? "text-success" : "text-danger"
                )}
              >
                {formatCurrencyCompact(forecast.net)}
              </dd>
            </span>
            <span className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">{t.finance.cashflow.troughLabel}</dt>
              <dd className="numeric font-medium">{formatCurrencyCompact(forecast.trough.value)}</dd>
            </span>
          </dl>
        }
      />

      {/*
        逐周清单：每一行是一条可以核对的记录。
        流入/流出用同一条基线上的两条横条表达长度关系——不是两组数字。
      */}
      <ol className="flex flex-col">
        {weeks.map((week) => (
          <li
            key={week.index}
            data-testid={`forecast-week-${week.index}`}
            className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-hairline py-2.5 first:border-t-0 first:pt-0 sm:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <span className="numeric text-label text-muted-foreground">{week.label}</span>

            <span className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                <span className="h-1.5 flex-1 rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-data-income"
                    style={{ width: `${(week.inflow / maxFlow) * 100}%` }}
                  />
                </span>
                <span className="numeric w-16 text-right text-label">
                  {formatCurrencyCompact(week.inflow)}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 flex-1 rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-data-expense"
                    style={{ width: `${(week.outflow / maxFlow) * 100}%` }}
                  />
                </span>
                <span className="numeric w-16 text-right text-label">
                  {formatCurrencyCompact(week.outflow)}
                </span>
              </span>
            </span>

            <span className="hidden flex-col gap-1 text-label sm:flex">
              <span className="text-muted-foreground">
                {t.finance.hero.weekNet}{" "}
                <span className={cn("numeric", week.net >= 0 ? "text-success" : "text-danger")}>
                  {formatCurrencyCompact(week.net)}
                </span>
              </span>
              <span className="text-muted-foreground">
                {t.finance.cashflow.breachLabel}{" "}
                <span
                  className={cn(
                    "numeric",
                    week.closing < CASH_FLOOR ? "font-semibold text-danger" : "text-foreground/80"
                  )}
                >
                  {formatCurrencyCompact(week.closing)}
                </span>
              </span>
            </span>

            <span
              className={cn(
                "numeric self-start text-body font-semibold sm:self-center",
                week.closing < CASH_FLOOR ? "text-danger" : "text-foreground/85"
              )}
            >
              {formatCurrencyCompact(week.closing)}
            </span>
          </li>
        ))}
      </ol>

      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5 border-t border-hairline pt-3.5 text-label">
        <span className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground">{t.finance.metrics.burn}</dt>
          <dd className="numeric font-medium">{formatCurrencyCompact(forecast.monthlyBurn)}</dd>
        </span>
        <span className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground">{t.finance.metrics.runway}</dt>
          <dd className="numeric font-medium">
            {formatRatio(forecast.runway)} {t.finance.hero.runwayUnit}
          </dd>
        </span>
        <span className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground">{t.finance.cashflow.breachLabel}</dt>
          <dd className="numeric font-medium text-danger">{formatCurrencyCompact(CASH_FLOOR)}</dd>
        </span>
      </dl>
    </section>
  )
}

/** 预测口径：四条规则，逐条说清楚——预测的可信度来自它的可解释性。 */
export function ForecastAssumptions() {
  const t = useMessages()
  const rules = [
    t.finance.cashflow.assumptionRecurring,
    t.finance.cashflow.assumptionInvoices,
    t.finance.cashflow.assumptionVendors,
    t.finance.cashflow.assumptionExcluded,
  ]

  return (
    <div className="flex flex-col gap-4" data-testid="forecast-assumptions">
      <SectionHeading title={t.finance.cashflow.assumptionsTitle} divider={false} />
      <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
        {rules.map((rule, index) => (
          <li key={rule} className="flex gap-2.5 text-body-sm text-muted-foreground">
            <span className="numeric text-label text-muted-foreground/50">
              {String(index + 1).padStart(2, "0")}
            </span>
            {rule}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 排期应付：已入账、尚未到付款日的账单——现金流出里"已经欠下"的部分。 */
export function ScheduledPayables() {
  const t = useMessages()
  const scheduled = useMemo(() => PAYABLES.filter((bill) => bill.status === "scheduled"), [])
  const total = scheduled.reduce((sum, bill) => sum + bill.amount, 0)

  return (
    <div className="flex flex-col gap-4" data-testid="scheduled-payables">
      <SectionHeading
        title={t.finance.cashflow.scheduledTitle}
        description={t.finance.cashflow.scheduledDescription}
        divider={false}
      />

      {scheduled.length === 0 ? (
        <EmptyState title={t.finance.cashflow.scheduledEmpty} />
      ) : (
        <ul className="flex flex-col">
          {scheduled.slice(0, 6).map((bill) => (
            <li
              key={bill.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-hairline py-3 first:border-t-0 first:pt-0"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body font-medium">{bill.vendorName}</span>
                <span className="text-label text-muted-foreground">
                  {bill.number} · {t.finance.risks.dueDate(bill.dueDate)}
                </span>
              </span>
              <span className="numeric text-body font-semibold">
                {formatCurrency(bill.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-label text-muted-foreground">
        {t.finance.scope.payable(formatCurrencyCompact(total))} ·{" "}
        {t.finance.scope.reference(DATA_SCOPE.referenceDate)}
      </p>
    </div>
  )
}
