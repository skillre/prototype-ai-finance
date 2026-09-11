<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Prototype Starter — Agent Instructions

这是一个**长期复用的 AI Agent 驱动 Interactive Prototype Starter**：只做「Frontend + local state + realistic mock data」。

## 项目边界

- ✅ Next.js 16 App Router · TypeScript · Tailwind v4 · pnpm
- ✅ shadcn/ui（**base-nova 风格，基于 Base UI**，而非 Radix）· Motion 13 · Zustand 5 · Recharts 3 · dnd-kit · Playwright
- ❌ 禁止加入 Database / Supabase / Authentication / Docker / Kubernetes / Monorepo / Turborepo / Microservices / Backend service / MCP / Multi-agent orchestration / GitHub Actions / Vercel API & CLI automation / Cloudflare / 任何新的 deployment platform。这些以后再处理。

## 开发原则（必须遵守）

1. **先 inspect，再修改**。动手前先读 `AGENTS.md`、相关组件与数据，配置有疑问时查阅 `node_modules/next/dist/docs/`（Next 16 有 breaking changes，如 `next lint` 已移除、`params` 为 Promise、`middleware` 改名为 `proxy`）。
2. **优先复用现有组件**：`components/ui/`（shadcn primitives）、`components/prototype/`（StatsCard、DataTable、FilterBar、DetailDrawer、CommandPalette、EmptyState、LoadingState、ErrorState、OnboardingWizard、ChartCard）、`components/motion/`（FadeIn、SlideIn、ScaleIn、PageTransition、StaggerContainer、AnimatedNumber）、`components/layout/`（Sidebar、TopNav、MobileNav、PageContainer）。
3. **禁止无意义重复组件**。相似 UI 先考虑扩展现有组件，而不是复制新文件。
4. **所有可见交互必须真实可用**。每个按钮/开关/菜单都连到 state、store 或真实行为；**不允许 fake buttons**、不允许仅视觉装饰。
5. **不制作静态 mockup**。页面必须由真实组件 + 局部状态驱动，数据来自 `lib/mock-data.ts`（realistic mock data，禁止 lorem ipsum）。
6. **shadcn/ui 优先作为 UI primitive**。注意 base-nova 风格 API 与旧版不同：用 `render` prop 而不是 `asChild`；Drawer 用 `swipeDirection`；`Select.Value` 的 children 可以是 `(value) => ReactNode`。
7. **Motion 优先负责交互动画**。时长与缓动只从 `lib/motion-presets.ts` / CSS token 取，禁止硬编码 duration/ease。
8. **使用 realistic mock data**：公司、金额、时间戳都要像真实 SaaS 数据。
9. **重要功能必须浏览器验证**：`pnpm dev` 后走一遍流程，或用 Playwright（`pnpm test`）覆盖（详见下方 Browser QA 规则）。
10. **修改时尽量保持现有 architecture**：app 页面在 `app/`，可复用业务组件按职责放入 `components/*`，状态在 `stores/`，mock 数据在 `lib/mock-data.ts`。
11. **必须考虑 responsive**：桌面（Sidebar + TopNav）与移动（MobileNav + Drawer + 单列 grid）都要可用。
12. **必须实现 loading / empty / error states**，并用全局（LoadingState / ErrorState / EmptyState）组件表达。
13. **完工前执行 `pnpm lint`**。
14. **完工前执行 `pnpm typecheck`**。
15. **完工前执行 `pnpm test`**（Playwright）。
16. **完工前执行 `pnpm build`**。
17. **不要假设代码结构**。任何结论都以实际读到的代码为准；route、组件、store、token 的名与实都以仓库现状为准。
18. **先理解现有架构，修改应尽量局部、可控、可回滚**；不进行没有必要的大规模重构。
19. **不覆盖用户已有修改**。开工前确认工作区状态；发现与任务无关的用户改动时，先停止并报告，绝不擅自覆盖或丢弃。

