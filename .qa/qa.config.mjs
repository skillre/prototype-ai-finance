/**
 * Prototype Factory · Browser QA configuration.
 *
 * Single source of truth for the QA sweep. Everything a product needs to change
 * lives here — routes, viewports, themes, tolerance — so the sweep script itself
 * stays product-agnostic and never learns a route name.
 *
 * This file is imported by three consumers:
 *   - `.qa/browser-qa.mjs`   the sweep
 *   - `playwright.config.ts` the e2e runner's port/host
 *   - `scripts/check-qa-port.mjs` the pre-flight guard
 *
 * A product derived from the Factory edits ONLY this file.
 */

/**
 * The QA port. Deliberately NOT 3000.
 *
 * 3000 is Next's default, which means every prototype on this machine, plus any
 * stray `next dev`, races for it. 3100 is hub's slot, 3200 is the Factory
 * baseline's, 3230 is ai-research's; **3210 is this product's**. Two QA runs on
 * the same port do not fail — they sweep each other's pages and report green.
 *
 * This file is the single source of truth for that port: `playwright.config.ts`
 * (`pnpm test`) and `.qa/browser-qa.mjs` (`pnpm qa`) both read it, so the e2e
 * run and the QA sweep can never disagree about which port is theirs.
 *
 * The port is *pinned* rather than left to Next's auto-increment, because
 * auto-increment is how a test run silently ends up talking to a different
 * server than the one it started.
 */
export const QA_PORT = 3210

/** Host the QA server binds to. 127.0.0.1 avoids exposing the dev server. */
export const QA_HOST = "127.0.0.1"

/** Full origin, used as Playwright's `baseURL`. */
export const QA_ORIGIN = `http://${QA_HOST}:${QA_PORT}`

/**
 * Routes to sweep.
 *
 * `null` means "discover every route from `app/`" — the default, and the reason
 * this script has no product routes baked into it.
 *
 * This product's discoverable routes are `/` plus the seven finance pages
 * (`/finance`, `/finance/cashflow`, `/finance/analysis`, `/finance/budget`,
 * `/finance/insights`, `/finance/risks`, `/finance/transactions`). The catch-all
 * `app/finance/[...rest]/page.tsx` is reported as dynamic and skipped by the
 * discovery walk; the 404 journey is covered by `tests/finance-navigation.spec.ts`.
 */
export const routes = null

/**
 * Routes that exist but cannot be discovered from the filesystem — dynamic
 * segments, or pages you want exercised with real ids.
 * @type {string[]}
 */
export const extraRoutes = []

/** Routes deliberately excluded from the sweep (e.g. heavy paywalls, redirects). */
/** @type {string[]} */
export const excludeRoutes = []

/** Viewports every route is swept at. */
export const viewports = [
  { name: "desktop", width: 1440, height: 900, mobile: false, touch: false },
  { name: "mobile", width: 390, height: 844, mobile: true, touch: true },
]

/** Colour schemes every route × viewport is swept at. */
export const themes = ["dark", "light"]

/** Milliseconds to settle after navigation before measuring. */
export const settleMs = 450

/**
 * Tolerance in CSS pixels for the viewport-expansion and overflow checks.
 *
 * The checks are written so this is the *only* slack: a scrollbar or a
 * fractional device-pixel-ratio rounding needs ~1px, and anything larger than
 * that is a real layout bug rather than noise.
 */
export const tolerancePx = 1

/**
 * Ratio threshold for the coarse-pointer spacing check.
 *
 * A touch target's spacing must differ measurably between fine and coarse
 * pointers. `0.02` is tight enough to catch "the media query never applied" and
 * loose enough to survive sub-pixel rounding.
 */
export const pointerRatioTolerance = 0.02

/**
 * Quorum for the style-presence bundle (Factory v1.2 · N3).
 *
 * Every route must differ from a same-browser **unstyled baseline** in at least
 * this many independent style domains — `box-reset` · `type` · `surface` ·
 * `ink`. A page that matches the browser default in all four is not a styled
 * page with a bug; it is an unstyled page.
 *
 * Why 2 and not 4: 4 would make the gate depend on the product painting every
 * domain (a product that only resets margins and sets a font would fail while
 * being perfectly styled). Why not 1: a single differing property is weak
 * evidence — it is exactly what one stray rule produces.
 *
 * Measured on this Factory: 4/4 channels differ. With the root stylesheet
 * removed: 0/4.
 */
export const stylePresenceMinChannels = 2

/** Fail the run if any numeric probe cannot be measured. Always leave on. */
export const failOnUnmeasurableProbe = true
