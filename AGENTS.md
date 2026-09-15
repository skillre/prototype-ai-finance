<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 智悟云 · AI 财务工作台 — Agent Instructions

这是一个**由 Prototype Factory 生产的独立原型**：只做「Frontend + local state + realistic ledger data」。
它从 `prototype-starter@v1.0.0` 继承了工厂基础设施与设计系统，并替换掉了上一个产品的业务实现。
治理层在 2026-09-15 对齐到 **Factory Core Policy v1.3.0**：管理块、`factory-policy.json`、
三份契约（init / product / visual-manifest）、LOCAL+REMOTE Browser QA 与自包含 CI 均已落地，
来源与未知项记录在 `factory.lock.json`。

## 项目边界

- ✅ Next.js 16 App Router · TypeScript · Tailwind v4 · pnpm
- ✅ shadcn/ui（**base-nova 风格，基于 Base UI**，而非 Radix）· Motion 13 · Zustand 5 · Recharts 3 · Playwright
- ✅ **DSH 宿主侧的多 Subagent 编排**：允许并要求 —— 边界与判据见下方 `factory-core-policy` 管理块。
- ✅ GitHub Actions **只作为 CI 质量门**（`.github/workflows/ci.yml`）：`factory:agents` → `factory:init` → `factory:contract` → lint / typecheck / build / test / qa。部署仍由 Vercel Git Integration 负责，**CI 不部署**。
- ❌ 禁止加入 Database / Supabase / Authentication / Docker / Kubernetes / Monorepo / Turborepo / Microservices / Backend service / MCP / Cloudflare / 任何新的 deployment platform。这些以后再处理。
- ❌ 禁止在**产品应用代码**里引入编排框架或编排运行时 —— 这才是 v1.2 那句「Multi-agent orchestration」真正要守的东西。宿主侧的 Subagent 调用不是产品代码，不受此限。
- ❌ 禁止 Vercel API & CLI automation（deployment token / bypass secret / `vercel` 命令自动化）：部署授权是人的决定，不是构建的副作用。

<!-- BEGIN:factory-core-policy v1.3.0 -->
> 本块由 `pnpm factory:agents --print-block` 从 `factory-policy.json` 渲染，`pnpm factory:agents` 逐字校验。
> **不要手工编辑块内文字**：改 `factory-policy.json`（其关键值由 `lib/factory-policy.schema.json` 钉住），再同步本块。块外仍是人类写的文档。

## Factory Core Policy v1.3.0（Agent 编排与并发）

- **Agent 编排边界（是边界，不是禁令）**：**允许并要求**在 **DSH 宿主**内用多 **Subagent** 拆分与并行任务；
  **禁止**在**产品应用代码**里引入编排框架或编排运行时。
  - 允许：宿主内拆分/并行只读或彼此独立的任务；宿主的 Subagent 调用不属于产品代码。
  - 禁止：产品应用代码及其运行时依赖（app/components/lib/hooks/stores/scripts）里出现 agent framework / orchestrator runtime / 多 agent 调度依赖。
  - 判据：`app` `components` `lib` `hooks` `stores` `scripts` 不得 import 编排 SDK；`package.json` 的运行时依赖不得出现编排框架。宿主侧的 Subagent 调用不是产品代码，不受此限。
- **模型路由**：provider `opencode-go-dsv41` / model `deepseek-flash` / reasoning effort `max`（2026-09-15 与 DSH 模型目录核对）。Subagent 默认走这条路由；改路由先改 `factory-policy.json`。
- **单 worktree 单写者**（`single-writer`）：同一棵工作副本同一时间只有一个写者；要并行写就各自独立 worktree。两个写者共享一棵树，冲突不是概率问题，是时间问题。
- **共享路径单 owner**（`single-owner`）：`AGENTS.md`、`package.json`、`factory-policy.json`、`factory.lock.json`、契约 schema 与门禁脚本这类共享面，同一时间只有一个 owner，其余 agent 只读。
- **test / qa 串行**（`serial`）：`pnpm test` 与 `pnpm qa` **永不并发**（Next 16 dev server 按项目加锁，并行只会在错误的 server 上出结果）。CI 里同样不得拆成两个并行 job。
- **HVA（人工视觉验收）**：`required-before-release` —— 没有 HVA 就没有发布；Agent 不能替人验收，未完成时状态只能是 `READY FOR HUMAN VISUAL ACCEPTANCE`。
- **部署授权**：`explicit-user-authorization` —— 源码发布 ≠ Production 部署。没有用户明确授权，不创建/提升 Production 部署、不改 Deployment Protection、不 push Production Branch。详见 `docs/vercel-bootstrap.md` 第 0 节与 `docs/release-runbook.md`。

