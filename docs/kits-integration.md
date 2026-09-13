# AI Finance × Prototype Kits —— Source Installation 集成记录

> 分支：`feature/style-cinematic-source-install`（从 `main` @ `852b996` 干净重做）
> Kits：`prototype-kits` **v0.1.0** → **v0.1.1** · `main` @ `64279eaf` → `9988c958`
> 结论：**Delivery Mode（Source Installation）成立** —— 产品不再需要 Kits 仓库在场。
>
> **v0.1.1 回归已完成**：本文第一 ~ 十一节是 v0.1.0 的原始集成记录（保留为证据链），
> 第十二节是 v0.1.1 正式安装后的逐项复测与修复确认。

---

## 一、这次要回答的问题

第一次集成实验（`feature/style-cinematic-experiment`）验证了「Kits 能不能让一个真实
Prototype 换一套视觉语言而不重写产品」，但它用的是 **Development Mode（Local Link）**：
`link:../prototype-kits` + `transpilePackages` + `experimental.externalDir` +
`turbopack.root` + `allowImportingTsExtensions`。

那套配置的代价是**产品与 Kits 的目录结构、React 类型版本强耦合**，而且
`pnpm install` 之后产品仍然指向同机的另一个检出 —— 它不能被独立交付。

本次要证明的是另一件事：

> **`kits add`（Source Installation）本身足够完成这次集成** ——
> 不依赖兄弟目录、不需要任何 Next 配置、不存在 `@kits/*` 运行时依赖、
> 把 `prototype-kits` 整段移走之后产品仍能独立 typecheck / test / build。

---

## 二、交付链路

```
app/globals.css
  └─@import ../lib/kits/adapters/finance-tokens.css    ← 产品所有（令牌桥接）
       ├─@import ./style-cinematic.css                 ← kits add 生成（Style Pack 缝）
       │    └─@import ../installed/cinematic/tokens.css
       │         └─@import ../contracts/tokens.css      ← 契约的中立兜底值
       └─@import ./effect-ambient-glow.css             ← kits add 生成（Effect 缝）
            └─@import ../installed/ambient-glow/ambient-glow.css

app/layout.tsx
  └─ import { stylePackMotionVars } from "@/lib/kits/adapters/style-pack"
       ├─ ../installed/contracts/index  → motionToCssVars()   ← Kits 自己的编译函数
       └─ ../installed/cinematic/index  → cinematicMotion     ← pack 的 motion.ts

components/** · app/**
  └─ import { SceneBackdrop, LedgerCursor, RevealSequence } from "@/lib/kits/adapters/scene"
       ├─ ./animated-grid   → ../installed/animated-grid/index
       ├─ ./data-cursor     → ../installed/data-cursor/index
       └─ ./insight-reveal  → ../installed/insight-reveal/index
```

**整条链全在仓库内部。** 没有任何一跳指向 `../prototype-kits`。

---

## 三、`kits add` 装了什么

```bash
node <kits>/packages/cli/kits.mjs add \
  --target /Users/skillre/ai-prototypes/prototype-ai-finance \
  --style cinematic \
  --components animated-grid,data-cursor,insight-reveal \
  --effects ambient-glow
```

### 资产解析（8 个，含自动补齐的依赖）

| 资产 | 类型 | 版本 | 来源 |
| --- | --- | --- | --- |
| `cinematic` | style | 0.1.0 | 直接请求 |
| `animated-grid` | component | 0.1.0 | 直接请求 |
| `data-cursor` | component | 0.1.0 | 直接请求 |
| `insight-reveal` | component | 0.1.0 | 直接请求 |
| `ambient-glow` | effect | 0.1.0 | 直接请求 |
| `contracts` | package | 0.1.0 | ← 依赖（被 `cinematic` 拉入） |
| `react-utils` | package | 0.1.0 | ← 依赖（被三个组件拉入） |
| `cli` | package | 0.1.0 | ← 隐式依赖（装完之后产品要能自己跑 `kits doctor`） |

依赖边：`cinematic→contracts` · `animated-grid→react-utils` · `data-cursor→react-utils` · `insight-reveal→react-utils`

### 落盘

- **42 个托管文件** 写进 `lib/kits/installed/` 与 `lib/kits/.kits/`
- **6 个适配层文件** 生成在 `lib/kits/adapters/`（0 个被保留覆盖）
- `lib/kits/kits.lock.json`

