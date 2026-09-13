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
      gridAnimationName: grid ? getComputedStyle(grid).animationName : null,
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

  await page.screenshot({ path: `${OUT}/touch-overview.png` })
  if (errors.length > 0) problems.push(`touch 运行期错误:\n  ${errors.join("\n  ")}`)
  await context.close()
}

/* ========================================================================== */
/* 阶段 3b · K-02：细指针 vs 触屏的**有效**网格尺寸必须差 1.5 倍                     */
/*                                                                           */
/* 注意不能量 --kits-grid-cell —— v0.1.1 刻意把它拆成了两个不同归属的名字：          */
/*   pack 定 --kits-grid-cell 基准（永远 64px）                                 */
/*   契约定 --kits-grid-cell-scale（细指针 1 / 触屏 1.5）                        */
/*   组件把两者与密度相乘，得到 --kits-grid-cell-size（真正用出来的长度）            */
/*                                                                           */
/* 因此判据是**实测长度之比**：一个 probe 元素 width: var(--kits-grid-cell-size)， */
/* 取 getBoundingClientRect()。比 1.5 而不是比绝对值，这样与 pack、密度无关。        */
/* ========================================================================== */

{
  const measure = async (mobile, width, height) => {
    const { context, page } = await makeContext(browser, {
      viewport: { width, height },
      theme: "dark",
      mobile,
    })
    await page.goto(`${BASE}/finance`, { waitUntil: "networkidle" })
    await page.waitForTimeout(700)
    const r = await page.evaluate(() => {
      const g = document.querySelector(".kits-grid")
      if (!g) return null
      /*
       * probe 必须挂进 .kits-grid **内部**，不能挂到 body。
       *
       * --kits-grid-cell-size 是在 .kits-grid 自己身上声明的（它要同时乘上
       * 契约的 scale 与组件的 density），而自定义属性只在**声明它的元素及其
       * 后代**上可见。挂到 body 上时 var() 无法解析 → 量到 0px。
       *
       * 这个坑很隐蔽：0/0 = NaN，而 `Math.abs(NaN - 1.5) > 0.02` 是 false ——
       * 断言会**静默通过**。所以下面额外用 Number.isFinite 兜底。
       */
      const probe = document.createElement("div")
      probe.style.cssText = "position:absolute;width:var(--kits-grid-cell-size);height:1px"
      g.appendChild(probe)
      /*
       * 用 offsetWidth（布局像素），**不要**用 getBoundingClientRect()。
       *
       * .kits-grid 在 hero 里会被视差层包住，桌面端视差是激活的（触屏端
       * --kits-pointer-factor 归零 → 视差关闭）。有 transform 时 rect 返回的是
       * **视觉**尺寸：实测 fine 侧是 130.56px，而布局上其实是 128px
       * —— 1.02 倍正是那层视差缩放，于是比值算出来 1.47 而不是 1.5。
       * offsetWidth 不受 transform 影响，量的才是布局真的用了多少。
       */
      const effectivePx = probe.offsetWidth
      probe.remove()
      const cs = getComputedStyle(g)
      return {
        effectivePx,
        effectiveRaw: cs.getPropertyValue("--kits-grid-cell-size").trim().replace(/\s+/g, " "),
        base: cs.getPropertyValue("--kits-grid-cell").trim(),
        scale: cs.getPropertyValue("--kits-grid-cell-scale").trim(),
        animationName: cs.animationName,
        coarse: matchMedia("(pointer: coarse)").matches,
      }
    })
    await context.close()
    return r
  }

  const fine = await measure(false, 1440, 900)
  const coarse = await measure(true, 390, 844)

  notes.push(`K-02 · fine = ${JSON.stringify(fine)}`)
  notes.push(`K-02 · coarse = ${JSON.stringify(coarse)}`)

  if (!fine || !coarse) {
    problems.push("K-02: /finance 上找不到 .kits-grid，探针无效")
  } else if (!Number.isFinite(fine.effectivePx) || !Number.isFinite(coarse.effectivePx) || fine.effectivePx <= 0) {
    // 兜底：量到 0 或 NaN 时**必须报错**，绝不能让 0/0=NaN 把断言静默吞掉。
    problems.push(
      `K-02: 有效网格尺寸探针失效（fine=${fine.effectivePx}, coarse=${coarse.effectivePx}, raw=${fine.effectiveRaw}）—— 无法判定`,
    )
  } else {
    if (!coarse.coarse) problems.push("K-02: 触屏上下文里 (pointer: coarse) 没有匹配，探针无效")

    const ratio = coarse.effectivePx / fine.effectivePx
    notes.push(`K-02 · 有效网格尺寸 ${fine.effectivePx}px → ${coarse.effectivePx}px（×${ratio.toFixed(2)}，期望 ×1.5）`)
    notes.push(`K-02 · 算式 fine=${fine.effectiveRaw} | coarse=${coarse.effectiveRaw}`)

    if (Math.abs(ratio - 1.5) > 0.02) {
      problems.push(
        `K-02 回归失败: 触屏网格 ${coarse.effectivePx}px / 细指针 ${fine.effectivePx}px = ×${ratio.toFixed(2)}，应为 ×1.5`,
      )
    }
    // 基准本身**不应**被契约改动 —— 变的是 scale，不是 base。
    if (coarse.base !== fine.base) {
      problems.push(`K-02: --kits-grid-cell 基准在触屏下被改了（${fine.base} → ${coarse.base}），契约应答的是 scale`)
    }
    if (fine.scale !== "1" || coarse.scale !== "1.5") {
      problems.push(`K-02: --kits-grid-cell-scale 细指针=${fine.scale} 触屏=${coarse.scale}（应为 1 / 1.5）`)
    }
    // 触屏下动效必须关闭。
    if (coarse.animationName !== "none") {
      problems.push(`K-02: 触屏下 animation-name=${coarse.animationName}（应为 none）`)
    }
    if (fine.animationName === "none") {
      problems.push("K-02: 细指针下动效也被关掉了（网格漂移动画应保留）")
    }
  }
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

/* ========================================================================== */
/* 阶段 5 · K-01 无障碍回归：无障碍树必须与 DOM 逐项一致                              */
/*                                                                           */
/* v0.1.0 的分组宿主 `.kits-reveal__item` 带 aria-hidden="true"，会把整棵内容     */
/* 子树从无障碍树里剪掉（DOM 里 1 个 button，getByRole 命中 0 个）。v0.1.1 改为  */
/* role="presentation"：声明"这个 div 没有语义"，但不剪内容。                    */
/*                                                                           */
/* 判据不是"大于零"，而是**与 DOM 相等** —— 只断言存在会漏掉"部分剪枝"。          */
/* Playwright 1.63 已移除 page.accessibility，改走 CDP 的 Accessibility 域。    */
/* ========================================================================== */

{
  const { context, page, errors } = await makeContext(browser, {
    viewport: { width: 1440, height: 900 },
    theme: "dark",
  })
  await page.goto(`${BASE}/finance`, { waitUntil: "networkidle" })
  await page.waitForTimeout(900)

  /*
   * DOM 侧：用 CSS 选择器数（不看语义）。
   * 无障碍侧：用 Playwright 的 getByRole 数 —— 它就是走无障碍树的，
   * 也正是 v0.1.0 里命中 0 个的那个查询方式（真实测试用的也是它）。
   * 两者必须相等；若宿主又被 aria-hidden，无障碍侧会塌到 0 而 DOM 侧不变。
   */
  const dom = await page.evaluate(() => {
    const roots = [...document.querySelectorAll('[data-kits-component="insight-reveal"]')]
    return {
      revealCount: roots.length,
      hiddenHosts: document.querySelectorAll('.kits-reveal__item[aria-hidden="true"]').length,
      presentationHosts: document.querySelectorAll('.kits-reveal__item[role="presentation"]').length,
    }
  })

  const reveals = page.locator('[data-kits-component="insight-reveal"]')
  const tally = { domButtons: 0, domHeadings: 0, domLinks: 0, axButtons: 0, axHeadings: 0, axLinks: 0 }
  for (let i = 0; i < dom.revealCount; i++) {
    const r = reveals.nth(i)
    tally.domButtons += await r.locator("button").count()
    tally.domHeadings += await r.locator("h1, h2, h3, h4, h5, h6").count()
    tally.domLinks += await r.locator("a[href]").count()
    tally.axButtons += await r.getByRole("button").count()
    tally.axHeadings += await r.getByRole("heading").count()
    tally.axLinks += await r.getByRole("link").count()
  }

  notes.push(`K-01 · a11y = ${JSON.stringify({ ...dom, ...tally })}`)

  if (dom.revealCount === 0) problems.push("K-01: /finance 上找不到 InsightReveal，探针无效")
  if (dom.hiddenHosts > 0) {
    problems.push(`K-01 回归失败: 有 ${dom.hiddenHosts} 个 .kits-reveal__item 带 aria-hidden（会剪掉内容子树）`)
  }
  if (dom.presentationHosts !== dom.revealCount * 3) {
    problems.push(
      `K-01: role="presentation" 宿主 ${dom.presentationHosts} 个，期望 ${dom.revealCount * 3} 个（每个 reveal 3 段）`,
    )
  }

  for (const [role, d, a] of [
    ["button", tally.domButtons, tally.axButtons],
    ["heading", tally.domHeadings, tally.axHeadings],
    ["link", tally.domLinks, tally.axLinks],
  ]) {
    notes.push(`K-01 · ${role}: DOM ${d} vs 无障碍树 ${a}`)
    if (a !== d) {
      problems.push(
        `K-01 回归失败: reveal 内 ${role} 的 DOM 有 ${d} 个，无障碍树只有 ${a} 个${
          a === 0 && d > 0 ? "（内容被 aria-hidden 剪掉了）" : ""
        }`,
      )
    }
  }
  // 至少要有可交互内容，否则探针等于没测（v0.1.0 时这里 DOM 是 1、无障碍是 0）。
  if (tally.domButtons === 0) problems.push("K-01: reveal 里没有任何 button，探针覆盖不到 K-01 的症状")

  await page.screenshot({ path: `${OUT}/a11y-overview.png` })
  if (errors.length > 0) problems.push(`a11y 运行期错误:\n  ${errors.join("\n  ")}`)
  await context.close()
}

/* ========================================================================== */
/* 阶段 6 · K-05 Effect Contract：公开变量在祖先作用域可覆盖（默认 / 覆盖 / 还原）      */
/*                                                                           */
/* 判据：                                                                      */
/*   1. 默认态的三条渐变必须与 v0.1.0 的字面量**逐字相同**（视觉等价的直接证据）；     */
/*   2. 在祖先作用域写 --kits-effect-ambient-* 必须生效（且不改 gradient 实现）；   */
/*   3. 撤掉覆盖后必须**完全还原**到默认。                                        */
/*                                                                           */
/* Finance 目前把环境光画在自己的 @utility ambient-wash 里（产品美术方向），      */
/* 并未使用 .kits-effect-ambient-glow 这个类。因此这里在真实页面上临时挂一个容器   */
/* 来验证契约本身 —— 这不改变产品行为，只是把契约放到 Finance 的 theme 作用域下测。 */
/* ========================================================================== */

{
  const { context, page, errors } = await makeContext(browser, {
    viewport: { width: 1440, height: 900 },
    theme: "dark",
  })
  await page.goto(`${BASE}/finance`, { waitUntil: "networkidle" })
  await page.waitForTimeout(600)

  const effect = await page.evaluate(() => {
    const probe = document.createElement("div")
    probe.className = "kits-effect-ambient-glow"
    probe.setAttribute("data-kits-effect-probe", "")
    probe.style.cssText = "position:fixed;inset:0;pointer-events:none"
    document.body.appendChild(probe)
    const read = () => {
      const cs = getComputedStyle(probe, "::before")
      return {
        opacity: cs.opacity,
        backgroundImage: cs.backgroundImage,
        primary: getComputedStyle(probe).getPropertyValue("--kits-effect-ambient-primary").trim(),
        strength: getComputedStyle(probe).getPropertyValue("--kits-effect-ambient-strength").trim(),
      }
    }
    const base = read()

    // 覆盖写在 <html> 上 —— 契约的默认值声明在 :root，因此祖先作用域必须能压过它。
    const root = document.documentElement
    root.style.setProperty("--kits-effect-ambient-primary", "rgb(255 0 0 / 0.9)")
    root.style.setProperty("--kits-effect-ambient-strength", "0.25")
    const overridden = read()

    root.style.removeProperty("--kits-effect-ambient-primary")
    root.style.removeProperty("--kits-effect-ambient-strength")
    const restored = read()

    probe.remove()
    return { base, overridden, restored }
  })

  notes.push(`K-05 · effect default = ${JSON.stringify(effect.base)}`)
  notes.push(`K-05 · effect override = ${JSON.stringify(effect.overridden)}`)

  // 1. 默认渐变必须与 v0.1.0 的字面量逐字等价。
  const V010 = [
    "radial-gradient(60% 50% at 18% 8%, rgba(79, 214, 255, 0.16) 0%, rgba(0, 0, 0, 0) 62%)",
    "radial-gradient(50% 45% at 85% 20%, rgba(255, 182, 79, 0.1) 0%, rgba(0, 0, 0, 0) 60%)",
    "radial-gradient(70% 55% at 50% 105%, rgba(139, 123, 255, 0.12) 0%, rgba(0, 0, 0, 0) 65%)",
  ].join(", ")
  if (effect.base.backgroundImage !== V010) {
    problems.push(
      `K-05: ambient-glow 默认渐变与 v0.1.0 不等价\n    期望 ${V010}\n    实测 ${effect.base.backgroundImage}`,
    )
  }
  if (effect.base.opacity !== "1") {
    problems.push(`K-05: 默认 opacity=${effect.base.opacity}（strength 默认应为 1）`)
  }

  // 2. 祖先作用域的覆盖必须生效。
  if (!effect.overridden.backgroundImage.includes("rgba(255, 0, 0, 0.9)")) {
    problems.push("K-05: 祖先作用域覆盖 --kits-effect-ambient-primary 没有生效")
  }
  if (Math.abs(parseFloat(effect.overridden.opacity) - 0.25) > 0.01) {
    problems.push(`K-05: 覆盖 --kits-effect-ambient-strength 后 opacity=${effect.overridden.opacity}（应为 0.25）`)
  }

  // 3. 撤销覆盖必须完全还原。
  if (effect.restored.backgroundImage !== effect.base.backgroundImage || effect.restored.opacity !== effect.base.opacity) {
    problems.push("K-05: 撤销覆盖后没有还原到默认值")
  }

  await page.screenshot({ path: `${OUT}/effect-override.png` })
  if (errors.length > 0) problems.push(`effect 运行期错误:\n  ${errors.join("\n  ")}`)
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
  console.log("  K-01 无障碍树 = DOM · K-02 coarse pointer 有效格 ×1.5 · K-05 effect 公开变量可覆盖且可还原")
} else {
  console.log(`QA 发现问题 ${problems.length} 条：`)
  for (const p of problems) console.log("  · " + p)
  process.exitCode = 1
}
