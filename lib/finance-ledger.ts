import {
  ACCOUNTS,
  CUSTOMERS,
  EXPENSE_CATEGORIES,
  MONTHS,
  PAYABLE_TERMS,
  PAYMENT_TERMS,
  REFERENCE_DATE,
  REVENUE_LINES,
  VENDORS,
  type AccountDef,
  type ExpenseCategoryId,
  type MonthKey,
} from "./finance-data"

/**
 * 记账引擎（deterministic ledger expansion）。
 *
 * `lib/finance-data.ts` 只声明矩阵与规则；这里把它们展开成**一笔一笔的真实
 * 收付**：收款、付款、开票、应付账单、内部资金调拨。之后所有的"余额"
 * "账龄""跑道""异常"都是对这些记录的查询，而不是另算一套数字。
 *
 * 三条保证：
 *   1. 科目合计 = 该科目各供应商付款之和（零头落在最后一个供应商上）。
 *   2. 账户期末余额 = 期初 + 该账户全部收付（含内部调拨）。
 *   3. 同输入同输出：没有随机数、没有 Date.now()、没有网络。
 */

export type CashDirection = "in" | "out"

/**
 * 现金流水的类型。区分它们不是为了好看——经营现金流要排除内部调拨，
 * 否则同一笔钱会在集团内被数两次。
 */
export type CashTransactionKind =
  | "revenue"
  | "receivable-settlement"
  | "expense"
  | "payable-settlement"
  | "transfer"

export interface CashTransaction {
  id: string
  /** ISO 日期 "2026-09-10"。 */
  date: string
  month: MonthKey
  direction: CashDirection
  amount: number
  accountId: string
  /** 收入线 id 或支出科目 id；内部调拨为 "transfer"。 */
  category: string
  kind: CashTransactionKind
  /** 交易对手：客户 / 供应商 / 员工 / 内部账户。 */
  counterparty: string
  memo: string
  method: string
  /** 凭证号——详情抽屉里"这笔钱凭什么出的"的答案。 */
  voucher: string
}

export type ReceivableStatus = "settled" | "open" | "overdue"

export interface ReceivableInvoice {
  id: string
  number: string
  customerId: string
  customerName: string
  /** 开票金额。 */
  amount: number
  invoiceDate: string
  dueDate: string
  /** 已回款日期；未回款为 null。 */
  settledDate: string | null
  status: ReceivableStatus
  /** 逾期天数（未逾期为 0）。 */
  daysLate: number
  /** 来源收入线。 */
  lineId: string
  memo: string
}

export type PayableStatus = "paid" | "scheduled"

export interface PayableBill {
  id: string
  number: string
  vendorId: string
  vendorName: string
  category: ExpenseCategoryId
  amount: number
  billDate: string
  dueDate: string
  paidDate: string | null
  status: PayableStatus
  memo: string
}

export interface AccountBalance extends AccountDef {
  /** 期末余额（截至基准日）。 */
  balance: number
  inflow: number
  outflow: number
  /** 内部调拨净额——余额的一部分，但不属于经营现金流。 */
  transferredIn: number
}

/* -------------------------------------------------------------------------- */
/* 日期工具（纯函数，只用字符串运算，不依赖运行时时区）                          */
/* -------------------------------------------------------------------------- */

const pad = (value: number) => String(value).padStart(2, "0")

/** "2026-09" + 15 → "2026-09-15"。 */
export function dayOfMonth(month: MonthKey, day: number): string {
  const [year, mm] = month.split("-").map(Number)
  const lastDay = new Date(Date.UTC(year, mm, 0)).getUTCDate()
  return `${month}-${pad(Math.min(day, lastDay))}`
}

/** 该月最后一天。 */
export function monthEnd(month: MonthKey): string {
  const [year, mm] = month.split("-").map(Number)
  const lastDay = new Date(Date.UTC(year, mm, 0)).getUTCDate()
  return `${month}-${pad(lastDay)}`
}

