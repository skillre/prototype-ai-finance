/**
 * AI Finance —— 数据源（source of truth）。
 *
 * 这一层只放**事实**：科目、月份矩阵、账户、供应商、客户与账期规则。
 * 不计算任何指标，不生成任何句子——推导在 `lib/finance-metrics.ts`，
 * 洞察在 `lib/finance-insights.ts`。
 *
 * ## 为什么是"一个月度矩阵 + 明确的拆分规则"而不是一堆随机数
 *
 * 财务产品的可信度来自**对得上**：现金余额 = 期初 + 累计收付；
 * 科目合计 = 各供应商付款之和；预算实际发生额 = 科目矩阵在期间内的合计。
 * 如果每个图表各自造数，三个页面一定会互相打脸。
 *
 * 所以这里只写一份原始矩阵（12 个月 × 5 条收入线 × 8 个支出科目），
 * 再配一份**确定性的拆分规则**（供应商占比 / 记账日 / 收款纪律）。
 * 流水、应收、应付、账户余额、预算执行、AI 洞察全部由这一份矩阵
 * 展开而来——换掉矩阵里的数字，全站所有金额同时变化。
 *
 * 记账期间：2025-10 ～ 2026-09（12 个自然月）。
 * 报表基准日：2026-09-11。
 */

/** 12 个记账月份，升序。索引即矩阵列号。 */
export const MONTHS = [
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
] as const

export type MonthKey = (typeof MONTHS)[number]

/** 报表基准月 / 基准日——"本月""近 90 天""未来三个月"都从这里出发。 */
export const REFERENCE_MONTH: MonthKey = "2026-09"
export const REFERENCE_DATE = "2026-09-11"

/** 运营备付金下限：现金低于这条线，任何一笔意外支出都会打断工资发放。 */
export const CASH_FLOOR = 1_000_000

export const CURRENCY = "CNY"

/* -------------------------------------------------------------------------- */
/* 收入线                                                                      */
/* -------------------------------------------------------------------------- */

export interface RevenueLineDef {
  id: string
  name: string
  /** 每条收入线在 12 个月里的确认收入（元）。 */
  monthly: number[]
  /** 该收入线的现金实现方式：订阅类是预付，实施类有账期。 */
  settlement: "prepaid" | "invoiced"
}

/**
 * 收入结构：三条订阅线（标准 / 专业 / 企业）+ 实施交付 + 增值服务。
 * 订阅线按月预付（签合同时收款），实施与增值走账期，因此会有应收账款。
 */
export const REVENUE_LINES: RevenueLineDef[] = [
  {
    id: "standard",
    name: "标准版订阅",
    monthly: [
      620_000, 628_000, 640_000, 645_000, 638_000, 652_000, 660_000, 668_000, 676_000, 682_000,
      690_000, 698_000,
    ],
    settlement: "prepaid",
  },
  {
    id: "pro",
    name: "专业版订阅",
    monthly: [
      890_000, 905_000, 930_000, 940_000, 935_000, 960_000, 975_000, 990_000, 1_005_000, 1_015_000,
      1_030_000, 1_046_000,
    ],
    settlement: "prepaid",
  },
  {
    id: "enterprise",
    name: "企业版订阅",
    monthly: [
      1_120_000, 1_150_000, 1_190_000, 1_205_000, 1_198_000, 1_240_000, 1_265_000, 1_290_000,
      1_318_000, 1_335_000, 1_360_000, 1_392_000,
    ],
    settlement: "prepaid",
  },
  {
    id: "delivery",
    name: "实施与交付",
    monthly: [
      286_000, 292_000, 318_000, 268_000, 214_000, 296_000, 322_000, 308_000, 336_000, 342_000,
      318_000, 356_000,
    ],
    settlement: "invoiced",
  },
  {
    id: "services",
    name: "增值服务",
    monthly: [
      132_000, 138_000, 146_000, 142_000, 128_000, 152_000, 158_000, 164_000, 168_000, 172_000,
      176_000, 182_000,
    ],
    settlement: "invoiced",
  },
]

/* -------------------------------------------------------------------------- */
/* 支出科目                                                                    */
/* -------------------------------------------------------------------------- */

export type ExpenseCategoryId =
  | "payroll"
  | "infrastructure"
  | "marketing"
  | "software"
  | "office"
  | "travel"
  | "compliance"
  | "procurement"

