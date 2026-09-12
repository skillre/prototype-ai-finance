import path from "node:path";
import type { NextConfig } from "next";

/**
 * =============================================================================
 * Prototype Kits 接入配置
 * =============================================================================
 *
 * Kits 是**源码分发**（.ts / .tsx / .css，没有构建产物），因此产品必须
 * 转译它 —— 否则 node_modules 里的 TSX 不会被编译。
 *
 * 接入方式：本仓库是独立仓库（不与 Kits 共享 workspace 根），因此用
 * `link:` 指向同机的 Kits 检出，见 package.json 的 @kits/* 与 pnpm-lock.yaml。
 *
 * ---------------------------------------------------------------------------
 * 为什么不是 `file:`（本实验踩到的第 1 个坑）
 * ---------------------------------------------------------------------------
 * pnpm 的 `file:` 依赖只复制**包目录本身**。而 Kits 的包会 import 兄弟目录：
 *
 *   components/<x>/x.tsx        → ../_shared/contract.ts, ../_shared/env.ts
 *   styles/cinematic/tokens.css → ../_contract/tokens.css
 *
 * 复制之后这两个兄弟目录不存在 → 构建直接失败（已实测）。
 * 这一个缺陷就足以说明：**Kits 目前只支持"同 workspace"或"同文件树"接入。**
 * 记录在 docs/kits-integration.md。
 *
 * ---------------------------------------------------------------------------
 * 为什么需要 turbopack.root（本实验踩到的第 2 个坑）
 * ---------------------------------------------------------------------------
 * Next.js 官方文档（turbopack 参考）：
 *   "To resolve files from linked dependencies outside the project root
 *    (via npm link, yarn link, pnpm link, etc.), you must configure the
 *    turbopack.root to the parent directory of both the project and the
 *    linked dependencies."
 *
 * 即：`transpilePackages` + `externalDir` 都不够，必须显式把 Turbopack 的
 * 根抬到同时包含两边的那一层，否则 `@kits/*` 会解析失败。
 *
 * 注意 root 抬到 ai-prototypes/ 之后，该目录下的其它原型（prototype-starter
 * 等）也进入了解析范围 —— 只影响解析，不影响产物。
 * =============================================================================
 */
const nextConfig: NextConfig = {
  transpilePackages: [
    "@kits/style-cinematic",
    "@kits/effects",
    "@kits/animated-grid",
    "@kits/data-cursor",
    "@kits/insight-reveal",
  ],

  // Kits 源码位于本仓库之外，需要允许 Next 转译目录树之外的文件。
  experimental: {
    externalDir: true,
  },

  turbopack: {
    // 同时包含本仓库与 prototype-kits 的那一层
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