安装器做的关键改写：

| 安装前（Kits 仓库里） | 安装后（产品里） |
| --- | --- |
| `import type { StylePackMotion } from "@kits/contracts"` | `from "../contracts/index"` |
| `import { cx } from "@kits/react-utils"` | `from "../react-utils/index"` |
| `@import "@kits/contracts/tokens.css"` | `@import "../contracts/tokens.css"` |
| `./animated-grid.tsx`（带源扩展名） | `./animated-grid`（**剥掉 `.ts` / `.tsx`**） |

最后一条是 `allowImportingTsExtensions` 能从产品消失的直接原因：Kits 源码内部
带 `.ts`/`.tsx` 说明符，安装器在写盘时把它们剥掉，因此产品的 tsconfig 一行不用改。

### `kits.lock.json` 摘要

```json
{
  "schemaVersion": 1,
  "registryVersion": "0.1.0",
  "source": {
    "kind": "source-installation",
    "repo": "prototype-kits",
    "commit": "64279eaf56bb7dd19daad96f1bcf43950256f8fe",
    "dirty": false
  },
  "layout": { "installedRoot": "lib/kits/installed", "adapterRoot": "lib/kits/adapters",
              "agentRoot": "lib/kits/.kits", "lockFile": "lib/kits/kits.lock.json" },
  "assets": [ 8 项，每项含 id / type / version / status / apiVersion / files[] ],
  "dependencies": [ 4 条依赖边 ],
  "files": [ 42 项，每项 { path, checksum(sha256 前 16 位), assetId } ]
}
```

**来源可追踪**：`source.commit` = `64279eaf…`，即发布 tag `v0.1.0` 指向的提交。
`kits doctor` 会把它读回来核对（`lock-source 来源 commit 64279eaf`）。

---

## 四、目录与所有权

```
lib/kits/
├── installed/        Kits 托管区（42 个文件）—— 重新安装会覆盖，产品只读
├── adapters/         产品托管区（11 个文件）—— Kits 永不覆盖
│   ├── style-cinematic.css       ← kits add 生成：Style Pack 的 CSS 缝
│   ├── effect-ambient-glow.css   ← kits add 生成：Effect 的 CSS 缝
│   ├── animated-grid.tsx         ← kits add 生成：组件缝
│   ├── data-cursor.tsx           ← kits add 生成
│   ├── insight-reveal.tsx        ← kits add 生成
│   ├── README.md                 ← kits add 生成
│   ├── finance-tokens.css        ← 产品手写：语义令牌 → 契约变量
│   ├── style-pack.ts             ← 产品手写：motionToCssVars
│   └── scene.tsx                 ← 产品手写：产品语义组件 API
├── .kits/            Installer 自身副本（9 个文件）—— 让产品脱离 Kits 仓库也能跑 doctor/diff
└── kits.lock.json    安装清单
```

两个目录、两种所有权。产品代码只 import `adapters/`；只有 `adapters/` 里的三个
手写文件（以及生成的缝）允许碰 `installed/`。升级 Kits（覆盖 `installed/`）不会
碰到产品写的任何一行。

---

## 五、Product Adapter

三个产品手写的适配层，全部基于**已安装源码**，不依赖 Kits 仓库：

### 1. `adapters/finance-tokens.css` —— 令牌桥接

Finance 的 76 个语义令牌（`--background` / `--brand` / `--hairline` / `--data-income` …）
全部改为指向 `--kits-*` 契约变量。**所有 JSX 与类名一行没改。**

- 浅色：`[data-kits-pack="cinematic"]:not(.dark)`（0-2-0）稳定压过 pack（0-1-0），
  与深色块同特异性、靠源码顺序决胜 —— 不依赖打包顺序。
- 深色：**几乎什么都不写**。仅有的三处环境光取值不是手写字面量，而是从 pack 的
  palette 推导：`color-mix(in srgb, var(--kits-color-accent) 16%, transparent)` 等，
  与效果包自带字面量逐位相同，但换 pack 时会跟着变。

### 2. `adapters/style-pack.ts` —— 动效刻度

```ts
import { cinematicMotion } from "../installed/cinematic/index";
import { motionToCssVars } from "../installed/contracts/index";

export const stylePackMotionVars: Record<string, string> = motionToCssVars(cinematicMotion);
```