export interface ExpenseCategoryDef {
  id: ExpenseCategoryId
  name: string
  /** 归属部门——预算执行页按它汇总。 */
  department: string
  /** 变动成本在现金流预测里按最近三个月均值滚动，固定成本按合同额。 */
  behavior: "fixed" | "variable"
  monthly: number[]
  /**
   * 该科目是否已经发生"异常"——把一个科目做成一条可追踪的支线，
   * 风险页与洞察层的结论才有出处，而不是凭空的感叹。
   */
  note?: string
}

export const EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  {
    id: "payroll",
    name: "人力成本",
    department: "人力与行政",
    behavior: "fixed",
    monthly: [
      1_800_000, 1_820_000, 1_860_000, 2_400_000, 1_900_000, 1_940_000, 1_980_000, 2_020_000,
      2_080_000, 2_140_000, 2_200_000, 2_260_000,
    ],
    note: "2026-01 含年终奖一次性发放 ¥54 万；全年人数净增 24 人。",
  },
  {
    id: "infrastructure",
    name: "云与基础设施",
    department: "研发中心",
    behavior: "variable",
    monthly: [
      196_000, 201_000, 208_000, 216_000, 214_000, 226_000, 232_000, 240_000, 248_000, 268_000,
      286_000, 312_000,
    ],
  },
  {
    id: "marketing",
    name: "销售与市场",
    department: "销售与市场",
    behavior: "variable",
    monthly: [
      390_000, 410_000, 495_000, 250_000, 265_000, 410_000, 545_000, 445_000, 595_000, 519_000,
      527_000, 409_000,
    ],
    note: "7、8 月为旺季加大投放，投放额连续超过 55 万。",
  },
  {
    id: "software",
    name: "研发与工具",
    department: "研发中心",
    behavior: "variable",
    monthly: [
      168_000, 172_000, 178_000, 184_000, 176_000, 188_000, 192_000, 196_000, 202_000, 208_000,
      214_000, 412_000,
    ],
    note: "2026-09 单月翻倍：三笔年度订阅在同一账单周期自动续费。",
  },
  {
    id: "office",
    name: "办公与行政",
    department: "人力与行政",
    behavior: "fixed",
    monthly: [
      208_000, 208_000, 214_000, 214_000, 208_000, 214_000, 218_000, 218_000, 224_000, 224_000,
      228_000, 232_000,
    ],
  },
  {
    id: "travel",
    name: "差旅与招待",
    department: "销售与市场",
    behavior: "variable",
    monthly: [
      114_000, 119_000, 145_000, 72_000, 77_000, 118_000, 159_000, 131_000, 171_000, 165_000,
      155_000, 196_000,
    ],
  },
  {
    id: "compliance",
    name: "财税与合规",
    department: "财务与合规",
    behavior: "fixed",
    monthly: [
      186_000, 188_000, 192_000, 320_000, 188_000, 192_000, 198_000, 336_000, 198_000, 202_000,
      206_000, 214_000,
    ],
  },
  {
    id: "procurement",
    name: "采购与物流",
    department: "人力与行政",
    behavior: "variable",
    monthly: [
      118_000, 122_000, 128_000, 124_000, 112_000, 132_000, 136_000, 134_000, 142_000, 138_000,
      146_000, 158_000,
    ],
  },
]

/* -------------------------------------------------------------------------- */
/* 账户                                                                        */
/* -------------------------------------------------------------------------- */

export interface AccountDef {
  id: string
  name: string
  bank: string
  /** 账户类型决定它在现金流页的位置。 */
  kind: "basic" | "general" | "wallet" | "petty"
  /** 期初余额（2025-10-01）。期末余额由此推出，不单独写死。 */
  opening: number
  /** 支出默认从哪个账户出账（供应商规则可覆盖）。 */
  note: string
}

export const ACCOUNTS: AccountDef[] = [
  {
    id: "acc-cmb",
    name: "招商银行 · 基本户",
    bank: "招商银行深圳分行",
    kind: "basic",
    opening: 9_400_000,
    note: "工资、社保与主要供应商付款账户。",
  },
  {
    id: "acc-icbc",
    name: "工商银行 · 一般户",
    bank: "工商银行深圳科技园支行",
    kind: "general",
    opening: 3_100_000,
    note: "大额采购与年度订阅。",
  },
  {
    id: "acc-alipay",
    name: "支付宝企业账户",
    bank: "支付宝（中国）",
    kind: "wallet",
    opening: 720_000,
    note: "市场投放与小额报销。",
  },
  {
    id: "acc-petty",
    name: "备用金与现金",
    bank: "公司备用金",
    kind: "petty",
    opening: 316_830,
    note: "差旅与招待的现场支出。",
  },
]

