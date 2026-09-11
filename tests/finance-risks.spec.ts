import { test, expect } from "@playwright/test"
import { openLedger } from "./support/localization"

/**
 * 风险与异常页。
 *
 * 三个来源各有一条真实路径：异常支出（单笔金额显著高于同科目历史水平）、
 * 应收账龄（按逾期天数分桶）、预算超支（与预算页同源）。发票详情由外壳的
 * 抽屉承载，因此"点开一张发票"是跨页面的同一个界面。
 */

test.describe("风险敞口", () => {
  test("第一视觉给出风险敞口与逾期金额", async ({ page }) => {
    await openLedger(page, "/finance/risks")
    const exposure = page.getByTestId("risk-exposure")
    await expect(exposure).toContainText("¥")
    await expect(page.getByTestId("aging-section")).toBeVisible()
  })

  test("账龄分桶与逾期清单一致", async ({ page }) => {
    await openLedger(page, "/finance/risks")
    const aging = page.getByTestId("aging-section")
    await expect(aging).toContainText("未到期")
    await expect(aging).toContainText("逾期 1–30 天")
    await expect(aging).toContainText("逾期 31–60 天")
    await expect(aging).toContainText("逾期 60 天以上")

    const list = page.getByTestId("exposure-list")
    await expect(list.getByTestId(/^risk-invoice-/).first()).toBeVisible()
  })

  test("账龄分桶可以过滤敞口清单并恢复", async ({ page }) => {
    await openLedger(page, "/finance/risks")
    const allRows = page.getByTestId("exposure-list").getByTestId(/^risk-invoice-/)
    const total = await allRows.count()
    expect(total).toBeGreaterThan(1)

    await page.getByTestId("aging-legend-d1-30").click()
    const filtered = await allRows.count()
    expect(filtered).toBeLessThanOrEqual(total)

    await page.getByTestId("aging-clear").click()
    await expect(allRows).toHaveCount(total)
  })

  test("点开一张发票会打开发票详情", async ({ page }) => {
    await openLedger(page, "/finance/risks")
    await page.getByTestId("exposure-list").getByTestId(/^risk-invoice-/).first().click()
    const drawer = page.getByTestId("transaction-drawer")
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText("发票号")
    await expect(drawer).toContainText("到期日")
    await page.keyboard.press("Escape")
    await expect(drawer).toHaveCount(0)
  })
})

test.describe("异常支出", () => {
  test("异常清单给出与同科目均值的差额", async ({ page }) => {
    await openLedger(page, "/finance/risks")
    const anomalies = page.getByTestId("anomaly-detail")
    await expect(anomalies).toBeVisible()
    await expect(anomalies.getByTestId(/^anomaly-row-/).first()).toBeVisible()
    await expect(anomalies).toContainText("高于同科目历史均值")
  })

  test("异常清单可以展开查看更多并收起", async ({ page }) => {
    await openLedger(page, "/finance/risks")
    const rows = page.getByTestId("anomaly-detail").getByTestId(/^anomaly-row-/)
    const preview = await rows.count()
    const toggle = page.getByTestId("anomaly-toggle")
    if ((await toggle.count()) === 0) return

    await toggle.click()
    const expanded = await rows.count()
    expect(expanded).toBeGreaterThanOrEqual(preview)
    await expect(toggle).toContainText("收起")

    await toggle.click()
    await expect(rows).toHaveCount(preview)
  })

  test("科目异动与预算超支都能跳到对应页面", async ({ page }) => {
    await openLedger(page, "/finance/risks")
    await page.getByTestId("risk-spikes").getByTestId(/^spike-row-/).first().click()
    await expect(page).toHaveURL(/\/finance\/analysis\?category=/)
  })

  test("预算超支科目指向预算执行页", async ({ page }) => {
    await openLedger(page, "/finance/risks")
    await page.getByTestId("risk-over-budget").getByTestId(/^over-budget-/).first().click()
    await expect(page).toHaveURL(/\/finance\/(analysis|budget)/)
  })
})
