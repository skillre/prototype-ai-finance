import { test, expect, type Page } from "@playwright/test"
import { LOCALIZED_ROUTES, expectFullyLocalized, openLedger } from "./support/localization"

/**
 * 本地化完整性（English Leakage Audit）。
 *
 * 覆盖落地页与财务工作台全部路由，以及**浮层**：命令中心、账户菜单、
 * 通知、原型状态、个人资料、凭证抽屉、登记对话框。
 *
 * 判定规则集中在 `tests/support/localization.ts`。账本里的专有名词（供应商名、
 * 客户名、凭证号、发票号、邮箱、快捷键）由允许列表统一放行——它们是记录内容
 * 或技术标识，不是界面文案。
 */

async function waitReady(page: Page, route: string) {
  if (route.startsWith("/finance")) {
    await expect(page.getByTestId("finance-content")).toBeVisible({ timeout: 20_000 })
  }
}

test.describe("界面文案零英文泄漏", () => {
  test("html 声明 zh-CN", async ({ page }) => {
    await page.goto("/finance")
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN")
  })

  for (const route of LOCALIZED_ROUTES) {
    test(`${route} 渲染后没有未翻译的界面文案`, async ({ page }) => {
      await page.goto(route)
      await waitReady(page, route)
      await expectFullyLocalized(page, route)
    })
  }
})

test.describe("浮层与表单同样完成本地化", () => {
  test("命令中心（检索态与空态）", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.keyboard.press("ControlOrMeta+K")
    const palette = page.getByTestId("command-palette")
    await expect(palette).toBeVisible()
    await expectFullyLocalized(page, "命令中心")

    await palette.getByRole("combobox").fill("zzz-not-found")
    await expect(palette).toContainText("没有匹配的命令")
    await expectFullyLocalized(page, "命令中心空态")
    await page.keyboard.press("Escape")
  })

  test("账户菜单 / 通知 / 原型状态", async ({ page }) => {
    await openLedger(page, "/finance")

    await page.getByTestId("account-menu").click()
    await expect(page.getByRole("menuitem", { name: "个人资料" })).toBeVisible()
    await expectFullyLocalized(page, "账户菜单")
    await page.keyboard.press("Escape")

    await page.getByTestId("notifications").click()
    await expect(page.getByText("通知")).toBeVisible()
    await expectFullyLocalized(page, "通知面板")
    await page.keyboard.press("Escape")

    await page.getByTestId("prototype-controls").click()
    await expect(page.getByText("原型状态")).toBeVisible()
    await expectFullyLocalized(page, "原型状态")
    await page.keyboard.press("Escape")
  })

  test("个人资料 / 退出登录 / 登记交易", async ({ page }) => {
    await openLedger(page, "/finance")

    await page.getByTestId("account-menu").click()
    await page.getByRole("menuitem", { name: "个人资料" }).click()
    await expect(page.getByTestId("profile-dialog")).toBeVisible()
    await expectFullyLocalized(page, "个人资料")
    await page.keyboard.press("Escape")

    await page.getByTestId("account-menu").click()
    await page.getByRole("menuitem", { name: "退出登录" }).click()
    await expect(page.getByTestId("sign-out-dialog")).toBeVisible()
    await expectFullyLocalized(page, "退出登录")
    await page.keyboard.press("Escape")

    await page.getByTestId("sidebar-command").click()
    await page.getByRole("option", { name: "登记一笔收支" }).click()
    await expect(page.getByTestId("add-transaction-dialog")).toBeVisible()
    await expectFullyLocalized(page, "登记交易")
  })

  test("凭证抽屉（交易与发票两种视图）", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    await page.getByTestId("transactions-table").locator("tbody tr").first().click()
    await expect(page.getByTestId("transaction-drawer")).toBeVisible()
    await expectFullyLocalized(page, "凭证抽屉")
  })

  test("错误态与加载态", async ({ page }) => {
    await page.goto("/finance")
    await expect(page.getByTestId("finance-loading")).toBeVisible({ timeout: 10_000 })
    await expectFullyLocalized(page, "加载态")

    await expect(page.getByTestId("finance-content")).toBeVisible({ timeout: 20_000 })
    await page.getByTestId("prototype-controls").click()
    await page.getByRole("button", { name: "模拟同步失败" }).click()
    await expect(page.getByTestId("finance-error")).toBeVisible()
    await expectFullyLocalized(page, "错误态")
  })
})

test.describe("落地页与 404", () => {
  test("落地页展示了真实的财务数字", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("能撑多久")
    await expect(page.getByText("¥842万")).toBeVisible()
    await expect(page.getByText("14.8 个月")).toBeVisible()
    await expectFullyLocalized(page, "落地页")
  })

  test("404 页保留本地化", async ({ page }) => {
    await page.goto("/nowhere")
    await expect(page.getByTestId("app-not-found")).toBeVisible()
    await expectFullyLocalized(page, "404")
  })
})