/** ISO 日期加减天数（非有限天数返回占位符，避免一处推导把整页打崩）。 */
export function addDays(iso: string, days: number): string {
  if (!Number.isFinite(days)) return "—"
  const clamped = Math.max(-36_500, Math.min(36_500, Math.round(days)))
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + clamped)
  return date.toISOString().slice(0, 10)
}

/** 两个 ISO 日期之间的天数（b - a）。 */
export function daysBetween(a: string, b: string): number {
  const from = new Date(`${a}T00:00:00Z`).getTime()
  const to = new Date(`${b}T00:00:00Z`).getTime()
  return Math.round((to - from) / 86_400_000)
}

/** 月份索引：MONTHS 里的下标。 */
export function monthIndex(month: string): number {
  return MONTHS.indexOf(month as MonthKey)
}

/** 从某个月偏移 n 个月。 */
export function shiftMonth(month: MonthKey, offset: number): MonthKey {
  const index = monthIndex(month) + offset
  const clamped = Math.min(Math.max(index, 0), MONTHS.length - 1)
  return MONTHS[clamped]
}

/* -------------------------------------------------------------------------- */
/* 拆分：把月度合计精确拆到若干条记录上                                          */
/* -------------------------------------------------------------------------- */

/**
 * 按权重拆分金额，零头全部落在最后一条上。
 * 这样"分项之和 = 合计"是构造性成立的，不需要事后修正。
 */
function splitAmount(total: number, weights: number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0)
  const parts: number[] = []
  let assigned = 0
  weights.forEach((weight, index) => {
    if (index === weights.length - 1) {
      parts.push(total - assigned)
      return
    }
    const part = Math.round((total * weight) / sum)
    assigned += part
    parts.push(part)
  })
  return parts
}

/** 供应商在该科目里的占比（已按科目归一化）。 */
const VENDORS_BY_CATEGORY = new Map<ExpenseCategoryId, typeof VENDORS>()
for (const vendor of VENDORS) {
  const list = VENDORS_BY_CATEGORY.get(vendor.category) ?? []
  list.push(vendor)
  VENDORS_BY_CATEGORY.set(vendor.category, list)
}

const ACCOUNT_BY_ID = new Map(ACCOUNTS.map((account) => [account.id, account]))

/* -------------------------------------------------------------------------- */
/* 应收：由账期规则生成的发票                                                    */
/* -------------------------------------------------------------------------- */

/** 发票号：INV-2026-08-03。 */
const invoiceNumber = (month: MonthKey, sequence: number) =>
  `INV-${month.slice(0, 4)}-${month.slice(5)}-${pad(sequence)}`

/** 每条收入线的当月收款比例（其余部分开票、进应收）。 */
function collectionRatioOf(line: { settlement: "prepaid" | "invoiced" }): number {
  return line.settlement === "prepaid"
    ? PAYMENT_TERMS.prepaidCollection
    : PAYMENT_TERMS.invoicedCollection
}

function termDaysOf(line: { settlement: "prepaid" | "invoiced" }): number {
  return line.settlement === "prepaid"
    ? PAYMENT_TERMS.prepaidTermDays
    : PAYMENT_TERMS.invoicedTermDays
}

/**
 * 开票：每条收入线每月按"未收部分"开出一张发票，落到某个客户头上。
 * 发票号、到期日、实际到账日全部由账期规则 + 客户回款纪律推导。
 */
