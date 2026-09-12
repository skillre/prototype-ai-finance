"use client"

import { useMemo } from "react"
import { ReceiptTextIcon, RotateCcwIcon } from "lucide-react"
import { FilterBar } from "@/components/prototype/filter-bar"
import { DataTable, type TableColumn } from "@/components/prototype/data-table"
import { Pagination } from "@/components/prototype/pagination"
import { EmptyState } from "@/components/prototype/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMessages } from "@/components/i18n/locale-provider"
import type { CashTransaction } from "@/lib/finance-ledger"
import { formatCurrency, formatDateShort } from "@/lib/format"
import {
  FILTER_ACCOUNTS,
  FILTER_CATEGORIES,
  categoryName,
  paginate,
  selectTransactions,
  useFinanceStore,
} from "@/stores/finance-store"
import { cn } from "@/lib/utils"

/** 每页 12 笔——足够看清一段时间，又不会让首屏变成一张无限长的表。 */
const PAGE_SIZE = 12

const RANGE_OPTIONS = [30, 90, 180, 3650] as const

/**
 * 交易流水。
 *
 * 这一页只有一件事：**把账本按你要的口径筛出来，并且每一行都能点开凭证**。
 * 因此构图上没有卡片——筛选条浮在表格上方的一条 hairline 上，合计是三个
 * 真实派生数字，表格本身是页面上唯一的"面"。
 *
 * 筛选状态一律走 store（`filters` / `page`），派生走纯函数
 * `selectTransactions`——页面不自己实现筛选逻辑，于是"筛选条里显示的条件"
 * 与"实际生效的条件"在结构上不可能不一致。
 */
