import { test, expect, type Page } from "@playwright/test"

/**
 * Route / Interaction Integrity —— 可点击入口的「没有死路」保证。
 *
 * 目标：核心 UI 上任何可被理解为可操作的入口，都必须抵达一个真实存在、
 * 有内容的结果（页面 / 抽屉 / 对话框 / 真实状态变更），而不是 404 或空动作。
 *
 * 选择器策略：优先 role + accessible name，必要时 data-testid，不用 nth()。
 */

/** 记录页面访问期间出现过的 404/5xx 响应与运行时错误。 */
function trackFailures(page: Page) {
  const badResponses: string[] = []
  const runtimeErrors: string[] = []

  page.on("response", (response) => {
    const status = response.status()
    if (status >= 400) badResponses.push(`${status} ${new URL(response.url()).pathname}`)
  })
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    // 资源 404 也会以 console error 形式出现，统一收集后过滤掉预期内的用例。
    if (message.type() === "error") runtimeErrors.push(message.text())
  })

  return { badResponses, runtimeErrors }
}

/** 等到 CRM 数据就绪。 */
async function waitForCrm(page: Page) {
  await expect(page.getByTestId("crm-content")).toBeVisible({ timeout: 20_000 })
}

test.describe("every CRM route resolves", () => {
  const routes = [
    { path: "/", name: "landing", marker: "landing" },
    { path: "/crm", name: "dashboard", marker: "crm" },
    { path: "/crm/customers", name: "customers", marker: "crm" },
    { path: "/crm/tasks", name: "tasks", marker: "crm" },
    { path: "/crm/activities", name: "activities", marker: "crm" },
    { path: "/crm/customers/c-001", name: "customer detail", marker: "crm" },
    { path: "/demo", name: "starter demo", marker: "demo" },
  ] as const

  for (const route of routes) {
    test(`${route.name} (${route.path}) returns 200 and renders real content`, async ({
      page,
    }) => {
      const response = await page.goto(route.path)
      expect(response?.status()).toBe(200)

      if (route.marker === "crm") await waitForCrm(page)
      if (route.marker === "demo") {
        await expect(page.getByTestId("demo-content")).toBeVisible({ timeout: 20_000 })
      }

      // 每个页面都必须有真实的 H1，而不是空白壳。
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    })
  }
})

