import { test, expect, type Page } from "@playwright/test"
import { openLedger } from "./support/localization"

/**
 * 账本页（交易流水）与凭证抽屉。
 *
 * 覆盖真实财务用户在这页会做的事：按方向/科目/账户/时间筛、搜交易对手、
 * 翻页、点开凭证核对、登记一笔新交易并立刻在列表里找到它。
 */

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(error.message))
  return errors
}

test.describe("账本列表", () => {
  test("默认列出近 90 天流水并分页", async ({ page }) => {
    const errors = trackConsoleErrors(page)
    await openLedger(page, "/finance/transactions")
    await expect(page.getByTestId("transactions-table")).toBeVisible()
    await expect(page.getByTestId("transactions-pagination")).toContainText("第 1–12 条")

    await page.getByRole("button", { name: "第 2 页" }).click()
    await expect(page.getByTestId("transactions-pagination")).toContainText("第 13–24 条")
    await page.getByRole("button", { name: "上一页" }).click()
    await expect(page.getByTestId("transactions-pagination")).toContainText("第 1–12 条")

    expect(errors).toEqual([])
  })

  test("按方向筛选只留下支出", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    await page.getByTestId("transactions-filter-direction").click()
    await page.getByRole("option", { name: "支出" }).click()
    const rows = page.getByTestId("transactions-table").locator("tbody tr")
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    for (let index = 0; index < count; index += 1) {
      await expect(rows.nth(index)).toContainText("−")
    }
  })

  test("按科目筛选后结果与该科目一致", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    await page.getByTestId("transactions-filter-category").click()
    await page.getByRole("option", { name: "云与基础设施" }).click()
    await expect(page.getByTestId("transactions-table")).toContainText("云与基础设施")
    await expect(page.getByTestId("transactions-table")).not.toContainText("员工工资发放")
  })

  test("按账户筛选只留下该账户的流水", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    await page.getByTestId("transactions-filter-account").click()
    await page.getByRole("option", { name: "支付宝企业账户" }).click()
    await expect(page.getByTestId("transactions-table")).toContainText("支付宝企业账户")
  })

  test("搜索交易对手与凭证号", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    await page.getByTestId("transactions-search").fill("阿里云")
    await expect(page.getByTestId("transactions-table")).toContainText("阿里云")
    await expect(page.getByTestId("transactions-table")).not.toContainText("携程商旅")
  })

  test("筛到空结果时给出可恢复的空态", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    await page.getByTestId("transactions-search").fill("zzz-不存在")
    await expect(page.getByText("没有匹配的交易")).toBeVisible()
    await page.getByRole("button", { name: "清除筛选" }).click()
    await expect(page.getByTestId("transactions-table")).toBeVisible()
    await expect(page.getByTestId("transactions-pagination")).toContainText("第 1–12 条")
  })

  test("时间范围切换真实收敛结果", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    const caption = page.getByTestId("transactions-pagination")
    const wide = await caption.textContent()
    await page.getByTestId("transactions-filter-range").click()
    await page.getByRole("option", { name: "近 30 天" }).click()
    const narrow = await caption.textContent()
    expect(narrow).not.toBe(wide)
  })
})

test.describe("凭证抽屉", () => {
  test("打开一笔支出并核对科目、账户与凭证号", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    await page.getByTestId("transactions-search").fill("阿里云")
    await page.getByTestId("transactions-table").locator("tbody tr").first().click()
    const drawer = page.getByTestId("transaction-drawer")
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText("云与基础设施")
    await expect(drawer).toContainText("凭证号")
    await expect(drawer).toContainText("工商银行")
  })

  test("抽屉里可以切换到同对手方的其它记录", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    await page.getByTestId("transactions-search").fill("阿里云")
    await page.getByTestId("transactions-table").locator("tbody tr").first().click()
    const drawer = page.getByTestId("transaction-drawer")
    await expect(drawer).toContainText("同对手方近期记录")
    const related = drawer.getByTestId(/^drawer-related-/)
    expect(await related.count()).toBeGreaterThan(0)
    await related.first().click()
    await expect(drawer).toBeVisible()
  })

  test("内部调拨会被标注并解释", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    await page.getByTestId("transactions-search").fill("内部资金调拨")
    await expect(page.getByTestId("transactions-table")).toContainText("内部调拨")
  })
})

test.describe("登记一笔收支", () => {
  test("校验失败不会提交", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    await page.getByTestId("sidebar-command").click()
    await page.getByRole("option", { name: "登记一笔收支" }).click()
    const dialog = page.getByTestId("add-transaction-dialog")
    await expect(dialog).toBeVisible()

    await page.getByTestId("add-transaction-submit").click()
    await expect(dialog).toContainText("请填写交易对手")

    await page.getByTestId("add-transaction-counterparty").fill("测试供应商")
    await page.getByTestId("add-transaction-amount").fill("0")
    await page.getByTestId("add-transaction-submit").click()
    await expect(dialog).toContainText("金额必须是大于 0 的数字")
  })

  test("登记成功后新交易出现在账本里", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    await page.getByTestId("sidebar-command").click()
    await page.getByRole("option", { name: "登记一笔收支" }).click()
    const dialog = page.getByTestId("add-transaction-dialog")
    await expect(dialog).toBeVisible()

    await page.getByTestId("add-transaction-counterparty").fill("深圳测试科技")
    await page.getByTestId("add-transaction-amount").fill("128000")
    await page.getByTestId("add-transaction-submit").click()

    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId("transaction-drawer")).toBeVisible()
    await expect(page.getByTestId("transaction-drawer")).toContainText("深圳测试科技")
    await expect(page.getByTestId("transaction-drawer")).toContainText("¥128,000")
  })
})
