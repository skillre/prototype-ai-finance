import { test, expect, type Page } from "@playwright/test"

/**
 * 智悟云 CRM 端到端覆盖。
 *
 * 选择器策略与既有 spec 一致：优先 role + accessible name，其次 label，
 * 最后才用 data-testid。不使用 nth() 与脆弱的 CSS 选择器。
 *
 * 界面语言为 zh-CN（见 lib/i18n/zh-CN.ts），因此断言使用中文文案。
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/crm")
  // 等待模拟的初始加载（骨架屏 → 就绪）。
  await expect(page.getByTestId("crm-content")).toBeVisible({ timeout: 20_000 })
})

/** 收集控制台错误，断言页面无运行时异常。 */
function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(error.message))
  return errors
}

test("dashboard renders KPIs, charts and live sections", async ({ page }) => {
  const errors = trackConsoleErrors(page)

  await expect(page.getByTestId("crm-root")).toBeVisible()
  await expect(page.getByText("客户总数")).toBeVisible()
  await expect(page.getByText("本月新增")).toBeVisible()
  await expect(page.getByText("进行中商机")).toBeVisible()
  await expect(page.getByText("合同总额")).toBeVisible()
  await expect(page.getByText("成交转化率")).toBeVisible()

  await expect(page.getByText("管道表现")).toBeVisible()
  await expect(page.getByText("阶段分布")).toBeVisible()
  await expect(page.getByText("最近动态")).toBeVisible()
  await expect(page.getByText("任务总览")).toBeVisible()
  await expect(page.getByText("高价值客户")).toBeVisible()

  // KPI 数字是真实派生值（22 位种子客户）。
  await expect(page.getByTestId("kpi-total-customers")).toContainText("22")
  // 金额使用人民币紧凑格式，且带千分位。
  await expect(page.getByTestId("kpi-revenue")).toContainText("¥2,006万")

  expect(errors).toEqual([])
})

test("navigates to Customers and paginates the table", async ({ page }) => {
  await page.getByTestId("nav-customers").click()

  const table = page.getByTestId("crm-table")
  await expect(table).toBeVisible()
  await expect(page.getByTestId("crm-pagination")).toContainText("第 1–8 条，共 22 条")

  await page.getByRole("button", { name: "第 2 页" }).click()
  await expect(page.getByTestId("crm-pagination")).toContainText("第 9–16 条，共 22 条")

  await page.getByRole("button", { name: "上一页" }).click()
  await expect(page.getByTestId("crm-pagination")).toContainText("第 1–8 条，共 22 条")
})

test("search filters rows and shows an empty state that recovers", async ({ page }) => {
  await page.getByTestId("nav-customers").click()
  const table = page.getByTestId("crm-table")
  await expect(table).toBeVisible()

  await page.getByTestId("crm-search").fill("北辰物流")
  await expect(page.getByTestId("crm-pagination")).toContainText("共 1 条")

  await page.getByTestId("crm-search").fill("zzz-no-such-customer")
  await expect(page.getByText("没有匹配的客户")).toBeVisible()

  // 空状态必须提供真实的出路。
  await page.getByRole("button", { name: "清除筛选" }).click()
  await expect(page.getByTestId("crm-pagination")).toContainText("第 1–8 条，共 22 条")
})

test("status and owner filters narrow the table", async ({ page }) => {
  await page.getByTestId("nav-customers").click()
  await expect(page.getByTestId("crm-table")).toBeVisible()

  await page.getByTestId("crm-filter-status").click()
  await page.getByRole("option", { name: "合作中" }).click()
  await expect(page.getByTestId("crm-pagination")).toContainText("共 9 条")

  await page.getByTestId("crm-filter-owner").click()
  await page.getByRole("option", { name: "陈美雅" }).click()
  await expect(page.getByTestId("crm-pagination")).not.toContainText("共 9 条")

  await page.getByRole("button", { name: "重置筛选" }).click()
  await expect(page.getByTestId("crm-pagination")).toContainText("第 1–8 条，共 22 条")
})