**第一次实验里那 13 行手抄的变量映射，在这里不存在。**
`motionToCssVars()` 现在是被安装的 `@kits/contracts` 的公开导出，产品直接调用它，
数值一个都没有落在产品里。

### 3. `adapters/scene.tsx` —— 产品语义组件 API

产品只说 Finance 的语言（`placement="hero" | "board"`、`<LedgerCursor>`、
`<RevealSequence>`），Kits 的参数组合收在这一层。`app/**` 与 `components/**`
里没有任何 Kits 路径。

---

## 六、与第一次实验（Local Link）的逐项对照

| 项 | 第一次实验（Local Link） | 本次（Source Installation） |
| --- | --- | --- |
| `package.json` | 5 个 `link:../prototype-kits/…` 依赖 | **无改动**（0 个 Kits 依赖） |
| `pnpm-lock.yaml` | 251 行变动 | **无改动** |
| `next.config.ts` | `transpilePackages`(5) + `externalDir` + `turbopack.root` | **无改动**（文件与 main 一致） |
| `tsconfig.json` | 加 `allowImportingTsExtensions` | **无改动** |
| `eslint.config.mjs` | 加 `.agent-tmp/**` 忽略 | **无改动** |
| `.gitignore` | 加 `.agent-tmp/` | **无改动** |
| `@kits/*` 运行时依赖 | 有（由 `link:` 解析） | **无**（0 处运行时说明符） |
| motion 映射 | 产品手抄 13 行 | **直接调用 `motionToCssVars()`** |
| React 类型漂移 | 需要把 `@types/react` 钉到 `^19.3.0` | **结构性消失**（见下） |
| 改 Kits 是否即时生效 | 是 | 否（需重跑 `kits add`） |
| 能否独立交付 | 否 | **能** |

### React 类型漂移为什么消失了（不是被修好，是被移除）

第一次实验里 `InsightReveal` 的 `ref as React.Ref<never>` 那行，在产品侧 `tsc`
上报出 `TS2322 ... Two different types with this name exist, but they are unrelated`。
根因不是那行断言，而是**同一份编译里出现两份 `@types/react`**：
Finance 一份、被 `link:` 进图的 Kits 一份（Next/TS 跟随符号链接到源码真实路径，
于是 Kits 的文件是用它自己那份 types 检查的）。

Source Installation 把 Kits 源码**复制进产品**，由产品自己的编译器编译 ——
整个模块图里只剩**一份** `@types/react`。两份类型身份不可能同时存在，
所以这类错误在结构上消失了，不需要对齐版本、也不需要断言。

`main` 上产品的 `@types/react` 仍然是未钉死的 `^19`；本次**没有**动它。

### Turbopack external root 为什么消失

`turbopack.root = path.resolve(__dirname, "..")` 存在的唯一理由是：被链接的依赖
在产品根目录之外，Turbopack 默认不去解析。安装后 Kits 源码在 `lib/kits/installed/`
**产品根目录之内**，属于普通源码，因此既不需要 root、也不需要 `externalDir`、
更不需要 `transpilePackages`。`next.config.ts` 保持与 `main` 完全一致。

---

## 七、视觉迁移范围

**改了**（8 个文件）：

| 文件 | 改了什么 |
| --- | --- |
| `app/globals.css` | 引入桥接层；排版/间距/圆角/投影/缓动/容器宽度改由 pack 决定；删除 `:root`/`.dark` 的 76 + 63 个颜色令牌；环境光改为 pack 的三点布光 |
| `app/layout.tsx` | `<html data-kits-pack="cinematic">` + 注入 `stylePackMotionVars` |
| `components/layout/sidebar.tsx` | 圆角取 pack 的 `radius-control`；去 `border-r` 改 pack 的表面投影 |
| `components/prototype/data-table.tsx` | 去 `ring` 描边改 pack 表面阴影；接入 `LedgerCursor` + `rowCursor` 读数 |
| `components/prototype/open-section.tsx` | 网格交给 `SceneBackdrop`；新增 `surface` 档位（主视觉的"面"） |
| `app/finance/_components/cash-runway-hero.tsx` | `surface`（主视觉浮起来） |
| `app/finance/_components/insight-layer.tsx` | `StaggerContainer` → `RevealSequence` |
| `app/finance/_components/transactions-view.tsx` | 每行传入精确读数 |

