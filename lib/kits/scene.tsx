"use client"

import { Children, type ReactNode } from "react"
import { AnimatedGrid } from "@kits/animated-grid"
import { DataCursor } from "@kits/data-cursor"
import { InsightReveal } from "@kits/insight-reveal"

/**
 * =============================================================================
 * Finance 侧适配层（ADAPTER）—— 产品唯一被允许依赖的 Kits 接口
 * =============================================================================
 *
 * Kits 的契约要求这条链路：
 *
 *     外部 / Kits 资产 → Adapter → **内部稳定 API** → Product
 *                                        ↑
 *                                   产品只被允许用这个
 *
 * 所以在这个文件之外，app/** 与 components/** **不允许**出现
 * `@kits/...` 的 import。产品代码只说 Finance 自己的语言：
 *
 *     <SceneBackdrop placement="hero" />
 *     <LedgerCursor>…</LedgerCursor>
 *     <RevealSequence>…</RevealSequence>
 *
 * ---------------------------------------------------------------------------
 * 这层适配换来了什么（不是仪式，是三个具体能力）
 * ---------------------------------------------------------------------------
 *   1. **产品不被组件 API 绑架。** 明天把 Kits 换成另一套实现（或换成
 *      第三方库），只需要改这一个文件 —— 它导出的是 Finance 的名字。
 *   2. **pack 语义收敛成产品语义。** 产品传 `placement="hero" | "board"`
 *      和 `cursorMode="ring"`，而不是 Kits 的 `cell="wide"/fade="medium"/
 *      motion="drift"`。营销页与账本页要的网格本来就不该是一样的参数组合。
 *   3. **降级与动画策略不由业务组件各写一遍。** reduced-motion、触屏、
 *      mount 探测全部在 Kits 组件内部；这里只决定**用不用**。
 *
 * ---------------------------------------------------------------------------
 * 一个类型上的取舍
 * ---------------------------------------------------------------------------
 * 没有从 `@kits/*` 导入 Kits 的枚举类型（GridCell / GridFade / GridMotion /
 * CursorMode …）。原因有二：
 *   a) style pack 的 index.ts 并没有 re-export 契约类型，消费方拿不到；
 *   b) 更重要的是——**一旦产品导入了 Kits 的类型，产品的类型面就绑在了
 *      Kits 的包结构上**，而"解绑"正是这一层要保证的事。
 * 因此这里用 `React.ComponentProps<typeof X>` 从**值**上做结构推导：
 * 只依赖运行时导出，不依赖类型导出。Kits 重构类型不会打断 Finance。
 */

/* -------------------------------------------------------------------------- */
/* 1. 场景背板 —— AnimatedGrid                                                 */
/* -------------------------------------------------------------------------- */

/**
 * 产品语义的两个档位，而不是 Kits 的三个枚举参数的笛卡尔积：
 *
 *   hero   主视觉舞台。网格更疏、边缘淡出更明显、允许极缓慢漂移 ——
 *          它承担"这个数字放在一个空间里"的感知。
 *   board  次级面板（开放式区块）。网格更密、静态 ——
 *          面板本身是阅读容器，背板不该动。
 */
export type ScenePlacement = "hero" | "board"

const SCENE_GRID = {
  hero: { cell: "wide", fade: "strong", motion: "drift" },
  board: { cell: "dense", fade: "subtle", motion: "none" },
} as const

