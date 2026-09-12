# Style Migration 实验 · AI Finance × prototype-kits

> **本实验的唯一问题：prototype-kits 能不能让一个真实 Prototype 换一套视觉语言，
> 而不重写产品？**
>
> 接口：`prototype-ai-finance` @ `main`（tag `v1.0.0`）
> 分支：`feature/style-cinematic-experiment`
> Pack：`cinematic`（Kits v0.1，`status: approved`）
> Kits 侧**只读**，未做任何修改。

---

## 1. Visual Manifest（写 UI 之前先写）

依据 `prototype-kits/skills/visual-direction/SKILL.md` 的顺序：读 Reference Board →
写 Manifest → 读 pack 的 SKILL → 选组件 → 应用 motion → 才写 JSX。

```json
{
  "productType": "ai-finance-console",
  "firstVisual": "Cash Runway Instrument —— 一块被左上光源照亮的浮起舞台，¥842万 现金头寸与 90 天发光预测曲线共面，警戒线是一条横穿全宽的地平线",
  "stylePack": "cinematic",
  "signatureComponents": ["animated-grid", "data-cursor", "insight-reveal"],
  "effects": ["ambient-glow"],
  "motionDirection": "atmospheric",
  "density": "medium",
  "avoid": [
    "purple-gradient",
    "glass-everywhere",
    "card-everywhere",
    "animation-everywhere",
    "generic-ai-dashboard",
    "decorative-effects-without-purpose",
    "pure-white-on-pure-black",
    "multi-hue-charts"
  ]
}
```

### 逐条理由

| 字段 | 决定 | 为什么 |
|---|---|---|
| `firstVisual` | 仍是 **Cash Runway Instrument** | 换 pack 不换产品。跑道仪表没有被降级成"普通 Hero"：它仍然是屏幕主角，只是现在由**光与深度**建立层级而不是由字号与留白。 |
| `stylePack` | `cinematic` | 任务指定。另有一个更实际的理由：Finance 的产品命题是"让现金跑道**被看见**"，而 cinematic 的命题正是"用光决定看哪里"。 |
| `signatureComponents` | **3 个，不是 5 个** | 见 §3 的选择与拒绝理由。 |
| `effects` | `ambient-glow` | 环境光是**容器级**的，一页只允许一个 —— 恰好就是主视觉舞台。 |
| `density` | `medium` | cinematic 的立场。Finance 原本偏 compact（仪表感），接受 `medium` 意味着行高变大、控件变高；这是换 pack 的真实代价之一。 |
| `avoid` | 8 条 | 其中 `purple-gradient` / `card-everywhere` / `animation-everywhere` 是 Agent 默认审美的主要拉力；`multi-hue-charts` 是 Finance 原有的图表语言，本次被 pack 的两个数据系列取代。 |

---

## 2. 集成审计（改动之前）

### 2.1 Finance 当前的视觉耦合

| 耦合点 | 位置 | 性质 |
|---|---|---|
| **语义令牌** | `app/globals.css` | 全部视觉取值的唯一来源。颜色 / 圆角 / 投影 / 环境光 / 缓动都在 `:root` 与 `.dark` |
| **Tailwind theme bridge** | `app/globals.css` 的 `@theme inline` | 把每个 CSS 变量变成工具类（`--color-surface` → `bg-surface`）。**这是本次集成能成立的关键** |
| **排版刻度** | `@theme` 的 `--text-*` | 含中文排版红线：中文字距为 0、行高 ≥1.18 |
| **间距刻度** | `--spacing-*` 语义别名 | 4px 网格 |
| **动效刻度** | `lib/motion-presets.ts` + CSS `--duration-*` / `--motion-ease-*` | 两层镜像，注释要求保持同步 |
| **环境光** | `.ambient-grid` / `.ambient-wash` / `.hero-wash` / `.surface-sheen` / `.chart-glow` utility | 硬编码在 `@utility` 里 |
| **外壳表面** | `Sidebar`（`border-r`）/ `TopNav`（`border-b` + backdrop-blur）/ `DataTable`（`ring-1`）/ `OpenSection` | 直接写 Tailwind 类 |

