import type { CrmCustomer, PipelinePoint } from "./crm-data"

/**
 * 销售洞察的确定性推导。
 *
 * 这层是「AI Sales Command Center」的 AI 属性所在——但不是假的 AI：
 * 每一句洞察都由当前客户与管道数据**推导**出来，换掉数据，句子里的公司、
 * 金额、百分比与停滞天数都会跟着变。不调用任何外部接口，也不需要网络，
 * 因此演示永远可复现（同输入 → 同输出）。
 *
 * 约定：本文件只产出**结构化事实**，措辞一律交给 lib/i18n。
 */

/** 停滞判定：超过这个天数没有触达，就进入"需要推动"的名单。 */
export const STALE_DAYS = 7

/** 归因窗口：最近 7 天内触达过的客户才算"正在推进"。 */
export const RECENT_WINDOW_HOURS = 24 * STALE_DAYS

export type DealNote =
  | { kind: "fresh"; hours: number; days: number }
  | { kind: "recent"; hours: number; days: number }
  | { kind: "stale"; hours: number; days: number }

/** 把"距上次触达多少小时"翻译成三种可朗读的状态，而不是一个裸数字。 */
export function dealNote(lastTouchHours: number): DealNote {
  const hours = Math.max(0, Math.round(lastTouchHours))
  const days = Math.max(0, Math.round(hours / 24))
  if (hours < 24) return { kind: "fresh", hours: Math.max(1, hours), days }
  if (days < STALE_DAYS) return { kind: "recent", hours, days }
  return { kind: "stale", hours, days }
}

/* -------------------------------------------------------------------------- */
/* 增长归因                                                                    */
/* -------------------------------------------------------------------------- */

export interface GrowthInsight {
  /** 本月合同额环比上月的变化，百分比（一位小数，可正可负）。 */
  growth: number
  /** 贡献最大的三位客户，按合同金额倒序。 */
  contributors: CrmCustomer[]
  /** 三位贡献客户合计占管道总额的比例，百分比（整数）。 */
  share: number
  /** 确定性置信度（88–96）——由样本量与近期触达密度决定，不是随机数。 */
  confidence: number
  /** 参与分析的客户数，用于在界面上交代分析范围。 */
  sampleSize: number
  /** 当前月与前一个月的数据点，供 Hero 与洞察层共用。 */
  points: { current: PipelinePoint; previous: PipelinePoint } | null
}

/**
 * 增长归因。
 *
 * 增长取自管道序列的最后两点（真实环比）；贡献客户取"最近 7 天内触达过、
 * 且合同金额最高"的三位——正在推进 + 金额最高，这两条一起才是"推动增长"
 * 的合理代理，而不是随便挑三个大客户。
 */
export function selectGrowthInsight(
  series: PipelinePoint[],
  customers: CrmCustomer[]
): GrowthInsight {
  const current = series[series.length - 1]
  const previous = series[series.length - 2]
  const points = current && previous ? { current, previous } : null

  const growth =
    points && points.previous.won > 0
      ? Math.round(((points.current.won - points.previous.won) / points.previous.won) * 1000) / 10
      : 0

  const pipeline = customers.filter((customer) => customer.status !== "churned")
  const totalValue = pipeline.reduce((sum, customer) => sum + customer.value, 0)

  const contributors = [...pipeline]
    .filter((customer) => customer.value > 0 && customer.lastTouchHours <= RECENT_WINDOW_HOURS)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)

  const contributorValue = contributors.reduce((sum, customer) => sum + customer.value, 0)
  const share = totalValue === 0 ? 0 : Math.round((contributorValue / totalValue) * 100)

  const recentlyTouched = customers.filter(
    (customer) => customer.lastTouchHours <= 24 && customer.status !== "churned"
  ).length

  const confidence = Math.min(96, 84 + contributors.length * 2 + Math.min(8, recentlyTouched))

  return { growth, contributors, share, confidence, sampleSize: customers.length, points }
}

/* -------------------------------------------------------------------------- */
/* 风险                                                                        */
/* -------------------------------------------------------------------------- */

