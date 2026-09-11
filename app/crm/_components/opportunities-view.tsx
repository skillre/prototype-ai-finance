"use client"

import { useMemo, useState } from "react"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  RotateCcwIcon,
  TargetIcon,
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
  type CustomerStatus,
} from "@/lib/crm-data"
import { useCrmStore } from "@/stores/crm-store"
import {
  formatCurrency,
  formatCurrencyCompact,
  formatRelativeHours,
  personInitials,
} from "@/lib/format"
import { useMessages } from "@/components/i18n/locale-provider"
import { cn } from "@/lib/utils"

type SortKey = "value" | "createdAt" | "lastTouchHours" | "company"

const SORT_KEYS: SortKey[] = ["value", "createdAt", "lastTouchHours", "company"]
const PAGE = 8

/**
 * 机会页。
 *
 * 侧栏里「机会」必须是真的能去的地方，所以它有一条真实路由：在谈与已签约
 * 客户按合同金额排开，支持搜索 / 阶段筛选 / 负责人筛选 / 排序 / 翻页，
 * 点任意一行进入客户档案。
 *
 * 筛选状态是**页面局部 state** 而不是 store：机会列表的筛选和客户名册的
 * 筛选是两个独立场景，共用一个 store 字段只会让两边互相打架。
 */