结论：Finance 的视觉是**高度令牌化**的，且 JSX 里**零颜色字面量**（grep 验证）。
这意味着"换一套视觉语言"可以主要发生在令牌层 —— 这正是 Kits 契约能起作用的前提。

### 2.2 可以直接映射到 Kits contract 的

| Finance | Kits 契约 | 方向 |
|---|---|---|
| `--background` / `--foreground` / `--surface` / `--elevated` / `--muted` | `--kits-color-canvas` / `ink` / `surface` / `surface-raised` | 直接引用 |
| `--brand` / `--data-accent` / `--success` / `--danger` / `--warning` | `--kits-color-accent` / `accent-2` / `positive` / `negative` | 直接引用 |
| `--border` / `--hairline` / `--input` / `--ring` | `--kits-color-rule` / `rule-strong` / `focus` | 直接引用 |
| `--chart-1..5` | `--kits-data-series-1..3` | 直接引用（**换 pack 会真的改变图表配色**） |
| `--radius` / `--radius-*` | `--kits-radius-control` / `-surface` | 直接引用 |
| `--elevation-*` | `--kits-surface-shadow` | 直接引用 |
| `--duration-*` / `--motion-ease-*` | `--kits-dur-*` / `--kits-ease-*` | 直接引用 |
| `--ambient-grid` / `--ambient-brand` / `--chart-glow` | `--kits-grid-line-color` / `--kits-ambient-key` / `--kits-color-glow` | 直接引用 |
| `--text-body` / `--text-label` | `--kits-body-size` / `--kits-label-size` | 直接引用 |

### 2.3 **不能**直接映射的（本实验的真实摩擦点）

| Finance 需要 | Kits 契约的缺口 | 处理 |
|---|---|---|
| **中文回退字体栈** | 契约只有 `--kits-font-display` / `body` / `mono`，没有"CJK 回退位"。cinematic 的栈以 `"SF Pro Display"` 开头，**中文会落到系统默认**（macOS 上是 PingFang，其他平台不一定） | Finance 在自己的 `@theme inline` 里把 `var(--kits-font-body)` **接在** CJK 栈前面 |
| **中文行高** | cinematic 的 `--kits-display-line` 是 **1.08**（"光晕需要呼吸"）。中文 40px 标题在 1.08 下会切字，Finance 的红线是 ≥1.18 | `--text-title/subtitle/heading` 保持自己的行高；**只有 `--text-display` 交给 pack**。这是"pack 与产品各负责一半"的实例 |
| **中文正字距** | cinematic 的 `--kits-display-tracking` 是 **+0.005em**。正好与"中文不用负字距"不冲突（正字距对中文安全） | display 直接继承 pack 的值 |
| **富文本 `--text-*` 层级** | 契约只提供 `display / title / body / label / data` 五档 | 由产品自己在五档之间派生（`metric` / `metric-sm` / `numeric` / `eyebrow`） |
| **浅色模式** | cinematic 原生只有深色 palette | Finance 在 `[data-kits-pack="cinematic"]:not(.dark)` 里覆盖**颜色**（Kits 允许的唯一覆盖维度），保留排版/间距/圆角/边界/动效 |

### 2.4 适合接入 Kits 的组件

`AmbientBackdrop` / `OpenSection` 的环境光层（网格）、`DataTable` 的行读数、
`InsightLayer` 的揭示节奏 —— 三者都是"结构性、可换实现、有明确产品语义"的位置。

### 2.5 **必须**保持 Finance-specific 的

`cash-runway-hero`（手写 SVG 跑道图：区间带 + 地平线 + 可固定光标，三个库都不直接支持）、
`finance-store` 的假设、`lib/finance-*` 四层账本、`DetailDrawer` /
`AddTransactionDialog` / `CommandPalette` / `FilterBar` / `Pagination`、
`MonthlyBrief` / `AccountBalances` / `OverBudgetCategories`、全部路由与 120 条测试。

**这些在本次迁移里一行未改。**

### 2.6 迁移风险（事前判断 → 事后核对）