test.describe("clickable entries never lead to a dead end", () => {
  test("landing CTAs reach real destinations", async ({ page }) => {
    const { badResponses } = trackFailures(page)
    await page.goto("/")

    await page.getByRole("link", { name: "打开 AI CRM 原型" }).click()
    await page.waitForURL("**/crm")
    await waitForCrm(page)

    await page.goto("/")
    await page.getByRole("link", { name: "打开演示仪表盘" }).click()
    await page.waitForURL("**/demo")
    await expect(page.getByTestId("demo-content")).toBeVisible({ timeout: 20_000 })

    expect(badResponses).toEqual([])
  })

  test("sidebar navigation lands on four distinct real URLs", async ({ page }) => {
    const { badResponses } = trackFailures(page)
    await page.goto("/crm")
    await waitForCrm(page)

    const journeys = [
      { nav: "nav-customers", url: /\/crm\/customers$/, marker: "crm-table" },
      { nav: "nav-tasks", url: /\/crm\/tasks$/, marker: "task-board" },
      { nav: "nav-activities", url: /\/crm\/activities$/, marker: "activity-timeline" },
    ]

    for (const journey of journeys) {
      await page.getByTestId(journey.nav).click()
      await page.waitForURL(journey.url)
      await expect(page.getByTestId(journey.marker)).toBeVisible()
    }

    await page.getByTestId("nav-dashboard").click()
    await page.waitForURL(/\/crm$/)
    await expect(page.getByText("管道表现")).toBeVisible()

    expect(badResponses).toEqual([])
  })

  test("dashboard KPIs, activity rows, task rows and accounts all navigate", async ({ page }) => {
    const { badResponses } = trackFailures(page)
    await page.goto("/crm")
    await waitForCrm(page)
    await page.waitForTimeout(800)

    // KPI 下钻 —— 每个 KPI 都必须真的进入客户列表。
    await page.getByTestId("kpi-total-customers").click()
    await page.waitForURL("**/crm/customers")
    await expect(page.getByTestId("crm-table")).toBeVisible()

    // 深链接筛选必须生效。
    await page.goto("/crm/customers?status=active")
    await waitForCrm(page)
    await expect(page.getByTestId("crm-filter-status")).toContainText("合作中")

    // Recent activity 整行可点 —— 进入该客户记录页。
    await page.goto("/crm")
    await waitForCrm(page)
    await page.waitForTimeout(600)
    await page.getByRole("button", { name: /^打开「/ }).first().click()
    await page.waitForURL(/\/crm\/customers\/c-/)
    await expect(page.getByTestId("detail-timeline")).toBeVisible()

    // Tasks overview 行 —— 进入任务看板。
    await page.goto("/crm")
    await waitForCrm(page)
    await page.waitForTimeout(600)
    await page.getByRole("button", { name: /^在看板中打开/ }).first().click()
    await page.waitForURL("**/crm/tasks")
    await expect(page.getByTestId("task-board")).toBeVisible()

    // Highest-value accounts —— 进入客户记录页。
    await page.goto("/crm")
    await waitForCrm(page)
    await page.waitForTimeout(600)
    await page
      .getByRole("button", { name: /云启医疗/ })
      .first()
      .click()
    await page.waitForURL(/\/crm\/customers\/c-/)

    expect(badResponses).toEqual([])
  })

  test("customer list row opens a drawer whose CTA reaches the record page", async ({ page }) => {
    const { badResponses } = trackFailures(page)
    await page.goto("/crm/customers")
    await waitForCrm(page)

    await page.getByTestId("crm-table").locator("tbody tr").first().click()
    const drawer = page.getByTestId("customer-drawer")
    await expect(drawer).toBeVisible()

    await page.getByTestId("open-account").click()
    await page.waitForURL(/\/crm\/customers\/c-/)
    await expect(page.getByTestId("detail-timeline")).toBeVisible()
    // 抽屉必须关闭，否则会挡住它刚刚导航到的页面。
    await expect(drawer).not.toBeVisible()

    await page.getByTestId("back-to-customers").click()
    await page.waitForURL("**/crm/customers")
    await expect(page.getByTestId("crm-table")).toBeVisible()

    expect(badResponses).toEqual([])
  })

  test("every command palette entry performs a real action", async ({ page }) => {
    const { badResponses } = trackFailures(page)
    await page.goto("/crm")
    await waitForCrm(page)

    const navigations: [string, RegExp, string][] = [
      ["前往客户", /\/crm\/customers$/, "crm-table"],
      ["前往任务", /\/crm\/tasks$/, "task-board"],
      ["前往活动", /\/crm\/activities$/, "activity-timeline"],
      ["前往总览", /\/crm$/, "kpi-total-customers"],
    ]

    for (const [label, urlPattern, marker] of navigations) {
      await page.keyboard.press("ControlOrMeta+k")
      await expect(page.getByTestId("command-palette")).toBeVisible()
      await page.getByRole("option", { name: label }).click()
      await page.waitForURL(urlPattern)
      await expect(page.getByTestId(marker)).toBeVisible()
    }

    // Add Customer —— 打开真实对话框。
    await page.keyboard.press("ControlOrMeta+k")
    await page.getByRole("option", { name: "添加客户" }).click()
    await expect(page.getByTestId("add-customer-dialog")).toBeVisible()
    await page.getByRole("button", { name: "取消" }).click()

    // Toggle theme —— 真实切换 dark class。
    const html = page.locator("html")
    const before = await html.evaluate((el) => el.classList.contains("dark"))
    await page.keyboard.press("ControlOrMeta+k")
    await page.getByRole("option", { name: "切换主题" }).click()
    await expect(html).toHaveClass(before ? /^(?!.*dark).*$/ : /dark/)

    expect(badResponses).toEqual([])
  })

  test("top nav notifications, profile and sign-out are all real", async ({ page }) => {
    const { badResponses } = trackFailures(page)
    await page.goto("/crm")
    await waitForCrm(page)

    // 通知条目 -> 对应客户记录页。
    await page.getByTestId("notifications").click()
    await page.getByRole("menuitem").filter({ hasText: "试用即将到期" }).click()
    await page.waitForURL(/\/crm\/customers\/c-002/)
    await expect(page.getByTestId("detail-timeline")).toBeVisible()

    // 全部标为已读 —— 真实清空未读徽标。
    await page.getByTestId("notifications").click()
    await page.getByRole("menuitem", { name: "全部标为已读" }).click()
    await expect(page.getByTestId("notifications").locator("span").first()).toBeHidden()

    // Profile —— 打开真实资料对话框。
    await page.getByTestId("account-menu").click()
    await page.getByRole("menuitem", { name: "个人资料" }).click()
    const profile = page.getByTestId("profile-dialog")
    await expect(profile).toBeVisible()
    // 对话框同时有右上角关闭与底部关闭，这里点底部那个（DOM 顺序在前）。
    await profile.getByRole("button", { name: "关闭" }).first().click()
    await expect(profile).not.toBeVisible()

    // Sign out —— 打开确认对话框，确认后回到初始状态。
    await page.getByTestId("account-menu").click()
    await page.getByRole("menuitem", { name: "退出登录" }).click()
    const signOut = page.getByTestId("sign-out-dialog")
    await expect(signOut).toBeVisible()
    await signOut.getByTestId("sign-out-dialog-confirm").click()
    await expect(signOut).not.toBeVisible()

    // 重置后回到仪表盘，KPI 回到种子数据的 22。
    await page.goto("/crm")
    await waitForCrm(page)
    await expect(page.getByTestId("kpi-total-customers")).toContainText("22")

    expect(badResponses).toEqual([])
  })
})