test("sorts the table by deal value", async ({ page }) => {
  await page.getByTestId("nav-customers").click()
  await expect(page.getByTestId("crm-table")).toBeVisible()

  await page.getByRole("button", { name: "按合同金额排序" }).click()
  // 升序：最低金额（已流失 = 0）出现在第一行。
  await expect(page.getByTestId("crm-table").locator("tbody tr").first()).toContainText("—")

  await page.getByRole("button", { name: "按合同金额排序" }).click()
  // 降序：最高金额出现在第一行。
  await expect(page.getByTestId("crm-table").locator("tbody tr").first()).toContainText("¥2,100,000")
})

test("adds a customer, updates the table, KPIs and activity feed", async ({ page }) => {
  const errors = trackConsoleErrors(page)

  await page.getByTestId("nav-customers").click()
  await expect(page.getByTestId("crm-pagination")).toContainText("共 22 条")

  await page.getByTestId("add-customer").click()
  const dialog = page.getByTestId("add-customer-dialog")
  await expect(dialog).toBeVisible()

  await page.getByTestId("add-customer-name").fill("陆遥")
  await page.getByTestId("add-customer-company").fill("星野智能")
  await page.getByTestId("add-customer-email").fill("luyao@xingye-ai.cn")
  await page.getByTestId("add-customer-phone").fill("+86 139 0000 1234")
  await page.getByTestId("add-customer-value").fill("880000")
  await page.getByTestId("add-customer-submit").click()

  await expect(dialog).not.toBeVisible()
  await expect(page.getByText("已添加「星野智能」")).toBeVisible()

  // 表格真实增加一条记录。
  await expect(page.getByTestId("crm-pagination")).toContainText("共 23 条")
  await expect(page.getByTestId("crm-table")).toContainText("星野智能")

  // 新建后详情抽屉可打开查看新客户。
  const drawer = page.getByTestId("customer-drawer")
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText("陆遥")).toBeVisible()

  await drawer.getByRole("button", { name: "关闭" }).click()
  await expect(drawer).not.toBeVisible()

  // KPI 真实联动。
  await page.getByTestId("nav-dashboard").click()
  await expect(page.getByTestId("kpi-total-customers")).toContainText("23")

  // 新客户写入活动流，并排在最前。
  await page.getByTestId("nav-activities").click()
  await expect(page.getByTestId("activity-timeline").locator("li").first()).toContainText("星野智能")

  expect(errors).toEqual([])
})

test("validates the add customer form", async ({ page }) => {
  await page.getByTestId("nav-customers").click()
  await page.getByTestId("add-customer").click()
  await expect(page.getByTestId("add-customer-dialog")).toBeVisible()

  // 空表单直接提交 → 出现校验错误，且记录不会被创建。
  await page.getByTestId("add-customer-submit").click()
  await expect(page.getByRole("alert").first()).toBeVisible()
  await expect(page.getByTestId("add-customer-dialog")).toBeVisible()

  await page.getByTestId("add-customer-name").fill("格式测试")
  await page.getByTestId("add-customer-company").fill("测试数据有限公司")
  await page.getByTestId("add-customer-email").fill("not-an-email")
  await page.getByTestId("add-customer-phone").fill("+86 138 0000 0000")
  await page.getByTestId("add-customer-submit").click()
  await expect(page.getByText("请输入有效的邮箱地址。")).toBeVisible()
  await expect(page.getByTestId("add-customer-dialog")).toBeVisible()
})

test("opens the customer detail drawer with record data", async ({ page }) => {
  await page.getByTestId("nav-customers").click()
  await expect(page.getByTestId("crm-table")).toBeVisible()

  // 默认按创建时间倒序，先用搜索定位到目标记录。
  await page.getByTestId("crm-search").fill("云启医疗")
  await expect(page.getByTestId("crm-pagination")).toContainText("共 1 条")
  await page.getByTestId("crm-table").getByText("云启医疗").click()

  const drawer = page.getByTestId("customer-drawer")
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText("周宁")).toBeVisible()
  await expect(drawer.getByText("zhouning@yunqi-med.cn")).toBeVisible()
  await expect(drawer.getByText("+86 137 6699 3388")).toBeVisible()
  await expect(drawer.getByText("首席信息官")).toBeVisible()
  await expect(drawer.getByText("等保三级", { exact: true })).toBeVisible()
  await expect(drawer.getByText("活动时间线")).toBeVisible()
  await expect(drawer.getByRole("button", { name: "复制邮箱" })).toBeVisible()

  await drawer.getByRole("button", { name: "关闭" }).click()
  await expect(drawer).not.toBeVisible()
})

