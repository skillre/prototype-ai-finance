"use client"

import { useMemo } from "react"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  PlusIcon,
  RotateCcwIcon,
  UsersIcon,
} from "lucide-react"
import { FilterBar } from "@/components/prototype/filter-bar"
import { DataTable, type TableColumn } from "@/components/prototype/data-table"
import { Pagination } from "@/components/prototype/pagination"
import { EmptyState } from "@/components/prototype/empty-state"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CRM_OWNERS,
  STATUS_META,
  STATUS_ORDER,
  type CrmCustomer,
  type CrmOwner,
} from "@/lib/crm-data"
import {
  PAGE_SIZE,
  paginate,
  selectFilteredCustomers,
  useCrmStore,
  type CrmOwnerFilter,
  type CrmSortKey,
  type CrmStatusFilter,
} from "@/stores/crm-store"
import { formatCurrency, formatDate, personInitials } from "@/lib/format"
import { useMessages } from "@/components/i18n/locale-provider"
import { cn } from "@/lib/utils"

const SORT_KEYS: CrmSortKey[] = ["createdAt", "value", "name", "company", "lastTouchHours"]

type CustomersViewProps = {
  onAddCustomer: () => void
  /** 打开客户详情（shell 负责同时更新 store 与 URL）。 */
  onOpenCustomer: (customerId: string) => void
}