export function OpportunitiesView({
  onOpenCustomer,
}: {
  onOpenCustomer: (customerId: string) => void
}) {
  const t = useMessages()
  const customers = useCrmStore((s) => s.customers)

  const [search, setSearch] = useState("")
  const [stage, setStage] = useState<CustomerStatus | "all">("all")
  const [owner, setOwner] = useState<CrmOwner | "all">("all")
  const [sortKey, setSortKey] = useState<SortKey>("value")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  const reset = () => {
    setSearch("")
    setStage("all")
    setOwner("all")
    setPage(1)
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const direction = sortDir === "asc" ? 1 : -1

    return customers
      .filter((customer) => customer.status !== "churned")
      .filter((customer) => {
        if (stage !== "all" && customer.status !== stage) return false
        if (owner !== "all" && customer.owner !== owner) return false
        if (
          needle &&
          !`${customer.name} ${customer.company} ${customer.email} ${customer.owner}`
            .toLowerCase()
            .includes(needle)
        ) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        switch (sortKey) {
          case "company":
            return a.company.localeCompare(b.company) * direction
          case "createdAt":
            return a.createdAt.localeCompare(b.createdAt) * direction
          case "lastTouchHours":
            return (a.lastTouchHours - b.lastTouchHours) * direction
          case "value":
          default:
            return (a.value - b.value) * direction
        }
      })
  }, [customers, search, stage, owner, sortKey, sortDir])

  const totalValue = useMemo(
    () => filtered.reduce((sum, customer) => sum + customer.value, 0),
    [filtered]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const rows = filtered.slice((safePage - 1) * PAGE, safePage * PAGE)

  const hasFilters = search !== "" || stage !== "all" || owner !== "all"

  const sortHeader = (column: SortKey, label: string) => {
    const active = sortKey === column
    const Icon = !active ? ArrowUpDownIcon : sortDir === "asc" ? ArrowUpIcon : ArrowDownIcon
    return (
      <button
        type="button"
        onClick={() => {
          setSortKey(column)
          setSortDir(active && sortDir === "desc" ? "asc" : "desc")
          setPage(1)
        }}
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
      key: "deal",
      header: sortHeader("company", t.opportunities.columns.deal),
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar size="sm" className="size-7">
            <AvatarFallback className="text-[11px]">{personInitials(row.name, 1)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-body-sm font-semibold">{row.company}</span>
            <span className="truncate text-label text-muted-foreground">
              {row.name} · {row.title}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "stage",
      header: t.opportunities.columns.stage,
      cell: (row) => {
        const meta = STATUS_META[row.status]
        return (
          <span className={cn("inline-flex items-center gap-1.5 text-body-sm", meta.text)}>
            <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
            {t.status[row.status]}
          </span>
        )
      },
    },
    {
      key: "owner",
      header: t.opportunities.columns.owner,
      className: "hidden md:table-cell",
      cell: (row) => (
        <span className="text-body-sm whitespace-nowrap text-muted-foreground">{row.owner}</span>
      ),
    },
    {
      key: "touch",
      header: t.opportunities.columns.touch,
      className: "hidden lg:table-cell",
      cell: (row) => (
        <span className="numeric text-body-sm whitespace-nowrap text-muted-foreground">
          {formatRelativeHours(row.lastTouchHours)}
        </span>
      ),
    },
    {
      key: "value",
      header: sortHeader("value", t.opportunities.columns.value),
      className: "text-right",
      cell: (row) => (
        <span className="numeric text-body font-semibold">{formatCurrency(row.value)}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* 管道摘要：三个真实派生数字，不是装饰统计条 */}
      <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-3" data-testid="opportunity-summary">
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow text-muted-foreground/60">{t.page.opportunities.title}</dt>
          <dd className="text-body-sm font-medium">
            {t.opportunities.summary(filtered.length)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow text-muted-foreground/60">{t.opportunities.columns.value}</dt>
          <dd className="numeric text-subtitle font-semibold">{formatCurrencyCompact(totalValue)}</dd>
        </div>
      </dl>

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        searchPlaceholder={t.opportunities.searchPlaceholder}
        searchTestId="opportunity-search"
        clearSearchLabel={t.common.clearSearch}
        resetLabel={t.common.resetFilters}
        hasActiveFilters={hasFilters}
        onReset={reset}
        resultCaption={t.opportunities.resultCaption(rows.length, filtered.length)}
      >
        <Select
          value={stage}
          onValueChange={(value) => {
            setStage(value as CustomerStatus | "all")
            setPage(1)
          }}
        >
          <SelectTrigger size="sm" className="w-32" data-testid="opportunity-filter-stage">
            <SelectValue>
              {(value) => (
                <span className="truncate">
                  {value && value !== "all"
                    ? t.status[value as CustomerStatus]
                    : t.opportunities.filters.allStages}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.opportunities.filters.allStages}</SelectItem>
            {STATUS_ORDER.map((status) => (
              <SelectItem key={status} value={status}>
                {t.status[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={owner}
          onValueChange={(value) => {
            setOwner(value as CrmOwner | "all")
            setPage(1)
          }}
        >
          <SelectTrigger size="sm" className="w-32" data-testid="opportunity-filter-owner">
            <SelectValue>
              {(value) => (
                <span className="truncate">
                  {value && value !== "all" ? String(value) : t.opportunities.filters.allOwners}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.opportunities.filters.allOwners}</SelectItem>
            {CRM_OWNERS.map((entry: CrmOwner) => (
              <SelectItem key={entry} value={entry}>
                {entry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortKey}
          onValueChange={(value) => {
            setSortKey(value as SortKey)
            setPage(1)
          }}
        >
          <SelectTrigger size="sm" className="w-40" data-testid="opportunity-filter-sort">
            <SelectValue>
              {(value) => (
                <span className="truncate">
                  {t.opportunities.filters.sortPrefix}：
                  {t.opportunities.sort[(value as SortKey) ?? "value"] ?? t.opportunities.sort.value}
                  {sortDir === "desc" ? " ↓" : " ↑"}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {t.opportunities.sort[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        testId="opportunity-table"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={(row) => onOpenCustomer(row.id)}
        emptyState={
          <EmptyState
            icon={TargetIcon}
            title={t.opportunities.empty.title}
            description={
              search ? t.opportunities.empty.withSearch(search) : t.opportunities.empty.noSearch
            }
            action={
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcwIcon />
                {t.common.clearFilters}
              </Button>
            }
          />
        }
      />

      <Pagination
        testId="opportunity-pagination"
        page={safePage}
        totalPages={totalPages}
        caption={t.pagination.range(
          filtered.length === 0 ? 0 : (safePage - 1) * PAGE + 1,
          Math.min(safePage * PAGE, filtered.length),
          filtered.length
        )}
        onPageChange={setPage}
      />

      <p className="numeric text-label text-muted-foreground/70">
        {t.opportunities.closedSummary(
          customers.filter((customer) => customer.status === "active").length,
          formatCurrencyCompact(
            customers
              .filter((customer) => customer.status === "active")
              .reduce((sum, customer) => sum + customer.value, 0)
          )
        )}
      </p>
    </div>
  )
}