**一行没动**：`lib/finance-data.ts` · `finance-ledger.ts` · `finance-metrics.ts` ·
`finance-insights.ts` · `stores/finance-store.ts` · `lib/i18n/**` · 路由 · 筛选 ·
分页 · 抽屉 · 对话框 · Command Center · Cash Runway 计算 · 假设 · 情景预设 ·
`next.config.ts` · `tsconfig.json` · `package.json` · `pnpm-lock.yaml`。

---

## 八、验证结果

| 关卡 | 结果 |
| --- | --- |
| `kits doctor` | ✓ 9/9（lock / lock-source / integrity 42 文件 / dependencies / react-major / types-parity / react-vs-types / typescript / adapters） |
| `pnpm lint` | ✓ 0 error 0 warning |
| `pnpm typecheck` | ✓ `next typegen` + `tsc --noEmit`，**tsconfig 零改动** |
| `pnpm test` | ✓ **120 passed**（当时因 K-01 有 1 处选择器退回 DOM —— **v0.1.1 已恢复为 `getByRole`，见第十二节**） |
| `pnpm build` | ✓ 10 条路由 |
| Browser QA | ✓ 8 路由 × 2 视口 × 明/暗 = **32 页**：0 console / 0 page / 0 request 错误，0 横向溢出 |
| Standalone | ✓ 见下 |

### Browser QA 的强判据

`.qa/shots.mjs` 用的 `scrollWidth - innerWidth` 在移动端是**盲的**：Chromium 在
`isMobile` 语境下会为了容纳溢出内容把**布局视口一起放大**，于是这个差仍然是 0，
而页面其实已经横向滚动了。`prototype-kits` 自己的 `/audit` 页就是这么漏掉的
（实测 `innerWidth` 681 / `scrollX` 289，而"溢出"读数是 0）。

`.qa/kits-qa.mjs` 改用三条互不依赖的判据：

1. `window.innerWidth ≈ 请求的视口宽度`
2. `documentElement.scrollWidth ≤ 请求的视口宽度`
3. `window.scrollTo(9999, 0)` 之后 `window.scrollX ≈ 0`

探针结果：

| 探针 | 结果 |
| --- | --- |
| reduced-motion | `kits-reveal--animated` 不出现，条目 `opacity: 1`、`filter: none`、`transform: none` |
| 触屏 · DataCursor | `.kits-cursor-root` **根本不渲染**；`[data-cursor]` 区域系统光标为 `pointer`（未被隐藏） |
| 触屏 · AnimatedGrid | `.kits-grid` 存在，`pointer-events: none` |
| 无 `IntersectionObserver` | `data-kits-visible="true"`、`opacity: 1` —— 立即揭示，不会永久隐藏 |

### 关键：Standalone 验证

`.qa/standalone.sh` 把 `prototype-kits` 目录改名隐藏（`trap EXIT` 保证恢复），
然后**在 Kits 仓库不可见时**跑完整套关卡：

```
──── 已隐藏 Kits 仓库: prototype-kits → prototype-kits.__hidden_standalone_probe__
──── 确认: [ -e .../prototype-kits ] = no
✓ doctor   ✓ typecheck(typegen)   ✓ typecheck(tsc)   ✓ build   ✓ test (120 passed)
STANDALONE OK — Kits 仓库不存在时全部通过
──── 已恢复: /Users/skillre/ai-prototypes/prototype-kits
```

依赖审计（同样在隐藏状态下）：

| 检查 | 结果 |
| --- | --- |
| `link:../` / `file:../` 兄弟目录依赖 | **0** |
| `@kits/*` 运行时 import / require / @import | **0** |
| `../prototype-kits` 路径引用 | **0**（仅注释文字与 `manifest.json` 的 `"origin": "prototype-kits"` 溯源字段） |
| `next.config.ts` / `tsconfig.json` / `package.json` / `pnpm-lock.yaml` 与 main 的差异 | **0 行** |

---

## 九、本次交付的取舍

### 1. `InsightReveal` 的产品侧宿主 wrapper 被删掉

v0.1.0 之前，Kits 用 `cloneElement(child, { style: { "--kits-reveal-index": i } })`
写步进序号，要求子元素把 `style` 转发到宿主 —— 产品的 `InsightRow` 不接收 `style`，
变量被静默丢弃，于是三段同时淡入。第一次实验被迫在适配层补一层 `<div>` 当宿主。

