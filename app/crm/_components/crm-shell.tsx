"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { toast } from "sonner"
import {
  ActivityIcon,
  BotIcon,
  BuildingIcon,
  CrownIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  PlusIcon,
  RotateCwIcon,
  ShieldAlertIcon,
  SparklesIcon,
  SunMoonIcon,
  TargetIcon,
  TriangleAlertIcon,
  UsersIcon,
  WandSparklesIcon,
} from "lucide-react"
import {
  Sidebar,
  type NavBrandDef,
  type NavContextDef,
  type NavGroupDef,
  type NavStatusDef,
  type NavUserDef,
} from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { CommandPalette, type PaletteGroup } from "@/components/prototype/command-palette"
import { ProfileDialog, type ProfileDetails } from "@/components/prototype/profile-dialog"
import { SignOutDialog } from "@/components/prototype/sign-out-dialog"
import { useHotkey } from "@/hooks/use-hotkey"
import { useMessages } from "@/components/i18n/locale-provider"
import { useCrmStore } from "@/stores/crm-store"
import { formatCurrencyCompact } from "@/lib/format"
import { AddCustomerDialog } from "./add-customer-dialog"
import { CustomerDetailDrawer } from "./customer-detail-drawer"

/** 本季度目标——侧栏工作区上下文用它与真实合同总额对比。 */
const QUARTER_GOAL = 24_000_000

/** CRM 的真实路由表——导航、命令面板与详情页都以此为唯一来源。 */
export const CRM_ROUTES = {
  dashboard: "/crm",
  customers: "/crm/customers",
  opportunities: "/crm/opportunities",
  tasks: "/crm/tasks",
  activities: "/crm/activities",
} as const

/** 风险预警的深链接：带筛选条件的客户名册。 */
export const CRM_RISK_ROUTE = "/crm/customers?status=at-risk"

export type CrmRouteKey = keyof typeof CRM_ROUTES

/** 页面元信息（眉标/标题/副标题）由词典提供，见下方的 useCrmPageMeta。 */
export function useCrmPageMeta(): Record<
  CrmRouteKey,
  { eyebrow: string; title: string; description: string }
> {
  const t = useMessages()
  return useMemo(
    () => ({
      dashboard: t.page.dashboard,
      customers: t.page.customers,
      opportunities: t.page.opportunities,
      tasks: t.page.tasks,
      activities: t.page.activities,
    }),
    [t]
  )
}

/** 命令面板的两种进入方式：普通检索 / AI 提问。 */
export type PaletteMode = "search" | "ai"

/** 页面内可以请求把某个区块带到眼前（当前只有总览的洞察层）。 */
export type FocusTarget = "insight"

type ShellContextValue = {
  /** 打开「添加客户」对话框（任何页面都能调用）。 */
  openAddCustomer: () => void
  /** 打开命令面板（可指定 AI 模式）。 */
  openCommandPalette: (mode?: PaletteMode) => void
  /** 请求把某个区块滚动到视野内并短暂点亮。 */
  requestFocus: (target: FocusTarget) => void
  /** 待处理的聚焦请求——由页面消费，消费后清除。 */
  focusRequest: { target: FocusTarget; nonce: number } | null
  clearFocus: () => void
}

const ShellContext = createContext<ShellContextValue>({
  openAddCustomer: () => {},
  openCommandPalette: () => {},
  requestFocus: () => {},
  focusRequest: null,
  clearFocus: () => {},
})

/** 页面内组件用它触发 shell 级交互（对话框 / 命令面板）。 */
export function useCrmShell(): ShellContextValue {
  return useContext(ShellContext)
}

/**
 * 智悟云 CRM 的共享外壳：Sidebar / TopNav / MobileNav / CommandPalette /
 * Add Customer Dialog / Customer Detail Drawer。放在 app/crm/layout.tsx，
 * 因此每个真实路由都拥有同一套导航与全局交互，切换页面不会重建外壳。
 */
