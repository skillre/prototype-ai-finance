import { defineConfig, devices } from "@playwright/test"

import { QA_HOST, QA_ORIGIN, QA_PORT } from "./.qa/qa.config.mjs"

/**
 * Playwright config — Factory v1.1 port isolation, adopted with policy v1.3.
 *
 * PORT ISOLATION (the important part)
 * -----------------------------------
 * This file used to pin 3210 by hand and set
 * `reuseExistingServer: process.env.FINANCE_REUSE === "1"`. Pinning by hand was
 * only half the defence (the port had two sources of truth: this file and
 * `.qa/qa.config.mjs`), and the escape hatch was the other half.
 *
 * Playwright's readiness probe is a plain HTTP GET whose success condition is
 * `200 <= status < 404`, and when it succeeds while `reuseExistingServer` is
 * truthy, Playwright returns immediately **without checking that the responder
 * is this app**. Any process holding the port — a stale dev server, a sibling
 * prototype — would be adopted as the app under test, and the whole suite could
 * go green against the wrong page. `FINANCE_REUSE=1` stopped being a
 * convenience flag the moment it existed, so it is gone.
 *
 * Factory v1.1 therefore (now adopted here):
 *   - reads the port from `.qa/qa.config.mjs` — one source of truth, shared with
 *     `pnpm qa` and `scripts/check-qa-port.mjs`,
 *   - pins the dev server to that port explicitly, so Next can never auto-bump
 *     while `baseURL` still points at the old one,
 *   - sets `reuseExistingServer: false` unconditionally — the server is always
 *     started and always stopped by this run, so teardown can only ever kill a
 *     process we own,
 *   - leaves an occupied port to the pre-flight guard
 *     (`scripts/check-qa-port.mjs`, wired into the `test` script), which fails
 *     loudly and names the process instead of letting Playwright hang for 180s.
 *
 * Run it through `pnpm test` so the guard executes first; running
 * `pnpm exec playwright test` directly skips the guard (Playwright will still
 * refuse to reuse, it just reports less helpfully).
 */

const DEV_COMMAND = `pnpm dev --hostname ${QA_HOST} --port ${QA_PORT}`

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: QA_ORIGIN,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: DEV_COMMAND,
    // Readiness only. Points at `/` because that route always exists, so this
    // config stays independent of which routes a given product ships.
    url: `${QA_ORIGIN}/`,
    // Never adopt an existing server. Not `!process.env.CI`, not an env flag —
    // always false.
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