v0.1.0 改成组件**自己建立宿主**（`.kits-reveal__item` + `display: contents`），
因此产品这边那层 wrapper **必须删掉** —— 留着只会多一层无意义的 div，并把产品的
DOM 结构绑在一个已经不存在的契约上。这是"适配层得以简化"最实在的一处。

### 2. 环境光：补回第三盏灯

第一次实验的 `app/globals.css` 里，`ambient-wash` 与 `hero-wash` 各有一条
`radial-gradient(… var(--finance-ambient-rim) …)`。而 `--finance-ambient-rim`
**在整个分支里被引用 2 次、定义 0 次** —— 那条渐变一直是空的，环境光实际只有
两盏灯（明暗都是）。注释里写的却是"与 pack 的 ambient-glow 用同一组三个光源"。

本次让它有了取值（深色从 pack 的 `--kits-data-series-3` 推导，浅色由产品按亮度
重新调），并把 `ambient-wash` 的三盏灯位置对齐到效果包本身的组合 —— 至此
产品环境光与已安装的 `ambient-glow` **用同一组三个光源**，注释与实现一致。

### 3. `ambient-glow` 效果包：已安装、已引入，但没有套用它的类

`kits add --effects ambient-glow` 把它装进了 `installed/ambient-glow/`，
`adapters/effect-ambient-glow.css` 把它引入了 CSS 图。但产品没有使用
`.kits-effect-ambient-glow` 这个类，原因是：

- 它的三盏灯是**深色专用字面量**（`rgb(79 214 255 / 0.16)` 等硬编码在
  `::before` 的 `background-image` 里），而 Finance 必须同时服务浅色 ——
  直接套用会让浅色下过曝；
- Finance 需要"主视觉更强、面板更弱"两档强度，而效果包只有一个强度。

因此产品取的是它的**颜色契约**（三盏灯的位置与强度），而不是它的类。
这是"效果包只提供单一模式"的设计边界，记录为 K-05。

---

## 十、Source Installation 暴露的问题

按严重度排列。**三个是 Kits 侧的真实缺陷，两个是适配层/契约的缺口。**
全部在本次集成中实测到。

> **状态（Kits v0.1.1）：全部已修。** 本节保留的是 v0.1.0 当时的原始记录 ——
> 它是这些缺陷之所以被修的证据链，删掉会让后来的读者以为它们从未存在。
> 修复后的复测见第十二节。

### K-01 · `InsightReveal` 分组宿主把整棵子树从无障碍树里剪掉 【严重】

`installed/insight-reveal/insight-reveal.tsx` 的宿主体：

```tsx
<div className="kits-reveal__item" aria-hidden="true" data-kits-reveal-index={index}>
  {child}
</div>
```

组件自己的注释写的是：

> aria-hidden：这一层是纯装饰的步进宿主，不承载语义。
> 子元素照常暴露给无障碍树（display:contents 不剪枝），
> 因此屏幕阅读器读到的结构与没有宿主时完全一致。

**这句话是错的。** `display: contents` 确实不剪枝 —— 但同一个元素上的
`aria-hidden="true"` **会**把整个子树从无障碍树里删掉。两个机制被混为一谈了。

实测（Chromium，生产构建，`/finance`）：

```
getByRole("button", { name: "查看该科目明细" })      → 0 个
locator("button:has-text(…)")                        → 1 个（DOM 里存在）

按钮的祖先链：
  button → div → div.kits-reveal__item[aria-hidden=true] → .kits-reveal
```

后果有两层：

1. **无障碍回归**：屏幕阅读器读不到洞察层的任何内容。`main` 上的
   `StaggerContainer` 没有这个问题，因此这是**接入 Kits 引入的回归**。
2. **打断所有基于 role 的查询**：`getByRole` / `getByLabelText` 等一律失效。

修复方向（Kits 侧）：宿主这一层根本不需要 `aria-hidden` —— 它是
`display: contents` 的普通 `div`，不产生盒子也不带语义。删掉这个属性即可；
或用 `role="presentation"`。

**本次处置**：不改 Kits。`tests/finance-overview.spec.ts` 里**唯一一处**
`getByRole` 退回 DOM 选择器（`locator("button", { hasText: … })`），
`expect(page).toHaveURL(/\/finance\/analysis\?category=software/)` 一字未改。
120 个测试全绿，业务断言零改动。

> 换句话说：**"测试 0 改动"没有做到，做到了 1 处、且只是选择器。**
> 但这一处正是缺陷的证据 —— 它不应该被当成"测试的问题"修掉，而应该被
> 当成 Kits 的 bug 修掉。