| 风险 | 事前判断 | 实际 |
|---|---|---|
| 深色下中文可读性 | 高。cinematic 字重 ≥500、行高 1.08 | ⚠️ 部分成立：标题行高按 pack，**中文标题未切字**（17px 层级），但 68px 主数字是纯数字因此无风险 |
| 390px 横向溢出 | 高。med 密度 + 更大圆角 | ⚠️ **真的发生了**：`/finance/budget` 溢出 16px，已修（见 §6.2） |
| 触屏信息可达 | 中。`DataCursor` 在触屏完全不激活 | ✅ 零信息损失：读数只是**加速**，抽屉里仍有同样的值 |
| 浅色模式变成"灰" | 中 | ✅ 通过"加深画布 + 加强环境光 + 更沉的字色"解决 |
| 120 个测试挂掉 | 中。测试可能绑定视觉实现 | ✅ **120/120 全过，零测试改动** |
| Kits 是源码分发，类型/构建耦合 | 未预料 | ❌ **真实发生**，见 §5 |

---

## 3. Signature Components：选了 3 个，拒了 2 个

### 选中的

| 组件 | 用在哪 | 产品意义（不是"好看"） |
|---|---|---|
| **`AnimatedGrid`** | `OpenSection` 的环境层 | 主视觉需要一个**空间度量**：跑道图上那个数字要看起来"在一个有尺度的面上"。网格尺寸与线色来自 pack（64px / 白 4.5%），换 pack 自动改变 |
| **`DataCursor`** | `DataTable`（账本、最近交易） | 表格显示紧凑格式（`¥57万`），对账要精确值（`¥43,608`）。悬停行时指针带出 `PZ-202609-31 · ¥43,608 · 支出` —— **省掉一次"点开抽屉"**。这是减少交互，不是加动效 |
| **`InsightReveal`** | `InsightLayer` | AI 洞察是**叙事**（01→02→03），不是三张并列卡片。逐段揭示把阅读顺序变成可见节奏；它替换掉的 `StaggerContainer` 是在**挂载时**就播放（用户可能还没滚到那一屏） |

### 拒绝的（以及理由）

| 组件 | 为什么不用 |
|---|---|
| **`InteractiveHero`** | 它的 API 需要一个 `title`。而 Cash Runway 的"标题"是**读数**（¥842万 / 14.8 个月），不是一句话。为了用它而编一句 hero 文案，等于让装饰反过来要求内容 —— 而且 pack 自己的 `usedByStylePacks` 把 interactive-hero 标为 `cinematic: optional` |
| **`SpotlightSurface`** | 它是"指针跟随的光斑"。但跑道上已经有**全页唯一的那处发光**（`chart-glow` 打在预测曲线上），再加一个跟随光斑就是同屏两个发光体 —— 直接违反 pack 的 `multiple-simultaneous-glows` 反模式与"同屏发光 ≤1"预算。**拒绝它是一次遵守规则，不是保守** |

**Effect 预算核对**：首屏签名组件 = 1（`AnimatedGrid`，环境层；`InsightReveal` 在首屏之下）；
整页 = 3；ambient effect = 1（`ambient-glow`）；同屏发光 = 1（曲线）；
`backdrop-filter` = 2（top-nav + 移动端 top-nav，互斥出现）。

---

## 4. 实际接入了什么

### 4.1 依赖与构建

```jsonc
// package.json
"@kits/style-cinematic": "link:../prototype-kits/styles/cinematic",
"@kits/effects":         "link:../prototype-kits/effects",
"@kits/animated-grid":   "link:../prototype-kits/components/animated-grid",
"@kits/data-cursor":     "link:../prototype-kits/components/data-cursor",
"@kits/insight-reveal":  "link:../prototype-kits/components/insight-reveal"
```

```ts
// next.config.ts
transpilePackages: ["@kits/style-cinematic", "@kits/effects", …],
experimental: { externalDir: true },
turbopack: { root: path.resolve(__dirname, "..") },  // 必须：同时含 Finance 与 Kits 的那一层
```

```jsonc
// tsconfig.json —— Kits 源码内部 import 带 .ts/.tsx 扩展名
"allowImportingTsExtensions": true
```

```jsonc
// devDependencies —— 必须与 Kits 对齐
"@types/react": "19.3.0",  "@types/react-dom": "19.3.0"
```

### 4.2 文件清单：**谁来自 Kits、谁是适配层**