机器可读副本：`factory-policy.json` · 关键值：`lib/factory-policy.schema.json` · 基线锁：`factory.lock.json` · 校验器：`scripts/guard-agent-policy.mjs`（`pnpm factory:agents`）。
<!-- END:factory-core-policy -->

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
12–15. 完工前依次执行并全部通过：`pnpm factory:agents` → `pnpm factory:init` → `pnpm factory:contract` →
`pnpm factory:manifest` → `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build` → `pnpm qa`
（`pnpm check` 把前五项合成一条命令；test 与 qa 串行，永不并发）。
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

这三条**正式登记**在 `product-contract.json`（id：`ledger.expense-reconciles` /
`ledger.revenue-reconciles` / `ledger.balance-rolls-forward`），并且由
`tests/finance-data.spec.ts` 里的 `invariant()` 登记同一个 id。
`pnpm factory:contract` **双向核对**：声明了没登记 → FAIL；登记了没声明 → FAIL。
断言是原来的那几条，一字未改 —— 这里补的是「它们在契约里有正式的家」。

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
- 中文行高高于纯拉丁方案：`text-title` 1.3、`text-subtitle` 1.4、`text-heading` 1.45、`text-body` 1.7。
  **例外是 `text-display`**：它整层交给 pack（cinematic 1.08），因为那一层是纯数字与大标题 ——
  这是 `visual-manifest.json` 里记录在案的 `typography` 偏离，理由同时写在 `app/globals.css` 的令牌注释里。
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

## 视觉方向（由 Prototype Kits 负责 · Visual Manifest）

**Factory 不规定 Prototype 长什么样。** 本产品已经做出的视觉决定记录在 `visual-manifest.json`：

| 决定 | 取值 | 凭据 |
| --- | --- | --- |
| 产品类型 | `ai-finance-console` | 本仓 IA：七个财务路由 + 命令中心 |
| 第一视觉 | 现金跑道仪表：大数字 / 90 天推演 / 警戒线地平线共用同一屏 | `app/finance/_components/cash-runway-hero.tsx` |
| Style Pack | `cinematic` | `lib/kits/kits.lock.json` 的已安装资产 |
| 签名组件（上限 3） | `animated-grid` · `data-cursor` · `insight-reveal` | 同上 + README「视觉语言」一节 |
| 效果包 | `ambient-glow` | 同上 |
| 动效语言 / 密度 | `atmospheric` / `medium` | pack manifest 的 `motion.language` / `profile.density`（L3 已比对一致） |
| 有意偏离 | `typography`（display 交给 pack，其余层级保留中文行高）· `color`（浅色 + 深色双主题） | `visual-manifest.json` 的 `deviations`，各带理由 |

- **没有 Manifest 就开始写 JSX = 违规。** `pnpm factory:manifest` 校验 L1 结构 / L2 Factory 自洽 /
  L3 与所选 pack 的 profile 比对；Kits 检出不在场时它报告 `[upstream-unavailable]` 并**明说没做上游比对**。
- **`firstVisual` 与 `avoid` 是强约束**：`avoid` 里的五项（`ai-purple`、`card-everywhere`、
  `card-borders-for-hierarchy`、`chat-window`、`symmetric-50-50-grid`）不是偏好，是禁止项。