export function CrmShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useMessages()

  const [commandOpen, setCommandOpen] = useState(false)
  const [paletteMode, setPaletteMode] = useState<PaletteMode>("search")
  const [focusRequest, setFocusRequest] = useState<ShellContextValue["focusRequest"]>(null)
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)

  const status = useCrmStore((s) => s.status)
  const initialize = useCrmStore((s) => s.initialize)
  const refresh = useCrmStore((s) => s.refresh)
  const simulateError = useCrmStore((s) => s.simulateError)
  const reset = useCrmStore((s) => s.reset)
  const selectCustomer = useCrmStore((s) => s.selectCustomer)
  const selectedCustomerId = useCrmStore((s) => s.selectedCustomerId)
  const notifications = useCrmStore((s) => s.notifications)
  const markAllNotificationsRead = useCrmStore((s) => s.markAllNotificationsRead)
  const customers = useCrmStore((s) => s.customers)
  const taskBoard = useCrmStore((s) => s.tasks)

  const generateAiSummary = useCrmStore((s) => s.generateAiSummary)

  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    initialize()
  }, [initialize])

  useHotkey("k", () => setCommandOpen(true), { mod: true })

  const brand = useMemo<NavBrandDef>(
    () => ({
      name: t.brand.name,
      subtitle: t.brand.subtitle,
      // Sidebar 自己提供品牌底色方块，这里只放字；否则会出现方块套方块。
      mark: <span className="relative text-[15px] font-semibold leading-none">{t.brand.mark}</span>,
    }),
    [t]
  )

  const account = useMemo<NavUserDef>(
    () => ({
      name: t.account.name,
      email: t.account.email,
      initials: t.account.initials,
    }),
    [t]
  )

  const profile = useMemo<ProfileDetails>(
    () => ({
      name: t.account.name,
      email: t.account.email,
      initials: t.account.initials,
      role: t.account.role,
      workspace: t.account.workspace,
      plan: t.account.plan,
    }),
    [t]
  )

  const pageMeta = useCrmPageMeta()

  // 当前激活的路由 key（用于侧栏高亮）。详情页归属 Customers。
  const activeRoute: CrmRouteKey = useMemo(() => {
    if (pathname.startsWith("/crm/customers")) return "customers"
    if (pathname.startsWith("/crm/opportunities")) return "opportunities"
    if (pathname.startsWith("/crm/tasks")) return "tasks"
    if (pathname.startsWith("/crm/activities")) return "activities"
    return "dashboard"
  }, [pathname])

  /**
   * 侧栏结构 = 产品结构。
   *
   *   工作台   —— 五个页面（每个都有真实路由，可分享、可新开标签）
   *   智能中心 —— 三个直达结论的入口：洞察层 / 风险名册 / AI 助手
   *   （无标题分组）—— 动作用 hairline 与页面导航分开，避免语义混淆
   */
  const navGroups = useMemo<NavGroupDef[]>(
    () => [
      {
        id: "workspace",
        label: t.shell.workspaceSection,
        items: [
          {
            id: "dashboard",
            label: t.nav.dashboard,
            icon: LayoutDashboardIcon,
            href: CRM_ROUTES.dashboard,
          },
          {
            id: "customers",
            label: t.nav.customers,
            icon: UsersIcon,
            href: CRM_ROUTES.customers,
            badge: customers.length,
          },
          {
            id: "opportunities",
            label: t.nav.opportunities,
            icon: TargetIcon,
            href: CRM_ROUTES.opportunities,
          },
          {
            id: "tasks",
            label: t.nav.tasks,
            icon: ListChecksIcon,
            href: CRM_ROUTES.tasks,
            badge: Object.values(taskBoard).reduce((sum, list) => sum + list.length, 0),
          },
          {
            id: "activities",
            label: t.nav.activities,
            icon: ActivityIcon,
            href: CRM_ROUTES.activities,
          },
        ],
      },
      {
        id: "intelligence",
        label: t.shell.intelligenceSection,
        items: [
          // 三个入口都不是装饰：聚焦洞察层、带筛选条件的名册、AI 模式的命令面板。
          { id: "insights", label: t.nav.insights, icon: SparklesIcon },
          { id: "risks", label: t.nav.risks, icon: ShieldAlertIcon },
          { id: "assistant", label: t.nav.assistant, icon: BotIcon },
        ],
      },
      {
        id: "actions",
        items: [{ id: "add-customer", label: t.nav.addCustomer, icon: PlusIcon, tone: "action" }],
      },
    ],
    [t, customers.length, taskBoard]
  )

  /**
   * 侧栏的工作区上下文：用真实合同总额对比季度目标。
   * 它代替了 V2 侧栏底部那一大片空白——空白不是"简洁"，是"没做完"。
   */
  const workspaceContext = useMemo<NavContextDef>(() => {
    const revenue = customers.reduce((sum, c) => sum + (c.status === "churned" ? 0 : c.value), 0)
    return {
      label: t.shell.goalLabel,
      value: formatCurrencyCompact(revenue),
      target: formatCurrencyCompact(QUARTER_GOAL),
      progress: Math.min(100, Math.round((revenue / QUARTER_GOAL) * 100)),
      hint: t.shell.goalHint,
    }
  }, [customers, t])

  /** 需要提醒的停滞客户数——AI 命令的说明文案要说出真实数字。 */
  const riskCount = useMemo(
    () =>
      customers.filter(
        (customer) =>
          customer.status !== "churned" && customer.value > 0 && customer.lastTouchHours >= 24 * 7
      ).length,
    [customers]
  )

  /** 金额最高的客户——"生成销售摘要"这条命令的真实目的地。 */
  const topCustomer = useMemo(
    () => [...customers].sort((a, b) => b.value - a.value)[0],
    [customers]
  )

  /** 实时状态：刷新是真实动作，不是装饰指示灯。 */
  const sidebarStatus = useMemo<NavStatusDef>(
    () => ({
      label: status === "loading" ? t.shell.syncing : t.shell.live,
      hint: t.shell.liveHint,
      busy: status === "loading",
      onRefresh: refresh,
      refreshLabel: t.a11y.refreshData,
    }),
    [status, refresh, t]
  )

  /**
   * 侧栏导航的兜底。
   *
   * 拖拽结束后，dnd-kit 会在 document 的**捕获阶段**装一个监听器，用来吞掉
   * 拖拽尾随的那个 click。如果用户拖完卡片立刻点侧栏，被吞掉的恰好是这次
   * 点击——React 的 onClick 与 next/link 都不会跑，浏览器于是执行锚点默认
   * 行为：一次整页导航。整页导航会把内存里的 store 清空（拖拽结果、筛选、
   * AI 摘要全部回滚）。
   *
   * 这个监听器注册得比 dnd-kit 更早，所以永远来得及 preventDefault，
   * 并自己用 router.push 完成这次客户端跳转。普通点击走的是同一条路径，
   * 不存在两条导航互相竞争。
   */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target as Element | null
      const anchor = target?.closest?.("a[data-nav-href]")
      const href = anchor?.getAttribute("data-nav-href")
      if (!href) return
      event.preventDefault()
      router.push(href)
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [router])

  const requestFocus = useCallback((target: FocusTarget) => {
    setFocusRequest((previous) => ({ target, nonce: (previous?.nonce ?? 0) + 1 }))
  }, [])

  const clearFocus = useCallback(() => setFocusRequest(null), [])

  const openCommandPalette = useCallback((mode: PaletteMode = "search") => {
    setPaletteMode(mode)
    setCommandOpen(true)
  }, [])

  const navigate = useCallback(
    (id: string) => {
      // 账户菜单里的动作有真实目的地：对话框，而不是「稍后提供」。
      if (id === "add-customer") {
        setAddCustomerOpen(true)
        return
      }
      if (id === "profile") {
        setProfileOpen(true)
        return
      }
      // 智能中心：三个入口各自抵达一个真实结果。
      if (id === "insights") {
        requestFocus("insight")
        router.push(CRM_ROUTES.dashboard)
        return
      }
      if (id === "risks") {
        router.push(CRM_RISK_ROUTE)
        return
      }
      if (id === "assistant") {
        openCommandPalette("ai")
        return
      }
      const href = CRM_ROUTES[id as CrmRouteKey]
      if (href) router.push(href)
    },
    [openCommandPalette, requestFocus, router]
  )

  /**
   * 抽屉里的「查看客户档案」：关闭抽屉并停留在详情页。
   * 抽屉是 modal，若不关闭会一直遮挡底下的详情页并拦截点击。
   */
  const openAccountPage = useCallback(
    (customerId: string) => {
      selectCustomer(null)
      router.push(`/crm/customers/${customerId}`)
    },
    [router, selectCustomer]
  )

  /**
   * Command Center 的四个分组。
   *
   *   导航     —— 五个真实路由
   *   客户     —— **由当前输入实时生成的记录检索结果**（含金额与阶段）
   *   智能     —— AI 命令：生成摘要 / 风险客户 / 高价值客户 / 定位洞察
   *   操作     —— 全局动作（新建、主题、刷新、故障演练）
   *
   * 它是一个函数而不是一个常量，因为"客户"这一组要跟着搜索词变化；
   * AI 模式则把"智能"提到最前，并把占位文案换成提问的语气。
   */
  const renderPaletteGroups = useCallback(
    (query: string, mode: PaletteMode): PaletteGroup[] => {
      const needle = query.trim().toLowerCase()

      const navigation: PaletteGroup = {
        heading: t.palette.navigate,
        items: [
          {
            id: "go-dashboard",
            label: t.palette.goDashboard,
            icon: LayoutDashboardIcon,
            keywords: t.palette.keywords.dashboard,
            shortcut: "G D",
            onSelect: () => router.push(CRM_ROUTES.dashboard),
          },
          {
            id: "go-customers",
            label: t.palette.goCustomers,
            icon: UsersIcon,
            keywords: t.palette.keywords.customers,
            shortcut: "G C",
            onSelect: () => router.push(CRM_ROUTES.customers),
          },
          {
            id: "go-opportunities",
            label: t.palette.goOpportunities,
            icon: TargetIcon,
            keywords: t.palette.keywords.opportunities,
            shortcut: "G O",
            onSelect: () => router.push(CRM_ROUTES.opportunities),
          },
          {
            id: "go-tasks",
            label: t.palette.goTasks,
            icon: ListChecksIcon,
            keywords: t.palette.keywords.tasks,
            shortcut: "G T",
            onSelect: () => router.push(CRM_ROUTES.tasks),
          },
          {
            id: "go-activities",
            label: t.palette.goActivities,
            icon: ActivityIcon,
            keywords: t.palette.keywords.activities,
            shortcut: "G A",
            onSelect: () => router.push(CRM_ROUTES.activities),
          },
        ],
      }

      const intelligence: PaletteGroup = {
        heading: t.palette.intelligence,
        items: [
          {
            id: "ai-summary",
            label: t.palette.aiSummary,
            testId: "palette-ai-summary",
            description: topCustomer
              ? t.palette.aiDescription.summary(topCustomer.company)
              : undefined,
            icon: WandSparklesIcon,
            keywords: t.palette.keywords.summary,
            onSelect: () => {
              if (!topCustomer) return
              // 真实动作：进入金额最高的客户档案，并立刻开始生成简报。
              generateAiSummary(topCustomer.id)
              router.push(`/crm/customers/${topCustomer.id}`)
            },
          },
          {
            id: "ai-risks",
            label: t.palette.aiRisks,
            description: t.palette.aiDescription.risks(riskCount),
            icon: ShieldAlertIcon,
            keywords: t.palette.keywords.risks,
            onSelect: () => router.push(CRM_RISK_ROUTE),
          },
          {
            id: "ai-key-accounts",
            label: t.palette.aiKeyAccounts,
            description: t.palette.aiDescription.keyAccounts(
              Math.min(5, customers.length)
            ),
            icon: CrownIcon,
            keywords: t.palette.keywords.keyAccounts,
            onSelect: () => router.push(CRM_ROUTES.customers),
          },
          {
            id: "ai-insight",
            label: t.palette.aiInsight,
            testId: "palette-ai-insight",
            description: t.palette.aiDescription.insight,
            icon: SparklesIcon,
            keywords: t.palette.keywords.insight,
            onSelect: () => {
              requestFocus("insight")
              router.push(CRM_ROUTES.dashboard)
            },
          },
        ],
      }

      // 记录检索：只在真的输入之后出现，且最多 5 条——面板不是列表页。
      const matches = needle
        ? customers
            .filter((customer) =>
              `${customer.company} ${customer.name} ${customer.owner} ${customer.email}`
                .toLowerCase()
                .includes(needle)
            )
            .slice(0, 5)
        : []

      const records: PaletteGroup | null =
        matches.length > 0
          ? {
              heading: t.palette.customers,
              items: matches.map((customer) => ({
                id: `customer-${customer.id}`,
                label: customer.company,
                testId: `palette-customer-${customer.id}`,
                /* 检索结果直接浮现关键数据：金额 + 阶段 + 负责人。 */
                description: t.palette.customerDescription(
                  formatCurrencyCompact(customer.value),
                  t.status[customer.status]
                ),
                keywords: `${customer.name} ${customer.owner} ${customer.email}`,
                icon: BuildingIcon,
                onSelect: () => router.push(`/crm/customers/${customer.id}`),
              })),
            }
          : null

      const actions: PaletteGroup = {
        heading: t.palette.actions,
        items: [
          {
            id: "add-customer",
            label: t.palette.addCustomer,
            icon: PlusIcon,
            keywords: t.palette.keywords.addCustomer,
            shortcut: "N",
            onSelect: () => setAddCustomerOpen(true),
          },
          {
            id: "toggle-theme",
            label: t.palette.toggleTheme,
            icon: SunMoonIcon,
            keywords: t.palette.keywords.theme,
            onSelect: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
          },
          {
            id: "refresh",
            label: t.palette.refresh,
            icon: RotateCwIcon,
            keywords: t.palette.keywords.refresh,
            onSelect: () => {
              refresh()
              toast.success(t.toast.refreshed)
            },
          },
          {
            id: "simulate-error",
            label: t.palette.simulateError,
            icon: TriangleAlertIcon,
            keywords: t.palette.keywords.error,
            onSelect: () => {
              simulateError()
              toast.error(t.toast.refreshFailed, { description: t.toast.refreshFailedDescription })
            },
          },
        ],
      }

      const ordered =
        mode === "ai"
          ? [intelligence, records, navigation, actions]
          : [navigation, records, intelligence, actions]

      return ordered.filter((group): group is PaletteGroup => group !== null)
    },
    [
      customers,
      generateAiSummary,
      refresh,
      requestFocus,
      resolvedTheme,
      riskCount,
      router,
      setTheme,
      simulateError,
      t,
      topCustomer,
    ]
  )

  const shellValue = useMemo<ShellContextValue>(
    () => ({
      openAddCustomer: () => setAddCustomerOpen(true),
      openCommandPalette,
      requestFocus,
      focusRequest,
      clearFocus,
    }),
    [clearFocus, focusRequest, openCommandPalette, requestFocus]
  )

  const meta = pageMeta[activeRoute]

  return (
    <ShellContext.Provider value={shellValue}>
      <div data-testid="crm-root" className="flex min-h-dvh">
        <Sidebar
          active={activeRoute}
          onNavigate={navigate}
          brand={brand}
          groups={navGroups}
          user={account}
          usage={null}
          context={workspaceContext}
          status={sidebarStatus}
          onOpenAccount={() => setProfileOpen(true)}
          accountHint={t.shell.accountHint}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="hidden lg:block">
            <TopNav
              // 面包屑式上下文（不是重复页面 H1——页面头部才是标题本体）。
              title={t.page.breadcrumb(meta.title)}
              subtitle={t.brand.subtitle}
              onOpenCommand={() => openCommandPalette("search")}
              onNavigate={navigate}
              dataSource={{
                notifications,
                status,
                onRefresh: refresh,
                onSimulateFailure: simulateError,
                onReset: reset,
                onMarkAllRead: () => {
                  markAllNotificationsRead()
                  toast.success(t.toast.notificationsRead)
                },
                // 通知携带 customerId 时直达客户详情页，否则回到动态页。
                notificationHref: (notification) =>
                  notification.customerId
                    ? `/crm/customers/${notification.customerId}`
                    : CRM_ROUTES.activities,
                onSignOut: () => setSignOutOpen(true),
                primaryNavId: "profile",
                primaryNavLabel: t.dialogs.profile.title,
                account: { name: account.name, email: account.email, initials: account.initials },
              }}
            />
          </div>
          <div className="lg:hidden">
            <MobileNav
              title={meta.title}
              active={activeRoute}
              onNavigate={navigate}
              onOpenCommand={() => openCommandPalette("search")}
              brand={brand}
              groups={navGroups}
              user={account}
              usage={null}
              context={workspaceContext}
              status={sidebarStatus}
              onOpenAccount={() => setProfileOpen(true)}
              accountHint={t.shell.accountHint}
            />
          </div>

          <main className="flex-1">{children}</main>
        </div>

        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          groups={[]}
          renderGroups={renderPaletteGroups}
          mode={paletteMode}
          placeholder={
            paletteMode === "ai" ? t.palette.aiPlaceholder : t.palette.placeholder
          }
          hint={t.palette.hint}
          testId="command-palette"
        />

        <AddCustomerDialog
          open={addCustomerOpen}
          onOpenChange={setAddCustomerOpen}
          onCreated={(id) => {
            // 新建后回到客户列表并打开抽屉：新行可见，同时能立即查看详情。
            router.push(CRM_ROUTES.customers)
            selectCustomer(id)
          }}
        />

        {selectedCustomerId ? <CustomerDetailDrawer onViewAccount={openAccountPage} /> : null}

        <ProfileDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          profile={profile}
          testId="profile-dialog"
        />

        <SignOutDialog
          open={signOutOpen}
          onOpenChange={setSignOutOpen}
          accountEmail={account.email}
          testId="sign-out-dialog"
          onConfirm={reset}
        />
      </div>
    </ShellContext.Provider>
  )
}