| 文件 | 性质 | 说明 |
|---|---|---|
| `lib/kits/finance-tokens.css` | **适配层** | Finance 语义令牌 → `--kits-*` 契约。含浅色模式的颜色覆盖 |
| `lib/kits/style-pack.ts` | **适配层** | 把 pack 的 `motion.ts` 编译成 CSS 变量并注入 `<html>` |
| `lib/kits/scene.tsx` | **适配层** | 产品 API（`SceneBackdrop` / `LedgerCursor` / `RevealSequence`）→ Kits 组件 |
| `app/globals.css` | **Finance 原有**，改了取值来源 | `@theme` 结构、工具类、base 层都保留 |
| `app/layout.tsx` | **Finance 原有** | + `data-kits-pack="cinematic"` + motion vars 注入 |
| `components/prototype/open-section.tsx` | **Finance 原有** | 网格换成 `<SceneBackdrop />`；新增 `surface` 选项 |
| `components/prototype/data-table.tsx` | **Finance 原有** | 外包 `<LedgerCursor />`；新增 `rowCursor` prop；去掉 `ring`（改用 pack 的表面） |
| `components/layout/sidebar.tsx` | **Finance 原有** | 去掉 `border-r`，改用 pack 的表面阴影 |
| `app/finance/_components/insight-layer.tsx` | **Finance 原有** | `StaggerContainer` → `<RevealSequence />` |
| `app/finance/_components/transactions-view.tsx` | **Finance 原有** | 传 `rowCursor` |
| `app/finance/_components/cash-runway-hero.tsx` | **Finance 原有** | `OpenSection` 加 `surface` |

**从 Kits 复制进 Finance 的代码：0 行。**
唯一的例外是 `style-pack.ts` 里那 13 行变量映射 —— 它是被**迫**的，见 §5 缺口 2。

### 4.3 哪些未来应当自动化

1. `link:` → 正式的 workspace / package 发布（需要 Kits 侧 `exports` 补齐，见 §5）
2. `style-pack.ts` 的手写映射 → Kits 导出 `motionToCssVars` 后一行 import
3. `next.config.ts` 的三处配置（`transpilePackages` / `externalDir` / `turbopack.root`）→
   一个 `withKits()` Next 插件，从 Kits 的 registry 自动读取需要转译的包名
4. `@types/react` 版本对齐 → 由 `withKits()` 校验并在不一致时**构建时报错**，而不是等 `tsc` 报出费解的交叉类型错误
5. 视觉验收（本实验靠人看截图）→ 保留人工，见 §8

---

## 5. Kits v0.1 的四个集成缺陷（本实验的附带产出）

> 这四条都是"接入即审计"发现的，**不是产品自己的问题**。
> 它们的共同点是：在 Kits 自己的 Playground 里完全看不出来。

### 缺口 1 —— 包**不能**用 `file:` 依赖安装

Kits 的包会 import 兄弟目录：

```
components/animated-grid/animated-grid.tsx   →  ../_shared/contract.ts
styles/cinematic/tokens.css                  →  ../_contract/tokens.css
```

而 pnpm 的 `file:` 依赖**只复制包目录本身**。复制之后 `_shared/` 与 `_contract/`
不存在 → 构建直接失败（已实测）。`file:` 与 `link:` 都是 Kits `docs/integration.md`
列出的方式 A，但只有 `link:`/workspace 真的可用。

**建议**：把契约与共享 hook 提升为一个**独立包**（`@kits/contract`、`@kits/shared`），
让每个包通过 `dependencies` 声明它，而不是靠相对路径向上爬。

### 缺口 2 —— 契约的编译函数对消费方不可达

`motionToCssVars()` 定义在 `styles/_contract/contract.ts`，但：

- pack 的 `exports` 只有 `"."`、`"./motion"`、`"./tokens.css"`、`"./manifest.json"`；
- pack 的 `index.ts` 只 re-export 了 `cinematicMotion`，**没有** `motionToCssVars`；
- 契约类型 `StylePackMotion` / `StylePackProfile` 同样没有被 re-export。

结果：消费方要么硬穿 exports 边界，要么把这 13 行映射**手抄一遍**。
本实验选了后者（并在代码里标成"本不该存在"），但这是本实验里唯一一处真正的复制。

