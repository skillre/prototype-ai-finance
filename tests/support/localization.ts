import { expect, type Page } from "@playwright/test"

/**
 * 英文泄漏审查的统一规则。
 *
 * 允许列表**只在这里维护一份**——各个 spec 里不再出现任何例外，
 * 这样新增页面时只需要问一个问题：这段西文属于下面哪一类？
 *
 * 判定顺序：
 *   1. 文本含中文 → 已本地化（中英混排的技术名词也算）。
 *   2. 不到 3 个连续字母 → 不是文案（金额、百分比、快捷键符号）。
 *   3. 命中 ALLOWED_ENGLISH 任一条 → 属于允许类别。
 *   4. 其余一律视为漏翻。
 */
export const ALLOWED_ENGLISH: RegExp[] = [
  /** 纯数字 / 金额 / 日期 / 百分比。 */
  /^[\d\s.,:%¥$+\-–—/()]+$/,
  /** 键盘快捷键：⌘K、⌘K →、Ctrl+K… */
  /^[⌘⇧⌥⌃A-Za-z0-9+→↑↓←\s]{1,12}$/,
  /** 凭证号 / 发票号 / 账单号——财务记录编号，不是界面文案。 */
  /^(INV|BILL|SK|PZ|DB)-[0-9A-Za-z-]+$/,
  /** 邮箱地址——记录内容。 */
  /@/,
  /** URL 与路由。 */
  /^https?:\/\//,
  /^\/[a-z][a-z0-9/_.-]*$/,
  /** 日期与 ISO 时间戳。 */
  /^\d{4}-\d{2}-\d{2}/,
  /** 记账月份：2026-09。 */
  /^\d{4}-\d{2}$/,
  /** HTTP 方法与请求信息（错误态会展示它）。 */
  /^(GET|POST|PUT|PATCH|DELETE)\s/,
  /** 技术栈名称（明确允许的专有名词）。 */
  /^(Next\.js|Tailwind|shadcn|Motion|Zustand|Recharts|Playwright|Base UI|pnpm|npm|Node)\b/,
  /** 供应商产品名——账本里的专有名词（与客户名、银行名同类）。 */
  /^(GitHub Enterprise|Figma|Datadog|JetBrains|Atlassian|Sentry|Notion|Jira|Confluence)\b/,
  /^(AGENTS\.md|CLAUDE\.md|README\.md|SKILL\.md)\b/,
  /^(lint|typecheck|build|dev|check)$/,
  /** 服务标识符——代码标识符，不是文案。 */
  /^(zhiwu-copilot-v2|api\.[a-z0-9.-]+)$/,
]

/** 需要做「零英文」检查的页面：落地页与财务工作台全部路由。 */
export const LOCALIZED_ROUTES = [
  "/",
  "/finance",
  "/finance/cashflow",
  "/finance/analysis",
  "/finance/budget",
  "/finance/insights",
  "/finance/risks",
  "/finance/transactions",
] as const

/**
 * 采集当前视口内所有可见文本节点。
 * 跳过：屏幕阅读器专用文字、脚本/样式、以及 <code>/<pre> 里的代码。
 */
export async function collectVisibleText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let node: Node | null
    while ((node = walker.nextNode())) {
      const text = (node.textContent ?? "").trim()
      if (!text || text.length > 120) continue
      const parent = node.parentElement
      if (!parent) continue
      if (parent.closest("[aria-hidden='true'], .sr-only, script, style, code, pre")) continue
      const style = getComputedStyle(parent)
      if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") continue
      found.push(text)
    }
    return found
  })
}

/** 在采集结果里找出不属于允许类别的西文片段。 */
export function findUntranslated(texts: string[]): string[] {
  return texts.filter((text) => {
    // 含中文 → 已本地化（中英混排的品牌名、技术名词也归此类）。
    if (/[\u4e00-\u9fff]/.test(text)) return false
    // 不含连续 3 个以上字母 → 不是文案。
    if (!/[A-Za-z]{3,}/.test(text)) return false
    return !ALLOWED_ENGLISH.some((rule) => rule.test(text))
  })
}

/** 断言当前页面没有未本地化的界面文案。 */
export async function expectFullyLocalized(page: Page, label = ""): Promise<void> {
  await page.waitForTimeout(320)
  const unlocalized = findUntranslated(await collectVisibleText(page))
  expect(unlocalized, `${label} 出现未本地化的西文文案`).toEqual([])
}

/** 打开一个财务路由，并等待账本就绪（模拟加载完成）。 */
export async function openLedger(page: Page, route = "/finance"): Promise<void> {
  await page.goto(route)
  await expect(page.getByTestId("finance-content")).toBeVisible({ timeout: 20_000 })
}