## Prototype 规则

- 所有可见交互控件**必须真实可用**：连接 state / store / 真实行为；**不允许 fake buttons**，不允许仅视觉装饰。
- **不允许纯静态 mockup 冒充 interactive prototype**：页面必须由真实组件 + 局部状态驱动。
- UI primitive 优先 **shadcn/ui**（base-nova API）；业务组件优先复用 `components/prototype`；动画优先复用 `components/motion`。
- 视觉只使用 `app/globals.css` 的 **design tokens** 与 `lib/motion-presets.ts`；禁止 magic number。
- 数据来自 **realistic mock data**；**不使用 lorem ipsum**。
- 必须考虑 **loading / empty / error** 三态（用全局组件表达）。
- 必须考虑 **responsive**（桌面与移动端都要可用）。
- **重要交互必须经过真实浏览器验证**（见 Browser QA 规则）。

## Browser QA 规则（重要交互必做）

对于重要交互，**不能只通过源码阅读判断**。必须：

1. 启动应用（`pnpm dev`，demo 在 http://localhost:3000/demo）
2. 实际打开浏览器
3. 执行关键用户流程
4. 检查页面结果
5. 检查 console error
6. 必要时截图
7. 发现问题后修复（找到根因、最小范围修复）
8. 修复后重新验证

浏览器验证优先关注：navigation / buttons / forms / tabs / dialogs / drawers / filters / drag and drop / command palette / responsive / loading / empty / error states。

## Quality Gates

任何 Prototype 在「完成」之前必须全部通过：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

任何一项失败：**禁止声称完成**。必须修复后重新执行，直至全部通过。

## Git 工作流与安全

### Git 安全规则（红线）

Agent 默认**禁止**执行：

- `git reset --hard`
- `git clean -fd`
- `git push --force`
- `git push --force-with-lease`
- `git branch -D`
- `git checkout .`
- `git restore .`
- `rm -rf`

除非用户明确要求（force 类操作还需用户确认风险）。对于任何可能覆盖用户修改的命令：**先停止并报告**，不允许擅自覆盖用户工作。

### Branch Strategy

- **`main` 是稳定基线**：只保存稳定、可展示、可部署版本。
- 开发一律在 **`feature/<name>`**：
  - 每个新 Prototype 使用独立 feature branch；**一个 Prototype 对应一个 feature branch**。
  - 不同 Prototype 不混在同一个 feature branch。
  - 不重复使用旧 feature branch 做完全不同的 Prototype。
  - Agent **默认不直接在 `main` 开发**。
- 命名要求：**lowercase、kebab-case、简洁、英文、无空格、无中文**。
- 推荐命名：`feature/ai-crm`、`feature/ai-dashboard`、`feature/analytics`、`feature/workflow`、`feature/mobile-app`。

### 开始新 Prototype 的 Branch 工作流

每次开始新 Prototype：

```bash
git status                 # 确认没有未提交的用户修改
git branch --show-current   # 确认当前位置

git checkout main
git pull --ff-only origin main   # 若有远程仓库

git checkout -b feature/<name>   # 例如 feature/ai-crm

git branch --show-current         # 必须是 feature/<name>
```

**只有确认在 `feature/<name>` 之后才开始开发。** 如果当前已经在其他 feature branch：**不把新 Prototype 混进去，先停止并报告**；不自动删除旧 branch。

### 在 feature branch 上开发

所有新 Prototype 的修改发生在 `feature/<name>`，允许有多个合理 commit。推荐 commit 类型：

`feat:` `fix:` `refactor:` `style:` `test:` `docs:` `chore:`

例如：`feat: add customer detail drawer`、`fix: improve mobile dashboard layout`、`test: add customer workflow coverage`。

禁止无意义的：`update` / `changes` / `work` / `misc` / `final`。

### Commit 规则

commit 之前必须：