**建议**：pack 的 `exports` 增加 `"./contract": "./_contract/contract.ts"`，
或从 `index.ts` 一并 re-export `motionToCssVars` 与两个契约类型。

### 缺口 3 —— `transpilePackages` + `externalDir` 还不够，需要 `turbopack.root`

Next 官方文档（turbopack 参考）写明：链接依赖在项目根之外时，必须把
`turbopack.root` 指到"同时包含两边的那一层"。少了它，`@kits/*` 直接解析失败：

```
Error: Module not found: Can't resolve '@kits/style-cinematic'
```

**建议**：在 `docs/integration.md` 的方式 A 一节里直接给出这段配置。

### 缺口 4 —— 链接依赖下的 `@types/react` 版本漂移会让**产品的**构建失败

```
../prototype-kits/components/insight-reveal/insight-reveal.tsx(92,7): TS2322
Type 'Ref<never>' is not assignable to type '… & … & …'
  Two different types with this name exist, but they are unrelated.
```

根因不是那句 `ref={ref as React.Ref<never>}`（虽然它确实很脆），而是：

```
Finance  node_modules/@types/react  →  19.2.18
Kits     node_modules/@types/react  →  19.3.0
```

TS 跟随符号链接到源码真实路径，于是 Kits 的文件是用**它自己那份** `@types/react`
检查的，同一次编译里出现两份 `VoidOrUndefinedOnly`。修法是把版本对齐，不是加断言。

**建议**：`docs/integration.md` 增加一节"链接依赖的版本约束"，
或由 `withKits()` 在构建时校验 React / React-DOM 类型版本一致。

### 缺口 5（组件 API）—— `step="group"` 的步进序号到不了 DOM

`InsightReveal` 用 `cloneElement(child, { style: … })` 给直接子元素写
`--kits-reveal-index`，这要求子元素把 `style` 转发到宿主元素。
产品里的子元素是 `InsightRow`（有自己的 props，不接收 `style`），于是变量被静默丢弃。
实测：

```
children[0].getAttribute("style")  →  null
--kits-reveal-index                →  ""     ← 步进彻底失效
```

**不报错、不警告，只是不生效。** 适配层用一层宿主 div 承接 style 修好了它，
但这应该是**组件文档里的一条契约要求**（"子元素必须转发 style"），
或者组件改为在自身上写序号、由自己的 CSS 用 `:nth-child()` 计算。

---

## 6. 改动清单与踩到的产品侧问题

### 6.1 视觉改动（按 pack 的十个维度）

| 维度 | 改动 |
|---|---|
| 1 排版 | 字重：主数字 600→**500**（跟随 `--kits-data-weight`）；眉标 11px/1.76px → **12px/0.96px**（跟随 `--kits-label-*`）；字体栈由 pack 决定（SF Pro / Inter 前置，CJK 回退保留） |
| 2 间距 | 脉搏 4px → **8px**（`--kits-space-unit`）；gutter 16px → **32px** |
| 3 密度 | `medium` |
| 4 圆角 | 由 pack：surface **14px**（原 16px）、control 8px；品牌方块 11px → `rounded-field` |
| 5 边界 | `border-width: 0`；侧栏 `border-r` 移除；`DataTable` 的 `ring-1` 移除；分隔仍是 1px 但读作"光边" |
| 6 表面 | 主视觉成为**浮起的面**（pack 的表面色 + 深投影 + 内高光）；面板投影由 pack 的 `ambient-glow` 取值决定 |
| 7 导航 | 侧栏从"贴边色带"变成"浮起的一层空间"（去描边 + 加投影 + 更暗的表面） |
| 8 数据语言 | 图表配色改为 pack 的 `glow-series`：收入 = `--kits-data-series-1`、支出 = `series-2`、预算 = `accent-2`、风险 = `negative` |
| 9 动效 | 时长全部来自 `motion.ts`（120/220/360/720ms，原 100/180/280/500）；缓动改为 pack 的曲线；指针视差 0.15→**1.0** |
| 10 层级 | `light-and-depth`：主视觉靠"被光照到 + 浮起"，其余靠亮度差 |

### 6.2 修掉的真实问题