### K-02 · 契约的 coarse-pointer 网格降级被 pack 覆盖 【中】

契约里写了触屏要把网格放大 1.5 倍：

```css
/* contracts/tokens.css */
@media (hover: none), (pointer: coarse) {
  :root, [data-kits-pack] {
    --kits-pointer-factor: 0 !important;
    --kits-hero-parallax-depth: 0px !important;
    --kits-grid-cell: calc(var(--kits-grid-cell) * 1.5);   /* ← 少了 !important */
  }
}
```

pack 则声明 `[data-kits-pack="cinematic"] { --kits-grid-cell: 64px; }`。
两条规则的特异性都是 **0-1-0**，而 pack 是在契约**之后**被 `@import` 的
（`cinematic/tokens.css` 第 11 行才引契约）—— **pack 赢**。

同一个块里的另外两个变量都写了 `!important`，只有 `--kits-grid-cell` 漏了。
这就是它输掉级联的全部原因。

实测（Playwright 移动端上下文，`(pointer: coarse)` 与 `(hover: none)` 均为 true）：

| | 期望 | 实测 |
| --- | --- | --- |
| `--kits-grid-cell` | `calc(64px * 1.5)` | `64px` |
| 实际像素 | 96px | 64px |

这恰好命中了 pack 自己在 `animated-grid/manifest.json` 里说要避免的那件事：
"pack 层同时把 `--kits-grid-cell` 放大 1.5 倍，避免小屏上过密的网格变成摩尔纹"。
而且 `dense` 档还要再乘 0.5 —— 移动端实际是 **32px** 的密网格，最容易起摩尔纹的
那一档，恰恰是降级失效的那一档。

`.qa/kits-qa.mjs` 把它记录为 `knownDefects[K-02]`，不阻断交付，但会在 Kits 修好
之后自动翻成通过。

### K-03 · `kits doctor` 在 Kits 仓库不可见时**静默地空过**类型对齐检查 【轻】

`readKitsTypesVersion(kitsRoot)` 找不到 `node_modules/@types/react/package.json`
时返回 `null`；`auditCompatibility` 里：

```js
const sameMajor = kitsTypesMajor === null || targetMajor === kitsTypesMajor;
```

即 **Kits 版本未知 → 判定通过**。但 detail 文案仍然是
"@types/react 19.3.0，与 Kits 解析到同一 major（19）" —— 读起来像是核对过了。

实测：Kits 仓库在场时这条检查是真的在比对（Kits 解析到 19.3.0，产品也是 19.3.0，
通过）；仓库被移走之后同一条仍然打 ✓，但已经是空过。

影响不大 —— 在 Source Installation 下这个检查本来就**结构性多余**（模块图里只有
一份 `@types/react`，见第六节）。但文案应当明说"Kits 不在本机，跳过"，
而不是宣称对齐。

### K-04 · 适配层生成器只为 Style Pack 生成 CSS 缝，没有 TS 缝 【中·适配层缺口】

`lib/adapters.mjs` 的 `adapterFilesFor()`：

| 资产类型 | 生成的缝 |
| --- | --- |
| `style` | `style-<id>.css`（CSS 缝） |
| `effect` | `effect-<id>.css`（CSS 缝） |
| `component` | `<id>.tsx`（TS 缝） |

但 Style Pack 同时有 **TypeScript 入口**（`index.ts` / `motion.ts` / `profile`），
生成器没有为它生成任何 TS 缝。于是"产品代码不得直接 import `installed/`"这条规则
在 style pack 的 TS 侧**无路可走**：想要 `cinematicMotion` 这个值，就必须伸进
`installed/`。

本次的处置：把 `adapters/style-pack.ts` 本身当作那条缺失的缝 —— 它是 adapters/ 里
的产品文件，`kits add` 永不覆盖它，只有它碰 `installed/`。
修复方向（Kits 侧）：为 style/effect 也生成 TS 缝，或让风格资产的入口只暴露
"值 + 类型"，由生成器转发。

### K-05 · Effect Pack 只提供深色字面量，没有可覆盖的颜色变量 【中·契约缺口】