function buildReceivables(): ReceivableInvoice[] {
  const invoices: ReceivableInvoice[] = []

  MONTHS.forEach((month, monthIdx) => {
    REVENUE_LINES.forEach((line, lineIdx) => {
      const cashPart = Math.round(line.monthly[monthIdx] * collectionRatioOf(line))
      // 未收部分 = 收入 - 当月已收。用减法而不是再乘一次比例，保证两者分文不差。
      const uninvoiced = line.monthly[monthIdx] - cashPart
      // 同一笔未收款拆到 1–2 个客户头上；用月份 + 收入线做确定性轮转。
      const splits = lineIdx % 2 === 0 ? 2 : 1
      const weights = splits === 2 ? [0.62, 0.38] : [1]
      const amounts = splitAmount(Math.round(uninvoiced), weights)
      const term = termDaysOf(line)

      amounts.forEach((amount, index) => {
        if (amount <= 0) return
        const customer =
          CUSTOMERS[(monthIdx * 3 + lineIdx * 2 + index * 5) % CUSTOMERS.length]
        const invoiceDate = monthEnd(month)
        const dueDate = addDays(invoiceDate, term)
        // 回款纪律决定实际到账日：纪律越差，拖得越久。
        const lateness = Math.round((1 - customer.discipline) * PAYMENT_TERMS.maxLatenessDays)
        const settledDate = addDays(dueDate, lateness)
        const due = dueDate <= REFERENCE_DATE
        const settled = settledDate <= REFERENCE_DATE

        invoices.push({
          id: `ar-${month}-${line.id}-${index}`,
          number: invoiceNumber(month, lineIdx * 2 + index + 1),
          customerId: customer.id,
          customerName: customer.name,
          amount,
          invoiceDate,
          dueDate,
          settledDate: settled ? settledDate : null,
          status: settled ? "settled" : due ? "overdue" : "open",
          daysLate: settled
            ? Math.max(0, lateness)
            : due
              ? daysBetween(dueDate, REFERENCE_DATE)
              : 0,
          lineId: line.id,
          memo: `${line.name} ${month.slice(0, 4)}年${Number(month.slice(5))}月`,
        })
      })
    })
  })

  return invoices.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate))
}

export const RECEIVABLES: ReceivableInvoice[] = buildReceivables()

/* -------------------------------------------------------------------------- */
/* 应付：供应商账期                                                             */
/* -------------------------------------------------------------------------- */

function buildPayables(): PayableBill[] {
  const bills: PayableBill[] = []

  MONTHS.forEach((month, monthIdx) => {
    EXPENSE_CATEGORIES.forEach((category) => {
      // 人力成本当月结清，没有供应商账期。
      if (category.id === "payroll") return
      const monthTotal = category.monthly[monthIdx]
      const deferred = Math.round(monthTotal * PAYABLE_TERMS.deferredRatio)
      if (deferred <= 0) return

      const vendors = VENDORS_BY_CATEGORY.get(category.id) ?? []
      const weights = vendors.map((vendor) => vendor.share)
      const parts = splitAmount(deferred, weights)

      vendors.forEach((vendor, index) => {
        const billDate = dayOfMonth(month, vendor.day)
        const dueDate = addDays(billDate, PAYABLE_TERMS.termDays)
        const paid = dueDate <= REFERENCE_DATE
        bills.push({
          id: `ap-${month}-${vendor.id}`,
          number: `BILL-${month.slice(0, 4)}-${month.slice(5)}-${pad(index + 1)}${vendor.id.slice(-2).toUpperCase()}`,
          vendorId: vendor.id,
          vendorName: vendor.name,
          category: category.id,
          amount: parts[index],
          billDate,
          dueDate,
          paidDate: paid ? dueDate : null,
          status: paid ? "paid" : "scheduled",
          memo: vendor.memo,
        })
      })
    })
  })

  return bills.filter((bill) => bill.amount > 0)
}

export const PAYABLES: PayableBill[] = buildPayables()

/* -------------------------------------------------------------------------- */
/* 现金流水                                                                    */
/* -------------------------------------------------------------------------- */

interface PendingTransaction extends CashTransaction {
  /** 排序用：同一天内先收后付，收付内部按生成顺序。 */
  sequence: number
}