- **偏离是记录，不是自动批准**：改视觉方向先改 `visual-manifest.json`，再改代码；链接轴（`density` / `motion`）还必须与对应字段一致。
- **Art Direction 是人工检查点**：选哪个 pack、第一视觉是什么、明确不要什么 —— Agent 不能替人决定，也不能不记录就跳过。
- 风格创作语义见 `lib/kits/installed/cinematic/SKILL.md`；Browser QA 标准见 `docs/browser-qa.md`。

## Product Semantic Contract（产品语义不变量）

**视觉回答「长什么样」；语义回答「绝不能搞错什么」。两者分开。**

`product-contract.json` 是产品语义约束的登记面，**不是** Visual Manifest 的一部分。
本产品登记三条（都是账本恒等式，见上方「数据红线」），全部 `enforcement: "test"`，
由 `tests/finance-data.spec.ts` 的 `invariant()` 登记同一个 id。

- **id 机器可读、与语言无关**（点分小写 kebab），不依赖中文文案，也不依赖测试标题；
- `pnpm factory:contract` **双向核对**：声明了没登记 → FAIL；登记了没声明 → FAIL；
- **Factory 不生成、不推断、不改写任何一条**：不许从代码猜 invariant、从 UI 猜状态机、自动生成 statement 或领域测试。
  判断是人做的 —— 新增一条不变量 = 先写进契约，再用 `invariant()` 包住真正持有它的测试。

## Initialization Boundary（初始化边界）

`prototype-starter` 里有三种东西，本仓对它们的处置不同，边界是机器可读的
（`init-contract.json` + `pnpm factory:init`，本仓 `stage: "product"`）：

| 层 | 路径 | 本仓的处置 |
| --- | --- | --- |
| **A · Factory Core** | `components/**` `lib/**` `scripts/**` `.qa/**` `hooks/**` `stores/**` `skills/**` | **保留**；治理升级时按 Factory Core 边界补齐（v1.3 补齐的是契约 / 门禁 / QA / CI） |
| **B · Reference Sample** | `app/crm/**` `app/demo/**` `app/_sample/**` `app/sample-command-center.css` 与示例测试 | **已删除**（`1f1ba9a`「remove the previous product's implementation」）。`sampleOwned` 仍然列出这些路径：那是边界声明 —— 若它们回来，身份豁免只在那里面生效，默认 `excluded = 0` |
| **C · Initialization Surface** | `package.json` `README.md` `app/layout.tsx` `app/page.tsx` `app/not-found.tsx` `lib/i18n/zh-CN.ts` | **本产品的身份**；六个文件逐个被读，不得残留 baseline 或 Sample 的名字 |

- `sampleMarkers` 在本仓是 `云图分析` / `yuntu.cn`（上一个产品的名字）与 `原型工作台` / `data-factory-landing`
  （baseline 的身份）—— **不包含 `智悟云` 与 `zhiwu.cn`**，因为那两样是本产品自己的品牌与业务记录。
- 0 scanned 不能 PASS：声明了却读不到的文件会让门禁失败，而不是被跳过。

## Kits Ownership Contract

Factory 不 vendor 任何 Kits 内容，只集成**调用机制**。本仓的安装状态：

| 路径 | 归属 |
| --- | --- |
| `lib/kits/installed/` | **Kits-managed** —— 重新安装会整体覆盖 |
| `lib/kits/.kits/` | **Kits-managed** tooling |
| `lib/kits/kits.lock.json` | **Kits-managed** state（安装状态的唯一凭据：来源 commit + 逐文件 checksum） |
| `lib/kits/adapters/` | **Product-owned** —— Kits 永不覆盖 |

- **禁止手工修改 `installed/`。** 需要升级 = 重跑 `kits add`，不是手工 patch asset。
- **产品代码不得直接 import `installed/*`。** 必须走 `Product → adapters → installed`（`@/lib/kits/adapters/*`）。
- 本产品用 **Source Installation**：没有 `@kits/*` 依赖、没有 `link:`、不需要 `transpilePackages` /
  `externalDir` / `turbopack.root`。把 `prototype-kits` 仓库移走，typecheck / test / build 仍然通过。
