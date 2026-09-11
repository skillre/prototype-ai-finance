import { test, expect, type Page } from "@playwright/test"
import { openLedger } from "./support/localization"

/**
 * 财务工作台的路由完整性。
 *
 * 七个页面都是真实路由：可分享、可刷新、可新开标签。导航、面包屑与
 * 404 兜底都必须指向这些路由，而不是只在内存里切 view。
 */

const ROUTES = [
  { id: "overview", path: "/finance", title: "财务总览" },
  { id: "cashflow", path: "/finance/cashflow", title: "现金流" },
  { id: "analysis", path: "/finance/analysis", title: "收支分析" },
  { id: "budget", path: "/finance/budget", title: "预算执行" },
  { id: "transactions", path: "/finance/transactions", title: "交易流水" },
  { id: "insights", path: "/finance/insights", title: "AI 财务洞察" },
  { id: "risks", path: "/finance/risks", title: "风险与异常" },
] as const

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(error.message))
  return errors
}

test.describe("路由完整性", () => {
  for (const route of ROUTES) {
    test(`${route.path} 直接访问即可渲染（深链可用）`, async ({ page }) => {
      const errors = trackConsoleErrors(page)
      await openLedger(page, route.path)
      await expect(page.getByTestId("finance-root")).toBeVisible()
      await expect(page.getByRole("heading", { level: 1 })).toContainText(route.title)
      expect(errors).toEqual([])
    })
  }
})

test.describe("侧栏导航", () => {
  test("七个页面之间逐一切换", async ({ page }) => {
    await openLedger(page, "/finance")
    for (const route of ["cashflow", "analysis", "budget", "transactions", "insights", "risks"]) {
      await page.getByTestId(`nav-${route}`).click()
      const target = ROUTES.find((item) => item.id === route)
      await expect(page).toHaveURL(new RegExp(`${target?.path}$`))
      await expect(page.getByTestId("finance-content")).toBeVisible()
      await expect(page.getByTestId(`nav-${route}`)).toHaveAttribute("aria-current", "page")
    }
    await page.getByTestId("nav-overview").click()
    await expect(page).toHaveURL(/\/finance$/)
  })

  test("侧栏快捷动作是真的（登记交易）", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.getByTestId("nav-add-transaction").click()
    await expect(page.getByTestId("add-transaction-dialog")).toBeVisible()
    await page.keyboard.press("Escape")
  })
})

test.describe("不支持的路由", () => {
  test("/finance 下的未知路径给出财务工作台的 404", async ({ page }) => {
    await page.goto("/finance/not-a-page")
    await expect(page.getByTestId("finance-not-found")).toBeVisible()
    await page.getByRole("link", { name: "回到财务总览" }).click()
    await expect(page).toHaveURL(/\/finance$/)
  })

  test("全站未知路径给出 404 与真实建议", async ({ page }) => {
    await page.goto("/nowhere")
    await expect(page.getByTestId("app-not-found")).toBeVisible()
    await expect(page.getByRole("link", { name: "现金流" })).toBeVisible()
  })
})

test.describe("状态三态", () => {
  test("加载态：首次进入显示同步骨架", async ({ page }) => {
    await page.goto("/finance")
    await expect(page.getByTestId("finance-loading")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("finance-content")).toBeVisible({ timeout: 20_000 })
  })

  test("错误态可触发、可恢复", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.getByTestId("prototype-controls").click()
    await page.getByRole("button", { name: "模拟同步失败" }).click()
    await expect(page.getByTestId("finance-error")).toBeVisible()
    await expect(page.getByTestId("finance-error")).toContainText("GET")

    await page.getByRole("button", { name: "重试" }).click()
    await expect(page.getByTestId("finance-content")).toBeVisible({ timeout: 20_000 })
  })

  test("重置账本恢复初始状态", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.getByTestId("runway-preset-stress").click()
    await expect(page.getByTestId("runway-months")).not.toHaveText("14.8")

    await page.getByTestId("prototype-controls").click()
    await page.getByRole("button", { name: "重置账本与假设" }).click()
    await expect(page.getByTestId("runway-months")).toHaveText("14.8")
  })
})

test.describe("主题", () => {
  test("深浅色切换是真实行为且持久", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.getByTestId("toggle-theme").click()
    await expect(page.locator("html")).toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator("html")).toHaveClass(/dark/)
    await page.getByTestId("toggle-theme").click()
    await expect(page.locator("html")).not.toHaveClass(/dark/)
  })
})

test.describe("账户与通知", () => {
  test("个人资料对话框可打开可关闭", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.getByTestId("account-menu").click()
    await page.getByRole("menuitem", { name: "个人资料" }).click()
    await expect(page.getByTestId("profile-dialog")).toBeVisible()
    await expect(page.getByTestId("profile-dialog")).toContainText("智悟云科技（深圳）有限公司")
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("profile-dialog")).toHaveCount(0)
  })

  test("退出登录先确认再重置", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.getByTestId("account-menu").click()
    await page.getByRole("menuitem", { name: "退出登录" }).click()
    await expect(page.getByTestId("sign-out-dialog")).toBeVisible()
    await page.getByTestId("sign-out-dialog").getByRole("button", { name: "退出登录" }).click()
    await expect(page.getByTestId("finance-content")).toBeVisible({ timeout: 20_000 })
  })

  test("通知条目指向真实页面", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.getByTestId("notifications").click()
    await expect(page.getByText("通知")).toBeVisible()
    await page.getByRole("menuitem").first().click()
    await expect(page).toHaveURL(/\/finance\/(analysis|risks|transactions|cashflow)/)
  })

  test("侧栏账户入口打开个人资料", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.getByTestId("sidebar-account").click()
    await expect(page.getByTestId("profile-dialog")).toBeVisible()
    await page.keyboard.press("Escape")
  })
})