function buildTransactions(): { transactions: CashTransaction[]; transfers: CashTransaction[] } {
  const rows: PendingTransaction[] = []
  let sequence = 0

  const push = (row: Omit<PendingTransaction, "sequence" | "id"> & { id?: string }) => {
    sequence += 1
    rows.push({ ...row, id: row.id ?? `tx-${sequence}`, sequence })
  }

  MONTHS.forEach((month, monthIdx) => {
    // ---- 收入侧：当月收款部分才是现金，其余开票进应收 ----
    REVENUE_LINES.forEach((line, lineIdx) => {
      const cashPart = Math.round(line.monthly[monthIdx] * collectionRatioOf(line))
      if (cashPart <= 0) return

      // 订阅类按月续费（金额分散在 2–3 个客户），实施类按项目回款（1–2 个客户）。
      const weights =
        line.settlement === "prepaid"
          ? lineIdx === 2
            ? [0.44, 0.33, 0.23]
            : [0.61, 0.39]
          : [0.58, 0.42]
      const amounts = splitAmount(cashPart, weights)

      amounts.forEach((amount, index) => {
        if (amount <= 0) return
        const customer = CUSTOMERS[(monthIdx * 5 + lineIdx * 3 + index * 7) % CUSTOMERS.length]
        push({
          date: dayOfMonth(month, line.settlement === "prepaid" ? 5 + index * 4 : 26 + index),
          month,
          direction: "in",
          amount,
          accountId: "acc-cmb",
          category: line.id,
          kind: "revenue",
          counterparty: customer.name,
          memo: line.settlement === "prepaid" ? `${line.name}续费` : `${line.name}首款`,
          method: "转账",
          voucher: `SK-${month.replace("-", "")}-${pad(lineIdx * 3 + index + 1)}`,
        })
      })
    })

    // ---- 支出侧：按供应商拆分，扣除走账期的部分 ----
    EXPENSE_CATEGORIES.forEach((category, categoryIdx) => {
      const vendors = VENDORS_BY_CATEGORY.get(category.id) ?? []
      if (vendors.length === 0) return
      const monthTotal = category.monthly[monthIdx]
      const deferred =
        category.id === "payroll" ? 0 : Math.round(monthTotal * PAYABLE_TERMS.deferredRatio)
      const immediate = monthTotal - deferred
      const parts = splitAmount(immediate, vendors.map((vendor) => vendor.share))

      vendors.forEach((vendor, index) => {
        if (parts[index] <= 0) return
        push({
          date: dayOfMonth(month, vendor.day),
          month,
          direction: "out",
          amount: parts[index],
          accountId: vendor.accountId,
          category: category.id,
          kind: "expense",
          counterparty: vendor.name,
          memo: vendor.memo,
          method: METHOD_LABEL[vendor.method],
          voucher: `PZ-${month.replace("-", "")}-${pad(categoryIdx * 4 + index + 1)}`,
        })
      })
    })
  })

  // ---- 应收回款：发票到账那一刻才是现金 ----
  RECEIVABLES.filter((invoice) => invoice.settledDate).forEach((invoice, index) => {
    push({
      date: invoice.settledDate as string,
      month: invoice.settledDate!.slice(0, 7) as MonthKey,
      direction: "in",
      amount: invoice.amount,
      accountId: "acc-cmb",
      category: invoice.lineId,
      kind: "receivable-settlement",
      counterparty: invoice.customerName,
      memo: `${invoice.number} 回款`,
      method: "转账",
      voucher: invoice.number,
      id: `tx-ar-${index}`,
    })
  })

  // ---- 应付付款 ----
  PAYABLES.filter((bill) => bill.paidDate).forEach((bill, index) => {
    push({
      date: bill.paidDate as string,
      month: bill.paidDate!.slice(0, 7) as MonthKey,
      direction: "out",
      amount: bill.amount,
      accountId: ACCOUNT_BY_ID.get("acc-icbc") ? "acc-icbc" : "acc-cmb",
      category: bill.category,
      kind: "payable-settlement",
      counterparty: bill.vendorName,
      memo: `${bill.memo}（月结）`,
      method: "转账",
      voucher: bill.number,
      id: `tx-ap-${index}`,
    })
  })

  // ---- 内部资金调拨：让每个账户都保有自己的备付金水位 ----
  const ordered = [...rows].sort((a, b) =>
    a.date === b.date ? a.sequence - b.sequence : a.date.localeCompare(b.date)
  )

  /** 每个账户的备付水位：低于它就从基本户调拨。 */
  const FLOOR: Record<string, number> = {
    "acc-cmb": 1_500_000,
    "acc-icbc": 700_000,
    "acc-alipay": 180_000,
    "acc-petty": 90_000,
  }
  const TOP_UP: Record<string, number> = {
    "acc-cmb": 2_200_000,
    "acc-icbc": 1_400_000,
    "acc-alipay": 420_000,
    "acc-petty": 200_000,
  }

  const balances = new Map(ACCOUNTS.map((account) => [account.id, account.opening]))
  const transfers: PendingTransaction[] = []

  for (const row of ordered) {
    const signed = row.direction === "in" ? row.amount : -row.amount
    balances.set(row.accountId, (balances.get(row.accountId) ?? 0) + signed)

    if (row.direction !== "out" || row.accountId === "acc-cmb") continue
    const balance = balances.get(row.accountId) ?? 0
    const floor = FLOOR[row.accountId] ?? 0
    if (balance >= floor) continue

    const target = TOP_UP[row.accountId] ?? floor * 2
    const amount = Math.max(50_000, Math.round((target - balance) / 10_000) * 10_000)
    balances.set(row.accountId, balance + amount)
    balances.set("acc-cmb", (balances.get("acc-cmb") ?? 0) - amount)

    transfers.push({
      id: `tx-tr-${transfers.length + 1}`,
      date: row.date,
      month: row.month,
      direction: "out",
      amount,
      accountId: "acc-cmb",
      category: "transfer",
      kind: "transfer",
      counterparty: ACCOUNT_BY_ID.get(row.accountId)?.name ?? row.accountId,
      memo: "内部资金调拨",
      method: "转账",
      voucher: `DB-${row.date.replace(/-/g, "")}-${pad(transfers.length + 1)}`,
      sequence: (sequence += 1),
    })
    transfers.push({
      id: `tx-tri-${transfers.length + 1}`,
      date: row.date,
      month: row.month,
      direction: "in",
      amount,
      accountId: row.accountId,
      category: "transfer",
      kind: "transfer",
      counterparty: ACCOUNT_BY_ID.get("acc-cmb")?.name ?? "acc-cmb",
      memo: "内部资金调拨",
      method: "转账",
      voucher: `DB-${row.date.replace(/-/g, "")}-${pad(transfers.length + 1)}`,
      sequence: (sequence += 1),
    })
  }

  const transactions: CashTransaction[] = [...rows, ...transfers]
    // 同一天内的先后顺序由生成顺序决定：先收后付，收付内部保持稳定。
    .sort((a, b) =>
      a.date === b.date ? a.sequence - b.sequence : a.date.localeCompare(b.date)
    )
    .map((row) => ({
      id: row.id,
      date: row.date,
      month: row.month,
      direction: row.direction,
      amount: row.amount,
      accountId: row.accountId,
      category: row.category,
      kind: row.kind,
      counterparty: row.counterparty,
      memo: row.memo,
      method: row.method,
      voucher: row.voucher,
    }))

  return { transactions, transfers }
}

