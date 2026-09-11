<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 智悟云 · AI 财务工作台 — Agent Instructions

这是一个**由 Prototype Factory 生产的独立原型**：只做「Frontend + local state + realistic ledger data」。
它从 `prototype-starter@v1.0.0` 继承了工厂基础设施与设计系统，并替换掉了上一个产品的业务实现。

## 项目边界

- ✅ Next.js 16 App Router · TypeScript · Tailwind v4 · pnpm
- ✅ shadcn/ui（**base-nova 风格，基于 Base UI**，而非 Radix）· Motion 13 · Zustand 5 · Recharts 3 · Playwright
- ❌ 禁止加入 Database / Supabase / Authentication / Docker / Kubernetes / Monorepo / Turborepo / Microservices / Backend service / MCP / Multi-agent orchestration / GitHub Actions / Vercel API & CLI automation / Cloudflare / 任何新的 deployment platform。

## 开工前必读（顺序）

1. `AGENTS.md`（本文件）—— 规则与红线
2. `lib/finance-data.ts` → `lib/finance-ledger.ts` → `lib/finance-metrics.ts` → `lib/finance-insights.ts`
   —— 数据从哪来、怎么展开、哪些是推导出来的
3. `app/globals.css` —— 令牌层（颜色、排版、间距、圆角、动效、环境光）
4. `app/finance/_components/finance-shell.tsx` —— 路由表、导航结构、命令中心、全局浮层
5. `lib/i18n/zh-CN.ts` —— 全部界面文案

## 开发原则

1. **先 inspect，再修改**。任何结论以实际读到的代码为准。
2. **优先复用现有组件**：`components/ui/`（shadcn primitives）、`components/prototype/`（OpenSection、SectionHeading、MetricStrip/MetricItem、DataTable、FilterBar、DetailDrawer、CommandPalette、EmptyState、LoadingState、ErrorState、Pagination、ProfileDialog、SignOutDialog）、`components/motion/`、`components/layout/`。
3. **禁止无意义重复组件**。相似 UI 先扩展现有组件。
4. **所有可见交互必须真实可用**：每个按钮/滑杆/图例都连到 state、store 或真实推导；**不允许 fake button**，也不允许"看起来能点"的装饰。
5. **不制作静态 mockup**。页面由真实组件 + store + 账本数据驱动。
6. **shadcn/ui 是 UI primitive**（base-nova API）：用 `render` prop 而不是 `asChild`；Drawer 用 `swipeDirection`；`Select.Value` 的 children 可以是 `(value) => ReactNode`。
7. **动效只从 `lib/motion-presets.ts` / CSS token 取**，按意图选择（`motion.enter`、`motion.press`），禁止硬编码 duration/ease。
8. **数据必须自洽**：任何页面上的数字都要能回到账本。新增派生指标写进 `lib/finance-metrics.ts`，不要写进组件。
9. **重要功能必须浏览器验证**（见 Browser QA 规则）。
10. **必须考虑 responsive**：桌面（Sidebar + TopNav）与移动（MobileNav + Drawer + 重排后的单列）都要可用。
11. **必须实现 loading / empty / error 三态**，用全局组件表达。
12–15. 完工前依次执行并全部通过：`pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build`。
16. **不覆盖用户已有修改**。开工前确认工作区状态。
17. **不要假设代码结构**；修改尽量局部、可控、可回滚。

## 数据红线（本产品最重要的一条）

**一个账本，多处查询；绝不为某个图表单独造数。**

```
lib/finance-data.ts     声明事实：月份矩阵、科目、供应商占比、账户、客户回款纪律、账期规则、季度预算
        ↓
lib/finance-ledger.ts   展开成流水：收款 / 付款 / 开票 / 应付账单 / 内部资金调拨
        ↓
lib/finance-metrics.ts  推导：月度序列、跑道、90 天预测、预算执行、账龄、筛选与分页
        ↓
lib/finance-insights.ts 结论：把上面两层的事实变成带依据、带去处的一条条洞察
        ↑
stores/finance-store.ts 只保存"用户改了什么"（假设 / 筛选 / 分页 / 选中的凭证）
```