test("generates an AI summary with a loading state, then regenerates", async ({ page }) => {
  await page.getByTestId("nav-customers").click()
  await page.getByTestId("crm-search").fill("云启医疗")
  await expect(page.getByTestId("crm-pagination")).toContainText("共 1 条")
  await page.getByTestId("crm-table").getByText("云启医疗").click()

  const panel = page.getByTestId("ai-summary")
  await expect(panel).toBeVisible()

  // 初始为 idle，只有一个生成入口。
  await panel.getByTestId("ai-summary-generate").click()

  // loading：出现 status 区域的骨架屏。
  await expect(panel.getByRole("status")).toBeVisible()

  // 结果淡入并包含确定性内容。
  await expect(panel.getByText(/健康的旗舰版客户/)).toBeVisible({
    timeout: 10_000,
  })
  await expect(panel.getByText("建议的下一步")).toBeVisible()
  await expect(panel.getByText(/置信度 \d+%/)).toBeVisible()

  // 可重新生成。
  await panel.getByTestId("ai-summary-regenerate").click()
  await expect(panel.getByRole("status")).toBeVisible()
  await expect(panel.getByText(/健康的旗舰版客户/)).toBeVisible({
    timeout: 10_000,
  })
})

test("command palette opens with ⌘K/Ctrl+K and runs real commands", async ({ page }) => {
  await page.keyboard.press("ControlOrMeta+K")

  const palette = page.getByTestId("command-palette")
  await expect(palette).toBeVisible()

  // 导航命令真实切换页面。
  await page.getByRole("option", { name: "前往任务" }).click()
  await expect(palette).not.toBeVisible()
  await expect(page.getByTestId("task-board")).toBeVisible()

  // 操作命令真实打开对话框。
  await page.keyboard.press("ControlOrMeta+K")
  await page.getByRole("option", { name: "添加客户" }).click()
  await expect(page.getByTestId("add-customer-dialog")).toBeVisible()
  await page.getByRole("button", { name: "取消" }).click()
  await expect(page.getByTestId("add-customer-dialog")).not.toBeVisible()

  // 主题命令真实切换 dark class。
  const html = page.locator("html")
  const wasDark = await html.evaluate((el) => el.classList.contains("dark"))
  await page.keyboard.press("ControlOrMeta+K")
  await page.getByRole("option", { name: "切换主题" }).click()
  await expect(html).toHaveClass(wasDark ? /^(?!.*dark).*$/ : /dark/)
})

test("switching pages via sidebar keeps navigation state", async ({ page }) => {
  await page.getByTestId("nav-activities").click()
  await expect(page.getByTestId("activity-timeline")).toBeVisible()
  await expect(page.getByText("活动时间线")).toBeVisible()

  await page.getByTestId("nav-tasks").click()
  await expect(page.getByTestId("task-board")).toBeVisible()
  await expect(page.getByRole("button", { name: "重置看板" })).toBeVisible()

  await page.getByTestId("nav-dashboard").click()
  await expect(page.getByText("管道表现")).toBeVisible()
})

test("drag and drop moves a task to another column and persists", async ({ page }) => {
  await page.getByTestId("nav-tasks").click()
  await expect(page.getByTestId("task-board")).toBeVisible()

  const followUp = page.getByTestId("task-column-follow-up")
  const proposal = page.getByTestId("task-column-proposal")

  await expect(followUp.locator("article")).toHaveCount(3)
  await expect(proposal.locator("article")).toHaveCount(2)

  const card = followUp.locator("article").first()
  const cardBox = await card.boundingBox()
  const targetBox = await proposal.boundingBox()
  if (!cardBox || !targetBox) throw new Error("task board columns are not rendered")

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 3)
  await page.mouse.down()
  await page.mouse.move(cardBox.x + cardBox.width / 2 + 30, cardBox.y + 40, { steps: 8 })
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 120, { steps: 20 })
  await page.mouse.up()

  // 顺序真实改变：源列 -1，目标列 +1。
  await expect(followUp.locator("article")).toHaveCount(2)
  await expect(proposal.locator("article")).toHaveCount(3)
  await expect(proposal).toContainText("重新破冰新任 IT 总监")

  // 重新挂载后仍然保留（写入的是 store，不是 DOM 顺序）。
  await page.getByTestId("nav-dashboard").click()
  await page.getByTestId("nav-tasks").click()
  await expect(page.getByTestId("task-column-proposal")).toContainText("重新破冰新任 IT 总监")
})

