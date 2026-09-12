import { SceneBackdrop } from "@/lib/kits/scene"
import { cn } from "@/lib/utils"

type OpenSectionProps = {
  children: React.ReactNode
  /**
   * `hero` — the page's protagonist region: a stronger off-centre bloom plus a
   * masked grid. `wash` — a quiet tinted region for secondary blocks.
   * `none` — no ambient layer at all.
   */
  ambient?: "none" | "wash" | "hero"
  /**
   * 让这块区域拥有自己的**表面**（pack 的 surface + 圆角 + 深投影），
   * 而不是一片通铺的环境光。主视觉用它把自己从画布上抬起来。
   */
  surface?: boolean
  /**
   * The ambient layer is clipped to the region, so the region needs rounded
   * corners to keep the wash from bleeding past its own bounds. It does NOT
   * get a ring, a border or a shadow — that is the whole point: a region you
   * can see without a container you can point at.
   */
  className?: string
  contentClassName?: string
  as?: "section" | "div"
}

/**
 * 开放式区域。
 *
 * 这是 V3 里替代「又一个 Card」的主要手段：一个靠**留白 + 环境光 + 排版**
 * 立起来的区域，没有边框、没有阴影、没有 hover 抬升。当一块内容需要重量
 * 但不需要 elevation 时，用它；只有当内容真的会浮在别的层之上（对话框、
 * 抽屉、tooltip）时才用 Card。
 *
 * ---------------------------------------------------------------------------
 * Style Pack 接入点
 * ---------------------------------------------------------------------------
 * 环境层分两部分，职责不同：
 *
 *   .hero-wash / .ambient-wash   光 —— 有方向、有数量限制的三点布光
 *   <SceneBackdrop />            空间 —— 网格（Kits · AnimatedGrid）
 *
 * 网格交给 Kits 的组件而不是继续用 `.ambient-grid` 工具类，是因为
 * "网格多大、多淡、要不要动"属于 Style Pack 的立场，不属于某一块版面的
 * 局部决定。换 pack 时它本就该跟着变 —— 组件化之后这件事才是自动的。
 *
 * 参数档位由适配层决定（见 lib/kits/scene.tsx）：
 *   hero  → 疏网格 + 强淡出 + 极缓漂移（"这个数字在空间里"）
 *   wash  → 密网格 + 弱淡出 + 静止（面板是阅读容器，背板不该动）
 *
 * ---------------------------------------------------------------------------
 * surface：主视觉的"面"
 * ---------------------------------------------------------------------------
 * `surface` 让这块区域长出**自己的表面**（pack 的 surface 色 + 连续圆角 +
 * ambient-glow 的深投影 + 内高光），而不是一片通铺到底的环境光。
 *
 * 这不是装饰，它回答的是 cinematic 的核心问题："层级从哪里来"。
 * editorial 用字号与留白分层、instrument 用线与标签分层，
 * cinematic 用**光与深度**分层 —— 而深度需要一个真正浮起来的"面"。
 * 主视觉因此成为一个被光照到的表面，页面其余部分退到画布上。
 */
export function OpenSection({
  children,
  ambient = "none",
  surface = false,
  className,
  contentClassName,
  as: Tag = "section",
}: OpenSectionProps) {
  return (
    <Tag className={cn("relative isolate", className)}>
      {ambient !== "none" ? (
        <div
          /* AnimatedGrid 自带 aria-hidden="true"，因此这里不重复声明。 */
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-panel",
            surface
              ? "bg-surface shadow-floating"
              : ambient === "hero"
                ? "bg-[var(--hero-base)]"
                : "bg-surface/40"
          )}
        >
          <div className={cn("absolute inset-0", ambient === "hero" ? "hero-wash" : "ambient-wash")} />
          {/*
            Mask is generous and off-centre so the grid never starts on the
            region's own edge — a grid line coinciding with the boundary
            reads as a seam rather than as texture.
          */}
          <div className="absolute -inset-8 [mask-image:radial-gradient(120%_95%_at_24%_0%,black_18%,transparent_82%)]">
            <SceneBackdrop placement={ambient === "hero" ? "hero" : "board"} />
          </div>
        </div>
      ) : null}
      <div className={cn("relative", contentClassName)}>{children}</div>
    </Tag>
  )
}
