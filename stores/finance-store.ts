"use client"

import { create } from "zustand"
import {
  ACCOUNTS,
  CUSTOMERS,
  EXPENSE_CATEGORIES,
  REVENUE_LINES,
  type ExpenseCategoryId,
  type MonthKey,
} from "@/lib/finance-data"
import { TRANSACTIONS, type CashTransaction, type ReceivableInvoice } from "@/lib/finance-ledger"
import {
  BASE_ASSUMPTIONS,
  DEFAULT_TRANSACTION_FILTERS,
  type Assumptions,
  type CashForecast,
  type TransactionFilters,
} from "@/lib/finance-metrics"
import { selectInsights as selectInsightsFor } from "@/lib/finance-insights"
import { messages as t } from "@/lib/i18n"

/**
 * 账本状态。
 *
 * 与 Factory 的约定一致：selector 只取**原始值**，派生一律用纯函数在组件里
 * `useMemo` 计算（见下方导出的 selector）。这里只保存"用户改了什么"：
 * 假设、筛选、分页、当前打开的凭证。
 *
 * 假设（收入达成率 / 成本系数 / 回款率）放在 store 而不是组件里，是因为
 * 它同时驱动第一视觉的跑道读数、现金流页的预测曲线，以及洞察层里那条
 * 情景结论——三处必须读同一个值。
 */

export type LedgerStatus = "loading" | "ready" | "error"

export interface NewTransactionInput {
  direction: "in" | "out"
  counterparty: string
  amount: number
  category: string
  accountId: string
  memo: string
}

interface FinanceState {
  status: LedgerStatus
  errorMessage: string | null

  transactions: CashTransaction[]
  /** 用户手工登记的交易，重置时清空。 */
  manualTransactions: CashTransaction[]

  assumptions: Assumptions
  /** 假设是否偏离基准——界面上的"已偏离基准"标签读它。 */
  assumptionsDirty: boolean

  filters: TransactionFilters
  page: number

  selectedTransactionId: string | null
  selectedInvoice: ReceivableInvoice | null

  insightSeverity: "all" | "high" | "medium" | "low"
  /** 洞察页只显示超支科目 / 全部科目。 */
  budgetOnlyOver: boolean

  initialize: () => void
  refresh: () => void
  simulateError: () => void
  reset: () => void

  setAssumption: (key: keyof Assumptions, value: number) => void
  applyAssumptions: (assumptions: Assumptions) => void
  resetAssumptions: () => void

  setFilters: (patch: Partial<TransactionFilters>) => void
  resetFilters: () => void
  setPage: (page: number) => void

  selectTransaction: (id: string | null) => void
  selectInvoice: (invoice: ReceivableInvoice | null) => void
  addTransaction: (input: NewTransactionInput) => CashTransaction

  setInsightSeverity: (value: FinanceState["insightSeverity"]) => void
  setBudgetOnlyOver: (value: boolean) => void
}

const SIMULATED_LATENCY = 700

/** 基准现金流水。系统数据永远是只读的，用户新增只追加在内存里。 */
const BASE_TRANSACTIONS = TRANSACTIONS