export function SceneBackdrop({
  placement = "hero",
  className,
}: {
  placement?: ScenePlacement
  className?: string
}) {
  const grid = SCENE_GRID[placement]
  return (
    <AnimatedGrid
      cell={grid.cell}
      fade={grid.fade}
      motion={grid.motion}
      aria-hidden="true"
      className={className}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* 2. 账本指针 —— DataCursor                                                   */
/* -------------------------------------------------------------------------- */

/**
 * 指针即探针：悬停在账本行上时，光环带出这一行的原始金额与凭证号。
 *
 * 为什么这件事有价值（而不是"加个动效"）：
 *   表格里显示的是紧凑格式（¥57万），而财务对账需要**精确值**。
 *   原先要么点开抽屉、要么去查凭证；现在悬停一次就能读到。
 *   这是"减少一次交互"，不是"多一个效果"。
 *
 * 为什么不用 crosshair 而是 ring：账本是**记录**，不是仪表盘。
 * 十字准星在深色地图/图表上表达"取样"，在业务表格上表达"瞄准"——
 * 语义不对。ring 表达"我正落在这个单元格上"。
 *
 * 组件内建降级（不需要产品处理）：
 *   - 触屏 / 粗指针 → 完全不激活，系统光标保留
 *   - prefers-reduced-motion → 不激活
 *   - 只在 [data-cursor] 标记区域内隐藏系统光标，因此抽屉里的输入框、
 *     需要选中的正文完全不受影响
 */
export function LedgerCursor({ children }: { children: ReactNode }) {
  return <DataCursor mode="ring">{children}</DataCursor>
}

/* -------------------------------------------------------------------------- */
/* 3. 结论序列 —— InsightReveal                                                */
/* -------------------------------------------------------------------------- */

/**
 * AI 洞察是**叙事**：01 → 02 → 03 有阅读顺序，不是并列的三张卡片。
 * 逐段揭示把这个顺序变成可见的节奏。
 *
 * 关键：揭示只服务 `enter` 角色（层级），不携带任何信息 ——
 * 关掉动效时信息零损失（这正是 Kits 的三层降级要做的事）。
 *
 * `blur` 打开：cinematic 的 `--kits-reveal-blur` 是 6px，
 * "从虚到实"就是这套 pack 表达"从远到近"的方式；
 * 换 pack 后该变量为 0，同一行代码自动变成无模糊揭示。
 *
 * ---------------------------------------------------------------------------
 * 接入时踩到的一个真实的坑（值得记下来的那一个）
 * ---------------------------------------------------------------------------
 * 第一次接上 `InsightReveal` 时，产品的 `pnpm typecheck` **和** `pnpm build`
 * 都失败在 Kits 自己的源文件上：
 *
 *   ../prototype-kits/components/insight-reveal/insight-reveal.tsx(92,7): TS2322
 *   Type 'Ref<never>' is not assignable to type '… & … & …'
 *
 * 看上去像 Kits 的 bug（那句 `ref={ref as React.Ref<never>}` 确实很脆），
 * 但根因不是它，而是**链接依赖下的类型版本漂移**：
 *
 *   Finance  node_modules/@types/react  →  19.2.18
 *   Kits     node_modules/@types/react  →  19.3.0
 *
 * 由于 Next/TS 会跟随符号链接到源码真实路径，Kits 的文件是用**它自己那份**
 * @types/react 检查的，于是同一次编译里出现两份 "VoidOrUndefinedOnly"，
 * 报出 "Two different types with this name exist, but they are unrelated"。
 *
 * 修法不是加断言（那是把症状盖住），而是**把依赖对齐**：
 * Finance 的 devDependencies 钉到与 Kits 相同的 @types/react 19.3.0。
 * 这对独立仓库来说是一笔必须付的成本 —— 只要用 `link:`/workspace 接源码，
 * 两边的 React 类型版本就必须一致，否则产品的 typecheck 会被别人的
 * 依赖版本决定。已记录在 docs/kits-integration.md。
 *
 * 结论：本段**没有任何类型断言**。产品 API 面仍然由 Finance 决定，
 * 但那是因为下面这个 interface 本身，而不是因为我们在掩盖类型错误。
 *
 * ---------------------------------------------------------------------------
 * 第 4 个缺口：step="group" 的步进序号**到不了 DOM**
 * ---------------------------------------------------------------------------
 * Kits 的 `InsightReveal` 用 `cloneElement(child, { style: { … } })` 把
 * `--kits-reveal-index` 写给每个直接子元素。这要求子元素必须把
 * `style` 原样转发到它自己的宿主元素上。
 *
 * 而产品里的子元素是 `InsightRow` —— 它有自己的 props，**不接收 style**，
 * 于是那个变量在 React 里被静默丢弃。实测（Chromium）：
 *
 *   children[0].getAttribute("style")  →  null
 *   --kits-reveal-index                →  "" （空）
 *
 * 结果不是报错，而是**步进彻底失效**：三段同时淡入，cinematic 的
 * `--kits-stagger-step`（110ms）永远用不上。这属于"看起来装上了、
 * 实际没生效"的一类失败，只有真的在浏览器里量过才会发现。
 *
 * 适配层在这里补上：每个子元素先套一层宿主元素，由**它**承接 style，
 * 再往下传。因为外层 `InsightReveal` 的直接子元素变成了这些 div，
 * cloneElement 写进去的变量就落到了真实 DOM 上。
 *
 * 副作用是每个条目多一层 div —— 由于父级是 `flex flex-col`，
 * 这些 div 直接成为 flex item，间距与顺序不变（已在 /finance 实测）。
 * ---------------------------------------------------------------------------
 */
interface RevealSequenceProps {
  children: ReactNode
  as?: "div" | "section" | "article" | "ol" | "ul"
  className?: string
}

export function RevealSequence({
  children,
  as = "div",
  className,
}: RevealSequenceProps) {
  /*
    把 children 包成宿主元素，好让 Kits 写在子元素 style 上的
    --kits-reveal-index 有一个真实的落点。key 沿用原索引。
  */
  const items = Children.toArray(children).map((child, index) => (
    <div key={index}>{child}</div>
  ))

  return (
    <InsightReveal
      as={as}
      step="group"
      shift="medium"
      blur
      maxStagger={4}
      className={className}
    >
      {items}
    </InsightReveal>
  )
}
