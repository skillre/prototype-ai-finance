import { test, expect, type Page } from "@playwright/test"

/**
 * AI Sales Command Center —— 本阶段新增的产品体验。
 *
 * 覆盖四件事，每一件都必须真实发生而不是看起来发生了：
 *   1. Revenue Intelligence Hero 的签名交互（悬停图形 → 读数跟着走）
 *   2. AI 洞察层（确定性推导 + 悬停高亮 + 点击进入客户）
 *   3. 实时数据层（真实时钟 + 可重放的事件流）
 *   4. Command Center（分组 / 记录检索 / AI 命令 / AI 模式）
 *   外加侧栏「智能中心」的三个真实入口与新的「机会」路由。
 */

async function waitForCrm(page: Page) {
  await expect(page.getByTestId("crm-content")).toBeVisible({ timeout: 20_000 })
}

/** 悬停到 Hero 图形宽度的某个比例处。 */
async function hoverChart(page: Page, ratio: number) {
  const box = await page.getByTestId("hero-chart").boundingBox()
  if (!box) throw new Error("hero chart is not rendered")
  await page.mouse.move(box.x + box.width * ratio, box.y + box.height * 0.8)
  await page.waitForTimeout(400)
}

test.describe("Revenue Intelligence Hero", () => {
  test("悬停图形时读数面板跟着光标走，且可以固定", async ({ page }) => {
    await page.goto("/crm")
    await waitForCrm(page)
    await page.waitForTimeout(900)

    // 大数字是页面唯一的第一视觉焦点，且是真实派生值。
    await expect(page.getByTestId("kpi-revenue")).toContainText("¥2,006万")

    const readout = page.getByTestId("hero-readout")
    await expect(readout).toContainText("在谈管道")

    await hoverChart(page, 0.1)
    const early = await readout.innerText()

    await hoverChart(page, 0.95)
    const late = await readout.innerText()

    // 读数真的变了——这就是签名交互。
    expect(late).not.toBe(early)
    // 停在非当月时，眉标会明说"正在读哪个月"。
    expect(early).toContain("读数")

    // 点击固定：指针移开后读数仍然是刚才那一期。
    await hoverChart(page, 0.1)
    await page.mouse.down()
    await page.mouse.up()
    await page.mouse.move(8, 8)
    await page.waitForTimeout(300)

    const reset = page.getByTestId("hero-readout-reset")
    await expect(reset).toBeVisible()
    // 固定的那一期仍然在读数面板里，指针已经离开了图形。
    await expect(readout).toContainText("读数")

    // 「回到当月」是真实动作。
    await reset.click()
    await expect(reset).not.toBeVisible()
  })

  test("区间切换真实改变图形与刻度", async ({ page }) => {
    await page.goto("/crm")
    await waitForCrm(page)
    await page.waitForTimeout(900)

    const ticks = page.locator(".recharts-xAxis .recharts-cartesian-axis-tick")

    await page.getByTestId("hero-range-12").click()
    await page.waitForTimeout(1100)
    await expect(ticks).toHaveCount(12)

    await page.getByTestId("hero-range-3").click()
    await page.waitForTimeout(1100)
    await expect(ticks).toHaveCount(3)
    await expect(page.getByTestId("hero-range-3")).toHaveAttribute("aria-pressed", "true")
  })
})