/* -------------------------------------------------------------------------- */
/* 供应商                                                                      */
/* -------------------------------------------------------------------------- */

export interface VendorDef {
  id: string
  name: string
  category: ExpenseCategoryId
  /** 在该科目月支出中的占比；同一科目所有占比之和必须为 1。 */
  share: number
  /** 记账日（1–28），固定日期让流水读起来像真实的账单周期。 */
  day: number
  accountId: string
  memo: string
  /** 结算方式，用于流水的"渠道"列。 */
  method: "transfer" | "card" | "payroll" | "wallet" | "direct-debit"
}

/**
 * 供应商 / 收款方。每个科目的占比之和为 1——**总和由代码校验**，
 * 多出来的零头落到该科目的最后一个供应商上，保证科目合计分文不差。
 */
export const VENDORS: VendorDef[] = [
  // 人力成本
  {
    id: "v-payroll",
    name: "员工工资发放",
    category: "payroll",
    share: 0.78,
    day: 10,
    accountId: "acc-cmb",
    memo: "当月工资",
    method: "payroll",
  },
  {
    id: "v-social",
    name: "深圳市社保与公积金中心",
    category: "payroll",
    share: 0.15,
    day: 12,
    accountId: "acc-cmb",
    memo: "五险一金代缴",
    method: "direct-debit",
  },
  {
    id: "v-hr-service",
    name: "科锐人力资源服务",
    category: "payroll",
    share: 0.07,
    day: 18,
    accountId: "acc-cmb",
    memo: "外包与招聘服务费",
    method: "transfer",
  },
  // 云与基础设施
  {
    id: "v-aliyun",
    name: "阿里云",
    category: "infrastructure",
    share: 0.52,
    day: 3,
    accountId: "acc-icbc",
    memo: "ECS / RDS / OSS 月结",
    method: "direct-debit",
  },
  {
    id: "v-tencent-cloud",
    name: "腾讯云",
    category: "infrastructure",
    share: 0.28,
    day: 5,
    accountId: "acc-icbc",
    memo: "CDN 与对象存储",
    method: "direct-debit",
  },
  {
    id: "v-observability",
    name: "观测云",
    category: "infrastructure",
    share: 0.2,
    day: 8,
    accountId: "acc-icbc",
    memo: "日志与监控",
    method: "card",
  },
  // 销售与市场
  {
    id: "v-douyin-ads",
    name: "巨量引擎",
    category: "marketing",
    share: 0.42,
    day: 6,
    accountId: "acc-alipay",
    memo: "信息流投放",
    method: "wallet",
  },
  {
    id: "v-baidu-ads",
    name: "百度营销",
    category: "marketing",
    share: 0.24,
    day: 9,
    accountId: "acc-alipay",
    memo: "搜索关键词投放",
    method: "wallet",
  },
  {
    id: "v-wechat-ads",
    name: "腾讯广告",
    category: "marketing",
    share: 0.16,
    day: 14,
    accountId: "acc-alipay",
    memo: "朋友圈广告",
    method: "wallet",
  },
  {
    id: "v-events",
    name: "数字中国建设峰会",
    category: "marketing",
    share: 0.18,
    day: 21,
    accountId: "acc-cmb",
    memo: "展会与赞助",
    method: "transfer",
  },
  // 研发与工具
  {
    id: "v-github",
    name: "GitHub Enterprise",
    category: "software",
    share: 0.12,
    day: 2,
    accountId: "acc-icbc",
    memo: "代码托管年费",
    method: "card",
  },
  {
    id: "v-figma",
    name: "Figma",
    category: "software",
    share: 0.09,
    day: 2,
    accountId: "acc-icbc",
    memo: "设计协作席位",
    method: "card",
  },
  {
    id: "v-datadog",
    name: "Datadog",
    category: "software",
    share: 0.15,
    day: 4,
    accountId: "acc-icbc",
    memo: "APM 与追踪",
    method: "card",
  },
  {
    id: "v-jetbrains",
    name: "JetBrains",
    category: "software",
    share: 0.08,
    day: 4,
    accountId: "acc-icbc",
    memo: "IDE 团队授权",
    method: "card",
  },
  {
    id: "v-atlassian",
    name: "Atlassian",
    category: "software",
    share: 0.1,
    day: 11,
    accountId: "acc-icbc",
    memo: "研发协作与知识库席位",
    method: "card",
  },
  {
    id: "v-sentry",
    name: "Sentry",
    category: "software",
    share: 0.06,
    day: 16,
    accountId: "acc-icbc",
    memo: "错误监控",
    method: "card",
  },
  {
    id: "v-notion",
    name: "Notion",
    category: "software",
    share: 0.05,
    day: 19,
    accountId: "acc-icbc",
    memo: "文档协作",
    method: "card",
  },
  {
    id: "v-saas-other",
    name: "其它研发订阅",
    category: "software",
    share: 0.35,
    day: 22,
    accountId: "acc-icbc",
    memo: "零散工具订阅合并出账",
    method: "card",
  },
  // 办公与行政
  {
    id: "v-rent",
    name: "深圳湾科技生态园",
    category: "office",
    share: 0.62,
    day: 1,
    accountId: "acc-cmb",
    memo: "办公场地租金与物业",
    method: "transfer",
  },
  {
    id: "v-utilities",
    name: "南方电网 / 水务集团",
    category: "office",
    share: 0.13,
    day: 15,
    accountId: "acc-cmb",
    memo: "水电物业",
    method: "direct-debit",
  },
  {
    id: "v-office-supply",
    name: "京东企业购",
    category: "office",
    share: 0.25,
    day: 20,
    accountId: "acc-cmb",
    memo: "办公用品与耗材",
    method: "transfer",
  },
  // 差旅与招待
  {
    id: "v-ctrip",
    name: "携程商旅",
    category: "travel",
    share: 0.58,
    day: 24,
    accountId: "acc-petty",
    memo: "机票与酒店月结",
    method: "wallet",
  },
  {
    id: "v-didi",
    name: "滴滴企业版",
    category: "travel",
    share: 0.17,
    day: 24,
    accountId: "acc-alipay",
    memo: "市内用车",
    method: "wallet",
  },
  {
    id: "v-entertain",
    name: "客户招待",
    category: "travel",
    share: 0.25,
    day: 26,
    accountId: "acc-petty",
    memo: "商务宴请与礼品",
    method: "wallet",
  },
  // 财税与合规
  {
    id: "v-tax",
    name: "国家税务总局",
    category: "compliance",
    share: 0.64,
    day: 15,
    accountId: "acc-cmb",
    memo: "增值税与附加税",
    method: "direct-debit",
  },
  {
    id: "v-audit",
    name: "立信会计师事务所",
    category: "compliance",
    share: 0.21,
    day: 25,
    accountId: "acc-cmb",
    memo: "年度审计与咨询",
    method: "transfer",
  },
  {
    id: "v-legal",
    name: "金杜律师事务所",
    category: "compliance",
    share: 0.15,
    day: 27,
    accountId: "acc-cmb",
    memo: "合规与合同审阅",
    method: "transfer",
  },
  // 采购与物流
  {
    id: "v-devices",
    name: "苹果企业采购",
    category: "procurement",
    share: 0.46,
    day: 13,
    accountId: "acc-icbc",
    memo: "研发设备采购",
    method: "transfer",
  },
  {
    id: "v-logistics",
    name: "顺丰企业寄件",
    category: "procurement",
    share: 0.24,
    day: 23,
    accountId: "acc-cmb",
    memo: "合同与物料寄送",
    method: "transfer",
  },
  {
    id: "v-server-hw",
    name: "浪潮信息",
    category: "procurement",
    share: 0.3,
    day: 28,
    accountId: "acc-icbc",
    memo: "测试环境服务器",
    method: "transfer",
  },
]

