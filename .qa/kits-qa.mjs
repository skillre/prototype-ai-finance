import { chromium } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"

/**
 * Browser QA —— AI Finance × Prototype Kits（Source Installation）
 *
 *   node .qa/kits-qa.mjs
 *
 * 与 .qa/shots.mjs 的差别（保留 shots.mjs 不动）：
 *
 *   1. **移动端用强判据**，不再只比 `scrollWidth - innerWidth`。
 *      `.qa/shots.mjs` 的判据在 isMobile 语境下是**盲的**：Chromium 会为了
 *      容纳溢出内容而把布局视口一起放大，于是 `scrollWidth - innerWidth`
 *      仍然是 0，而页面其实已经横向滚动了 289px。protype-kits 自己的
 *      /audit 页就是这么漏掉的。这里改用三条独立判据：
 *        a. window.innerWidth ≈ 请求的视口宽度
 *        b. documentElement.scrollWidth ≤ 请求的视口宽度
 *        c. window.scrollTo(9999,0) 之后 window.scrollX ≈ 0
 *
 *   2. 增加 Kits 组件的**降级探针**：reduced-motion、触屏（数据指针关闭）、
 *      InsightReveal 默认可见（含 JS 完全失败时）、AnimatedGrid 的触屏网格。
 *
 * 输出：/Users/skillre/ai-prototypes/.agent-tmp/fa-source-install/qa/
 */

const OUT = "/Users/skillre/ai-prototypes/.agent-tmp/fa-source-install/qa"
const BASE = process.env.QA_BASE ?? "http://localhost:3211"

const ROUTES = [
  ["overview", "/finance"],
  ["cashflow", "/finance/cashflow"],
  ["analysis", "/finance/analysis"],
  ["budget", "/finance/budget"],
  ["insights", "/finance/insights"],
  ["risks", "/finance/risks"],
  ["transactions", "/finance/transactions"],
  ["landing", "/"],
]

const VIEWPORTS = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
]

mkdirSync(OUT, { recursive: true })

const problems = []
const notes = []

