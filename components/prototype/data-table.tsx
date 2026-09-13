"use client"

import { LedgerCursor } from "@/lib/kits/adapters/scene"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface TableColumn<T> {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  /** Tailwind alignment + width classes for both header and cell. */
  className?: string
}

type DataTableProps<T> = {
  columns: TableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  emptyState?: React.ReactNode
  loading?: boolean
  skeletonRows?: number
  className?: string
  /** Lands on the <table> element — used by e2e tests. */
  testId?: string
  /**
   * 每一行的**精确读数**。传了它，悬停该行时指针会带上这串文字。
   *
   * 为什么是一条"读数"而不是一个开关：表格里显示的是紧凑格式（¥57万），
   * 而财务对账要的是精确值。把精确值挂在指针上，等于把"点开抽屉"这一
   * 次交互省掉。读数的内容由调用方决定（它知道业务语义）。
   *
   * 触屏与 reduced-motion 下组件完全不激活（降级内建在 Kits 的 DataCursor 里），
   * 因此这不是"只在桌面可见的信息"——它是对已有信息的**加速**，
   * 触屏用户仍然可以通过点击行打开抽屉读到同样的值。
   */
  rowCursor?: (row: T) => string
}

/**
 * Minimal, typed data table. Handles loading skeletons and an empty state;
 * row clicks are optional (calls `onRowClick`). Scrolls horizontally on
 * narrow screens instead of collapsing columns.
 *
 * Visual hierarchy: the header is a quiet eyebrow row, body rows carry the
 * data, and the row itself is the target — hover tints it and grows a brand
 * rail on the left.
 *
 * Style Pack 决定表面：cinematic 是 borderTreatment = none-with-depth，
 * 所以容器不再用 ring 描边，改用 pack 的表面阴影 + 连续圆角 ——
 * 深色下它是"浮在空间里的面板"，而不是一个加了描边的盒子。
 * （之前的 `ring-1 ring-border/60` 在 cinematic 的 border-width = 0 语言下
 *   是外来语法，已移除；层级改由亮度差 + 投影建立。）
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyState,
  loading = false,
  skeletonRows = 6,
  className,
  testId,
  rowCursor,
}: DataTableProps<T>) {
  return (
    <LedgerCursor>
      <div className={cn("relative overflow-x-auto rounded-panel bg-surface shadow-card", className)}>
        <table data-testid={testId} className="w-full min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border/70 text-muted-foreground">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn("eyebrow px-4 py-2.5 font-medium whitespace-nowrap", column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, row) => (
                  <tr key={row} className="border-b border-border/50 last:border-0">
                    {columns.map((column) => (
                      <td key={column.key} className={cn("px-4 py-2.5", column.className)}>
                        <Skeleton className="h-4 w-full max-w-28" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => {
                  const key = rowKey(row)
                  const interactive = Boolean(onRowClick)
                  return (
                    <tr
                      key={key}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      /* 指针读数契约：Kits DataCursor 解析这两个属性
                         （inspection 默认开启；触屏与 reduced-motion 下不激活）。 */
                      data-cursor={rowCursor ? "inspect" : undefined}
                      data-cursor-label={rowCursor ? rowCursor(row) : undefined}
                      className={cn(
                        "group/row relative border-b border-hairline transition-colors duration-hover ease-standard last:border-0",
                        interactive &&
                          "cursor-pointer hover:bg-brand-soft/45 focus-within:bg-brand-soft/45 outline-none",
                        "data-[selected=true]:bg-brand-soft/45"
                      )}
                      tabIndex={interactive ? 0 : undefined}
                      onKeyDown={
                        onRowClick
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault()
                                onRowClick(row)
                              }
                            }
                          : undefined
                      }
                    >
                      {columns.map((column, index) => (
                        <td
                          key={column.key}
                          className={cn(
                            // First cell owns the hover rail so the row reads as one target.
                            "relative px-4 py-2.5 align-middle",
                            index === 0 &&
                              interactive &&
                              "before:absolute before:inset-y-1.5 before:left-0 before:w-[2px] before:scale-y-0 before:rounded-r-full before:bg-brand before:transition-transform before:duration-hover before:ease-standard group-hover/row:before:scale-y-100",
                            column.className
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
          </tbody>
        </table>
        {!loading && rows.length === 0 && emptyState ? (
          <div className="px-4 py-10">{emptyState}</div>
        ) : null}
      </div>
    </LedgerCursor>
  )
}