export interface RiskInsight {
  /** 风险敞口最大的客户——既贵又久没动。 */
  customer: CrmCustomer
  staleDays: number
  /** 该客户的敞口：合同金额 × 停滞天数（只用于排序，不展示）。 */
  exposure: number
  /** 除他之外，其余停滞客户涉及的合同额合计。 */
  otherValue: number
  /** 除他之外，其余停滞客户数量。 */
  otherCount: number
}

/** 风险敞口 = 合同金额 × 停滞天数。金额大且久未动的机会排在最前。 */
function riskExposure(customer: CrmCustomer): number {
  const days = Math.round(customer.lastTouchHours / 24)
  return customer.value * Math.max(1, days)
}

export function selectRiskInsight(customers: CrmCustomer[]): RiskInsight | null {
  const stale = customers
    .filter(
      (customer) =>
        customer.status !== "churned" && customer.value > 0 && customer.lastTouchHours >= 24 * STALE_DAYS
    )
    .sort((a, b) => riskExposure(b) - riskExposure(a))

  const top = stale[0]
  if (!top) return null

  const rest = stale.slice(1)

  return {
    customer: top,
    staleDays: Math.round(top.lastTouchHours / 24),
    exposure: riskExposure(top),
    otherValue: rest.reduce((sum, customer) => sum + customer.value, 0),
    otherCount: rest.length,
  }
}

/* -------------------------------------------------------------------------- */
/* 机会雷达                                                                    */
/* -------------------------------------------------------------------------- */

export interface SpotlightDeal {
  customer: CrmCustomer
  note: DealNote
  /** 加权得分：金额（万） × (1 + 停滞天数 / 10)。得分本身不展示，只决定名次。 */
  score: number
}

/**
 * 高优先级机会。
 *
 * 纯按金额排序只会得到一份"最大客户榜"（下面还有一份）。这里用的是**紧迫度**：
 * 金额乘以停滞加成，于是"贵且卡住"的机会会浮到"更贵但一直在推进"的前面。
 */
export function selectSpotlightDeals(customers: CrmCustomer[], limit = 3): SpotlightDeal[] {
  return customers
    .filter((customer) => customer.status !== "churned" && customer.value > 0)
    .map((customer) => {
      const note = dealNote(customer.lastTouchHours)
      return {
        customer,
        note,
        score: (customer.value / 10_000) * (1 + note.days / 10),
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/* -------------------------------------------------------------------------- */
/* 阶段构成                                                                    */
/* -------------------------------------------------------------------------- */

export interface StageCompositionSlice {
  status: CrmCustomer["status"]
  count: number
  value: number
  /** 占管道总额的比例（0–100，已含最小可见宽度，仅用于绘制）。 */
  share: number
}

/**
 * 阶段构成：把五个阶段变成**一条**构成条。
 *
 * 原来的"行 + 右侧金额"是可以直接搬进 BI 报表的形态；一条按金额切分的
 * 构成条 + 下方可下钻的图例，才是"管道构成"这件事本身的样子。
 */
export function selectStageComposition(customers: CrmCustomer[]): {
  slices: StageCompositionSlice[]
  total: number
} {
  const pipeline = customers.filter((customer) => customer.status !== "churned")
  const total = pipeline.reduce((sum, customer) => sum + customer.value, 0)

  const slices = (["lead", "trial", "active", "at-risk", "churned"] as const).map((status) => {
    const rows = customers.filter((customer) => customer.status === status)
    const value = status === "churned" ? 0 : rows.reduce((sum, customer) => sum + customer.value, 0)
    return {
      status,
      count: rows.length,
      value,
      share: total === 0 ? 0 : (value / total) * 100,
    }
  })

  return { slices, total }
}

/** 负责人排行：金额倒序，附带在管数量。 */
export function selectOwnerRanking(customers: CrmCustomer[]) {
  const map = new Map<string, { count: number; value: number }>()
  for (const customer of customers) {
    const entry = map.get(customer.owner) ?? { count: 0, value: 0 }
    entry.count += 1
    if (customer.status !== "churned") entry.value += customer.value
    map.set(customer.owner, entry)
  }
  return [...map.entries()]
    .map(([owner, stats]) => ({ owner, ...stats }))
    .sort((a, b) => b.value - a.value)
}