| 问题 | 现象 | 修法 |
|---|---|---|
| **390px 横向溢出 16px** | `/finance/budget`：`¥3,674,000` 在 36px 字号下需要 194px，而移动端 2 列网格的单元格内容宽只有 ~130px | `--text-metric-sm` 从 `--kits-data-size`(2.25rem) 改为 **1.75rem**。pack 的 data 档是"一个读数"的尺寸，不是"次级指标带里数字"的尺寸 —— 契约没有为这个层级留位置 |
| **步进失效** | `--kits-reveal-index` 到不了 DOM（见 §5 缺口 5） | 适配层用宿主 div 承接 |
| **`.dark` 特异性不足** | 浅色覆盖写在 `:root, [data-kits-pack]`（0-1-0）上，`.dark`（0-1-0）会输给 `:root` 那一半 | 浅色改写为 `[data-kits-pack="cinematic"]:not(.dark)`（0-2-0），深色 `[data-kits-pack="cinematic"].dark` |
| **`--text-metric-sm` 语义错位** | 见上 | 见上 |

### 6.3 明确**没有**改的

- `lib/finance-data.ts` / `finance-ledger.ts` / `finance-metrics.ts` / `finance-insights.ts` —— 四层账本
- `stores/finance-store.ts`
- 全部路由、筛选、Command Center、抽屉、对话框、分页、i18n
- `cash-runway-hero` 的 SVG 图表逻辑、假设滑杆、情景预设
- `lib/i18n/zh-CN.ts` 的任何文案
- **120 个 Playwright 测试：一行未改**

---

## 7. 验证

| 门 | 结果 |
|---|---|
| `pnpm lint` | ✅ 0 error / 0 warning |
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm test` | ✅ **120 passed**（与 `main` 基线完全相同，无测试改动） |
| `pnpm build` | ✅ 全部路由静态产出 |
| Browser QA | ✅ 8 路由 × 2 视口 × 2 配色：0 console / 0 page / 0 request / 0 横向溢出 |

### 组件行为的浏览器实测

| 检查 | 结果 |
|---|---|
| `DataCursor` 激活 | `data-kits-active="true"`，标记 12 行，环标签 = `PZ-202609-31 · ¥43,608 · 支出`，`--target-inspect` 形态正确 |
| 系统光标 | 标记区域内 `cursor: none`，其余元素 `cursor: default`（**只在标记区隐藏**） |
| 触屏降级 | `data-kits-active="false"`，指示器**渲染 0 个节点**，系统光标保留（`pointer`） |
| `AnimatedGrid` | `aria-hidden="true"`、`pointer-events: none`、`--kits-grid-cell-size: calc(64px * 2)`、`data-kits-motion="drift"` |
| `InsightReveal` | 视口外 `data-kits-visible="false"` → 滚入后 `true`、子元素 opacity 1；`--kits-reveal-index` = 0 / 1 / 2 |
| `prefers-reduced-motion` | `kits-reveal--animated` **不存在**、内容 opacity 1、网格 `motion="none"`、`--kits-pointer-factor: 0`、`--kits-dur-base: 0s` |
| 动效真的来自 pack | 同一个导航项：`main` 的 `transition-duration: 0.15s` → 本分支 **`0.22s`**（= `--kits-dur-quick` 220ms） |

---

## 8. 哪些步骤必须保持人工 Art Direction

自动化能保证"装上了、没坏、降级正确"，但**不能**保证"好看、是这套语言、有焦点"。
本次以下判断全部由人做，且**不应**自动化：

1. **`firstVisual` 那一句话** —— "第一眼看到什么"是产品主张，不是可枚举的配置
2. **浅色模式的取向** —— Kits 只给了深色 cinematic。把它扩展成"明亮影棚"是一次
   **设计决定**（加深画布、加强光、更沉的字色），不是一个映射规则
3. **拒绝哪些组件** —— 拒绝 `SpotlightSurface` 的依据是"同屏发光 ≤1"这条审美判断，
   工具可以检查数量，但不能判断"这个光应该给谁"
4. **主视觉是否仍然是主角** —— 需要看图，不能看 DOM
5. **"像不像另一支团队做的"** —— 这是本次交付里唯一无法被断言的目标

可以安全自动化的：依赖与构建配置（缺口 1/3/4）、变量映射（缺口 2）、
降级检查、横向溢出、动效时长来源、组件数量预算。