三条恒等式（`tests/finance-data.spec.ts` 断言，必须精确为 0）：

1. 支出矩阵 = 已付供应商款 + 未付应付
2. 收入矩阵 = 已收现金 + 未回款应收
3. 账户期末余额合计 = 期初合计 + 全部经营收付（内部调拨不计入经营现金流）

**同输入必须得到同输出**：不联网、不用 `Date.now()` 生成数据、不用未固定种子的随机数。

## 视觉构图（Design System V5 — Financial Instrument）

**层级靠构图与排版承担，不靠卡片边框。** 第一屏先给现金跑道，然后产品开口说话，再给数据、给指标，最后才是记录。

| 层级 | 承担者 | 实例（`/finance`） |
| --- | --- | --- |
| L1 | 唯一的主角：`text-metric` 大数字 + 与它共面的图形 | `CashRunwayHero` |
| L2 | 产品说的话：推导出来的结论 + 可操作的实体 | `InsightLayer` / `lib/finance-insights.ts` |
| L3 | 本月结论：由事实拼出的整句 | `MonthlyBrief` |
| L4 | 真正的数据可视化：构成条 + 视觉排行 | `AccountBalances` / `OverBudgetCategories` |
| L5 | 次级指标带：排版 + hairline + 真实迷你走势 | `MetricStrip` / `MetricItem` |
| L6 | 记录层：账本、凭证、账龄清单 | `RecentTransactions` / `DataTable` |

1. **一屏一个主角**。同一个数字在同一屏里只出现一次，且只有一种写法（万元紧凑）。
2. **`Card` 是稀缺资源**。只有真正浮在别的层之上的内容才用它：对话框、抽屉、Popover、Tooltip。需要"分量"但不需要 elevation 的区块用 `<OpenSection>` + `<SectionHeading>`。
3. **抽象容器换成语义容器**：open section + hairline / 数式排版块 / 分隔线列表 / 整块图形区。
4. **构图允许非对称**（1.38fr/1fr、1.45fr/1fr）。全部 50/50 与全部 `gap-4` 会让页面读起来像表格。
5. **一屏一个光源**。页面自带 Hero 时关掉全局环境光（`<FinanceDataBoundary ambient={false}>`）。
6. **签名交互只有一个**：拖动假设面板（收入达成率 / 成本系数 / 回款率）→ 跑道、警戒线日期、90 天曲线与洞察同时重算。其余地方保持静止。

### AI 洞察红线

- **洞察必须推导出来**：`lib/finance-insights.ts` 从账本算出科目异动、预算超支、回款风险、现金压力、成本优化与供应商集中度。换掉数据，句子里的科目、金额、百分比、日期、客户名都会变。
- **每条洞察要交代四件事**：事实（facts）、影响金额（impact，决定排序）、依据条数（evidence）、去处（target）。缺一条就不算完成。
- **洞察里的实体必须可操作**：点击落到凭证抽屉、发票详情或一个筛选好的页面。
- **词典负责措辞，代码负责事实**：`finance-insights.ts` 只产出结构化事实，文案一律经 `t.finance.insight.kind.*`。

### 中文排版红线

- **中文不使用负字距**。负 tracking 只允许出现在纯数字 token 上（`text-metric` / `text-numeric` / `.numeric`）。含中文量词、单位、日期的字符串不加 `.numeric`。
- 中文行高高于纯拉丁方案：`text-display` 1.18、`text-title` 1.3、`text-body` 1.7。
- 字体栈以 Geist 起头，再回落到 PingFang / Hiragino / YaHei / Noto，**不用拉丁字体合成中文**。
- 控件命中区不小于 24px；密集列表的行内链接用 `py-1 -my-1` 扩大命中区而不改变排版。

