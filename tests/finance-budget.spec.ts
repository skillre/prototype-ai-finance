import { test, expect } from "@playwright/test"
import { openLedger } from "./support/localization"

/**
 * 预算执行页。
 *
 * 覆盖：季度执行率、科目明细的排序与状态、只看超支的真实过滤、
 * 部门维度汇总，以及从科目下钻到收支分析。
 */

test.describe("预算执行", () => {
  test("整体执行率与总览来自同一份数据", async ({ page }) => {
    await openLedger(page, "/finance/budget")
    const usage = page.getByTestId("budget-usage")
    await expect(usage).toContainText("97.4%")
    // 预算总额与实际发生来自同一份季度数据（与侧栏的上下文块一致）
    await expect(page.getByText("预算总额")).toBeVisible()
    await expect(page.getByText("实际发生").first()).toBeVisible()
    await expect(page.getByText("¥1,234万").first()).toBeVisible()
  })

  test("科目明细列出八个科目并按执行率排序", async ({ page }) => {
    await openLedger(page, "/finance/budget")
    const rows = page.getByTestId("budget-rows")
    await expect(rows).toContainText("研发与工具")
    await expect(rows).toContainText("销售与市场")
    await expect(rows).toContainText("差旅与招待")
    await expect(rows).toContainText("人力成本")
    // 执行率最高的科目排在最前
    const first = rows.getByTestId(/^budget-row-/).first()
    await expect(first).toContainText("研发与工具")
  })

  test("三个科目的状态被标为已超支", async ({ page }) => {
    await openLedger(page, "/finance/budget")
    await expect(page.getByTestId("budget-row-software")).toContainText("已超支")
    await expect(page.getByTestId("budget-row-marketing")).toContainText("已超支")
    await expect(page.getByTestId("budget-row-travel")).toContainText("已超支")
    await expect(page.getByTestId("budget-row-payroll")).toContainText("接近上限")
    await expect(page.getByTestId("budget-row-infrastructure")).toContainText("正常")
  })

  test("只看超支科目是真实过滤", async ({ page }) => {
    await openLedger(page, "/finance/budget")
    const rows = page.getByTestId("budget-rows")
    await expect(rows.getByTestId("budget-row-payroll")).toBeVisible()

    await page.getByTestId("budget-only-over").click()
    await expect(rows.getByTestId("budget-row-payroll")).toHaveCount(0)
    await expect(rows.getByTestId("budget-row-software")).toBeVisible()
    await expect(rows.getByTestId(/^budget-row-/)).toHaveCount(3)

    await page.getByTestId("budget-only-over").click()
    await expect(rows.getByTestId(/^budget-row-/)).toHaveCount(8)
  })

  test("科目行可以下钻到收支分析", async ({ page }) => {
    await openLedger(page, "/finance/budget")
    await page.getByTestId("budget-row-software").click()
    await expect(page).toHaveURL(/\/finance\/analysis\?category=software/)
    await expect(page.getByTestId("analysis-drilldown")).toBeVisible()
  })

  test("部门维度给出归口部门汇总", async ({ page }) => {
    await openLedger(page, "/finance/budget")
    const departments = page.getByTestId("budget-departments")
    await expect(departments).toContainText("研发中心")
    await expect(departments).toContainText("人力与行政")
    await expect(departments).toContainText("销售与市场")
  })

  test("可以跳到账本核对实际发生额", async ({ page }) => {
    await openLedger(page, "/finance/budget")
    await page.getByTestId("budget-open-ledger").click()
    await expect(page).toHaveURL(/\/finance\/transactions$/)
    await expect(page.getByTestId("transactions-table")).toBeVisible()
  })
})