test.describe("404 safety", () => {
  test("an unknown route shows a recoverable 404 page, not a dead end", async ({ page }) => {
    const response = await page.goto("/crm/this-page-does-not-exist")
    expect(response?.status()).toBe(404)

    await expect(page.getByTestId("app-not-found")).toBeVisible()
    // 恢复链接必须真实可用。
    await page.getByRole("link", { name: "客户", exact: true }).click()
    await page.waitForURL("**/crm/customers")
    await waitForCrm(page)
    await expect(page.getByTestId("crm-table")).toBeVisible()
  })

  test("an unknown top-level route is also recoverable", async ({ page }) => {
    const response = await page.goto("/totally-unknown")
    expect(response?.status()).toBe(404)
    await expect(page.getByTestId("app-not-found")).toBeVisible()
    await page.getByRole("link", { name: "AI CRM 总览" }).click()
    await page.waitForURL("**/crm")
    await waitForCrm(page)
  })

  test("an unknown customer id renders an in-page not-found with a way back", async ({ page }) => {
    const response = await page.goto("/crm/customers/c-does-not-exist")
    // 数据在客户端 store 中，因此页面本身可正常返回；关键是给出可恢复的界面。
    expect(response?.status()).toBe(200)

    await expect(page.getByTestId("customer-not-found")).toBeVisible({
      timeout: 20_000,
    })
    await page.getByRole("link", { name: "返回客户列表" }).click()
    await page.waitForURL("**/crm/customers")
    await expect(page.getByTestId("crm-table")).toBeVisible()
  })
})

test.describe("mobile navigation integrity (390×844)", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("every mobile nav destination resolves and the list flow works", async ({ page }) => {
    const { badResponses } = trackFailures(page)
    await page.goto("/crm")
    await waitForCrm(page)

    const journeys: [string, RegExp, string][] = [
      ["nav-customers", /\/crm\/customers$/, "crm-table"],
      ["nav-tasks", /\/crm\/tasks$/, "task-board"],
      ["nav-activities", /\/crm\/activities$/, "activity-timeline"],
      ["nav-dashboard", /\/crm$/, "kpi-total-customers"],
    ]

    for (const [id, urlPattern, marker] of journeys) {
      await page.getByTestId("mobile-nav").click()
      const navDrawer = page.getByRole("dialog")
      await expect(navDrawer).toBeVisible()
      await navDrawer.getByTestId(id).click()
      await page.waitForURL(urlPattern)
      await expect(page.getByTestId(marker)).toBeVisible()
    }

    // 移动端客户流程：筛选 -> 抽屉 -> 记录页。
    await page.getByTestId("mobile-nav").click()
    await page.getByRole("dialog").getByTestId("nav-customers").click()
    await expect(page.getByTestId("crm-table")).toBeVisible()
    await page.getByTestId("crm-search").fill("云启")
    await expect(page.getByTestId("crm-pagination")).toContainText("共 1 条")
    await page.getByTestId("crm-table").locator("tbody tr").click()
    await page.getByTestId("open-account").click()
    await page.waitForURL(/\/crm\/customers\/c-/)
    await expect(page.getByTestId("detail-timeline")).toBeVisible()

    expect(badResponses).toEqual([])
  })

  test("add customer works on mobile and lands on the new record", async ({ page }) => {
    await page.goto("/crm/customers")
    await waitForCrm(page)

    await page.getByTestId("add-customer").click()
    await page.getByTestId("add-customer-name").fill("移动端测试")
    await page.getByTestId("add-customer-company").fill("指南针移动")
    await page.getByTestId("add-customer-email").fill("tester@compassmobile.cn")
    await page.getByTestId("add-customer-phone").fill("+86 136 0000 0000")
    await page.getByTestId("add-customer-submit").click()

    // 回到列表 + 打开抽屉，新记录可见。
    await expect(page.getByTestId("crm-table")).toContainText("指南针移动")
    await expect(page.getByTestId("customer-drawer")).toBeVisible()

    await page.getByTestId("open-account").click()
    await page.waitForURL(/\/crm\/customers\/c-/)
    await expect(page.getByTestId("detail-timeline")).toBeVisible()
  })
})
