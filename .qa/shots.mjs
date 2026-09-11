import { chromium } from "@playwright/test"
import { mkdirSync } from "node:fs"

/**
 * Browser QA 截图脚本（不属于测试套件，只在 QA 时运行）。
 *
 *   node .qa/shots.mjs
 *
 * 输出：/Users/skillre/ai-prototypes/.agent-tmp/fa-shots/
 */

const OUT = "/Users/skillre/ai-prototypes/.agent-tmp/fa-shots"
const BASE = process.env.QA_BASE ?? "http://localhost:3210"

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

const browser = await chromium.launch()
const problems = []

for (const [device, viewport] of VIEWPORTS) {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport, colorScheme: theme })
    const page = await context.newPage()

    const errors = []
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`)
    })
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
    page.on("requestfailed", (request) =>
      errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`)
    )

    for (const [name, route] of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" })
      await page.waitForTimeout(900)
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        return doc.scrollWidth - doc.clientWidth
      })
      if (overflow > 1) problems.push(`${device}/${theme}${route} 横向溢出 ${overflow}px`)
      await page.screenshot({
        path: `${OUT}/${device}-${theme}-${name}.png`,
        fullPage: false,
      })
    }

    if (errors.length > 0) problems.push(`${device}/${theme} errors:\n  ${errors.join("\n  ")}`)
    await context.close()
  }
}

await browser.close()
console.log(problems.length === 0 ? "QA OK — 无 console/page/network 错误，无横向溢出" : problems.join("\n"))