const METHOD_LABEL: Record<string, string> = {
  transfer: "银行转账",
  card: "企业信用卡",
  payroll: "批量代发",
  wallet: "第三方支付",
  "direct-debit": "自动扣款",
}

const LEDGER = buildTransactions()

/** 全部现金流水，按日期倒序。 */
export const TRANSACTIONS: CashTransaction[] = LEDGER.transactions

/** 内部资金调拨（用于在现金流页说明"这不是经营现金流"）。 */
export const TRANSFERS: CashTransaction[] = LEDGER.transfers

/* -------------------------------------------------------------------------- */
/* 账户余额                                                                    */
/* -------------------------------------------------------------------------- */

function buildAccountBalances(): AccountBalance[] {
  const map = new Map(
    ACCOUNTS.map((account) => [
      account.id,
      { ...account, balance: account.opening, inflow: 0, outflow: 0, transferredIn: 0 },
    ])
  )

  for (const transaction of TRANSACTIONS) {
    const account = map.get(transaction.accountId)
    if (!account) continue
    if (transaction.direction === "in") {
      account.balance += transaction.amount
      account.inflow += transaction.amount
      if (transaction.kind === "transfer") account.transferredIn += transaction.amount
    } else {
      account.balance -= transaction.amount
      account.outflow += transaction.amount
    }
  }

  return [...map.values()]
}

