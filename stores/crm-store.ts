"use client"

import { create } from "zustand"
import {
  CRM_ACTIVITIES,
  CRM_CUSTOMERS,
  CRM_NOTIFICATIONS,
  CRM_TASKS,
  STATUS_ORDER,
  type ActivityKind,
  type CrmActivity,
  type CrmCustomer,
  type CrmNotification,
  type CustomerPlan,
  type CustomerStatus,
  type CrmTask,
  type CrmOwner,
  type TaskColumnId,
} from "@/lib/crm-data"
import { buildAiSummary, type AiSummary } from "@/lib/ai-summary"
import { messages as t } from "@/lib/i18n"

export type CrmDataStatus = "loading" | "ready" | "error"
export type CrmStatusFilter = CustomerStatus | "all"
export type CrmOwnerFilter = CrmOwner | "all"
export type CrmSortKey = "name" | "company" | "value" | "createdAt" | "lastTouchHours"
export type CrmSortDir = "asc" | "desc"
export type AiStatus = "idle" | "loading" | "ready" | "error"

export interface NewCrmCustomerInput {
  name: string
  company: string
  email: string
  phone: string
  owner: CrmOwner
  status: CustomerStatus
  value: number
  notes: string
}

export const PAGE_SIZE = 8

/** mock 数据的"当前月"，用于月度派生（与 lib/crm-data.ts 的时间戳一致）。 */
export const REFERENCE_MONTH = "2026-09"

interface CrmState {
  status: CrmDataStatus
  errorMessage: string | null

  customers: CrmCustomer[]
  activities: CrmActivity[]
  tasks: Record<TaskColumnId, CrmTask[]>
  notifications: CrmNotification[]

  selectedCustomerId: string | null
  aiStatus: AiStatus
  aiSummary: AiSummary | null
  /**
   * 递增的请求令牌，用来判断"这次 AI 请求还算不算数"。
   * 不能用 `selectedCustomerId` 代替：详情页是直接按 URL 渲染的，
   * 并不会把客户标记为"已选中"，那样生成请求会永远停在 loading。
   */
  aiRequest: number

  search: string
  statusFilter: CrmStatusFilter
  ownerFilter: CrmOwnerFilter
  sortKey: CrmSortKey
  sortDir: CrmSortDir
  page: number

  activityKindFilter: ActivityKind | "all"
  activityOwnerFilter: CrmOwner | "all"

  initialize: () => void
  refresh: () => void
  simulateError: () => void
  reset: () => void

  setSearch: (value: string) => void
  setStatusFilter: (value: CrmStatusFilter) => void
  setOwnerFilter: (value: CrmOwnerFilter) => void
  setSort: (key: CrmSortKey) => void
  setPage: (page: number) => void
  resetFilters: () => void

  selectCustomer: (id: string | null) => void
  addCustomer: (input: NewCrmCustomerInput) => CrmCustomer
  generateAiSummary: (customerId: string) => void
  clearAiSummary: () => void

  moveTask: (taskId: string, from: TaskColumnId, to: TaskColumnId, toIndex: number) => void
  resetBoard: () => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  setActivityKindFilter: (value: ActivityKind | "all") => void
  setActivityOwnerFilter: (value: CrmOwner | "all") => void
}

const SIMULATED_LATENCY = 900

function cloneTasks(): Record<TaskColumnId, CrmTask[]> {
  return Object.fromEntries(
    Object.entries(CRM_TASKS).map(([column, tasks]) => [column, tasks.map((t) => ({ ...t }))])
  ) as Record<TaskColumnId, CrmTask[]>
}