- 完整记录见 `docs/kits-integration.md`。

## 部署授权与发布（Vercel）

**部署模型是 Vercel 自身的 Git 集成，不是 CI。** `.github/workflows/ci.yml` 只做质量门：
不调用 Vercel CLI、不持有部署凭据、不创建 Preview/Production。

没有**明确授权**时，不得：创建 Vercel Project · link project · 修改 Production Branch ·
修改 Deployment Protection · 创建 Production deployment · 把 Preview 提升为 Production ·
创建 automation bypass secret · push 到 Production Branch。

另外五条：

1. **部署身份必须核验 `target` / `git ref` / `git SHA` / `readyState`，不得靠 URL 推断。**
2. **受 SSO 保护的 URL 不得称为 public。** 只有匿名请求 2xx 才支持 "public" 这个说法；
   受保护（302 → SSO / 401 / 403）既不是部署失败，也不是 public。
3. **不允许先 push 再 cancel。** Production 建起来之后 cancel 不是回滚。Production Branch 未知也是 STOP。
4. **`vercel curl` 会顺带创建 automation bypass secret。** 执行前说明，或执行后立即披露它是否仍然存在 ——
   不得当成普通 curl 处理。
5. **不要读、不要写、不要打印任何 token 值。**

```bash
pnpm factory:deploy actions     # 授权矩阵：哪些动作需要用户明确授权
pnpm factory:deploy preflight --branch <b> [--production-branch <p>] [--authorized]
pnpm factory:deploy verify --deployment <json> --rc <accepted-sha>
pnpm factory:deploy access --status <code> [--location <url>]
```

### 发布（RELEASE）

**发布不是一次 push，是一个 commit 依次过门**：

```
RC SHA → 本地门禁 → Preview(同一 SHA) → 在线 QA → 人工视觉验收
       → 源码发布 → Production(同一 SHA) → annotated tag → housekeeping
```

- **RC 是一个明确的 SHA**，不是「feature branch 上最新的 commit」。定了 RC 就不要再往同一分支推新 commit。
- **状态不是布尔**：`NOT READY` → `READY FOR HUMAN VISUAL ACCEPTANCE` → `READY TO RELEASE SOURCE`
  → `READY TO DEPLOY PRODUCTION`。**没有 `READY FOR RELEASE` 这个状态**：
  HVA 未完成时只能是 `READY FOR HUMAN VISUAL ACCEPTANCE`。
- **源码发布 ≠ Production 部署。** merge `main` 与「创建 Production deployment」是两次独立授权。
- **在线 QA 跑在部署上**（`pnpm qa:online`）：本地绿了不等于部署上是对的。REMOTE 模式是**观察者**：
  不部署、不 promote、不 merge、不 tag、**不创建 bypass token**；secret 只能由用户提供，不打印、不持久化、不提交。
- **Production 验收是多证据**：target / ref / SHA == RC / alias 正在服务 / 核心路由 HTTP / Production 在线 QA。
  `readyState: READY` 必要但不充分；平台的 `live` 字段**不作为判据**。
- **tag 必须是 annotated，且 target == 已验收 RC SHA**；**不要 `git push --tags`**。
- **housekeeping 不是可选项**（九项）：bypass secret 是否已清理（确认 automation bypass secret 是否仍然存在）·
  临时 credential 是否清理 · Deployment Protection 未被改动 · working tree clean · local/origin/tag SHA 对齐 ·
  截图与报告不在 repo 内 · 被取消的 deployment 只作历史 · feature branch 去留已决定 ·
  文案/polish 进 backlog（**不偷偷塞进已验收的 SHA**）。

完整顺序见 `docs/release-runbook.md`；Vercel 侧的授权边界见 `docs/vercel-bootstrap.md` 第 0 节。

## Browser QA 规则（重要交互必做）

**源码读得再仔细也不是验证。** 本仓的 Browser QA 是**一套 sweep、两个 origin**：