export function TransactionsView(props: {
  /** 打开某笔交易的凭证抽屉 */
  onOpenTransaction: (id: string) => void
}) {
  const t = useMessages()

  const status = useFinanceStore((state) => state.status)
  const transactions = useFinanceStore((state) => state.transactions)
  const filters = useFinanceStore((state) => state.filters)
  const page = useFinanceStore((state) => state.page)
  const setFilters = useFinanceStore((state) => state.setFilters)
  const resetFilters = useFinanceStore((state) => state.resetFilters)
  const setPage = useFinanceStore((state) => state.setPage)

  /* ---- 派生：筛选 + 合计 + 分页，全部是纯函数结果 ----------------------- */

  const filtered = useMemo(
    () => selectTransactions(transactions, filters),
    [transactions, filters]
  )

  /**
   * 合计只统计经营现金流：内部调拨是同一笔钱在自家账户之间移动，
   * 计入收入 / 支出会把两侧同时吹大（合计里那部分记为净额 0）。
   */
  const totals = useMemo(() => {
    const operating = filtered.filter((row) => row.kind !== "transfer")
    const inflow = operating
      .filter((row) => row.direction === "in")
      .reduce((sum, row) => sum + row.amount, 0)
    const outflow = operating
      .filter((row) => row.direction === "out")
      .reduce((sum, row) => sum + row.amount, 0)
    return { inflow, outflow, net: inflow - outflow }
  }, [filtered])

  const pagination = useMemo(() => paginate(filtered, page, PAGE_SIZE), [filtered, page])

  const activeFilterCount =
    (filters.search.trim() ? 1 : 0) +
    (filters.direction !== "all" ? 1 : 0) +
    (filters.category !== "all" ? 1 : 0) +
    (filters.accountId !== "all" ? 1 : 0)

  const rangeOptions: { value: number; label: string }[] = [
    { value: 30, label: t.finance.transactions.range30 },
    { value: 90, label: t.finance.transactions.range90 },
    { value: 180, label: t.finance.transactions.range180 },
    { value: 3650, label: t.finance.transactions.rangeAll },
  ]

  const rangeOf = (days: number) =>
    rangeOptions.some((option) => option.value === days)
      ? String(days)
      : String(RANGE_OPTIONS[1])

  const columns: TableColumn<CashTransaction>[] = [
    {
      key: "date",
      header: t.finance.transactions.columnDate,
      cell: (row) => <TransactionHeadline row={row} />,
    },
    {
      key: "counterparty",
      header: t.finance.transactions.columnCounterparty,
      className: "hidden sm:table-cell",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-body-sm">{row.counterparty}</span>
          {row.kind === "transfer" ? (
            <Badge variant="outline" className="shrink-0 text-label">
              {t.finance.transactions.transferBadge}
            </Badge>
          ) : null}
        </span>
      ),
    },
    {
      key: "memo",
      header: t.finance.transactions.columnMemo,
      className: "hidden xl:table-cell",
      cell: (row) => (
        <span className="block max-w-[18rem] truncate text-body-sm text-muted-foreground">
          {row.memo}
        </span>
      ),
    },
    {
      key: "category",
      header: t.finance.transactions.columnCategory,
      className: "hidden md:table-cell",
      cell: (row) => <TransactionMeta row={row} />,
    },
    {
      key: "account",
      header: t.finance.transactions.columnAccount,
      className: "hidden lg:table-cell",
      cell: (row) => (
        <span className="text-body-sm whitespace-nowrap text-muted-foreground">
          {accountName(row.accountId)}
        </span>
      ),
    },
    {
      key: "amount",
      header: t.finance.transactions.columnAmount,
      className: "text-right",
      cell: (row) => <AmountCell row={row} />,
    },
    {
      key: "method",
      header: t.finance.transactions.columnMethod,
      className: "hidden xl:table-cell",
      cell: (row) => (
        <span className="text-body-sm whitespace-nowrap text-muted-foreground">{row.method}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5" data-testid="transactions-view">
      <FilterBar
        searchValue={filters.search}
        onSearchChange={(value) => setFilters({ search: value })}
        searchTestId="transactions-search"
        clearSearchLabel={t.common.clearSearch}
        resetLabel={t.common.resetFilters}
        hasActiveFilters={activeFilterCount > 0}
        onReset={resetFilters}
        resultCaption={t.finance.transactions.count(pagination.total)}
      >
        <Select
          value={filters.direction}
          onValueChange={(value) => setFilters({ direction: value as "all" | "in" | "out" })}
        >
          <SelectTrigger size="sm" className="w-28" data-testid="transactions-filter-direction">
            <SelectValue>
              {(value) =>
                value === "in"
                  ? t.finance.transactions.directionIn
                  : value === "out"
                    ? t.finance.transactions.directionOut
                    : t.finance.transactions.directionAll
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.finance.transactions.directionAll}</SelectItem>
            <SelectItem value="in">{t.finance.transactions.directionIn}</SelectItem>
            <SelectItem value="out">{t.finance.transactions.directionOut}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.category}
          onValueChange={(value) => setFilters({ category: value ?? "all" })}
        >
          <SelectTrigger size="sm" className="w-36" data-testid="transactions-filter-category">
            <SelectValue>
              {(value) =>
                value && value !== "all"
                  ? categoryName(value)
                  : t.finance.transactions.directionAll
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.finance.transactions.directionAll}</SelectItem>
            {FILTER_CATEGORIES.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.accountId}
          onValueChange={(value) => setFilters({ accountId: value ?? "all" })}
        >
          <SelectTrigger size="sm" className="w-40" data-testid="transactions-filter-account">
            <SelectValue>
              {(value) =>
                value && value !== "all"
                  ? accountName(value)
                  : t.finance.transactions.directionAll
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.finance.transactions.directionAll}</SelectItem>
            {FILTER_ACCOUNTS.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={rangeOf(filters.days)}
          onValueChange={(value) => setFilters({ days: Number(value) })}
        >
          <SelectTrigger size="sm" className="w-32" data-testid="transactions-filter-range">
            <SelectValue>
              {(value) =>
                rangeOptions.find((option) => String(option.value) === value)?.label ??
                t.finance.transactions.range90
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {rangeOptions.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {/* 合计：三个派生数字，在 hairline 上，不是三张卡片 */}
      <dl
        className="flex flex-wrap items-baseline gap-x-8 gap-y-3 border-b border-hairline pb-3"
        data-testid="transactions-summary"
      >
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow text-muted-foreground/60">{t.finance.transactions.totalIn}</dt>
          <dd className="numeric text-subtitle font-semibold text-success">
            {formatCurrency(totals.inflow)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow text-muted-foreground/60">{t.finance.transactions.totalOut}</dt>
          <dd className="numeric text-subtitle font-semibold">{formatCurrency(totals.outflow)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow text-muted-foreground/60">{t.finance.transactions.net}</dt>
          <dd
            className={cn(
              "numeric text-subtitle font-semibold",
              totals.net >= 0 ? "text-success" : "text-danger"
            )}
          >
            {totals.net >= 0 ? "+" : "−"}
            {formatCurrency(Math.abs(totals.net))}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-4">
        <DataTable
          testId="transactions-table"
          columns={columns}
          rows={pagination.rows}
          rowKey={(row) => row.id}
          onRowClick={(row) => props.onOpenTransaction(row.id)}
          /*
            每一行的精确读数。表格里是紧凑格式（¥57万），指针悬停时带出
            不受格式限制的原值 + 凭证号 —— 对账的人少一次「点开抽屉」。
            触屏与 reduced-motion 下不激活；那时用户仍可点开抽屉读到同一个值，
            因此这不是「只在桌面可见的信息」。
          */
          rowCursor={(row) =>
            `${row.voucher} · ${formatCurrency(row.amount)} · ${
              row.direction === "in"
                ? t.finance.transactions.directionIn
                : t.finance.transactions.directionOut
            }`
          }
          loading={status === "loading"}
          skeletonRows={PAGE_SIZE}
          emptyState={
            <EmptyState
              icon={ReceiptTextIcon}
              title={t.finance.transactions.empty}
              description={t.finance.transactions.emptyHint}
              action={
                <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                  <RotateCcwIcon />
                  {t.common.clearFilters}
                </Button>
              }
            />
          }
        />

        {pagination.totalPages > 1 ? (
          <Pagination
            testId="transactions-pagination"
            page={pagination.page}
            totalPages={pagination.totalPages}
            caption={t.finance.transactions.resultCaption(
              pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1,
              Math.min(pagination.page * pagination.pageSize, pagination.total),
              pagination.total,
              `${totals.net >= 0 ? "+" : "−"}${formatCurrency(Math.abs(totals.net))}`
            )}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <p className="text-label text-muted-foreground/70">{t.finance.transactions.transferHint}</p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 单元格                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 第一格：移动端承担"日期 + 交易对手"（表格在窄屏折成两行），
 * 桌面端只留日期——交易对手有自己的列。
 */
function TransactionHeadline({ row }: { row: CashTransaction }) {
  const t = useMessages()
  return (
    <>
      <span className="flex items-baseline justify-between gap-3 sm:hidden">
        <span className="numeric shrink-0 text-body-sm text-muted-foreground">
          {formatDateShort(row.date)}
        </span>
        <span className="min-w-0 truncate text-body-sm font-medium">{row.counterparty}</span>
      </span>

      <span className="hidden sm:block">
        <span className="numeric text-body-sm whitespace-nowrap text-muted-foreground">
          {formatDateShort(row.date)}
        </span>
      </span>

      {row.kind === "transfer" ? (
        <span className="text-label text-muted-foreground/70 sm:hidden">
          {t.finance.transactions.transferBadge}
        </span>
      ) : null}
    </>
  )
}

/** 移动端第二行的科目 + 账户；桌面端这两项各有自己的列。 */
function TransactionMeta({ row }: { row: CashTransaction }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5 md:block">
      <span className="truncate text-body-sm">{categoryName(row.category)}</span>
      <span className="truncate text-label text-muted-foreground lg:hidden">
        {accountName(row.accountId)}
      </span>
    </span>
  )
}

/**
 * 金额：带符号 + 分色。
 *
 * 收入 `+` 并用 success，支出用 `−`（真正的减号，不是连字符）；内部调拨的
 * 金额保持中性——它既不是收入也不是支出，给它上色会误导。
 */
function AmountCell({ row }: { row: CashTransaction }) {
  const tone =
    row.kind === "transfer" ? "text-muted-foreground" : row.direction === "in" ? "text-success" : ""
  return (
    <span className={cn("numeric text-body-sm font-semibold whitespace-nowrap", tone)}>
      {row.direction === "in" ? "+" : "−"}
      {formatCurrency(row.amount)}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* 工具                                                                        */
/* -------------------------------------------------------------------------- */

function accountName(accountId: string): string {
  return FILTER_ACCOUNTS.find((account) => account.id === accountId)?.name ?? accountId
}