export const ACCOUNT_BALANCES: AccountBalance[] = buildAccountBalances()

/** 现金总额——全站唯一的"现金头寸"。 */
export const CASH_POSITION = ACCOUNT_BALANCES.reduce((sum, account) => sum + account.balance, 0)

/* -------------------------------------------------------------------------- */
/* 对账（供测试与"数据可信度"检查使用）                                          */
/* -------------------------------------------------------------------------- */

export interface LedgerAudit {
  /**
   * 矩阵支出 - 已付款支出 = 未付应付。这是本账本最重要的一条恒等式：
   * 有账期的那部分支出还没有变成现金，差额必须**恰好**等于未付账单。
   */
  expensePayableDelta: number
  /** 矩阵收入 - 已收现金 = 未回款应收。同理。 */
  revenueReceivableDelta: number
  openingTotal: number
  netCashFlow: number
  closingTotal: number
  transactionCount: number
  openReceivables: number
  scheduledPayables: number
  /** 内部调拨的净额，恒为 0（左右手互转）。 */
  transferNet: number
}

/**
 * 自检：把矩阵与流水对一遍。
 *
 * 任何一处对不上，`tests/finance-data.spec.ts` 都会失败——这层自检存在的
 * 意义是：数据一旦被改坏，先坏在测试里，而不是坏在页面上的某个数字。
 */
export function auditLedger(): LedgerAudit {
  const expenseFromMatrix = EXPENSE_CATEGORIES.reduce(
    (sum, category) => sum + category.monthly.reduce((acc, value) => acc + value, 0),
    0
  )
  const expensePaid = TRANSACTIONS.filter(
    (transaction) => transaction.kind === "expense" || transaction.kind === "payable-settlement"
  ).reduce((sum, transaction) => sum + transaction.amount, 0)

  const revenueFromMatrix = REVENUE_LINES.reduce(
    (sum, line) => sum + line.monthly.reduce((acc, value) => acc + value, 0),
    0
  )
  const revenueCollected = TRANSACTIONS.filter(
    (transaction) =>
      transaction.kind === "revenue" || transaction.kind === "receivable-settlement"
  ).reduce((sum, transaction) => sum + transaction.amount, 0)

  const openingTotal = ACCOUNTS.reduce((sum, account) => sum + account.opening, 0)
  const operating = TRANSACTIONS.filter((transaction) => transaction.kind !== "transfer")
  const netCashFlow = operating.reduce(
    (sum, transaction) =>
      sum + (transaction.direction === "in" ? transaction.amount : -transaction.amount),
    0
  )
  const transferNet = TRANSACTIONS.filter((transaction) => transaction.kind === "transfer").reduce(
    (sum, transaction) =>
      sum + (transaction.direction === "in" ? transaction.amount : -transaction.amount),
    0
  )

  const openReceivables = RECEIVABLES.filter((invoice) => invoice.status !== "settled").reduce(
    (sum, invoice) => sum + invoice.amount,
    0
  )
  const scheduledPayables = PAYABLES.filter((bill) => bill.status === "scheduled").reduce(
    (sum, bill) => sum + bill.amount,
    0
  )

  return {
    expensePayableDelta: expenseFromMatrix - expensePaid - scheduledPayables,
    revenueReceivableDelta: revenueFromMatrix - revenueCollected - openReceivables,
    openingTotal,
    netCashFlow,
    closingTotal: openingTotal + netCashFlow,
    transactionCount: TRANSACTIONS.length,
    openReceivables,
    scheduledPayables,
    transferNet,
  }
}