/* -------------------------------------------------------------------------- */
/* 客户与账期规则                                                              */
/* -------------------------------------------------------------------------- */

export interface CustomerDef {
  id: string
  name: string
  industry: string
  /**
   * 回款纪律（0–1）：越高越按时。
   * 应收账龄与回款风险全部由它推导——不是给每条应收单独贴标签。
   */
  discipline: number
}

export const CUSTOMERS: CustomerDef[] = [
  { id: "cu-01", name: "招商局港口控股", industry: "交通物流", discipline: 0.97 },
  { id: "cu-02", name: "华润数科", industry: "企业服务", discipline: 0.94 },
  { id: "cu-03", name: "比亚迪电子", industry: "智能制造", discipline: 0.92 },
  { id: "cu-04", name: "顺丰科技", industry: "交通物流", discipline: 0.88 },
  { id: "cu-05", name: "金蝶软件", industry: "企业服务", discipline: 0.86 },
  { id: "cu-06", name: "迈瑞医疗", industry: "医疗器械", discipline: 0.81 },
  { id: "cu-07", name: "广汽研究院", industry: "汽车", discipline: 0.73 },
  { id: "cu-08", name: "天虹数科", industry: "零售", discipline: 0.68 },
  { id: "cu-09", name: "深业集团", industry: "地产园区", discipline: 0.61 },
  { id: "cu-10", name: "啟赋资本", industry: "金融投资", discipline: 0.52 },
]

