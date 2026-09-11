/**
 * 活动按天分组。
 *
 * 仪表盘的「最近动态」与活动页的时间线都要用同一套分桶规则——放两份就是
 * 两份会各自漂移的逻辑。时间锚点是**真实当前时间**：mock 数据的时间戳
 * 就落在原型"当前月"，因此分组结果在演示里是稳定的。
 *
 * 注意：调用方都在客户端渲染路径上（页面先经过 store 的 loading 态），
 * 所以这里读 `Date` 不会造成服务端/客户端水合不一致。
 */

export type ActivityGroupKey = "today" | "yesterday" | "week" | "earlier"

export const ACTIVITY_GROUP_ORDER: ActivityGroupKey[] = [
  "today",
  "yesterday",
  "week",
  "earlier",
]

const DAY = 86_400_000

export function groupActivitiesByDay<T extends { at: string }>(
  items: T[],
  now: Date = new Date()
): { key: ActivityGroupKey; items: T[] }[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  const buckets = new Map<ActivityGroupKey, T[]>()
  for (const item of items) {
    const at = new Date(item.at).getTime()
    const key: ActivityGroupKey =
      at >= startOfToday
        ? "today"
        : at >= startOfToday - DAY
          ? "yesterday"
          : at >= startOfToday - DAY * 6
            ? "week"
            : "earlier"
    const bucket = buckets.get(key)
    if (bucket) bucket.push(item)
    else buckets.set(key, [item])
  }

  return ACTIVITY_GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
    key,
    items: buckets.get(key)!,
  }))
}