test("activities timeline renders every event type and filters", async ({ page }) => {
  await page.getByTestId("nav-activities").click()

  const timeline = page.getByTestId("activity-timeline")
  await expect(timeline).toBeVisible()
  await expect(timeline.locator("li")).toHaveCount(20)

  await page.getByTestId("activity-filter-kind").click()
  await page.getByRole("option", { name: "邮件" }).click()
  await expect(timeline.locator("li")).toHaveCount(4)

  await page.getByTestId("activity-filter-owner").click()
  await page.getByRole("option", { name: "陈美雅" }).click()
  await expect(timeline.locator("li")).toHaveCount(2)

  await page.getByRole("button", { name: "重置筛选" }).click()
  await expect(timeline.locator("li")).toHaveCount(20)
})

test.describe("mobile viewport (390×844)", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("renders the mobile shell and navigates via the drawer", async ({ page }) => {
    await expect(page.getByTestId("mobile-nav")).toBeVisible()
    await expect(page.locator("aside")).toBeHidden()
    await expect(page.getByTestId("crm-content")).toBeVisible()

    // 移动端导航抽屉可用。
    await page.getByTestId("mobile-nav").click()
    const navDrawer = page.getByRole("dialog")
    await expect(navDrawer.getByTestId("nav-customers")).toBeVisible()
    await navDrawer.getByTestId("nav-customers").click()

    // 客户页在移动端完整可用：表格、搜索、筛选、添加都在。
    await expect(page.getByTestId("crm-table")).toBeVisible()
    await expect(page.getByTestId("crm-search")).toBeVisible()
    await expect(page.getByTestId("crm-filter-status")).toBeVisible()
    await expect(page.getByTestId("add-customer")).toBeVisible()
  })

  test("completes the mobile customer flow: search, drawer, AI summary", async ({ page }) => {
    await page.getByTestId("mobile-nav").click()
    await page.getByRole("dialog").getByTestId("nav-customers").click()
    await expect(page.getByTestId("crm-table")).toBeVisible()

    await page.getByTestId("crm-search").fill("星河科技")
    await expect(page.getByTestId("crm-pagination")).toContainText("共 1 条")

    await page.getByTestId("crm-table").locator("tbody tr").click()
    const drawer = page.getByTestId("customer-drawer")
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText("李然")).toBeVisible()

    // 抽屉在移动端适配屏幕宽度，AI 摘要流程可用。
    const box = await drawer.boundingBox()
    expect(box?.width).toBeGreaterThan(300)

    await drawer.getByTestId("ai-summary-generate").click()
    await expect(drawer.getByRole("status")).toBeVisible()
    await expect(drawer.getByText(/规模版试用期/)).toBeVisible({
      timeout: 10_000,
    })

    await drawer.getByRole("button", { name: "关闭" }).click()
    await expect(drawer).not.toBeVisible()
  })

  test("adds a customer from the mobile viewport", async ({ page }) => {
    await page.getByTestId("mobile-nav").click()
    await page.getByRole("dialog").getByTestId("nav-customers").click()

    await page.getByTestId("add-customer").click()
    const dialog = page.getByTestId("add-customer-dialog")
    await expect(dialog).toBeVisible()

    await page.getByTestId("add-customer-name").fill("钱多多")
    await page.getByTestId("add-customer-company").fill("口袋实验室")
    await page.getByTestId("add-customer-email").fill("qianduoduo@koudai-lab.cn")
    await page.getByTestId("add-customer-phone").fill("+86 137 0000 0000")
    await page.getByTestId("add-customer-submit").click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByTestId("crm-pagination")).toContainText("共 23 条")
  })

  test("command palette works on mobile", async ({ page }) => {
    await page.getByTestId("mobile-nav").click()
    await page.getByRole("dialog").getByTestId("nav-tasks").click()
    await expect(page.getByTestId("task-board")).toBeVisible()

    await page.getByRole("button", { name: "打开命令面板" }).click()
    await expect(page.getByTestId("command-palette")).toBeVisible()
    await page.getByRole("option", { name: "前往总览" }).click()
    await expect(page.getByText("管道表现")).toBeVisible()
  })
})