test.describe("AI 洞察层", () => {
  test("洞察由真实数据推导，悬停实体高亮同名记录，点击进入档案", async ({ page }) => {
    await page.goto("/crm")
    await waitForCrm(page)
    await page.waitForTimeout(900)

    const insight = page.getByTestId("ai-insight")
    await expect(insight).toBeVisible()

    // 句子里的数字是推导值（一位小数百分比），不是写死的文案。
    await expect(page.getByTestId("ai-insight-sentence")).toContainText(/\d+\.\d%/)

    // 三位贡献客户来自真实数据，且都可操作。
    const contributors = page.getByTestId("ai-insight-contributors").locator("li")
    await expect(contributors).toHaveCount(3)

    // 悬停 → 下方同名记录同步高亮。
    const row = page.getByTestId("top-accounts").locator("li", { hasText: "云启医疗" }).locator("button")
    const before = await row.evaluate((el) => getComputedStyle(el).backgroundColor)
    await page.getByTestId("insight-contributor-c-004").hover()
    await page.waitForTimeout(260)
    const after = await row.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(after).not.toBe(before)

    // 点击 → 客户档案。
    await page.getByTestId("insight-contributor-c-004").click()
    await page.waitForURL(/\/crm\/customers\/c-004/)
    await expect(page.getByTestId("detail-timeline")).toBeVisible()
  })

  test("风险预警指向真实客户，「查看重点客户」带筛选进入名册", async ({ page }) => {
    await page.goto("/crm")
    await waitForCrm(page)
    await page.waitForTimeout(900)

    const risk = page.getByTestId("ai-insight-risk")
    await expect(risk).toBeVisible()
    await expect(risk).toContainText("天未更新")

    await page.getByTestId("insight-view-key-accounts").click()
    await page.waitForURL(/\/crm\/customers\?status=active/)
    await expect(page.getByTestId("crm-filter-status")).toContainText("合作中")
  })
})

test.describe("机会雷达与实时数据层", () => {
  test("机会雷达三行都进入真实客户档案", async ({ page }) => {
    await page.goto("/crm")
    await waitForCrm(page)
    await page.waitForTimeout(900)

    await expect(page.getByTestId("opportunity-spotlight").locator("li")).toHaveCount(3)
    await page.getByTestId("spotlight-deal-c-010").click()
    await page.waitForURL(/\/crm\/customers\/c-010/)
    await expect(page.getByTestId("detail-timeline")).toBeVisible()
  })

  test("「全部机会」进入机会页", async ({ page }) => {
    await page.goto("/crm")
    await waitForCrm(page)
    await page.waitForTimeout(900)

    await page.getByTestId("spotlight-view-all").click()
    await page.waitForURL("**/crm/opportunities")
    await expect(page.getByTestId("opportunity-table")).toBeVisible()
  })

  test("实时数据层有时间戳、真实时钟与可重放的事件流", async ({ page }) => {
    await page.goto("/crm")
    await waitForCrm(page)
    await page.waitForTimeout(900)

    const status = page.getByTestId("live-status")
    await expect(status).toContainText("数据实时同步")
    await expect(status).toContainText(/\d{2}:\d{2}/)

    const layer = page.getByTestId("live-data-layer")
    await expect(layer.locator("li").first()).toBeVisible()

    await page.getByTestId("live-replay").click()
    await expect(layer.locator("li")).toHaveCount(3)
  })

  test("实时层的事件可以进入对应客户", async ({ page }) => {
    await page.goto("/crm")
    await waitForCrm(page)
    await page.waitForTimeout(900)

    await page.getByTestId("live-data-layer").locator("li button").first().click()
    await page.waitForURL(/\/crm\/customers\/c-/)
    await expect(page.getByTestId("detail-timeline")).toBeVisible()
  })
})

