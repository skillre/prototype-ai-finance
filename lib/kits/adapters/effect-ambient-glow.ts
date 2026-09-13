/**
 * Kits 适配层 · ambient-glow · 由 `kits add` 生成（v0.1.1）
 *
 * ===========================================================================
 * 这个文件属于**产品**，不属于 Kits。
 * ===========================================================================
 *
 *   lib/kits/installed/   Kits 托管区 —— 重新安装会覆盖，产品只读
 *   lib/kits/adapters/    ← 你在这里 —— Kits 永不覆盖这个目录
 *
 * 产品代码请只 import 这一层：
 *
 *   import { AnimatedGrid } from "@/lib/kits/adapters/animated-grid";
 *
 * 而不是直接 import 托管区。这样 Kits 升级时，产品的引用面不动。
 *
 * 想改行为（换实现、覆盖品牌色、加自己的降级）就在本文件里改 ——
 * `kits add` 不会覆盖它，`kits doctor` 也不会把它算作「被改动的托管文件」。
 *
 * 注意 import 路径**不带扩展名**：Kits 源码内部用具名扩展名（workspace 的
 * 源码分发一直开着 allowImportingTsExtensions），但那不该成为产品的要求。
 * 安装器在写盘时会把 .ts / .tsx 剥掉，因此产品不需要改任何 tsconfig。
 */

/**
 * Effect 的 TS 缝。
 *
 * 效果是纯 CSS，托管区里没有可 import 的模块 —— 所以这里导出的是**标识符**
 * （类名与公开变量名），而不是实现。作用只有一个：让产品不必在 JSX / TS 里
 * 硬编码 Kits 的类名字符串，也不必硬编码变量名字符串。
 *
 * ⚠️ 变量名是**生成时**从 effects/manifest.json 烘焙进来的快照。
 * 升级 Kits 之后如果 Kits 改了变量名，这个文件不会自动更新
 * （它属于产品，installer 不覆盖）—— `kits doctor` 会提示模板已过期。
 */

/** 效果 id（与 registry / effects/manifest.json 一致）。 */
export const effectId = "ambient-glow" as const;

/** 容器类名。 */
export const effectClass = "kits-effect-ambient-glow" as const;

/**
 * 修饰类：显式开启可选行为。
 * *   breathing → kits-effect-ambient-glow--breathing
 */
export const effectModifiers = {
  "breathing": "kits-effect-ambient-glow--breathing"
} as const;

/**
 * 公开变量名（Effect Contract）。产品只 override 这些，不碰效果内部的
 * 渐变实现。每个变量的默认值与含义见 effects/README.md。
 */
export const effectVars = {
  "primary": "--kits-effect-ambient-primary",
  "primaryPosition": "--kits-effect-ambient-primary-position",
  "primarySize": "--kits-effect-ambient-primary-size",
  "primaryFalloff": "--kits-effect-ambient-primary-falloff",
  "secondary": "--kits-effect-ambient-secondary",
  "secondaryPosition": "--kits-effect-ambient-secondary-position",
  "secondarySize": "--kits-effect-ambient-secondary-size",
  "secondaryFalloff": "--kits-effect-ambient-secondary-falloff",
  "rim": "--kits-effect-ambient-rim",
  "rimPosition": "--kits-effect-ambient-rim-position",
  "rimSize": "--kits-effect-ambient-rim-size",
  "rimFalloff": "--kits-effect-ambient-rim-falloff",
  "strength": "--kits-effect-ambient-strength"
} as const;