export function CustomersView({ onAddCustomer, onOpenCustomer }: CustomersViewProps) {
  const t = useMessages()
  const customers = useCrmStore((s) => s.customers)
  const search = useCrmStore((s) => s.search)
  const statusFilter = useCrmStore((s) => s.statusFilter)
  const ownerFilter = useCrmStore((s) => s.ownerFilter)
  const sortKey = useCrmStore((s) => s.sortKey)
  const sortDir = useCrmStore((s) => s.sortDir)
  const page = useCrmStore((s) => s.page)

  const setSearch = useCrmStore((s) => s.setSearch)
  const setStatusFilter = useCrmStore((s) => s.setStatusFilter)
  const setOwnerFilter = useCrmStore((s) => s.setOwnerFilter)
  const setSort = useCrmStore((s) => s.setSort)
  const setPage = useCrmStore((s) => s.setPage)
  const resetFilters = useCrmStore((s) => s.resetFilters)

  // 派生数据在组件内 useMemo —— selector 只取原始值（zustand v5 约定）。
  const filtered = useMemo(
    () =>
      selectFilteredCustomers({
        customers,
        search,
        statusFilter,
        ownerFilter,
        sortKey,
        sortDir,
      }),
    [customers, search, statusFilter, ownerFilter, sortKey, sortDir]
  )

  const paged = useMemo(() => paginate(filtered, page, PAGE_SIZE), [filtered, page])

  const hasActiveFilters = search !== "" || statusFilter !== "all" || ownerFilter !== "all"

  // 普通渲染函数（不是组件）——避免每次 render 产生新的组件类型而重挂载。
  const sortHeader = (column: CrmSortKey, label: string) => {
    const active = sortKey === column
    const Icon = !active ? ArrowUpDownIcon : sortDir === "asc" ? ArrowUpIcon : ArrowDownIcon
    return (
      <button
        type="button"
        onClick={() => setSort(column)}
        aria-label={t.customers.sort.aria(label)}
        className={cn(
          "group/sort -my-1 inline-flex items-center gap-1 rounded-sm py-1 outline-none transition-colors duration-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
          active && "text-foreground"
        )}
      >
        {label}
        <Icon
          className={cn(
            "size-3 transition-opacity duration-hover",
            active ? "opacity-100" : "opacity-40 group-hover/sort:opacity-80"
          )}
        />
      </button>
    )
  }

  const columns: TableColumn<CrmCustomer>[] = [
    {
      key: "customer",
      header: sortHeader("name", t.customers.columns.customer),
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar size="sm" className="size-7">
            <AvatarFallback className="text-[11px]">
              {personInitials(row.name, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-body-sm font-semibold">{row.name}</span>
            <span className="truncate text-label text-muted-foreground">{row.company}</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: t.customers.columns.status,
      cell: (row) => {
        const meta = STATUS_META[row.status]
        return (
          /* 状态是"读数"而不是"标签"：一个语义色圆点 + 同色文字，
             比一整块彩色胶囊安静得多，也不会和数据抢注意力。 */
          <span className={cn("inline-flex items-center gap-1.5 text-body-sm", meta.text)}>
            <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
            {t.status[row.status]}
          </span>
        )
      },
    },
    {
      key: "owner",
      header: t.customers.columns.owner,
      className: "hidden md:table-cell",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Avatar size="sm" className="size-6">
            <AvatarFallback className="text-[10px]">
              {personInitials(row.owner, 1)}
            </AvatarFallback>
          </Avatar>
          <span className="text-body-sm whitespace-nowrap text-muted-foreground">
            {row.owner}
          </span>
        </div>
      ),
    },
    {
      key: "value",
      header: sortHeader("value", t.customers.columns.value),
      className: "text-right",
      cell: (row) => (
        <span
          className={cn(
            "numeric text-body font-semibold",
            row.value === 0 && "font-normal text-muted-foreground"
          )}
        >
          {row.value > 0 ? formatCurrency(row.value) : t.common.notAvailable}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: sortHeader("createdAt", t.customers.columns.createdAt),
      className: "hidden lg:table-cell",
      cell: (row) => (
        <span className="numeric text-body-sm whitespace-nowrap text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t.customers.searchPlaceholder}
        searchTestId="crm-search"
        clearSearchLabel={t.common.clearSearch}
        resetLabel={t.common.resetFilters}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        resultCaption={t.customers.resultCaption(filtered.length, customers.length)}
        actions={
          <Button type="button" size="sm" onClick={onAddCustomer} data-testid="add-customer">
            <PlusIcon />
            {t.customers.addCustomer}
          </Button>
        }
      >
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as CrmStatusFilter)}
        >
          <SelectTrigger size="sm" className="w-32" data-testid="crm-filter-status">
            <SelectValue>
              {(value) => (
                <span className="truncate">
                  {value && value !== "all"
                    ? t.status[value as CrmCustomer["status"]]
                    : t.customers.filters.allStatuses}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.customers.filters.allStatuses}</SelectItem>
            {STATUS_ORDER.map((status) => (
              <SelectItem key={status} value={status}>
                {t.status[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={ownerFilter}
          onValueChange={(value) => setOwnerFilter(value as CrmOwnerFilter)}
        >
          <SelectTrigger size="sm" className="w-32" data-testid="crm-filter-owner">
            <SelectValue>
              {(value) => (
                <span className="truncate">
                  {value && value !== "all" ? String(value) : t.customers.filters.allOwners}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.customers.filters.allOwners}</SelectItem>
            {CRM_OWNERS.map((owner: CrmOwner) => (
              <SelectItem key={owner} value={owner}>
                {owner}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortKey} onValueChange={(value) => setSort(value as CrmSortKey)}>
          <SelectTrigger size="sm" className="w-40" data-testid="crm-filter-sort">
            <SelectValue>
              {(value) => (
                <span className="truncate">
                  {t.customers.filters.sortPrefix}：
                  {t.customers.sort[(value as CrmSortKey) ?? "createdAt"] ?? t.customers.sort.createdAt}
                  {sortDir === "desc" ? " ↓" : " ↑"}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {t.customers.sort[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        testId="crm-table"
        columns={columns}
        rows={paged.rows}
        rowKey={(row) => row.id}
        onRowClick={(row) => onOpenCustomer(row.id)}
        emptyState={
          <EmptyState
            icon={UsersIcon}
            title={t.customers.empty.title}
            description={
              search
                ? t.customers.empty.withSearch(search)
                : t.customers.empty.noSearch
            }
            action={
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <RotateCcwIcon />
                {t.common.clearFilters}
              </Button>
            }
          />
        }
      />

      <Pagination
        testId="crm-pagination"
        page={paged.page}
        totalPages={paged.totalPages}
        caption={
          paged.total === 0
            ? t.pagination.noResults
            : t.pagination.range(
                (paged.page - 1) * PAGE_SIZE + 1,
                Math.min(paged.page * PAGE_SIZE, paged.total),
                paged.total
              )
        }
        onPageChange={setPage}
      />
    </div>
  )
}