1. `git status` → `git diff --stat` → `git diff`，检查：unintended changes、secrets、API keys、`.env`、`node_modules`、`.next`、`test-results`、临时文件、无关改动。
2. 全部通过 `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` 以后才能 commit。
3. 尽量使用 `git add <explicit-files>`；不要盲目 `git add -A`，除非已明确确认所有变更都属于当前任务。
4. commit 后再次 `git status` 确认。

### Push 规则

**默认不 push。** 只有以下情况才允许 push：用户明确要求 push、当前任务明确要求 delivery / publish。

push 之前必须 `git branch --show-current` 确认当前**不是 `main`**，然后：

```bash
git push -u origin feature/<name>
```

禁止 `git push --force` / `git push --force-with-lease`，除非用户明确要求并确认风险。

### Merge 规则

`main` 表示稳定版本。标准流程：

```
feature branch → development → browser QA → Playwright
→ lint/typecheck/build → commit → push → Vercel Preview
→ 人工确认 → merge into main
```

Agent 默认**禁止自动 merge**；默认禁止 push main、合并 main、删除 feature branch。只有用户明确要求时才执行 merge。发生 merge conflict：**停止并报告**，不擅自进行高风险 conflict resolution。

## 设计 Token

一切视觉常量来自 `app/globals.css` 的 design token 层（typography `text-display/title/subtitle/heading/caption/label/eyebrow/metric/metric-sm/numeric`、semantic spacing `p-gutter/gap-stack/mt-section`、radius `rounded-field/rounded-card/rounded-panel`、motion `duration-*`/`ease-*`、内容宽度 `max-w-dashboard/content/text`）。禁止在页面里撒 magic number。

## 视觉构图（Design System V4 — AI Sales Command Center）

**层级靠构图与排版承担，不靠卡片边框。**
V4 不是视觉微调，而是从「做得挺好看的仪表盘」走到「有主张的产品」：
第一屏先给收入智能，然后**产品开口说话**（AI 洞察），再给数据、给指标、最后才是记录。

### 层级阶梯（每个页面都要能回答「第一眼应该看到什么」）

| 层级 | 承担者 | 实例（`/crm`） |
| --- | --- | --- |
| L1 | 唯一的主角：`text-metric` 大数字 + 与它共面的图形 | `RevenueHero` |
| L2 | 产品说的话：推导出来的洞察 + 可操作的实体 | `AiInsightLayer` / `lib/insights.ts` |
| L3 | 一个 Intelligence Module：编辑式编号区块（01/02/03） | `OpportunitySpotlight` |
| L4 | 真正的数据可视化：构成条 + 视觉排行 | 阶段构成 / 负责人排行 |
| L5 | 次级指标带：排版 + hairline + 真实迷你走势 | `MetricStrip` |
| L6 | 记录层：实时流、时间线、队列、排行 | `LiveDataLayer` + 开放区块 |

1. **一屏一个主角**。每个页面先定第一视觉焦点（通常是 Hero 里的那个大数字），其余信息按 L1 → L6 递减。不要让所有模块视觉权重相同。同一个数字在同一屏里只出现一次。
2. **`Card` 是稀缺资源**。只有真正浮在别的层之上的内容才用它：对话框、抽屉、Popover、Tooltip、拖拽预览。需要"分量"但不需要 elevation 的区块用 `<OpenSection>` + `<SectionHeading>`。
3. **抽象容器换成语义容器**。优先用 `open section + hairline` / 数式排版块 / 分隔线列表 / 整块图形区，而不是"又一个圆角盒子"。
4. **构图允许非对称**（58/42、1.45fr/1fr）。全部 50/50 与全部 `gap-4` 会让页面读起来像表格。
5. **一屏一个光源**。页面自带 Hero 时把全局环境光关掉（`<CrmDataBoundary ambient={false}>`），两个晕染互相抵消等于没有设计。
6. **复用 V4 构图原语**：`OpenSection`、`SectionHeading`、`MetricStrip`/`MetricItem`。`StatsCard`/`ChartCard` 是"卡片形态"的变体，保留给确实需要卡片的布局，不是默认选择。
7. **签名交互只有一个**。当前是「悬停 Hero 图形 → 读数跟着光标走，可点击固定」。其余地方保持静止；「交互动效」用于交代状态变化，不是用来装饰。