/**
 * 账期规则：把"确认收入"和"收到现金"分成两件事。
 *
 * 订阅类当月收 72%（签合同先收），余款月末开票、账期 30 天；
 * 实施与增值当月收 35%（验收付首款），余款月末开票、账期 45 天。
 *
 * 应收账款**全部**由这条规则生成——不是手工挑几条写死。于是应收账龄、
 * 逾期金额、回款风险洞察，与收入页的每一条收入线都对得上。
 */
export const PAYMENT_TERMS = {
  /** 订阅类当月收款比例（年度预付为主，因此当月收款比例高）。 */
  prepaidCollection: 0.85,
  prepaidTermDays: 30,
  /** 实施与增值的当月收款比例。 */
  invoicedCollection: 0.5,
  invoicedTermDays: 45,
  /** 客户拖延上限（天）：按回款纪律折算，纪律越差拖得越久。 */
  maxLatenessDays: 62,
} as const

/** 应付账款：非人力科目的 8% 走月结，次月付清（供应商账期）。 */
export const PAYABLE_TERMS = {
  deferredRatio: 0.08,
  termDays: 30,
} as const

/**
 * 三个月滚动口径：净现金流出速率 = 近三个月平均月度净流出。
 * 跑道（runway）与警戒线预测都以它为基础，全站只此一处定义。
 */
export const BURN_WINDOW_MONTHS = 3

/** 未来 90 天现金预测的分桶：按周，13 个桶 + 期末。 */
export const FORECAST_WEEKS = 13

/* -------------------------------------------------------------------------- */
/* 工作区身份                                                                  */
/* -------------------------------------------------------------------------- */

export const WORKSPACE = {
  company: "智悟云科技（深圳）有限公司",
  short: "智悟云科技",
  plan: "企业版 · 财务中台",
  fiscalYear: "2026 财年",
  /** 会计政策：人民币记账，月度结账。 */
  standard: "企业会计准则 · 月度结账",
} as const

/**
 * 季度预算（2026 Q3，按科目下达）。
 *
 * 预算按**科目**而不是按"部门总额"下达：只有这样，"三个成本科目超出预算"
 * 才是一句可以被追溯到具体科目的结论。部门维度在执行页里由科目汇总得到。
 *
 * 这组数字不是随手填的：它与矩阵里 2026-07～09 的实际发生额对得上——
 * 人力、云、办公、财税、采购在预算内，市场、研发工具、差旅超支。
 */
export const QUARTER_BUDGETS: { category: ExpenseCategoryId; amount: number }[] = [
  { category: "payroll", amount: 6_800_000 },
  { category: "infrastructure", amount: 1_000_000 },
  { category: "marketing", amount: 1_400_000 },
  { category: "software", amount: 720_000 },
  { category: "office", amount: 700_000 },
  { category: "travel", amount: 500_000 },
  { category: "compliance", amount: 700_000 },
  { category: "procurement", amount: 520_000 },
]

/** 季度预算合计——侧栏工作区上下文用它与实际发生额对比。 */
export const QUARTER_BUDGET = QUARTER_BUDGETS.reduce((sum, entry) => sum + entry.amount, 0)