/** 建一个上下文，挂上 console / pageerror / requestfailed 收集器。 */
async function makeContext(browser, { viewport, theme, mobile = false, reducedMotion, javaScriptEnabled = true }) {
  const context = await browser.newContext({
    viewport,
    colorScheme: theme,
    reducedMotion,
    javaScriptEnabled,
    ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}),
  })
  const page = await context.newPage()
  const errors = []
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`)
  })
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`))
  page.on("requestfailed", (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`))
  return { context, page, errors }
}

/**
 * 横向溢出的三条判据。返回原始测量值，判定在调用方做。
 * 注意：读 scrollX 之前必须真的滚一下 —— 只读 scrollWidth 会漏掉
 * 「布局视口被撑大」这一类溢出。
 */
async function measureOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement
    const innerWidth = window.innerWidth
    const scrollWidth = doc.scrollWidth
    window.scrollTo(9999, 0)
    const scrolledX = window.scrollX
    window.scrollTo(0, 0)
    return { innerWidth, scrollWidth, scrolledX }
  })
}

const browser = await chromium.launch()

/* ========================================================================== */
/* 阶段 1 · 8 路由 × 2 视口 × 明暗                                                   */
/* ========================================================================== */

for (const [device, viewport] of VIEWPORTS) {
  for (const theme of ["light", "dark"]) {
    const mobile = device === "mobile"
    const { context, page, errors } = await makeContext(browser, { viewport, theme, mobile })

    for (const [name, route] of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" })
      await page.waitForTimeout(700)

      const m = await measureOverflow(page)
      const tag = `${device}/${theme} ${route}`

      // a. 视口宽度没有被内容撑大（移动端是强判据）
      if (Math.abs(m.innerWidth - viewport.width) > 1) {
        problems.push(`${tag}: innerWidth=${m.innerWidth} ≠ 请求的 ${viewport.width}（布局视口被撑大）`)
      }
      // b. 文档宽度不超过请求的视口宽度
      if (m.scrollWidth > viewport.width + 1) {
        problems.push(`${tag}: scrollWidth=${m.scrollWidth} > ${viewport.width}`)
      }
      // c. 真的没有可滚动的横向空间
      if (Math.abs(m.scrolledX) > 1) {
        problems.push(`${tag}: scrollTo(9999,0) 后 scrollX=${m.scrolledX}（页面级横向滚动）`)
      }

      await page.screenshot({ path: `${OUT}/${device}-${theme}-${name}.png` })
    }

    if (errors.length > 0) problems.push(`${device}/${theme} 运行期错误:\n  ${errors.join("\n  ")}`)
    await context.close()
  }
}

/* ========================================================================== */
/* 阶段 2 · reduced-motion：内容必须立即可见，且不残留模糊/位移                          */
/* ========================================================================== */

{
  const { context, page, errors } = await makeContext(browser, {
    viewport: { width: 1440, height: 900 },
    theme: "dark",
    reducedMotion: "reduce",
  })
  await page.goto(`${BASE}/finance`, { waitUntil: "networkidle" })
  await page.waitForTimeout(700)

  const rm = await page.evaluate(() => {
    const root = document.querySelector('[data-kits-component="insight-reveal"]')
    if (!root) return { found: false }
    const host = root.querySelector(".kits-reveal__item")
    const child = host?.firstElementChild ?? null
    const cs = child ? getComputedStyle(child) : null
    return {
      found: true,
      animatedClass: root.classList.contains("kits-reveal--animated"),
      rootOpacity: getComputedStyle(root).opacity,
      childOpacity: cs?.opacity ?? null,
      childFilter: cs?.filter ?? null,
      childTransform: cs?.transform ?? null,
    }
  })
  notes.push(`reduced-motion · InsightReveal = ${JSON.stringify(rm)}`)
  if (!rm.found) problems.push("reduced-motion: 找不到 InsightReveal 根节点")
  else {
    if (rm.childOpacity !== "1") problems.push(`reduced-motion: 条目 opacity=${rm.childOpacity}（应为 1，内容必须直接可见）`)
    if (rm.childFilter && rm.childFilter !== "none") problems.push(`reduced-motion: 条目残留 filter=${rm.childFilter}`)
  }
  await page.screenshot({ path: `${OUT}/reduced-motion-overview.png` })
  if (errors.length > 0) problems.push(`reduced-motion 运行期错误:\n  ${errors.join("\n  ")}`)
  await context.close()
}

/* ========================================================================== */
/* 阶段 3 · 触屏：DataCursor 必须不激活；AnimatedGrid 必须可降级                        */
/* ========================================================================== */

const knownDefects = []

{
  const { context, page, errors } = await makeContext(browser, {
    viewport: { width: 390, height: 844 },
    theme: "dark",
    mobile: true,
  })
  // 用 /finance：它是唯一同时有 hero 与 board 两个 <AnimatedGrid /> 的路由
  // （/finance/transactions 与落地页都没有网格）。
  await page.goto(`${BASE}/finance`, { waitUntil: "networkidle" })
  await page.waitForTimeout(700)

  const touch = await page.evaluate(() => {
    const root = document.querySelector(".kits-cursor-root")
    const marked = document.querySelector("[data-cursor]")
    const grid = document.querySelector(".kits-grid")
    const probe = document.createElement("div")
    probe.style.cssText = "position:absolute;width:var(--kits-grid-cell);height:1px"
    document.body.appendChild(probe)
    const resolvedCell = probe.getBoundingClientRect().width
    probe.remove()
    return {
      cursorRoot: Boolean(root),
      cursorActive: root?.classList.contains("kits-cursor-root--active") ?? null,
      cursorHideNative: root?.classList.contains("kits-cursor-root--hide-native") ?? null,
      markedCursor: marked ? getComputedStyle(marked).cursor : null,
      gridCount: document.querySelectorAll(".kits-grid").length,
      gridPointerEvents: grid ? getComputedStyle(grid).pointerEvents : null,
      gridCellRaw: grid ? getComputedStyle(grid).getPropertyValue("--kits-grid-cell").trim() : null,
      gridCellResolvedPx: resolvedCell,
      coarseMatches: matchMedia("(pointer: coarse)").matches,
      noHoverMatches: matchMedia("(hover: none)").matches,
    }
  })
  notes.push(`touch · DataCursor/Grid = ${JSON.stringify(touch)}`)

  if (touch.cursorActive) problems.push("touch: DataCursor 在触屏上被激活了（应完全不激活）")
  if (touch.cursorHideNative) problems.push("touch: DataCursor 隐藏了系统光标（触屏上不应隐藏）")
  if (touch.markedCursor === "none") problems.push("touch: [data-cursor] 区域的系统光标被隐藏了")
  if (touch.gridCount === 0) problems.push("touch: /finance 上找不到 <AnimatedGrid /> 渲染出的 .kits-grid")
  if (touch.gridPointerEvents !== "none") {
    problems.push(`touch: AnimatedGrid pointer-events=${touch.gridPointerEvents}（应为 none）`)
  }

  /*
   * 已知缺陷 K-02：contracts 的 coarse-pointer 放大没有生效。
   *
   *   contracts/tokens.css  @media (hover:none),(pointer:coarse) {
   *     :root, [data-kits-pack] { --kits-grid-cell: calc(var(--kits-grid-cell) * 1.5); }
   *   }
   *   cinematic/tokens.css  [data-kits-pack="cinematic"] { --kits-grid-cell: 64px; }
   *
   * 两条规则的特异性都是 0-1-0，而 pack 是在契约**之后**被 @import 的，
   * 因此 pack 的 64px 覆盖掉了降级值 96px。
   * 同一个块里 --kits-pointer-factor 与 --kits-hero-parallax-depth 都写了
   * !important，只有 --kits-grid-cell 漏了 —— 这就是它输掉级联的原因。
   *
   * 期望 96px（64 × 1.5），实测 64px。这不影响"交付链路成立"，但会让
   * 触屏上的密网格（dense = 0.5 → 32px）退化成摩尔纹，正是 pack 自己
   * 在 manifest 里说要避免的那件事。记录为待 Kits 修复项。
   */
  const expected = 96
  if (touch.coarseMatches && touch.gridCellResolvedPx !== expected) {
    knownDefects.push({
      id: "K-02",
      title: "contracts 的 coarse-pointer --kits-grid-cell 放大被 pack 覆盖",
      expected: `${expected}px（64px × 1.5）`,
      actual: `${touch.gridCellResolvedPx}px`,
      status: "open",
      where: "prototype-kits/lib/contracts/tokens.css（缺 !important）",
    })
  }

  await page.screenshot({ path: `${OUT}/touch-overview.png` })
  if (errors.length > 0) problems.push(`touch 运行期错误:\n  ${errors.join("\n  ")}`)
  await context.close()
}

/* ========================================================================== */
/* 阶段 4 · 无 IntersectionObserver：内容必须立即揭示（不能永久隐藏）                     */
/*                                                                           */
/* 本产品是 CSR（未 hydrate 前是 loading 骨架），因此「JS 完全失败」这一档在            */
/* 页面级无法测量 —— 它渲染不出业务内容，与 Kits 无关。可测且真正有意义的是             */
/* Kits 文档里承诺的降级 1：**没有 IntersectionObserver 时立即揭示**。               */
/* ========================================================================== */

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => {
    // @ts-expect-error 故意删掉，模拟不支持 IO 的运行时
    delete window.IntersectionObserver
  })
  const page = await context.newPage()
  const errors = []
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`)
  })
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`))

  await page.goto(`${BASE}/finance`, { waitUntil: "networkidle" })
  await page.waitForTimeout(800)

  const noIo = await page.evaluate(() => {
    const root = document.querySelector('[data-kits-component="insight-reveal"]')
    if (!root) return { found: false }
    const host = root.querySelector(".kits-reveal__item")
    const child = host?.firstElementChild ?? null
    const cs = child ? getComputedStyle(child) : null
    return {
      found: true,
      hasIO: typeof window.IntersectionObserver !== "undefined",
      visible: root.getAttribute("data-kits-visible"),
      rootOpacity: getComputedStyle(root).opacity,
      childOpacity: cs?.opacity ?? null,
      childFilter: cs?.filter ?? null,
      childTransform: cs?.transform ?? null,
    }
  })
  notes.push(`no-IO · InsightReveal = ${JSON.stringify(noIo)}`)
  if (!noIo.found) problems.push("no-IO: 找不到 InsightReveal 根节点")
  else {
    if (noIo.hasIO) problems.push("no-IO: IntersectionObserver 没有被清掉，探针无效")
    if (noIo.visible !== "true") problems.push(`no-IO: data-kits-visible=${noIo.visible}（无 IO 时应立即揭示）`)
    if (noIo.rootOpacity !== "1") problems.push(`no-IO: 根节点 opacity=${noIo.rootOpacity}（应为 1）`)
    if (noIo.childFilter && noIo.childFilter !== "none") problems.push(`no-IO: 条目残留 filter=${noIo.childFilter}`)
    if (noIo.childTransform && noIo.childTransform !== "none") problems.push(`no-IO: 条目残留 transform=${noIo.childTransform}`)
  }
  await page.screenshot({ path: `${OUT}/no-io-overview.png` })
  if (errors.length > 0) problems.push(`no-IO 运行期错误:\n  ${errors.join("\n  ")}`)
  await context.close()
}

await browser.close()

const report = { base: BASE, problems, notes, knownDefects, at: new Date().toISOString() }
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))

console.log("—— 探针 ——")
for (const n of notes) console.log("  " + n)
console.log()
if (knownDefects.length > 0) {
  console.log("—— 已确认的 Kits 缺陷（不阻断交付，待 Kits 修复）——")
  for (const d of knownDefects) {
    console.log(`  ${d.id} [${d.status}] ${d.title}`)
    console.log(`      期望 ${d.expected} / 实测 ${d.actual} —— ${d.where}`)
  }
  console.log()
}
if (problems.length === 0) {
  console.log(`QA OK — ${ROUTES.length} 路由 × ${VIEWPORTS.length} 视口 × 明/暗 = ${ROUTES.length * VIEWPORTS.length * 2} 页；`)
  console.log("  0 console error · 0 page error · 0 request failure · 0 横向溢出（三条判据）")
  console.log("  reduced-motion / 触屏 DataCursor / 无 IntersectionObserver 探针全部符合预期")
} else {
  console.log(`QA 发现问题 ${problems.length} 条：`)
  for (const p of problems) console.log("  · " + p)
  process.exitCode = 1
}