export const useFinanceStore = create<FinanceState>((set, get) => ({
  status: "loading",
  errorMessage: null,

  transactions: [],
  manualTransactions: [],

  assumptions: { ...BASE_ASSUMPTIONS },
  assumptionsDirty: false,

  filters: { ...DEFAULT_TRANSACTION_FILTERS },
  page: 1,

  selectedTransactionId: null,
  selectedInvoice: null,

  insightSeverity: "all",
  budgetOnlyOver: false,

  initialize: () => {
    if (get().status === "ready") return
    set({ status: "loading", errorMessage: null })
    setTimeout(() => {
      set({ status: "ready", transactions: BASE_TRANSACTIONS })
    }, SIMULATED_LATENCY)
  },

  refresh: () => {
    set({ status: "loading", errorMessage: null })
    setTimeout(() => {
      set((state) => ({
        status: "ready",
        transactions: [...state.manualTransactions, ...BASE_TRANSACTIONS],
      }))
    }, SIMULATED_LATENCY)
  },

  simulateError: () =>
    set({
      status: "error",
      errorMessage: "GET https://api.zhiwu.cn/v1/ledger?month=2026-09 — 请求在 10 秒后超时。",
    }),

  reset: () =>
    set({
      status: "ready",
      errorMessage: null,
      transactions: BASE_TRANSACTIONS,
      manualTransactions: [],
      assumptions: { ...BASE_ASSUMPTIONS },
      assumptionsDirty: false,
      filters: { ...DEFAULT_TRANSACTION_FILTERS },
      page: 1,
      selectedTransactionId: null,
      selectedInvoice: null,
      insightSeverity: "all",
      budgetOnlyOver: false,
    }),

  setAssumption: (key, value) =>
    set((state) => {
      const assumptions = { ...state.assumptions, [key]: value }
      return {
        assumptions,
        assumptionsDirty:
          Math.abs(assumptions.revenueFactor - 1) > 0.001 ||
          Math.abs(assumptions.costFactor - 1) > 0.001 ||
          Math.abs(assumptions.collectionRate - 1) > 0.001,
      }
    }),

  applyAssumptions: (assumptions) => set({ assumptions, assumptionsDirty: true }),
  resetAssumptions: () => set({ assumptions: { ...BASE_ASSUMPTIONS }, assumptionsDirty: false }),

  // 任何筛选变化都回到第一页，避免停在越界页码上。
  setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch }, page: 1 })),
  resetFilters: () => set({ filters: { ...DEFAULT_TRANSACTION_FILTERS }, page: 1 }),
  setPage: (page) => set({ page: Math.max(1, page) }),

  selectTransaction: (id) => set({ selectedTransactionId: id }),
  selectInvoice: (invoice) => set({ selectedInvoice: invoice }),

  addTransaction: (input) => {
    const now = new Date()
    const transaction: CashTransaction = {
      id: `tx-manual-${now.getTime()}`,
      date: now.toISOString().slice(0, 10),
      month: now.toISOString().slice(0, 7) as MonthKey,
      direction: input.direction,
      amount: input.amount,
      accountId: input.accountId,
      category: input.category,
      kind: input.direction === "in" ? "revenue" : "expense",
      counterparty: input.counterparty.trim(),
      memo: input.memo.trim() || t.data.defaultMemo,
      method: t.data.manualEntry,
      voucher: `${t.data.manualVoucher}-${String(now.getTime()).slice(-6)}`,
    }

    set((state) => ({
      manualTransactions: [transaction, ...state.manualTransactions],
      transactions: [transaction, ...state.transactions],
      page: 1,
    }))
    return transaction
  },

  setInsightSeverity: (value) => set({ insightSeverity: value }),
  setBudgetOnlyOver: (value) => set({ budgetOnlyOver: value }),
}))

/* -------------------------------------------------------------------------- */
/* 纯函数 selector —— 与 Factory 既有约定一致：只接收原始值，派生在组件里。      */
/* -------------------------------------------------------------------------- */

export {
  selectTransactions,
  selectCashForecast,
  selectRunwayScenario,
  paginate,
} from "@/lib/finance-metrics"
export type { Assumptions, TransactionFilters, CashForecast }

/** 假设的中文标签——筛选条、命令中心与洞察层共用。 */
export function assumptionLabel(key: keyof Assumptions): string {
  switch (key) {
    case "revenueFactor":
      return t.finance.scenario.revenueFactor
    case "costFactor":
      return t.finance.scenario.costFactor
    default:
      return t.finance.scenario.collectionRate
  }
}

/** 全部可筛选科目（收入线 + 支出科目）。 */
export const FILTER_CATEGORIES = [
  ...REVENUE_LINES.map((line) => ({ id: line.id, name: line.name, track: "in" as const })),
  ...EXPENSE_CATEGORIES.map((category) => ({
    id: category.id,
    name: category.name,
    track: "out" as const,
  })),
]

export const FILTER_ACCOUNTS = ACCOUNTS.map((account) => ({ id: account.id, name: account.name }))

export function categoryName(id: string): string {
  // 内部资金调拨没有科目：它是账户之间的移动，必须说人话而不是 "transfer"。
  if (id === "transfer") return t.finance.transactions.transferBadge
  return (
    REVENUE_LINES.find((line) => line.id === id)?.name ??
    EXPENSE_CATEGORIES.find((category) => category.id === id)?.name ??
    id
  )
}

export function categoryId(id: string): ExpenseCategoryId | null {
  return EXPENSE_CATEGORIES.some((category) => category.id === id)
    ? (id as ExpenseCategoryId)
    : null
}

/** 客户回款纪律——应收详情抽屉里解释"为什么这一笔慢了"。 */
export function customerDisciplineOf(customerName: string): number | null {
  const customer = CUSTOMERS.find((item) => item.name === customerName)
  return customer ? customer.discipline : null
}

export { selectInsightsFor }
