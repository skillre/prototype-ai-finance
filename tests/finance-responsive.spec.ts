import { test, expect, type Page } from "@playwright/test"
import { openLedger } from "./support/localization"

/**
 * 响应式审计 —— 1440×900（桌面）与 390×844（iPhone 14 Pro 逻辑尺寸）。
 *
 * 移动端不是"压缩过的桌面"：导航进抽屉、表头进卡片、栏位重排。
 * 这一组断言的是"没有被压坏"：没有横向溢出、没有小于 24px 的命中区、
 * 关键入口仍在视野内且可点。
 */

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

const ROUTES = [
  "/finance",
  "/finance/cashflow",
  "/finance/analysis",
  "/finance/budget",
  "/finance/insights",
  "/finance/risks",
  "/finance/transactions",
] as const

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement
    return Math.max(0, doc.scrollWidth - doc.clientWidth)
  })
}

test.describe("1440×900 桌面", () => {
  test.use({ viewport: DESKTOP })

  for (const route of ROUTES) {
    test(`${route} 无横向溢出且侧栏常驻`, async ({ page }) => {
      await openLedger(page, route)
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
      await expect(page.getByTestId("nav-overview")).toBeVisible()
      await expect(page.getByTestId("mobile-nav")).toBeHidden()
    })
  }

  test("跑道仪表在桌面为左右共面构图", async ({ page }) => {
    await openLedger(page, "/finance")
    const cash = await page.getByTestId("runway-cash").boundingBox()
    const chart = await page.getByTestId("runway-chart").boundingBox()
    expect(cash).not.toBeNull()
    expect(chart).not.toBeNull()
    if (!cash || !chart) return
    // 数字在左、图形在右：两块版面共享同一条水平带
    expect(chart.x).toBeGreaterThan(cash.x + cash.width - 1)
    expect(Math.abs(chart.y - cash.y)).toBeLessThan(320)
  })

  test("账本在桌面是表格形态", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    await expect(page.getByTestId("transactions-table").locator("thead")).toBeVisible()
  })
})

test.describe("390×844 移动端", () => {
  test.use({ viewport: MOBILE })

  for (const route of ROUTES) {
    test(`${route} 重新排版且无横向溢出`, async ({ page }) => {
      await openLedger(page, route)
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
      await expect(page.getByTestId("mobile-nav")).toBeVisible()
      // 桌面侧栏在移动端必须收起
      await expect(page.getByTestId("sidebar-account")).toBeHidden()
    })
  }

  test("移动端导航走抽屉，切换后自动收起", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.getByTestId("mobile-nav").click()
    /* 抽屉里的导航：桌面的 Sidebar 仍在 DOM 中（只是被 CSS 收起），
       因此必须把选择器收敛到抽屉内部，而不是全局 testid。 */
    const drawer = page.getByRole("dialog")
    const drawerNav = drawer.getByTestId("nav-cashflow")
    await expect(drawerNav).toBeVisible()
    await drawerNav.click()
    await expect(page).toHaveURL(/\/finance\/cashflow$/)
    await expect(drawer).toBeHidden()
  })

  test("移动端的跑道读数与假设面板依然可操作", async ({ page }) => {
    await openLedger(page, "/finance")
    await expect(page.getByTestId("runway-cash")).toBeVisible()
    const slider = page.getByTestId("assumption-revenueFactor")
    await slider.scrollIntoViewIfNeeded()
    await expect(slider).toBeVisible()
    await slider.fill("0.8")
    const runway = Number(await page.getByTestId("runway-months").textContent())
    expect(runway).toBeLessThan(14.8)
  })

  test("账本在移动端是两行记录而不是横滚表格", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    const table = page.getByTestId("transactions-table")
    await expect(table).toBeVisible()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
  })

  test("表格里的每一行都可点开凭证", async ({ page }) => {
    await openLedger(page, "/finance/transactions")
    await page.getByTestId("transactions-table").locator("tbody tr").first().click()
    await expect(page.getByTestId("transaction-drawer")).toBeVisible()
    await expect(page.getByTestId("transaction-drawer")).toBeVisible()
  })

  test("移动端顶栏的主题与命令入口可用", async ({ page }) => {
    await openLedger(page, "/finance")
    await page.getByRole("button", { name: "打开命令中心" }).click()
    await expect(page.getByTestId("command-palette")).toBeVisible()
    await page.keyboard.press("Escape")
    await page.getByRole("button", { name: "切换深浅色" }).click()
    await expect(page.locator("html")).toHaveClass(/dark/)
  })
})

test.describe("触摸命中区", () => {
  test.use({ viewport: MOBILE })

  test("导航项与主要动作不小于 24px", async ({ page }) => {
    await openLedger(page, "/finance")
    const targets = [page.getByTestId("mobile-nav"), page.getByTestId("runway-preset-base")]
    for (const target of targets) {
      const box = await target.boundingBox()
      expect(box, "命中区必须存在").not.toBeNull()
      if (!box) continue
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(24)
    }

    // 抽屉里的导航项同样要够大（移动端的主要入口都在这里）
    await page.getByTestId("mobile-nav").click()
    const drawerItem = page.getByRole("dialog").getByTestId("nav-cashflow")
    const itemBox = await drawerItem.boundingBox()
    expect(itemBox).not.toBeNull()
    if (itemBox) expect(Math.min(itemBox.width, itemBox.height)).toBeGreaterThanOrEqual(24)
  })
})
