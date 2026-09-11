"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { toast } from "sonner"
import {
  ActivityIcon,
  BadgeAlertIcon,
  BanknoteIcon,
  BotIcon,
  CoinsIcon,
  CommandIcon,
  LayoutDashboardIcon,
  ListTreeIcon,
  PieChartIcon,
  PlusIcon,
  ReceiptIcon,
  RotateCwIcon,
  ScanSearchIcon,
  ShieldAlertIcon,
  SunIcon,
  TargetIcon,
  TriangleAlertIcon,
  WalletIcon,
} from "lucide-react"
import { Sidebar, type NavContextDef, type NavGroupDef, type NavStatusDef } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { CommandPalette, type PaletteGroup } from "@/components/prototype/command-palette"
import { ProfileDialog, type ProfileDetails } from "@/components/prototype/profile-dialog"
import { SignOutDialog } from "@/components/prototype/sign-out-dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useHotkey } from "@/hooks/use-hotkey"
import { useMessages } from "@/components/i18n/locale-provider"
import { useFinanceStore, categoryName } from "@/stores/finance-store"
import {
  BUDGET,
  DATA_SCOPE,
  RECEIVABLES_SUMMARY,
  RUNWAY,
  selectCategorySlices,
} from "@/lib/finance-metrics"
import { formatCurrency, formatCurrencyCompact, formatRatio } from "@/lib/format"
import { AddTransactionDialog } from "./add-transaction-dialog"
import { TransactionDrawer } from "./transaction-drawer"

/** 财务工作台的真实路由表——导航、命令中心与洞察跳转共用这一份。 */
export const FINANCE_ROUTES = {
  overview: "/finance",
  cashflow: "/finance/cashflow",
  analysis: "/finance/analysis",
  budget: "/finance/budget",
  insights: "/finance/insights",
  risks: "/finance/risks",
  transactions: "/finance/transactions",
} as const

export type FinanceRouteKey = keyof typeof FINANCE_ROUTES

/** 带科目筛选的分析页——洞察里的"查看该科目明细"落到这里。 */
export const analysisRoute = (categoryId: string) => `${FINANCE_ROUTES.analysis}?category=${categoryId}`

export function useFinancePageMeta(): Record<
  FinanceRouteKey,
  { eyebrow: string; title: string; description: string }
> {
  const t = useMessages()
  return useMemo(
    () => ({
      overview: t.page.overview,
      cashflow: t.page.cashflow,
      analysis: t.page.analysis,
      budget: t.page.budget,
      insights: t.page.insights,
      risks: t.page.risks,
      transactions: t.page.transactions,
    }),
    [t]
  )
}

export type PaletteMode = "search" | "ai"

type ShellContextValue = {
  /** 打开「登记一笔收支」对话框（任何页面都能调用）。 */
  openAddTransaction: () => void
  /** 打开命令中心（可指定 AI 模式）。 */
  openCommandPalette: (mode?: PaletteMode) => void
  /** 打开某笔交易的凭证抽屉。 */
  openTransaction: (id: string) => void
}

const ShellContext = createContext<ShellContextValue>({
  openAddTransaction: () => {},
  openCommandPalette: () => {},
  openTransaction: () => {},
})

export function useFinanceShell(): ShellContextValue {
  return useContext(ShellContext)
}

/**
 * 智悟云 · AI 财务工作台的共享外壳。
 *
 * 它只做三件事：把路由表变成导航、把假设与账本状态暴露给命令中心、
 * 承载跨页面的浮层（凭证抽屉 / 登记对话框 / 个人资料 / 退出登录）。
 * 页面本身只关心自己的构图。
 */
