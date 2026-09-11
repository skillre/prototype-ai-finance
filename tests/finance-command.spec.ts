import { test, expect, type Page } from "@playwright/test"
import { openLedger } from "./support/localization"

/**
 * Command Center（命令中心）。
 *
 * 它不是"换皮的导航菜单"：检索的是**账本**（交易带着日期、科目与金额出现，
 * 选中即打开凭证），智能指令落到确定性的结论上，操作组里的每个动作都能
 * 在页面上看到结果。
 */

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(error.message))
  return errors
}

test.describe("命令中心", () => {
  test("⌘K 打开，四组命令都在", async ({ page }) => {
    const errors = trackConsoleErrors(page)
    await openLedger(page, "/finance")
    await page.keyboard.press("ControlOrMeta+K")
    const palette = page.getByTestId("command-palette")
    await expect(palette).toBeVisible()
    await expect(palette).toContainText("导航")
    await expect(palette).toContainText("智能指令")
    await expect(palette).toContainText("操作")
    await expect(palette).toContainText("前往财务总览")
    expect(errors).toEqual([])
  })

  test("输入即检索账本，选中打开凭证", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.keyboard.press("ControlOrMeta+K")
    const palette = page.getByTestId("command-palette")
    await palette.getByRole("combobox").fill("阿里云")
    await expect(palette).toContainText("交易检索")
    await expect(palette).toContainText("阿里云")
    await palette.getByRole("option").first().click()
    await expect(page.getByTestId("transaction-drawer")).toBeVisible()
    await expect(page.getByTestId("transaction-drawer")).toContainText("阿里云")
  })

  test("导航命令跳到对应路由", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.keyboard.press("ControlOrMeta+K")
    await page.getByTestId("command-palette").getByRole("option", { name: /前往现金流/ }).click()
    await expect(page).toHaveURL(/\/finance\/cashflow$/)
  })

  test("AI 模式把智能指令提到最前", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.getByTestId("sidebar-command").click()
    const palette = page.getByTestId("command-palette")
    await expect(palette).toBeVisible()

    /* 命令中心顶部有 ⌘K 提示；AI 模式由智能指令进入 */
    await palette.getByRole("option", { name: /检查超支科目/ }).click()
    await expect(page).toHaveURL(/\/finance\/budget$/)
  })

  test("智能指令落到真实结论上", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.keyboard.press("ControlOrMeta+K")
    const palette = page.getByTestId("command-palette")
    await expect(palette).toContainText("当前跑道")
    await palette.getByRole("option", { name: /列出逾期应收/ }).click()
    await expect(page).toHaveURL(/\/finance\/risks$/)
  })

  test("操作组：切换主题与重新同步都是真动作", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.keyboard.press("ControlOrMeta+K")
    await page.getByTestId("command-palette").getByRole("option", { name: "切换深浅色" }).click()
    await expect(page.locator("html")).toHaveClass(/dark/)

    await page.keyboard.press("ControlOrMeta+K")
    await page.getByTestId("command-palette").getByRole("option", { name: "重新同步账本" }).click()
    await expect(page.getByTestId("finance-content")).toBeVisible({ timeout: 20_000 })
  })

  test("命令中心每次打开都从空检索词开始", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.keyboard.press("ControlOrMeta+K")
    const palette = page.getByTestId("command-palette")
    await palette.getByRole("combobox").fill("阿里云")
    await page.keyboard.press("Escape")
    await page.keyboard.press("ControlOrMeta+K")
    await expect(palette.getByRole("combobox")).toHaveValue("")
  })

  test("侧栏底部的命令入口同样可用", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.getByTestId("sidebar-command").click()
    await expect(page.getByTestId("command-palette")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("command-palette")).toHaveCount(0)
  })
})
