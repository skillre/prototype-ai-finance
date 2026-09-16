"use client"

import type { ReactNode } from "react"
import { AnimatedGrid } from "./animated-grid"
import { DataCursor } from "./data-cursor"
import { InsightReveal } from "./insight-reveal"

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
 * 本文件位于 **adapters/**（产品托管区）：
 *
 *   lib/kits/installed/   Kits 托管区 —— 重新安装会覆盖，产品只读
 *   lib/kits/adapters/    ← 你在这里 —— Kits 永不覆盖这个目录
 *
 * 这里 import 的是**同目录的生成缝**（./animated-grid 等，由 `kits add`
 * 生成），而不是 ../installed/ —— 也**不是** prototype-kits 仓库。
 * 因此把 Kits 仓库整段移走，本文件照常编译。
 *
 * 在这个文件之外，app/** 与 components/** **不允许**出现任何 Kits 路径：
 * 产品代码只说 Finance 自己的语言：
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
 *      和 `cursorMode`，而不是 Kits 的 `cell="wide"/fade="medium"/
 *      motion="drift"`。营销页与账本页要的网格本来就不该是一样的参数组合。
 *   3. **降级与动画策略不由业务组件各写一遍。** reduced-motion、触屏、
 *      mount 探测全部在 Kits 组件内部；这里只决定**用不用**。
 *
 * ---------------------------------------------------------------------------
 * 一个类型上的取舍
 * ---------------------------------------------------------------------------
 * 没有从 installed/ 导入 Kits 的枚举类型（GridCell / GridFade / GridMotion /
 * CursorMode …）。原因：**一旦产品导入了 Kits 的类型，产品的类型面就绑在了
 * Kits 的包结构上**，而"解绑"正是这一层要保证的事。
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

/**
 * 注意这里**没有** `aria-hidden`：v0.1.0 的 AnimatedGrid 自己声明了
 * `aria-hidden="true"`、`pointer-events: none`、`z-index: -1`，
 * 且它的 props 里根本没有 aria-hidden —— 重复声明会直接编译失败。
 * 这是"组件不应当依赖消费方配合才能工作"的一个具体落点。
 */
export function SceneBackdrop({
  placement = "hero",
  className,
}: {
  placement?: ScenePlacement
  className?: string
}) {
  const grid = SCENE_GRID[placement]
  return <AnimatedGrid cell={grid.cell} fade={grid.fade} motion={grid.motion} className={className} />
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
 *   - 只在标记区域内隐藏系统光标，因此抽屉里的输入框、
 *     需要选中的正文完全不受影响
 *
 * 读数由调用方通过 `data-cursor` / `data-cursor-label` 提供
 * （见 components/prototype/data-table.tsx 的 rowCursor）。
 */
export function LedgerCursor({ children }: { children: ReactNode }) {
  return <DataCursor mode="ring">{children}</DataCursor>
}

/**
 * 指针读数目标的 props —— Kits 的 `DataCursor` 用 `closest("[data-cursor]")`
 * 找目标，并把 `data-cursor-label` 当作该目标的读数标签。
 *
 * ## 为什么这两个属性名住在这里，而不是住在调用点
 *
 * 它们是**某一个 Kits 资产的 DOM 契约**，不是 Finance 自己的词汇。
 * `components/**` 里只要出现 Kits 资产 id，Factory Core 的契约测试
 * （`tests/factory-contract.spec.ts` → "Factory Core source names no specific
 * Kits asset"）就判违规 —— 而且判得有道理：Core 一旦抄下某个光标实现的
 * 名字，换实现时它会**静默失效**：不报错，只是不再有读数。
 *
 * 所以 Core 只说产品语义（`cursorTarget(...)`），资产名留在这层适配里。
 * 用法：
 *
 * ```tsx
 * <tr {...cursorTarget("inspect", "P99 · 184ms")}>
 * ```
 *
 * 不传 `kind` 表示这一行不是读数目标（返回 `undefined`，属性整体不渲染）。
 */
export interface CursorTargetProps {
  "data-cursor"?: string
  "data-cursor-label"?: string
}

export function cursorTarget(kind?: string, label?: string): CursorTargetProps | undefined {
  if (!kind) return undefined
  return { "data-cursor": kind, "data-cursor-label": label }
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
 * 与第一次实验的差别：产品侧的宿主 wrapper **删掉了**
 * ---------------------------------------------------------------------------
 * 第一次实验（Kits v0.1 之前）里，Kits 用
 *
 *     cloneElement(child, { style: { "--kits-reveal-index": i } })
 *
 * 把步进序号写给直接子元素。那要求子元素把 `style` 原样转发到宿主元素，
 * 而产品的子元素是 `InsightRow`（有自己的 props、不接收 style）——
 * 于是变量被 React 静默丢弃，三段同时淡入，`--kits-stagger-step` 永远用不上。
 * 当时产品被迫在适配层补一层 `<div key={index}>` 当宿主。
 *
 * v0.1.0 的 InsightReveal 改成**自己建立宿主**：
 * `.kits-reveal__item[data-kits-reveal-index]`，并配 `display: contents`
 * 让它对布局不可见。因此产品这边的 wrapper 现在**必须删掉** ——
 * 留着它只会多出一层无意义的 div，并且把产品的 DOM 结构绑在一个
 * 已经不存在的契约上。
 *
 * 这就是"适配层得以简化"最实在的一处：产品不再需要知道步进序号怎么落到 DOM。
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
  return (
    <InsightReveal
      as={as}
      step="group"
      shift="medium"
      blur
      maxStagger={4}
      className={className}
    >
      {children}
    </InsightReveal>
  )
}