### AI 洞察与实时数据的红线

- **洞察必须推导出来**，不能是把文案写死在组件里。`lib/insights.ts` 从当前客户/管道数据算出增长归因、风险敞口（金额 × 停滞天数）与机会紧迫度（金额 × (1 + 停滞天数/10)）；换掉数据，句子里的公司、金额、百分比、停滞天数都会变。**不接外部接口、不联网、同输入同输出**。
- **"实时"必须是真的**。事件来自真实记录、按有界队列推进（一次一条、只留最新 5 条）、走完就明说"已是最新"而不是无限循环；时钟是真实时钟且在客户端挂载后才渲染（避免水合不一致）；重放入口是真实动作。
- **洞察里的实体必须可操作**：悬停同步高亮下方同名记录，点击直达客户档案。任何"看起来能点"的实体都要有真实结果。
- **词典负责措辞，代码负责事实**：`lib/insights.ts` 只产出结构化事实（公司、金额、天数、百分比），文案一律经 `t.dashboard.insight.*`。文案里不出现与区块标题同名的词（例如洞察句不要写「高价值客户」，那是下方区块的标题）。

### 中文排版红线

- **中文不使用负字距**。负 tracking 只允许出现在纯数字 token 上（`text-metric` / `text-numeric` / `.numeric`）。含中文的量词、单位、时长（例如 `4分38秒`）不加 `.numeric`。
- 中文行高高于纯拉丁方案：`text-display` 1.18、`text-title` 1.3、`text-body` 1.7。中文大标题在 1.05 行高下会被裁切。
- 字体栈以 Geist 起头，再回落到 PingFang / Hiragino / YaHei / Noto，**不用拉丁字体合成中文**。
- 控件命中区不小于 24px；密集列表的行内链接用 `py-1 -my-1` 扩大命中区而不改变排版。

## 文案与本地化

- 默认语言 **zh-CN**。`app/**` 与 `components/**` 里**不允许**出现硬编码的用户可见文案，一律经 `useMessages()`（服务端用 `messages`）从 `lib/i18n` 取。
- 词典负责**界面文案**；**业务记录内容**（客户名、公司名、备注、金额）留在 `lib/crm-data.ts` / `lib/mock-data.ts`，不做翻译。
- 路由 slug 保持英文（`/crm/customers`），界面显示中文。新增 locale 只需在 `lib/i18n/` 增加一个 `Messages` 形状的文件。
- 允许保留原文的只有：品牌名、URL、Email、技术栈名称、代码、键盘快捷键。这份白名单集中在 `tests/support/localization.ts`，并断言 `/`、`/demo` 与全部 `/crm` 路由（含浮层）零泄漏。

## Zustand 约定

- selector 只取**原始值**（如 `customers` 数组本身），派生（filter/sort/计数）在组件内用 `useMemo`。**禁止在 selector 里返回新数组/新对象**（zustand v5 会无限渲染）。
- 参考 `stores/dashboard-store.ts` 的 `selectFilteredCustomers` 纯函数。

## 常用命令

```bash
pnpm dev          # http://localhost:3000 ，demo 在 /demo
pnpm lint         # ESLint
pnpm typecheck    # next typegen + tsc --noEmit
pnpm test         # Playwright E2E（自动启动 dev server，需先 pnpm exec playwright install chromium）
pnpm check        # lint + typecheck + test
pnpm build        # production build（Turbopack）
```

- 开发高保真交互原型时，请同时加载 `skills/interactive-prototype/SKILL.md` 的完整工作流。
- 完成原型、准备交付时，请加载 `skills/git-delivery/SKILL.md` 的 Git 交付工作流。