export const useCrmStore = create<CrmState>((set, get) => ({
  status: "loading",
  errorMessage: null,

  customers: [],
  activities: CRM_ACTIVITIES,
  tasks: cloneTasks(),
  notifications: CRM_NOTIFICATIONS,

  selectedCustomerId: null,
  aiStatus: "idle",
  aiSummary: null,
  aiRequest: 0,

  search: "",
  statusFilter: "all",
  ownerFilter: "all",
  sortKey: "createdAt",
  sortDir: "desc",
  page: 1,

  activityKindFilter: "all",
  activityOwnerFilter: "all",

  initialize: () => {
    if (get().status === "ready") return
    set({ status: "loading", errorMessage: null })
    setTimeout(() => {
      set({ status: "ready", customers: [...CRM_CUSTOMERS] })
    }, SIMULATED_LATENCY)
  },

  refresh: () => {
    set({ status: "loading", errorMessage: null })
    setTimeout(() => {
      set({ status: "ready", customers: [...CRM_CUSTOMERS] })
    }, SIMULATED_LATENCY)
  },

  simulateError: () =>
    set({
      status: "error",
      errorMessage: "GET https://api.zhiwu.cn/v1/customers — 请求在 10 秒后超时。",
    }),

  reset: () =>
    set({
      status: "ready",
      errorMessage: null,
      customers: [...CRM_CUSTOMERS],
      tasks: cloneTasks(),
      notifications: CRM_NOTIFICATIONS.map((n) => ({ ...n })),
      selectedCustomerId: null,
      aiStatus: "idle",
      aiSummary: null,
      aiRequest: 0,
      search: "",
      statusFilter: "all",
      ownerFilter: "all",
      sortKey: "createdAt",
      sortDir: "desc",
      page: 1,
      activityKindFilter: "all",
      activityOwnerFilter: "all",
    }),

  // 任何筛选变化都回到第一页，避免停留在越界页码上。
  setSearch: (value) => set({ search: value, page: 1 }),
  setStatusFilter: (value) => set({ statusFilter: value, page: 1 }),
  setOwnerFilter: (value) => set({ ownerFilter: value, page: 1 }),
  setSort: (key) =>
    set((state) => ({
      sortKey: key,
      sortDir: state.sortKey === key ? (state.sortDir === "asc" ? "desc" : "asc") : "asc",
      page: 1,
    })),
  setPage: (page) => set({ page: Math.max(1, page) }),
  resetFilters: () =>
    set({ search: "", statusFilter: "all", ownerFilter: "all", page: 1 }),

  selectCustomer: (id) =>
    set((state) => ({
      selectedCustomerId: id,
      aiStatus: "idle",
      aiSummary: null,
      // 切换记录时作废仍在飞行中的生成请求。
      aiRequest: state.aiRequest + 1,
    })),

  addCustomer: (input) => {
    const now = new Date()
    const customer: CrmCustomer = {
      id: `c-${now.getTime()}`,
      name: input.name.trim(),
      company: input.company.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      title: t.customer.fields.contact,
      status: input.status,
      owner: input.owner,
      value: input.value,
      plan: input.status === "lead" ? "Starter" : input.status === "trial" ? "Growth" : "Scale",
      createdAt: now.toISOString().slice(0, 10),
      lastTouchHours: 0,
      tags: input.status === "lead" ? [t.data.tagInbound] : [t.data.tagNew],
      notes: input.notes.trim() || t.data.placeholderNote,
    }

    // 新客户同时写入活动流，时间线保持真实。
    // 注意：mock 数据里的时间戳是构造出来的，可能晚于真实系统时间，
    // 因此新建活动的时间取「现有最大时间 + 1 秒」，保证它稳定排在最前。
    const maxAt = get().activities.reduce((max, item) => (item.at > max ? item.at : max), "")
    const nextAt = new Date(
      Math.max(Date.now(), maxAt ? new Date(maxAt).getTime() + 1000 : 0)
    ).toISOString()

    const activity: CrmActivity = {
      id: `a-${now.getTime()}`,
      customerId: customer.id,
      kind: "status",
      title: t.data.createdActivityTitle,
      detail: t.data.createdActivityDetail(customer.owner, customer.company),
      actor: customer.owner,
      time: t.data.justNow,
      at: nextAt,
    }

    set((state) => ({
      customers: [customer, ...state.customers],
      activities: [activity, ...state.activities],
      page: 1,
    }))
    return customer
  },

  generateAiSummary: (customerId) => {
    const customer = get().customers.find((c) => c.id === customerId)
    if (!customer) {
      set({ aiStatus: "error", aiSummary: null })
      return
    }
    const token = get().aiRequest + 1
    set({ aiStatus: "loading", aiSummary: null, aiRequest: token })
    setTimeout(() => {
      // 结果返回时用户可能已经切走或重新生成——只认最新一次请求。
      if (get().aiRequest !== token) return
      // 记录本身可能已被移除（例如重置数据）。
      const current = get().customers.find((c) => c.id === customerId)
      if (!current) {
        set({ aiStatus: "error", aiSummary: null })
        return
      }
      set({ aiStatus: "ready", aiSummary: buildAiSummary(current) })
    }, 1400)
  },

  clearAiSummary: () =>
    set((state) => ({ aiStatus: "idle", aiSummary: null, aiRequest: state.aiRequest + 1 })),

  moveTask: (taskId, from, to, toIndex) =>
    set((state) => {
      const source = state.tasks[from]
      const index = source.findIndex((t) => t.id === taskId)
      if (index === -1) return state

      const task = source[index]
      const nextTasks = { ...state.tasks }

      if (from === to) {
        const reordered = [...source]
        reordered.splice(index, 1)
        reordered.splice(toIndex, 0, task)
        nextTasks[from] = reordered
      } else {
        nextTasks[from] = source.filter((t) => t.id !== taskId)
        const target = [...state.tasks[to]]
        target.splice(toIndex, 0, task)
        nextTasks[to] = target
      }

      return { tasks: nextTasks }
    }),

  setActivityKindFilter: (value) => set({ activityKindFilter: value }),
  setActivityOwnerFilter: (value) => set({ activityOwnerFilter: value }),

  /** 只把任务看板恢复为初始顺序——不会影响客户、筛选或 AI 摘要。 */
  resetBoard: () => set({ tasks: cloneTasks() }),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, unread: false } : n
      ),
    })),

  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, unread: false })),
    })),
}))