```bash
pnpm qa                     # LOCAL_MANAGED：自己起 server、自己停（端口 3210）
pnpm qa --routes=/finance   # 只扫一个子集
pnpm qa:online --base-url=<url> --identity=<deployment.json> --expect-sha=<rc-sha>   # REMOTE：观察者
```

`pnpm qa` 扫全部路由 × 桌面 1440×900 / 移动 390×844 × 浅色 / 深色，要到达的状态是：

```
0 console error · 0 page error · 0 request failure · 0 横向溢出 · 0 viewport expansion
```

同一份 `.qa/sweep.mjs` 同时服务 LOCAL 与 REMOTE —— **不是两套真相**：探针、判据、矩阵、
style-presence 通道、DOM == AX 配套扫描全部复用，只有 origin 不同。

### 人工流程仍然要做

1. `pnpm dev --port 3210`，实际打开浏览器
2. 走关键用户流程：跑道 → 拖假设 → 洞察跳转 → 账本筛选 → 凭证抽屉 → 登记收支 → 预算下钻 → 发票详情
3. 截图存档（1440×900 与 390×844，浅色与深色）—— `node .qa/shots.mjs` 批量截图，
   `node .qa/kits-qa.mjs` 走 Kits 组件（含 reduced-motion / 触屏降级探针）
4. 发现问题后修根因，最小范围修复，再重新验证

### 四类必须知道的判据（细节见 `docs/browser-qa.md`）

- **移动端三条判据一起查**：只比 `scrollWidth - innerWidth` 是**盲的** —— Chromium 会为了容纳溢出
  内容把布局视口一起放大，差值接近 0 而页面已经横向滚动。必须同时满足
  `abs(innerWidth - 请求宽度) <= 1`、`scrollWidth <= 请求宽度 + tolerance`、`scrollTo(9999,0)` 后 `scrollX ≈ 0`。
- **No Invisible Semantics**：对 `button` / `link` / `heading`，DOM 贡献语义的元素数必须等于无障碍树里该 role 的节点数；
  配套的「`aria-hidden` 宿主内不得有可交互内容」扫描**必须同时存在**（剪枝会从两侧一起移除节点，只查 DOM==AX 会静默通过）。
- **Probe Integrity**：`0 / 0 = NaN`，而 `Math.abs(NaN - x) > tolerance` 是 `false` —— 断言会静默通过。
  所以所有数值探针都经 `.qa/probe-guard.mjs` 的 `measure()`；selector 未命中 / 非有限值 → **fail loudly**。
  「没量到」永远不等于「满足条件」。
- **Style Presence**：App Router 按模块图打包 CSS，某条路由没 import 那份样式表就永远到不了浏览器 ——
  不报错、不警告、DOM 完整、按 testid 的断言全部通过。sweep 因此把每条路由与**同一个浏览器**里渲染的
  **未加样式基线**做差，要求至少在 `stylePresenceMinChannels` 个独立样式域上有差异。

### Port Isolation（不可协商）

**Playwright 的 `reuseExistingServer` 会接受任何以 2xx/3xx 应答就绪 URL 的 server，不做身份校验。**
端口 3000 是 Next 的默认端口，一个残留或不属于本项目的 server 会被当成"被测应用"，
整套断言在**错误的页面**上通过——而且不报错。

- 端口唯一来源是 `.qa/qa.config.mjs` 的 `QA_PORT = 3210`；`playwright.config.ts` 与 `.qa/browser-qa.mjs` 都读它。
- **`reuseExistingServer: false`，永远**（不是 `!process.env.CI`，也不是任何环境变量开关）。
- `scripts/check-qa-port.mjs` 是 pre-flight 守卫，已接进 `pnpm test`：端口被占用时**fail loudly** 并给出定位命令。
- **禁止** `pkill -f "next dev"` / `pkill -f "next-server"`：它们会误杀同机其它原型。
  端口被占用时用 `lsof -nP -iTCP:3210 -sTCP:LISTEN` 定位，确认那确实属于当前任务再单独停止它。