### 色彩方向

产品拥有两个色：**深青**（`--brand`，机构感，刻意不用"AI 紫"）与**黄铜**（`--data-accent`，预算与预测）。
图表另有一套语义色：`--data-income` 青 / `--data-expense` 陶土橙 / `--data-budget` 黄铜 / `--data-risk` 红。
**同一张图里出现的每个颜色都在回答"这条线是什么"**，而不是"这个系列排第几"。

## 文案与本地化

- 默认语言 **zh-CN**。`app/**` 与 `components/**` 里**不允许**出现硬编码的用户可见文案，一律经 `useMessages()`（服务端用 `messages`）从 `lib/i18n` 取。
- 词典负责**界面文案**；**业务记录内容**（科目名、供应商名、客户名、凭证号、摘要）留在 `lib/finance-data.ts` / `lib/finance-ledger.ts`。
- 路由 slug 保持英文（`/finance/cashflow`），界面显示中文。
- 允许保留原文的只有：品牌名、URL、邮箱、技术栈名称、SaaS 供应商产品名（GitHub / Figma / Datadog…）、凭证与发票编号、快捷键。白名单集中在 `tests/support/localization.ts`。

## Zustand 约定

- selector 只取**原始值**；派生在组件里用 `useMemo` 调用 `lib/finance-metrics.ts` 的纯函数。**禁止在 selector 里返回新数组/新对象**（zustand v5 会无限渲染）。
- 假设（assumptions）放在 store：它同时驱动第一视觉的读数、现金流页的曲线与洞察层的结论，三处必须读同一个值。

## Browser QA 规则（重要交互必做）

1. 启动应用（`pnpm dev --port 3210`）
2. 实际打开浏览器（或 `node .qa/shots.mjs` 批量截图）
3. 执行关键用户流程：跑道 → 拖假设 → 洞察跳转 → 账本筛选 → 凭证抽屉 → 登记收支 → 预算下钻 → 发票详情
4. 检查 console / page / network error
5. 截图存档（1440×900 与 390×844，浅色与深色）
6. 发现问题后修根因，最小范围修复
7. 修复后重新验证

## Quality Gates

```bash
pnpm lint        # ESLint
pnpm typecheck   # next typegen + tsc --noEmit
pnpm test        # Playwright（自动在 3210 端口起 dev server）
pnpm build       # 生产构建
```

任何一项失败：**禁止声称完成**。

## Git 工作流与安全

### Git 安全规则（红线）

Agent 默认**禁止**执行：`git reset --hard`、`git clean -fd`、`git push --force`、`git push --force-with-lease`、`git branch -D`、`git checkout .`、`git restore .`、`rm -rf`。

### Branch Strategy

- **`main` 是稳定基线**：只保存稳定、可展示、可部署版本。
- 开发一律在 **`feature/<name>`**：一个 Prototype 对应一个 feature branch。
- Agent **默认不直接在 `main` 开发**，默认**不 merge**，默认不 push main。

### Commit / Push 规则

commit 前：`git status` → `git diff --stat` → `git diff`，确认没有 secrets、`.env`、`node_modules`、`.next`、`test-results`、临时文件与无关改动；用 `git add <explicit-files>`。
commit message 使用 `feat:` `fix:` `refactor:` `style:` `test:` `docs:` `chore:`；禁止 `update` / `changes` / `final` 这类无意义信息。
push 前必须 `git branch --show-current` 确认**不是 main**，然后 `git push -u origin feature/<name>`。

## 常用命令

```bash
pnpm dev --port 3210   # http://localhost:3210 ，财务工作台在 /finance
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node .qa/shots.mjs     # Browser QA：32 张截图 + console / 横向溢出检查
```

- 开发工作流见 `skills/interactive-prototype/SKILL.md`。
- 交付工作流见 `skills/git-delivery/SKILL.md`。
