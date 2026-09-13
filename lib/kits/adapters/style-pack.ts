/**
 * Kits 适配层 · motion 刻度（产品所有）
 *
 * ===========================================================================
 * 这个文件属于**产品**，不属于 Kits。`kits add` 不会覆盖它。
 * ===========================================================================
 *
 * 它做三件事，多一件都不做：
 *
 *   1. 从**已安装的** Kits 源码取 pack 的 motion.ts（不复制它的任何数值）
 *   2. 用 Kits 自己的 `motionToCssVars()` 把 duration / ease / stagger / pointer
 *      编译成 CSS 变量
 *   3. 交给 app/layout.tsx 注入到 <html> 的 inline style
 *
 * ---------------------------------------------------------------------------
 * 与第一次实验（Local Link）的差别 —— 这里正是本实验要证明的那条
 * ---------------------------------------------------------------------------
 * 第一次实验里，这段映射是**产品手抄的 13 行**。原因不是设计选择，而是
 * Kits v0.1 之前的缺陷：`motionToCssVars()` 虽然存在，却躺在
 * `styles/_contract/contract.ts` 里，而没有任何一个包的 `exports` 暴露它
 * （pack 的 exports 只有 "."、"./motion"、"./tokens.css"、"./manifest.json"）。
 * 于是契约的编译函数对消费方不可达，产品只能把变量表抄一遍 —— 一次静默脱钩。
 *
 * 现在：`motionToCssVars` 是已安装 `@kits/contracts` 的**公开导出**，
 * 产品直接调用它。**13 行映射在这里不存在。**
 *
 * 换 pack 时改的只是下面那一行 import —— 13 个变量自动跟着变，
 * 因为数值从来不在产品里。
 *
 * ---------------------------------------------------------------------------
 * 为什么这个文件直接 import ../installed/ —— 一个真实的适配层缺口
 * ---------------------------------------------------------------------------
 * `kits add` 的适配层生成器（lib/adapters.mjs）对 Style Pack 只生成**一个
 * CSS 缝**（adapters/style-cinematic.css → installed/cinematic/tokens.css）。
 * 但 style pack 同时还有一个 **TypeScript 入口**（index.ts / motion.ts），
 * 生成器没有为它生成对应的 TS 缝。
 *
 * 于是「产品代码不得直接 import 托管区」这条规则，在 style pack 的 TS 侧
 * 无路可走：想要 `cinematicMotion` 这个值，就必须伸进 installed/。
 *
 * 处理方式：本文件**就是**那条缺失的缝 —— 它是 adapters/ 里的产品文件，
 * `kits add` 永不覆盖它；只有它碰 installed/，产品其余部分只 import 本文件。
 * 已作为「适配层生成器缺一个 TS 缝」记录在 docs/kits-integration.md。
 *
 * 注意这里**没有**从 installed/ 导入 Kits 的枚举类型（MotionLanguage 等）
 * 去给产品用：类型只用 `typeof cinematicMotion` 结构推导，避免产品的类型面
 * 绑在 Kits 的包结构上。
 */

import { cinematicMotion } from "../installed/cinematic/index";
import { motionToCssVars } from "../installed/contracts/index";

/**
 * 注入到 <html> 的 style。SSR 阶段即可序列化，因此：
 *   - 服务端 HTML 里就带着正确的时长，首帧不闪；
 *   - 不需要 useEffect（不需要接受 hydration 差异）；
 *   - `prefers-reduced-motion` 时契约层的 !important 仍然覆盖它
 *     （见 installed/contracts/tokens.css 的 reduced-motion 段）。
 *
 * 返回值类型收成 Record<string, string>：Kits 保证的是"变量名 → CSS 值字符串"，
 * 这份保证不应该让产品去依赖 Kits 内部的类型形状。
 */
export const stylePackMotionVars: Record<string, string> = motionToCssVars(cinematicMotion);

/** 该 pack 的动效性格 —— 供文档与 QA 断言使用。 */
export const stylePackMotionLanguage = cinematicMotion.language;

/** 该 pack 允许的动效角色。产品的自定义动效必须能归入其中之一。 */
export const stylePackMotionRoles = cinematicMotion.roles;

/** 无障碍降级策略（来自 pack，不是产品决定）。 */
export const stylePackReducedMotion = cinematicMotion.reducedMotion;