`ambient-glow` 的三盏灯是硬编码在 `::before` 的 `background-image` 里的
`rgb(79 214 255 / 0.16)` 等**深色专用**值，没有任何 `--kits-effect-*` 变量。
一个必须同时服务明暗两种模式的产品，无法在不重写整条 `background-image` 的前提下
复用它。同理，pack 的环境光与标题光晕也都是以**类**和**规则**的形式提供，
没有变量化的 `--kits-ambient-*` / `--kits-display-glow` —— 于是产品只能自己发明
名字（本次是 `--finance-ambient-*`、`--finance-display-glow`）。

修复方向（Kits 侧）：把这些值变量化，让"只覆盖颜色"这条规则对效果包也成立。

---

## 十一、重新安装 / 升级

```bash
# 重新安装（覆盖 installed/，adapters/ 里已存在的文件一律保留）
node lib/kits/.kits/kits.mjs add --target . --style cinematic \
  --components animated-grid,data-cursor,insight-reveal --effects ambient-glow

# 体检
node lib/kits/.kits/kits.mjs doctor

# 与当前 Kits 的差异
node lib/kits/.kits/kits.mjs diff
```

装完 `lib/kits/.kits/` 里已经有 Installer 的完整副本，因此**这些命令不需要
`prototype-kits` 仓库在场** —— 这正是 standalone 验证能通过的原因之一。

`installed/` 里的文件如果被人改过，`doctor` 的 `integrity` 会报出来；
`adapters/` 里的 `finance-tokens.css` / `style-pack.ts` / `scene.tsx` 是产品自己的，
永远不会被覆盖，也不会被算作"被改动的托管文件"。

---

## 十二、v0.1.1 回归 —— 第十节的五个缺口逐项复测

Kits v0.1.1（`main` @ `9988c958`，tag `v0.1.1`）发布后，在同一分支
`feature/style-cinematic-source-install` 上用**正式安装**重做了一遍。

### 装了什么

```bash
node <kits>/packages/cli/kits.mjs add --target . --style cinematic \
  --components animated-grid,data-cursor,insight-reveal --effects ambient-glow
```

| | v0.1.0 | v0.1.1 |
|---|---|---|
| `lock.source.commit` | `64279eaf` | **`9988c958`** |
| `lock.registryVersion` | 0.1.0 | **0.1.1** |
| 托管文件 | 42 | **43** |
| 升到 0.1.1 的资产 | — | contracts / cli / insight-reveal / animated-grid / ambient-glow |
| 保持 0.1.0 的资产 | — | cinematic / data-cursor / react-utils |

只有真正变了的 5 个资产升版，其余 3 个保持 0.1.0 —— Installer 没有跟着"整体
盖一个新版本号"。

### 适配层所有权：实测不是承诺

重装前先对 `lib/kits/adapters/` 的 9 个文件做了 sha256 快照。装完后：

```
适配层  2 新建 / 7 保留产品版本
保留： style-cinematic.css · style-pack.ts · animated-grid.tsx · data-cursor.tsx
      insight-reveal.tsx · effect-ambient-glow.css · README.md
新建： style-cinematic.ts · effect-ambient-glow.ts
```

**9 个已存在文件 0 覆盖。** 连 v0.1.0 生成的 `style-cinematic.css` 都没重写
（哪怕它的内容在 v0.1.1 里没变，Installer 也不碰）。`lock.adapters` 里
`written` / `kept` 两个列表把这件事记录成了可审计的数据，不只是终端上的一行字。

### `style-pack.ts`：那条手写缝被正式缝取代

v0.1.0 时 `kits add` 只为 Style Pack 生成 **CSS 缝**，没有 TS 缝。于是上一轮
只能由产品手写 `style-pack.ts`，而它不得不 `import … from "../installed/cinematic/index"`
—— K-04 描述的那条"无路可走"。v0.1.1 生成了 `style-cinematic.ts` 之后，
这条手写缝就没有存在理由了，按 doctor 自己给出的升级路径处理：

```bash
rm lib/kits/adapters/style-pack.ts        # 删掉手写版本
node lib/kits/.kits/kits.mjs add …        # Installer 按 v0.1.1 模板初始化
```

现在是 1 行 `export * from "./style-cinematic"`。

> 注意这是**文档化的升级路径**，不是绕过所有权：医生输出里原本就写着
> 「想要新模板：删掉该文件再跑 `kits add`（只补不存在的）」。Installer 自己
> 永远不会覆盖已有的适配层文件 —— 这一步必须由人来做决定。