test.describe("Command Center", () => {
  test("分组、记录检索与高亮都是真实的", async ({ page }) => {
    await page.goto("/crm")
    await waitForCrm(page)

    await page.keyboard.press("ControlOrMeta+k")
    const palette = page.getByTestId("command-palette")
    await expect(palette).toBeVisible()

    await page.getByPlaceholder("输入命令或搜索…").fill("云启")
    const record = page.getByTestId("palette-customer-c-004")
    await expect(record).toBeVisible()
    // 结果直接浮现关键数据，而不是只给一个名字。
    await expect(record).toContainText("云启医疗")
    await expect(record).toContainText("合作中")

    await record.click()
    await page.waitForURL(/\/crm\/customers\/c-004/)
    await expect(page.getByTestId("detail-timeline")).toBeVisible()
  })

  test("AI 命令真的执行：生成摘要 / 风险客户 / 定位洞察", async ({ page }) => {
    await page.goto("/crm")
    await waitForCrm(page)

    // 生成销售摘要 —— 进入客户档案并立刻开始生成。
    await page.keyboard.press("ControlOrMeta+k")
    await page.getByTestId("palette-ai-summary").click()
    await page.waitForURL(/\/crm\/customers\/c-004/)
    const panel = page.getByTestId("ai-summary-page")
    await expect(panel.getByText(/置信度 \d+%/)).toBeVisible({ timeout: 15_000 })

    // 查看风险客户 —— 带筛选条件进入名册。
    await page.keyboard.press("ControlOrMeta+k")
    await page.getByRole("option", { name: /查看风险客户/ }).click()
    await page.waitForURL(/status=at-risk/)
    await expect(page.getByTestId("crm-filter-status")).toContainText("流失风险")

    // 定位智能洞察 —— 回到总览并停在洞察层。
    await page.keyboard.press("ControlOrMeta+k")
    await page.getByTestId("palette-ai-insight").click()
    await page.waitForURL(/\/crm$/)
    await waitForCrm(page)
    await expect(page.getByTestId("ai-insight")).toBeVisible()
  })
})

test.describe("侧栏智能中心", () => {
  test("三个入口各自抵达真实结果", async ({ page }) => {
    await page.goto("/crm")
    await waitForCrm(page)

    // 销售洞察 → 聚焦洞察层（同页滚动，不换页）。
    await page.getByTestId("nav-insights").click()
    await page.waitForURL(/\/crm$/)
    await expect(page.getByTestId("ai-insight")).toBeVisible()

    // 风险预警 → 已筛选的名册。
    await page.getByTestId("nav-risks").click()
    await page.waitForURL(/\/crm\/customers\?status=at-risk$/)
    await waitForCrm(page)
    await expect(page.getByTestId("crm-filter-status")).toContainText("流失风险")
    await expect(page.getByTestId("crm-pagination")).toContainText("共 3 条")

    // AI 助手 → AI 模式的命令面板。
    await page.getByTestId("nav-assistant").click()
    await expect(page.getByTestId("command-palette-ai")).toBeVisible()
    await expect(page.getByPlaceholder("向 AI 提问，或搜索客户…")).toBeVisible()
  })

  test("机会是一个真实路由", async ({ page }) => {
    await page.goto("/crm")
    await waitForCrm(page)

    await page.getByTestId("nav-opportunities").click()
    await page.waitForURL("**/crm/opportunities")
    await expect(page.getByTestId("opportunity-table")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toContainText("机会")

    // 检索与筛选真实生效。
    await page.getByTestId("opportunity-search").fill("云翼")
    await expect(page.getByTestId("opportunity-table").locator("tbody tr")).toHaveCount(1)
    await page.getByRole("button", { name: "重置筛选" }).click()
    await expect(page.getByTestId("opportunity-table").locator("tbody tr")).toHaveCount(8)

    await page.getByTestId("opportunity-table").locator("tbody tr").first().click()
    await page.waitForURL(/\/crm\/customers\/c-/)
    await expect(page.getByTestId("detail-timeline")).toBeVisible()
  })
})

test.describe("移动端（390×844）", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("抽屉里的智能中心与机会都可用", async ({ page }) => {
    await page.goto("/crm")
    await waitForCrm(page)
    await page.waitForTimeout(900)

    // Hero 的读数面板在窄屏下同样存在。
    await expect(page.getByTestId("hero-readout")).toBeVisible()

    await page.getByTestId("mobile-nav").click()
    const drawer = page.getByRole("dialog")
    await drawer.getByTestId("nav-opportunities").click()
    await page.waitForURL("**/crm/opportunities")
    await expect(page.getByTestId("opportunity-table")).toBeVisible()

    await page.getByTestId("mobile-nav").click()
    await page.getByRole("dialog").getByTestId("nav-risks").click()
    await page.waitForURL(/status=at-risk/)
    await waitForCrm(page)
    await expect(page.getByTestId("crm-filter-status")).toContainText("流失风险")
  })
})
