/**
 * Style Pack 的**动效刻度**，编译成 CSS 变量。
 *
 * 这是 Kits 契约里"TS → CSS 的唯一通道"（`motionToCssVars`）在 Finance 侧的
 * 转发点。它只做三件事，多一件都不做：
 *
 *   1. 从 @kits/style-cinematic 取 motion.ts（**不复制它的数值**）
 *   2. 按 Kits 契约的变量表把 duration / ease / stagger / pointer 编译出来
 *   3. 交给 app/layout.tsx 注入到 <html> 的 inline style
 *
 * ---------------------------------------------------------------------------
 * ⚠️ 契约缺口（本实验发现的第 2 个）
 * ---------------------------------------------------------------------------
 * Kits 导出了 `motionToCssVars()`，但**只有主入口
 * `@kits/style-cinematic` 的 index.ts 里 re-export 了 `cinematicMotion`，
 * 没有 re-export `motionToCssVars`**；而它所在的 `_contract/contract.ts`
 * 不在任何包的 `exports` 映射里（pack 的 exports 只有 "."、"./motion"、
 * "./tokens.css"、"./manifest.json"）。
 *
 * 也就是说：**契约的编译函数对消费方不可达。**
 * 结果就是下面这段 13 行的映射被复制到了产品里 —— 它是一张"由包自己保证
 * 不变"的变量表，却必须由产品手抄一遍。
 *
 * 这不是本次迁移的选择，而是被迫的绕行；已在 docs/kits-integration.md
 * 记录为 Kits 应修项（导出 `./contract` 子路径，或从 index 一并 re-export）。
 *
 * 关键设计：**数值一个都没有写在这里** —— 它们全部来自 cinematicMotion。
 * 因此换 pack 时改的只是上面那一行 import，13 个变量自动跟着变。
 */

import { cinematicMotion } from "@kits/style-cinematic";

/**
 * 与 Kits `motionToCssVars()` 逐字等价的映射（契约变量表见
 * styles/_contract/contract.ts 结尾）。
 *
 * 保留这个本地实现而不是 import，是为了让"缺口"在代码里是**可见的**：
 * 一个读者应该能一眼看出这里本不该存在。
 *
 * 参数类型用 `typeof cinematicMotion` 内联 —— 这样类型推断不需要经由
 * `StylePackMotion` 别名，避免 `type X = Parameters<typeof f>` 与
 * `f(x: X)` 之间的循环引用（TS2456）。
 */
function compileMotion(motion: typeof cinematicMotion): Record<string, string> {
  return {
    "--kits-dur-instant": `${motion.duration.instant}ms`,
    "--kits-dur-quick": `${motion.duration.quick}ms`,
    "--kits-dur-base": `${motion.duration.base}ms`,
    "--kits-dur-slow": `${motion.duration.slow}ms`,
    "--kits-dur-ambient": `${motion.duration.ambient}ms`,
    "--kits-ease-out": motion.ease.out,
    "--kits-ease-inout": motion.ease.inOut,
    "--kits-ease-linear": motion.ease.linear,
    "--kits-ease-spring": motion.ease.spring,
    "--kits-stagger-step": `${motion.staggerStep}ms`,
    "--kits-ambient-cycle": `${motion.ambientCycle}ms`,
    "--kits-enter-distance": motion.enterDistance,
    "--kits-pointer-factor": String(motion.pointerFactor),
  };
}

/**
 * 注入到 <html> 的 style。SSR 阶段即可序列化，因此：
 *   - 服务端 HTML 里就带着正确的时长，首帧不闪；
 *   - 不需要 useEffect（不需要接受 hydration 差异）；
 *   - `prefers-reduced-motion` 时契约层的 !important 仍然覆盖它
 *     （见 styles/_contract/tokens.css 的 9b 段）。
 */
export const stylePackMotionVars: Record<string, string> = compileMotion(
  cinematicMotion,
);

/** 该 pack 的动效性格 —— 供文档与 QA 断言使用。 */
export const stylePackMotionLanguage = cinematicMotion.language;

/** 该 pack 允许的动效角色。产品的自定义动效必须能归入其中之一。 */
export const stylePackMotionRoles = cinematicMotion.roles;

/** 无障碍降级策略（来自 pack，不是产品决定）。 */
export const stylePackReducedMotion = cinematicMotion.reducedMotion;