手写缝导出的 `stylePackMotionLanguage` / `stylePackMotionRoles` /
`stylePackReducedMotion` 三个符号**从未被消费**（全仓搜索只有定义没有引用），
因此随文件一起退休；正式缝提供的 `stylePackMotionVars` 是唯一的实际依赖，
`app/layout.tsx` 一行未改就继续工作。

### 逐项复测

| | v0.1.0 实测 | v0.1.1 实测 |
|---|---|---|
| **K-01** | `getByRole(button)` → **0**，DOM 里 1 | `.kits-reveal__item[aria-hidden]` **0** 个；`role="presentation"` 3 个；reveal 内 button/heading 的 DOM 与无障碍树**逐项相等**（3=3、3=3） |
| **K-02** | 触屏 `--kits-grid-cell` 仍是 64px（放大被 pack 吃掉） | 有效格 `calc(64px*1*2)`=**128px** → `calc(64px*1.5*2)`=**192px**，**×1.50**；触屏动画 `none`，细指针保留 `kits-grid-drift`；基准变量**没有被改**（契约改的是 scale） |
| **K-03** | 打印「与 Kits 解析到同一 major」（无上游时无法验证） | 上游在场 → `[verified]`；上游缺席 → `[upstream-unavailable]` + `[compatible]` 并注明「**未做上游比对**」 |
| **K-04** | 无 TS 缝，产品只能伸进 `installed/` | `adapters/style-cinematic.ts` + `style-pack.ts` + `effect-ambient-glow.ts`；产品代码**零** `installed/` 引用 |
| **K-05** | 只有硬编码 RGB，无公开变量 | 13 个 `--kits-effect-ambient-*`；默认渐变与 v0.1.0 字面量**逐字相同**；祖先作用域覆盖生效且可完全还原 |
| **K-06** | `kits add --style editorial` 会因 README 里的示例字符串失败 | 本次安装全程未被文档/注释里的 `@kits/*` 示例干扰 |

### 关于 K-02 的探针：两个"看起来通过"的坑

复测时发现原有的 K-02 探针本身是**错的**，两次都差点放过：

1. **量错了变量。** 它量 `--kits-grid-cell`（基准），而 v0.1.1 刻意把基准与
   缩放拆成两个名字 —— 基准**本来就该**恒为 64px。要看的是有效格
   `--kits-grid-cell-size`。
2. **量到了 0 却静默通过。** `--kits-grid-cell-size` 声明在 `.kits-grid`
   **自己身上**，自定义属性只在声明元素及其后代可见；把 probe 挂到 `<body>`
   上 `var()` 解析不出来，量到 0px。而 `0/0 = NaN`，
   `Math.abs(NaN - 1.5) > 0.02` 恰好是 `false` —— 断言静默通过。

修法：probe 挂进 `.kits-grid` **内部**，并且用 `offsetWidth`（布局像素）而不是
`getBoundingClientRect()`。后者在有 `transform` 时返回**视觉**尺寸：hero 的视差层
在桌面端是激活的（触屏端 `--kits-pointer-factor` 归零），会把 128px 量成
130.56px，比值算出来 1.47 而不是 1.50。另外补了 `Number.isFinite` 兜底，
**量不到时必须报错，不许静默通过**。

### Finance 尚未跟进的一处（不是 blocker）

`app/globals.css` 的 `@utility ambient-wash` / `hero-wash` 仍然是**产品自己**的
三点布光实现，消费 `--finance-ambient-*`（→ `--ambient-*`）。Kits 的
`.kits-effect-ambient-glow` 类**始终没有被套用**在任何一个元素上。

这在 v0.1.0 是被迫的（效果包没有公开变量，产品只能自己重写整个渐变）；
v0.1.1 之后它变成了一个**可选的整合**。本轮没有做，因为它会改变可见视觉 ——
尤其 `hero-wash` 是刻意调亮、几何也不同（`52% 68% at 12% 0%` vs 契约的
`60% 50% at 18% 8%`），迁移它属于美术方向决策而不是回归修复。

值得记下的一处细节：`ambient-wash` 的**深色**取值与 Kits 的默认值逐位相同，
而它写成 `color-mix(in srgb, var(--kits-color-accent) 16%, transparent)` —— 
即跟随 pack 的 accent 走。Kits 的默认值是固定字面量。因此直接搬过去反而会
**丢掉 pack 跟随能力**。真要整合，应该保留 `color-mix` 的颜色、只把几何交给
契约变量。