/* -------------------------------------------------------------------------- */
/* 纯函数 selector —— 与 stores/dashboard-store.ts 保持同样约定：              */
/* 只接收原始 state，派生逻辑放在这里，组件用 useMemo 调用。                    */
/* -------------------------------------------------------------------------- */

export interface FilterInput {
  customers: CrmCustomer[]
  search: string
  statusFilter: CrmStatusFilter
  ownerFilter: CrmOwnerFilter
  sortKey: CrmSortKey
  sortDir: CrmSortDir
}

export function selectFilteredCustomers({
  customers,
  search,
  statusFilter,
  ownerFilter,
  sortKey,
  sortDir,
}: FilterInput): CrmCustomer[] {
  const query = search.trim().toLowerCase()

  const filtered = customers.filter((customer) => {
    if (statusFilter !== "all" && customer.status !== statusFilter) return false
    if (ownerFilter !== "all" && customer.owner !== ownerFilter) return false
    if (
      query &&
      !`${customer.name} ${customer.company} ${customer.email} ${customer.phone} ${customer.title}`
        .toLowerCase()
        .includes(query)
    ) {
      return false
    }
    return true
  })

  const direction = sortDir === "asc" ? 1 : -1
  return [...filtered].sort((a, b) => {
    switch (sortKey) {
      case "name":
        return a.name.localeCompare(b.name) * direction
      case "company":
        return a.company.localeCompare(b.company) * direction
      case "value":
        return (a.value - b.value) * direction
      case "createdAt":
        return a.createdAt.localeCompare(b.createdAt) * direction
      case "lastTouchHours":
      default:
        return (a.lastTouchHours - b.lastTouchHours) * direction
    }
  })
}

