import { defineConfig, devices } from "@playwright/test"

/**
 * 与应用端口解耦：这个项目固定用 3210，避免与同机的其它原型（如
 * prototype-starter 的 3000）互相复用——reuseExistingServer 一旦命中
 * 另一个应用，整套断言就会在错误的页面上通过。
 */
const PORT = Number(process.env.FINANCE_PORT ?? 3210)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `${BASE_URL}/finance`,
    reuseExistingServer: process.env.FINANCE_REUSE === "1",
    timeout: 180_000,
  },
})