- **`pnpm test` 与 `pnpm qa` 不能同时运行**：Next 16 的 dev server 是**按项目**加锁的（`.next/dev/lock`），
  不是按端口。CI 里两者也是串行 job（`browser-qa: needs: quality-gate`）。

### 在线 QA（REMOTE）

**本地绿了不等于部署上是对的。** `pnpm qa:online` 用同一份 sweep 扫一个**已经存在**的 URL：

- **只观察，不编排**：不部署 · 不 link · 不 promote · 不 merge · 不 tag · **永不创建 bypass token** ·
  不启动本地 server · 不持久化任何凭据；
- secret 只能由用户通过 `QA_ONLINE_BYPASS_SECRET` 提供（作为请求头），**不打印、不持久化、不提交**；
  没有 secret 时 runner 停下来说明，不报假绿；
- **身份先于 QA**：给了 `--expect-*` 却没给 `--identity` → 不跑；期望值与部署记录不一致 → **跑 QA 之前** STOP。

### T1：dev-server manifest 竞态不是产品缺陷

只在 Turbopack dev server 下出现、日志里是路由 manifest 的 JSON 解析错误（读到写入中的文件）、
**重跑即绿**，且从未在 `next start` / Preview / Production 上复现 —— 三条同时成立才算 T1：
**重跑一次并记录，不要去改产品**。**「跑得慢」不等于 T1**；任何一条不成立就按真实失败处理。

## Quality Gates

任何改动在「完成」之前必须全部通过：

```bash
pnpm lint        # ESLint
pnpm typecheck   # next typegen + tsc --noEmit
pnpm test        # Playwright E2E（端口守卫 + 自管 server，端口 3210）
pnpm build       # 生产构建
pnpm qa          # Browser QA 全量扫描（自管 server，端口 3210）

pnpm factory:agents    # 策略门禁：编排边界 / 管理块 ↔ factory-policy.json / schema 关键值 / lock / CI 契约
pnpm factory:init      # 初始化边界：stage=product 的身份残留扫描
pnpm factory:contract  # 产品语义不变量：声明 ↔ 测试登记，双向核对
pnpm factory:manifest  # Visual Manifest：L1 结构 + L2 自洽 + L3 与 pack 比对
pnpm factory:deploy    # 部署授权与身份（actions / preflight / verify / access）
pnpm qa:online         # 在线 QA（REMOTE 观察者；需要用户提供 URL 与凭据）
```

任何一项失败：**禁止声称完成**。`pnpm check` 会依次跑
`factory:agents` → lint → typecheck → test → build → qa，**策略门禁是第一项**；
`pnpm test` 与 `pnpm qa` **串行**，永不并发。

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
pnpm test              # Playwright E2E：端口守卫 + 自管 dev server（3210）
pnpm build
pnpm qa                # Browser QA 全量扫描（LOCAL：自己起 server、自己停）
pnpm check             # factory:agents → lint → typecheck → test → build → qa

pnpm factory:agents    # Agent 策略门禁（--print-block 同步 AGENTS.md 管理块）
pnpm factory:init      # 初始化边界：product stage 的身份残留
pnpm factory:contract  # 产品语义不变量：声明 ↔ 测试登记
pnpm factory:manifest  # Visual Manifest（L1 结构 / L2 自洽 / L3 与 pack 比对）
pnpm factory:deploy    # 部署授权与身份（actions / preflight / verify / access）
pnpm qa:online         # 在线 QA（REMOTE 观察者：只扫已存在的 URL，不部署、不建 token）

node .qa/shots.mjs     # 人工 QA 截图：32 张 + console / 横向溢出检查
node .qa/kits-qa.mjs   # Kits 组件的人工 QA：reduced-motion / 触屏降级探针
```

- 开发工作流见 `skills/interactive-prototype/SKILL.md`。
- 交付工作流见 `skills/git-delivery/SKILL.md`。
- 发布顺序见 `docs/release-runbook.md`；部署授权边界见 `docs/vercel-bootstrap.md`。
