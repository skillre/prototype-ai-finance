import { readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Which stage this repository is at — `baseline` or `product`.
 *
 * ## Why this exists
 *
 * Factory v1.2 added `stage` to `init-contract.json`, and `pnpm factory:init`
 * honours it: a product **must** delete the Reference Sample and stop calling
 * itself the Factory. But a handful of Core contract tests asserted the
 * *Factory's own repository shape* — that the sample exists, that
 * `lib/i18n/zh-CN.ts` still carries the sample's identity, that
 * `product-contract.json` declares only starter-level invariants, that no Kits
 * install is present.
 *
 * Those assertions are true of the baseline and necessarily false of a product.
 * Running them unguarded in a derived product produced a red suite for doing
 * exactly what `docs/product-initialization.md` tells you to do.
 *
 * The fix is not to delete them — they are the only thing keeping the Factory's
 * own repo honest — but to make each one **skip explicitly** when it does not
 * apply. A silent pass would be worse than a failure: it would report "checked"
 * for something that was never checked.
 */
export const STAGE = (
  JSON.parse(readFileSync(join(process.cwd(), "init-contract.json"), "utf8")) as { stage: string }
).stage

/** True only in the Factory's own repository. */
export const IS_BASELINE = STAGE === "baseline"

/** True only in a product derived from the Factory. */
export const IS_PRODUCT = STAGE === "product"

/** The standard skip reason, so every guarded test says the same thing. */
export const BASELINE_ONLY = "仅适用于 Factory baseline；派生产品按 INIT 清单第 2 步已删除 Reference Sample"
