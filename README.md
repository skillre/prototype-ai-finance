# Prototype Starter

A reusable, agent-friendly foundation for building **high-fidelity interactive prototypes**:
Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + Motion + Zustand —
frontend only, local state, realistic mock data. No database, no auth, no backend service.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000 — demo dashboard at /demo
pnpm check        # lint + typecheck + Playwright e2e
pnpm build        # production build (Turbopack)
```

First e2e run needs browsers once: `pnpm exec playwright install chromium`.

## Why this starter

- **Real interactions, no mockups.** Every visible control works against local state:
  filters, drag-and-drop ordering, add-customer dialog, detail drawer, command palette
  (⌘K), sign-out, theme toggle, loading/empty/error states.
- **Design System V2.** A complete token hierarchy in one layer (`app/globals.css`) with a
  JS mirror (`lib/motion-presets.ts`) — Light and Dark, semantic colour roles, type scale,
  radius & elevation semantics, and intent-named motion. See below.
- **Chinese-first localization.** Every user-visible string in `app/**` and `components/**`
  resolves through `lib/i18n` — landing page, demo dashboard, CRM and 404s alike.
  No scattered copy; adding a locale is one file.
- **Reusable component library.** Generic building blocks you copy into new prototypes:
  `components/prototype/*` (OpenSection, SectionHeading, MetricStrip/MetricItem —
  the V3 composition primitives; StatsCard, ChartCard, DataTable, FilterBar, DetailDrawer,
  CommandPalette, EmptyState, LoadingState, ErrorState, OnboardingWizard, AmbientBackdrop),
  `components/motion/*` (FadeIn, SlideIn, ScaleIn, PageTransition, StaggerContainer,
  AnimatedNumber), `components/layout/*` (Sidebar, TopNav, MobileNav, PageContainer).
- **Agent-first.** `AGENTS.md` pins development rules (inspect first, reuse components,
  real interactions only, browser QA, quality gates, git safety & branch strategy).
  `skills/interactive-prototype/SKILL.md` defines the full build workflow
  and `skills/git-delivery/SKILL.md` defines the delivery workflow.
- **Verified.** 59 Playwright e2e flows cover routing integrity, navigation, forms,
  drawers, drag-and-drop, the command palette, English-leakage auditing, theme tokens and
  mobile viewports.

## Design System V4 — AI Sales Command Center

Premium interactive data product: **composition** carries the hierarchy, not card borders.
V4 is not a visual pass — it is the step from "a well-designed dashboard" to a product
with a point of view: the screen opens with **revenue intelligence**, then the product
**speaks** (AI insight), then the data, then the metrics, and only then the records.

### The composition ladder

Every screen opens with exactly one protagonist, then steps down. Modules do not all get
the same weight — that is the whole design.

| Level | What it is | Where (`/crm`) |
| --- | --- | --- |
| **L1 · Revenue Intelligence** | The hero: `text-metric` number + the chart it belongs to, sharing one plane. The readout lives *inside* the plot's reserved top band, so the number and the data occupy the same composition instead of sitting side by side. | `RevenueHero` |
| **L2 · AI Insight** | The product speaks: a derived sentence about growth attribution, three named accounts you can hover (they highlight the matching row further down) and a risk statement with a real next step. | `AiInsightLayer` + `lib/insights.ts` |
| **L3 · Intelligence module** | Editorial numbered block — `01 / 02 / 03`, ranked by urgency, not by amount. No card. | `OpportunitySpotlight` |
| **L4 · Data visualisation** | Stage composition as **one** segmented bar + a drill-down legend; owner performance as a **vertical visual ranking**. No "rows with a right-aligned value". | `StageComposition`, owner ranking |
| **L5 · Secondary metrics** | Four figures on hairlines with real 12-month micro-trends. | `MetricStrip` / `MetricItem` |
| **L6 · Live + records** | A real event stream with a real clock, the day-grouped activity timeline, the task queue and the ranked key accounts. | `LiveDataLayer`, open sections |

### Signature interaction

**Chart hover → the readout follows the cursor.** Hovering the hero plot re-reads the
month under the pointer: the eyebrow switches to `9月 读数`, the amount, the pipeline and
the coverage ratio all move with it, and clicking **pins** that month (a real button,
`回到当月`, releases it). It is the one motion the page is built around — everything else
stays still.

### AI is derived, live is real

Two rules keep the product honest:

- **Insight is derived.** `lib/insights.ts` computes growth attribution, risk exposure
  (`金额 × 停滞天数`) and opportunity urgency (`金额 × (1 + 停滞天数/10)`) from the same
  customers the rest of the page renders. Change the data and the company names, amounts,
  percentages and stale-day counts in the sentences change with it. No external API, no
  network, deterministic output.
- **Live is real.** The live layer streams the actual activity records on a bounded queue
  (one every 8 s, newest five kept), stamps a real client clock, says so when the queue is
  exhausted instead of looping, and its replay button genuinely resets it.

**`Card` is a scarce resource.** Use it only where content genuinely floats above another
layer: dialogs, drawers, popovers, tooltips, drag previews. If a block needs weight but
not elevation, use an open section. `StatsCard` / `ChartCard` remain in the library as the
card-shaped variants — they are simply not the default any more.

### Tokens (`app/globals.css`)

| Group | Tokens |
| --- | --- |
| Colour roles | `background` · `surface` · `elevated` · `interactive` · `foreground` · `muted` · `border` · `hairline` · `accent` · `accent-soft` · `brand` · `data-accent` · `success` · `warning` · `danger` · `info` (each with a `-soft` where it matters) |
| Typography | `text-display` · `text-title` · `text-subtitle` · `text-heading` · `text-body` · `text-body-sm` · `text-caption` · `text-label` · `text-eyebrow` · `text-metric` · `text-metric-sm` · `text-numeric` + the `.numeric` / `.eyebrow` utilities |
| Radius | `rounded-field` (controls) · `rounded-card` · `rounded-panel` · `rounded-floating` |
| Elevation | `shadow-subtle` · `shadow-card` · `shadow-elevated` · `shadow-floating` — Light and Dark differ |
| Motion | `duration-instant/fast/normal/slow/glacial` + `duration-press/hover/enter/exit/modal/drawer/list/page`; `ease-standard/out-expo/out-back/spring/emphasized` |
| Ambient | `ambient-grid` · `ambient-wash` · `hero-wash` · `chart-glow` · `surface-sheen` · `kbd-chip` · `section-tick` · `live-halo` |
| Hero surface | `--hero-base` · `--ambient-hero-brand` · `--ambient-hero-warm` — the hero reads its **own** ambient tokens, so Dark can be pushed further without dragging every other wash along |

Rules: never hardcode a colour, duration or easing outside the token layer; pick motion by
**intent** (`motion.enter`, `motion.press`) rather than by feel.

### Colour direction

Two hues are owned by the product: **deep cobalt** (`--brand`) and a **controlled cyan**
(`--data-accent`). Chart series 1–2 are that pair; series 3–5 are semantic colours
reserved for status (合作中 / 逾期 / 流失风险). No decorative rainbow, no AI purple, no
random pastels.

### Typography — the CJK rule

Chinese glyphs are full-width and square. Negative tracking that flatters Latin display
type makes 中文 look cramped, so **letter-spacing is 0 on every token that carries
Chinese** and negative tracking lives only on the numeric tokens (`text-metric`,
`text-numeric`, `.numeric`), whose glyphs are half-width digits. Line-heights are higher
than a Latin-only scale would use — 1.05 on a 56px Chinese headline clips the glyphs.
The font stack leads with Geist and then falls through PingFang / Hiragino / YaHei / Noto
so 中文 is never synthesised from a Latin face.

### Themes

- **Light** — cool off-white canvas (`--background` is a blue-tinted grey, not white),
  pure-white surfaces. The gap between the two is wide enough that a surface reads as
  elevated *without* a border, which is what lets the layout drop most card outlines.
- **Dark** — layered charcoal over a navy undertone. The three surface steps
  (0.152 → 0.202 → 0.238) are deliberately wide apart so elevation reads as luminance, not
  as a border. One controlled ambient bloom per screen, a faint grid, and a single chart
  glow — never purple, never neon, never glass everywhere. Dark is allowed to be **more**
  expressive than Light: the hero sinks *below* the page (`.dark --hero-base` is deeper
  than `--background`) so the brand blue can come through it. Expressiveness comes from
  depth, not from turning the glow up.

### Ambient layer

`components/prototype/ambient-backdrop.tsx` (page-level) and
`components/prototype/open-section.tsx` (region-level) are the only places that add
decoration. **One light source per screen**: pages that carry their own hero turn the
global backdrop off (`<CrmDataBoundary ambient={false}>`) so two washes never cancel out.

### i18n (`lib/i18n/`)

```ts
// lib/i18n/zh-CN.ts   — the reference dictionary (source of truth for the shape)
// lib/i18n/index.ts   — locale registry, `getMessages`, `messages` (non-hook accessor)
// components/i18n/    — <LocaleProvider>, useMessages(), useLocale()
```

```tsx
const t = useMessages()
return <h1>{t.page.dashboard.title}</h1>
```

Adding `en-US`: create `lib/i18n/en-US.ts` typed as `Messages`, append `"en-US"` to
`LOCALES` and the dictionary map. No component changes.

**Dictionary = interface copy.** Record content (customer names, notes, amounts) lives in
`lib/crm-data.ts` / `lib/mock-data.ts` and is intentionally *not* translated. Route slugs
stay English.

`tests/support/localization.ts` holds the single allow-list for Latin text (brand names,
URLs, emails, tech-stack names, keyboard shortcuts) and the visible-text scanner; the
specs assert **zero** non-allow-listed English on `/`, `/demo` and every `/crm` route,
including dialogs, drawers, menus and the command palette.

## Structure

```
app/                     # routes: / (landing), /demo (demo dashboard), /crm (AI CRM)
  crm/                   #   /crm · /crm/customers · /crm/customers/[id] · /crm/opportunities · /crm/tasks · /crm/activities
  crm/_components/       #   revenue-hero · ai-insight-layer · opportunity-spotlight · live-data-layer · crm-shell
components/
  ui/                    # shadcn/ui primitives (Base UI "base-nova" style)
  prototype/             # reusable product components
  motion/                # Motion-based animation components
  layout/                # Sidebar, TopNav, MobileNav, PageContainer
  i18n/                  # LocaleProvider, useMessages()
hooks/                   # useMediaQuery, useDebouncedValue, useHotkey
lib/
  i18n/                  # dictionaries (zh-CN) + locale registry
  crm-data.ts            # AI CRM mock records (Chinese business data)
  mock-data.ts           # demo workspace mock records (Chinese business data)
  activity-groups.ts     # shared day-bucketing for the activity timelines
  insights.ts            # deterministic growth / risk / opportunity derivation (the "AI")
  format.ts              # money / number / date formatting + personInitials
  motion-presets.ts      # JS mirror of the motion tokens
stores/                  # Zustand stores (dashboard demo + CRM)
tests/                   # Playwright e2e specs
  support/               # shared test helpers (English allow-list + text scanner)
skills/                  # agent skills (interactive-prototype, git-delivery)
```

## Stack notes

- **shadcn/ui "base-nova"** is built on **Base UI**, not Radix — use the `render` prop
  instead of `asChild`, `swipeDirection` on Drawer, `(value) => …` children on `Select.Value`.
- **Next.js 16** has breaking changes; read `node_modules/next/dist/docs/` when in doubt
  (`next lint` is gone, `params` is async, Turbopack is the default bundler).
- **Zustand**: selectors must return stable references — derive with `useMemo` in
  components, never create arrays/objects inside selectors.

## Agent Development Workflow

The standard loop every prototype goes through (see `skills/interactive-prototype/SKILL.md`):

```
Understand → Inspect → Plan → Build → Run → Browser Validate → Fix → Polish → Test → Git Delivery
```

After Build, keep the **Browser QA Loop** running until it converges:

```
Implement → Run → Browser → Interact → Inspect → Detect → Fix → Browser again → Test
```

Important interactions are validated in a real browser — execute the key user flows,
inspect the results and console errors, screenshot when needed — not only by reading code.

## Git Branch Workflow

```
main → feature/<name> → development → QA → commit → push → Vercel Preview → human review → merge main
```

- `main` = the stable, demoable, deployable baseline
- `feature/*` = prototype development — **one prototype per feature branch**
- Agents never develop directly on `main` and never merge to `main` by default
- Full git safety rules (blacklisted commands, commit/push/merge rules) live in `AGENTS.md`;
  the delivery checklist lives in `skills/git-delivery/SKILL.md`

## Example

Creating an "AI CRM" prototype:

```bash
git status                     # confirm no uncommitted user changes
git checkout main
git pull --ff-only origin main
git checkout -b feature/ai-crm
git branch --show-current      # must be feature/ai-crm
```

After development:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Then:

```bash
git status
git diff --stat
git diff
git add <explicit-files>
git commit -m "feat: add ai crm prototype"
git push -u origin feature/ai-crm
```

Then: GitHub → Vercel → Preview URL. After human confirmation of the preview, consider
merging `feature/ai-crm` into `main` — only when the user explicitly asks.

## New Prototype Standard Flow

1. Update `main`
2. Create the feature branch
3. Understand the requirement
4. Inspect
5. Plan
6. Build
7. Run
8. Browser QA
9. Fix
10. Polish
11. Playwright
12. `pnpm lint`
13. `pnpm typecheck`
14. `pnpm build`
15. Diff review
16. Commit
17. Push
18. Vercel Preview
19. Human confirmation
20. Merge into `main` (only when the user asks)