export function selectActivities({
  activities,
  activityKindFilter,
  activityOwnerFilter,
}: {
  activities: CrmActivity[]
  activityKindFilter: ActivityKind | "all"
  activityOwnerFilter: CrmOwner | "all"
}): CrmActivity[] {
  return activities
    .filter((activity) => {
      if (activityKindFilter !== "all" && activity.kind !== activityKindFilter) return false
      if (activityOwnerFilter !== "all" && activity.actor !== activityOwnerFilter) return false
      return true
    })
    .sort((a, b) => b.at.localeCompare(a.at))
}

export interface CrmKpis {
  totalCustomers: number
  newThisMonth: number
  activeDeals: number
  revenue: number
  conversionRate: number
}

/** 全部 KPI 都由当前 customers 派生——新增客户后数字会真实变化。 */
export function selectKpis(customers: CrmCustomer[]): CrmKpis {
  const totalCustomers = customers.length
  const newThisMonth = customers.filter((c) => c.createdAt.startsWith(REFERENCE_MONTH)).length
  const activeDeals = customers.filter(
    (c) => c.status === "lead" || c.status === "trial"
  ).length
  const revenue = customers.reduce((sum, c) => sum + (c.status === "churned" ? 0 : c.value), 0)
  const won = customers.filter((c) => c.status === "active").length
  const conversionRate = totalCustomers === 0 ? 0 : (won / totalCustomers) * 100

  return { totalCustomers, newThisMonth, activeDeals, revenue, conversionRate }
}

/** Pipeline 阶段分布（供环形图使用）。 */
export function selectStageBreakdown(customers: CrmCustomer[]) {
  return STATUS_ORDER.map((status) => ({
    status,
    count: customers.filter((c) => c.status === status).length,
  }))
}

export interface CrmMonthlyPoint {
  /** "2026-08" */
  key: string
  /** 该月新增客户数。 */
  added: number
  /** 截至该月月底的客户总数。 */
  cumulative: number
  /** 截至该月月底在谈/已签约的年度合同额。 */
  value: number
  /** 截至该月月底仍未转化的商机数（线索 + 试用）。 */
  openDeals: number
  /** 截至该月月底合作中客户占比（0–100）。 */
  conversion: number
}

/**
 * KPI 迷你走势用的逐月序列——完全由真实 customers 派生，不是装饰数据。
 * 以 mock 数据的"当前时间"为锚点向前回溯 `months` 个月。
 */
export function selectMonthlySeries(customers: CrmCustomer[], months = 12): CrmMonthlyPoint[] {
  const [anchorYear, anchorMonth] = REFERENCE_MONTH.split("-").map(Number)

  const keys: string[] = []
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const total = anchorYear * 12 + (anchorMonth - 1) - offset
    const year = Math.floor(total / 12)
    const month = (total % 12) + 1
    keys.push(`${year}-${String(month).padStart(2, "0")}`)
  }

  return keys.map((key, index) => {
    // 截至本月月底：按 "YYYY-MM" 前缀比较即可，ISO 日期字典序与时间序一致。
    const upTo = `${key}-32`
    const soFar = customers.filter((c) => c.createdAt <= upTo)
    const active = soFar.filter((c) => c.status === "active").length
    const openDeals = soFar.filter((c) => c.status === "lead" || c.status === "trial").length

    return {
      key,
      added: customers.filter((c) => c.createdAt.startsWith(key)).length,
      cumulative: soFar.length,
      value: soFar.reduce((sum, c) => sum + (c.status === "churned" ? 0 : c.value), 0),
      openDeals,
      conversion:
        index === 0 || soFar.length === 0 ? 0 : Math.round((active / soFar.length) * 1000) / 10,
    }
  })
}

/** mock 数据的"当前月"，用于月度派生（与 lib/crm-data.ts 的时间戳一致）。 */

export function paginate<T>(rows: T[], page: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    rows: rows.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total: rows.length,
  }
}

export type { CrmCustomer, CrmTask, CrmActivity, CustomerStatus, CustomerPlan, CrmOwner, TaskColumnId }