export function FinanceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useMessages()
  const { resolvedTheme, setTheme } = useTheme()

  // 软件科目的当月发生额——命令中心里"定位软件支出异动"要说真实金额。
  const softwareAmount = useMemo(
    () => selectCategorySlices().slices.find((slice) => slice.id === "software")?.amount ?? 0,
    []
  )

  const [commandOpen, setCommandOpen] = useState(false)
  const [paletteMode, setPaletteMode] = useState<PaletteMode>("search")
  const [addOpen, setAddOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)

  const status = useFinanceStore((s) => s.status)
  const initialize = useFinanceStore((s) => s.initialize)
  const refresh = useFinanceStore((s) => s.refresh)
  const simulateError = useFinanceStore((s) => s.simulateError)
  const reset = useFinanceStore((s) => s.reset)
  const transactions = useFinanceStore((s) => s.transactions)
  const assumptions = useFinanceStore((s) => s.assumptions)
  const selectedTransactionId = useFinanceStore((s) => s.selectedTransactionId)
  const selectTransaction = useFinanceStore((s) => s.selectTransaction)
  const invoice = useFinanceStore((s) => s.selectedInvoice)

  useEffect(() => {
    initialize()
  }, [initialize])

  useHotkey("k", () => setCommandOpen(true), { mod: true })

  const brand = useMemo(
    () => ({
      name: t.brand.short,
      subtitle: t.brand.subtitle,
      // Sidebar 自带的品牌方块已提供底色，这里只放字，避免方块套方块。
      mark: <span className="relative text-[15px] font-semibold leading-none">{t.brand.mark}</span>,
    }),
    [t]
  )

  const account = useMemo(
    () => ({ name: t.account.name, email: t.account.email, initials: t.account.initials }),
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

  const pageMeta = useFinancePageMeta()

  const activeRoute: FinanceRouteKey = useMemo(() => {
    if (pathname.startsWith(FINANCE_ROUTES.cashflow)) return "cashflow"
    if (pathname.startsWith(FINANCE_ROUTES.analysis)) return "analysis"
    if (pathname.startsWith(FINANCE_ROUTES.budget)) return "budget"
    if (pathname.startsWith(FINANCE_ROUTES.insights)) return "insights"
    if (pathname.startsWith(FINANCE_ROUTES.risks)) return "risks"
    if (pathname.startsWith(FINANCE_ROUTES.transactions)) return "transactions"
    return "overview"
  }, [pathname])

  /** 侧栏结构 = 产品结构：七个页面 + 三个直达结论的入口。 */
  const navGroups = useMemo<NavGroupDef[]>(
    () => [
      {
        id: "workspace",
        label: t.shell.workspaceSection,
        items: [
          { id: "overview", label: t.nav.overview, icon: LayoutDashboardIcon, href: FINANCE_ROUTES.overview },
          { id: "cashflow", label: t.nav.cashflow, icon: CoinsIcon, href: FINANCE_ROUTES.cashflow },
          { id: "analysis", label: t.nav.analysis, icon: PieChartIcon, href: FINANCE_ROUTES.analysis },
          { id: "budget", label: t.nav.budget, icon: TargetIcon, href: FINANCE_ROUTES.budget },
          {
            id: "transactions",
            label: t.nav.transactions,
            icon: ReceiptIcon,
            href: FINANCE_ROUTES.transactions,
          },
        ],
      },
      {
        id: "intelligence",
        label: t.shell.intelligenceSection,
        items: [
          { id: "insights", label: t.nav.insights, icon: BotIcon, href: FINANCE_ROUTES.insights },
          {
            id: "risks",
            label: t.nav.risks,
            icon: ShieldAlertIcon,
            href: FINANCE_ROUTES.risks,
            badge: RECEIVABLES_SUMMARY.overdueCount,
          },
        ],
      },
      {
        id: "actions",
        items: [
          { id: "add-transaction", label: t.nav.addTransaction, icon: PlusIcon, tone: "action" },
        ],
      },
    ],
    [t]
  )

  /** 侧栏上下文：季度预算执行率——用真实发生额对比季度预算。 */
  const workspaceContext = useMemo<NavContextDef>(
    () => ({
      label: t.shell.goalLabel,
      value: formatCurrencyCompact(BUDGET.actual),
      target: formatCurrencyCompact(BUDGET.budget),
      progress: Math.min(100, Math.round(BUDGET.usage)),
      hint: t.shell.goalHint,
    }),
    [t]
  )

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

  const navigate = useCallback(
    (id: string) => {
      // 账户菜单里的动作有真实目的地：对话框，而不是「稍后提供」。
      if (id === "add-transaction") {
        setAddOpen(true)
        return
      }
      if (id === "profile") {
        setProfileOpen(true)
        return
      }
      const href = FINANCE_ROUTES[id as FinanceRouteKey]
      if (href) router.push(href)
    },
    [router]
  )

  const openCommandPalette = useCallback((mode: PaletteMode = "search") => {
    setPaletteMode(mode)
    setCommandOpen(true)
  }, [])

  const openTransaction = useCallback(
    (id: string) => selectTransaction(id),
    [selectTransaction]
  )

  /**
   * Command Center 的四个分组。
   *
   * 与 CRM 版本的差别不在"换了几条命令"，而在**检索的是账本**：
   * 输入两个字符，交易就会带着日期、科目与金额出现在结果里，选中即打开凭证。
   * "智能指令"这一组全部是对确定性推导的入口——它们不调用模型，但都落到
   * 一条真实的结论上。
   */
  const renderPaletteGroups = useCallback(
    (query: string, mode: PaletteMode): PaletteGroup[] => {
      const needle = query.trim().toLowerCase()

      const navigation: PaletteGroup = {
        heading: t.palette.navigate,
        items: [
          {
            id: "go-overview",
            label: t.palette.goOverview,
            icon: LayoutDashboardIcon,
            keywords: t.palette.keywords.overview,
            shortcut: "G O",
            onSelect: () => router.push(FINANCE_ROUTES.overview),
          },
          {
            id: "go-cashflow",
            label: t.palette.goCashflow,
            icon: CoinsIcon,
            keywords: t.palette.keywords.cashflow,
            shortcut: "G C",
            onSelect: () => router.push(FINANCE_ROUTES.cashflow),
          },
          {
            id: "go-analysis",
            label: t.palette.goAnalysis,
            icon: PieChartIcon,
            keywords: t.palette.keywords.analysis,
            shortcut: "G A",
            onSelect: () => router.push(FINANCE_ROUTES.analysis),
          },
          {
            id: "go-budget",
            label: t.palette.goBudget,
            icon: TargetIcon,
            keywords: t.palette.keywords.budget,
            shortcut: "G B",
            onSelect: () => router.push(FINANCE_ROUTES.budget),
          },
          {
            id: "go-insights",
            label: t.palette.goInsights,
            icon: BotIcon,
            keywords: t.palette.keywords.insights,
            shortcut: "G I",
            onSelect: () => router.push(FINANCE_ROUTES.insights),
          },
          {
            id: "go-risks",
            label: t.palette.goRisks,
            icon: ShieldAlertIcon,
            keywords: t.palette.keywords.risks,
            shortcut: "G R",
            onSelect: () => router.push(FINANCE_ROUTES.risks),
          },
          {
            id: "go-transactions",
            label: t.palette.goTransactions,
            icon: ReceiptIcon,
            keywords: t.palette.keywords.transactions,
            shortcut: "G T",
            onSelect: () => router.push(FINANCE_ROUTES.transactions),
          },
        ],
      }

      const intelligence: PaletteGroup = {
        heading: t.palette.intelligence,
        items: [
          {
            id: "ai-brief",
            label: t.palette.aiBrief,
            testId: "palette-ai-brief",
            description: t.palette.aiBriefDescription,
            icon: ScanSearchIcon,
            keywords: t.palette.keywords.brief,
            onSelect: () => router.push(FINANCE_ROUTES.insights),
          },
          {
            id: "ai-cash",
            label: t.palette.aiCash,
            description: t.palette.aiCashDescription(formatRatio(RUNWAY)),
            icon: WalletIcon,
            keywords: t.palette.keywords.cash,
            onSelect: () => router.push(FINANCE_ROUTES.cashflow),
          },
          {
            id: "ai-risks",
            label: t.palette.aiRisks,
            description: t.palette.aiRisksDescription(
              RECEIVABLES_SUMMARY.overdueCount,
              formatCurrency(RECEIVABLES_SUMMARY.overdueTotal)
            ),
            icon: BadgeAlertIcon,
            keywords: t.palette.keywords.risks,
            onSelect: () => router.push(FINANCE_ROUTES.risks),
          },
          {
            id: "ai-budget",
            label: t.palette.aiBudget,
            description: t.palette.aiBudgetDescription(BUDGET.overCount),
            icon: TargetIcon,
            keywords: t.palette.keywords.budget,
            onSelect: () => router.push(FINANCE_ROUTES.budget),
          },
          {
            id: "ai-software",
            label: t.palette.aiSoftware,
            description: t.palette.aiSoftwareDescription(
              formatCurrencyCompact(softwareAmount * assumptions.costFactor)
            ),
            icon: ListTreeIcon,
            keywords: t.palette.keywords.software,
            onSelect: () => router.push(analysisRoute("software")),
          },
        ],
      }

      // 账本检索：只在真的输入之后出现，且最多 6 条——面板不是流水页。
      const matches = needle.length >= 2
        ? transactions
            .filter((transaction) =>
              `${transaction.counterparty} ${transaction.memo} ${transaction.voucher} ${categoryName(transaction.category)}`
                .toLowerCase()
                .includes(needle)
            )
            .slice(0, 6)
        : []

      const records: PaletteGroup | null =
        matches.length > 0
          ? {
              heading: t.palette.records,
              items: matches.map((transaction) => ({
                id: `tx-${transaction.id}`,
                label: transaction.counterparty,
                testId: `palette-transaction-${transaction.id}`,
                description: t.palette.transactionDescription(
                  transaction.date,
                  categoryName(transaction.category),
                  formatCurrency(transaction.amount)
                ),
                keywords: `${transaction.memo} ${transaction.voucher}`,
                icon: transaction.direction === "in" ? BanknoteIcon : ActivityIcon,
                onSelect: () => openTransaction(transaction.id),
              })),
            }
          : null

      const actions: PaletteGroup = {
        heading: t.palette.actions,
        items: [
          {
            id: "add-transaction",
            label: t.nav.addTransaction,
            icon: PlusIcon,
            keywords: t.palette.keywords.refresh,
            shortcut: "N",
            onSelect: () => setAddOpen(true),
          },
          {
            id: "toggle-theme",
            label: t.palette.toggleTheme,
            icon: SunIcon,
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
          {
            id: "reset",
            label: t.palette.reset,
            icon: RotateCwIcon,
            keywords: t.palette.keywords.reset,
            onSelect: () => {
              reset()
              toast.success(t.prototype.resetToastTitle, {
                description: t.prototype.resetToastDescription,
              })
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
      assumptions.costFactor,
      openTransaction,
      refresh,
      reset,
      resolvedTheme,
      router,
      setTheme,
      simulateError,
      softwareAmount,
      t,
      transactions,
    ]
  )

  const shellValue = useMemo<ShellContextValue>(
    () => ({
      openAddTransaction: () => setAddOpen(true),
      openCommandPalette,
      openTransaction,
    }),
    [openCommandPalette, openTransaction]
  )

  const meta = pageMeta[activeRoute]

  return (
    <ShellContext.Provider value={shellValue}>
      <div data-testid="finance-root" className="flex min-h-dvh">
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
          utilities={
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t.a11y.openCommand}
                    data-testid="sidebar-command"
                    onClick={() => openCommandPalette("search")}
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <CommandIcon className="size-4" />
                <span className="text-label">{t.nav.commandCenter}</span>
                <kbd className="kbd-chip ml-auto">⌘K</kbd>
              </TooltipTrigger>
              <TooltipContent side="top">{t.a11y.commandHint}</TooltipContent>
            </Tooltip>
          }
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="hidden lg:block">
            <TopNav
              title={t.page.breadcrumb(meta.title)}
              subtitle={t.brand.subtitle}
              onOpenCommand={() => openCommandPalette("search")}
              onNavigate={navigate}
              dataSource={{
                notifications: [
                  {
                    id: "n-software",
                    title: t.nav.analysis,
                    description: t.palette.aiSoftware,
                    time: t.common.justNow,
                    unread: true,
                    kind: "budget",
                    href: analysisRoute("software"),
                  },
                  {
                    id: "n-overdue",
                    title: t.nav.aging,
                    description: t.palette.aiRisks,
                    time: t.common.justNow,
                    unread: true,
                    kind: "risk",
                    href: FINANCE_ROUTES.risks,
                  },
                  {
                    id: "n-report",
                    title: t.nav.exportReport,
                    description: t.finance.scope.reference(DATA_SCOPE.referenceDate),
                    time: t.common.justNow,
                    unread: false,
                    kind: "report",
                    href: FINANCE_ROUTES.transactions,
                  },
                  {
                    id: "n-sync",
                    title: t.finance.status.ready,
                    description: t.finance.scope.transactions(DATA_SCOPE.transactionCount),
                    time: t.common.justNow,
                    unread: false,
                    kind: "sync",
                    href: FINANCE_ROUTES.cashflow,
                  },
                ],
                status,
                onRefresh: refresh,
                onSimulateFailure: simulateError,
                onReset: reset,
                onMarkAllRead: () => toast.success(t.toast.notificationsRead),
                onSignOut: () => setSignOutOpen(true),
                notificationHref: (notification) => notification.href ?? FINANCE_ROUTES.overview,
                primaryNavId: "profile",
                primaryNavLabel: t.dialogs.profile.title,
                account,
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
          placeholder={paletteMode === "ai" ? t.palette.aiPlaceholder : t.palette.placeholder}
          hint={t.palette.hint}
          testId="command-palette"
        />

        <AddTransactionDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onCreated={(transaction) => {
            selectTransaction(transaction.id)
          }}
        />

        {selectedTransactionId ? (
          <TransactionDrawer
            transactionId={selectedTransactionId}
            onOpenChange={(open) => {
              if (!open) selectTransaction(null)
            }}
            onOpenInvoiceRail={() => {
              selectTransaction(null)
              router.push(FINANCE_ROUTES.risks)
            }}
          />
        ) : null}

        {invoice ? (
          <TransactionDrawer
            invoiceId={invoice.id}
            onOpenChange={() => useFinanceStore.getState().selectInvoice(null)}
            onOpenInvoiceRail={() => useFinanceStore.getState().selectInvoice(null)}
          />
        ) : null}

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
