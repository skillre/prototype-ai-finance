/**
 * 智悟云 CRM 的真实感 mock 数据。
 *
 * 与 lib/mock-data.ts（Northwind 演示仪表盘）相互独立——CRM 原型拥有自己的
 * 客户、任务、活动与图表数据，但共用同一套 UI primitive、motion preset 与
 * design token。
 *
 * 约定：**数据里只放内容，不放界面文案**。
 *   • 本文件负责客户 / 任务 / 活动 / 通知等业务数据（中文业务语境）。
 *   • 所有按钮、标题、标签、空状态等界面文案集中在 lib/i18n/zh-CN.ts。
 * 因此状态、活动类型、任务列在这里只保留 id 与视觉色调，文案由 i18n 提供。
 */

/* -------------------------------------------------------------------------- */
/* 客户                                                                        */
/* -------------------------------------------------------------------------- */

export type CustomerStatus = "lead" | "trial" | "active" | "churned" | "at-risk"

export type CustomerPlan = "Starter" | "Growth" | "Scale" | "Enterprise"

export interface CrmCustomer {
  id: string
  name: string
  company: string
  email: string
  phone: string
  title: string
  status: CustomerStatus
  owner: string
  /** 合同金额（人民币元），未成交的为预估管道金额。 */
  value: number
  plan: CustomerPlan
  /** ISO 日期，用于排序与"本月新增"统计。 */
  createdAt: string
  /** 距上次触达的小时数——排序用，展示时经 formatRelativeHours 本地化。 */
  lastTouchHours: number
  tags: string[]
  notes: string
}

export const CRM_OWNERS = ["陈美雅", "高子墨", "苏芮", "韦俊", "潘丽"] as const

export type CrmOwner = (typeof CRM_OWNERS)[number]

/**
 * 状态视觉。文案在 i18n（`t.status[status]`），这里只保留色调：
 * 语义色优先于图表色，保证徽章、指示灯与环形图三处颜色永远一致。
 */
export const STATUS_META: Record<
  CustomerStatus,
  { dot: string; text: string; chip: string }
> = {
  lead: {
    dot: "bg-brand",
    text: "text-brand",
    chip: "border-transparent bg-brand-soft text-brand",
  },
  trial: {
    dot: "bg-info",
    text: "text-info",
    chip: "border-transparent bg-info-soft text-info",
  },
  active: {
    dot: "bg-success",
    text: "text-success",
    chip: "border-transparent bg-success-soft text-success",
  },
  "at-risk": {
    dot: "bg-warning",
    text: "text-warning",
    chip: "border-transparent bg-warning-soft text-warning",
  },
  churned: {
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
    chip: "border-transparent bg-muted text-muted-foreground",
  },
}

export const STATUS_ORDER: CustomerStatus[] = ["lead", "trial", "active", "at-risk", "churned"]

export const CRM_CUSTOMERS: CrmCustomer[] = [
  {
    id: "c-001",
    name: "陈晨",
    company: "北辰物流",
    email: "chenchen@beichen-logistics.cn",
    phone: "+86 138 0013 8462",
    title: "运营副总裁",
    status: "active",
    owner: "陈美雅",
    value: 1_480_000,
    plan: "Enterprise",
    createdAt: "2026-08-19",
    lastTouchHours: 3,
    tags: ["旗舰客户", "Q4 续约", "车队接口"],
    notes:
      "续约窗口在 11 月。运营团队希望在签约前拿到车队遥测接口——已约工程团队下周二做技术范围评估。",
  },
  {
    id: "c-002",
    name: "李然",
    company: "星河科技",
    email: "liran@xinghe-tech.cn",
    phone: "+86 139 2288 1043",
    title: "采购总监",
    status: "trial",
    owner: "高子墨",
    value: 960_000,
    plan: "Scale",
    createdAt: "2026-09-02",
    lastTouchHours: 20,
    tags: ["试用第 9 天", "安全评估"],
    notes:
      "试用进入第 9 天。安全问卷已回传且无风险项，目前只剩法务环节，通过后可 Q4 启动。",
  },
  {
    id: "c-003",
    name: "王思远",
    company: "远航制造",
    email: "wangsiyuan@yuanhang-mfg.cn",
    phone: "+86 136 7788 2251",
    title: "信息技术总监",
    status: "at-risk",
    owner: "苏芮",
    value: 720_000,
    plan: "Growth",
    createdAt: "2026-03-11",
    lastTouchHours: 288,
    tags: ["关键人离职", "Q3 续约"],
    notes:
      "原对接人 7 月跳槽到竞品公司。新任总监已六周未参加任何会议，需要一次高管级别的重新破冰。",
  },
  {
    id: "c-004",
    name: "周宁",
    company: "云启医疗",
    email: "zhouning@yunqi-med.cn",
    phone: "+86 137 6699 3388",
    title: "首席信息官",
    status: "active",
    owner: "陈美雅",
    value: 2_100_000,
    plan: "Enterprise",
    createdAt: "2026-01-27",
    lastTouchHours: 8,
    tags: ["旗舰客户", "等保三级", "增购意向"],
    notes:
      "两家新院区的增购已在讨论中。等保三级补充协议已签署归档，采购希望签三年期。",
  },
  {
    id: "c-005",
    name: "林浩",
    company: "光谷机器人",
    email: "linhao@guanggu-robot.cn",
    phone: "+86 188 5566 7712",
    title: "工程经理",
    status: "trial",
    owner: "韦俊",
    value: 540_000,
    plan: "Growth",
    createdAt: "2026-09-05",
    lastTouchHours: 44,
    tags: ["试用第 6 天", "自助开通"],
    notes:
      "自助注册，首日即邀请十一名工程师加入。使用量明显高于试用中位数，是快速成单的优质候选。",
  },
  {
    id: "c-006",
    name: "赵敏",
    company: "晨曦能源",
    email: "zhaomin@chenxi-energy.cn",
    phone: "+86 159 3344 9028",
    title: "财务副总裁",
    status: "active",
    owner: "潘丽",
    value: 1_320_000,
    plan: "Scale",
    createdAt: "2026-05-14",
    lastTouchHours: 30,
    tags: ["财务决策人", "按量计费"],
    notes:
      "希望下一期改为按量计费而非按席位。财务部正在内部测算超量场景的成本区间。",
  },
  {
    id: "c-007",
    name: "孙宇",
    company: "海通航运",
    email: "sunyu@haitong-ship.cn",
    phone: "+86 135 8899 4407",
    title: "船队总监",
    status: "churned",
    owner: "高子墨",
    value: 0,
    plan: "Starter",
    createdAt: "2025-11-08",
    lastTouchHours: 1440,
    tags: ["已流失", "预算削减"],
    notes:
      "6 月因船队事业部整体预算冻结而终止。对方保留 FY27 重启的可能——已在 1 月设置回访提醒。",
  },
  {
    id: "c-008",
    name: "吴静",
    company: "明澈诊断",
    email: "wujing@mingche-dx.cn",
    phone: "+86 186 2233 5561",
    title: "实验室主任",
    status: "active",
    owner: "苏芮",
    value: 880_000,
    plan: "Growth",
    createdAt: "2026-06-30",
    lastTouchHours: 52,
    tags: ["系统集成", "实验室平台"],
    notes:
      "实验室信息系统对接已于上个月上线。内部复盘中被提及最多的功能是通量报表。",
  },
  {
    id: "c-009",
    name: "郑凯",
    company: "恒锐精密",
    email: "zhengkai@hengrui-precision.cn",
    phone: "+86 133 6677 1194",
    title: "厂长",
    status: "lead",
    owner: "韦俊",
    value: 410_000,
    plan: "Starter",
    createdAt: "2026-09-08",
    lastTouchHours: 12,
    tags: ["主动咨询", "已约演示"],
    notes:
      "来自制造业线上研讨会的主动咨询。演示定在周四，核心问题是能否支持车间平板离线使用。",
  },
  {
    id: "c-010",
    name: "何雅",
    company: "安泰保险",
    email: "heya@antai-insure.cn",
    phone: "+86 130 4455 8873",
    title: "理赔负责人",
    status: "at-risk",
    owner: "潘丽",
    value: 1_150_000,
    plan: "Scale",
    createdAt: "2026-02-20",
    lastTouchHours: 336,
    tags: ["Q3 续约", "工单升级"],
    notes:
      "8 月升级了两张 P2 工单。问题都已解决，但满意度有所下滑，需要安排一次理赔团队的客户健康检查。",
  },
  {
    id: "c-011",
    name: "冯磊",
    company: "磐石资本",
    email: "fenglei@panshi-capital.cn",
    phone: "+86 139 1188 6032",
    title: "合伙人",
    status: "active",
    owner: "陈美雅",
    value: 1_750_000,
    plan: "Enterprise",
    createdAt: "2025-12-04",
    lastTouchHours: 15,
    tags: ["旗舰客户", "口碑推荐", "联合案例"],
    notes:
      "已确认参与 Q4 发布的联合客户案例。法务正在审阅引用文案，品牌部希望在 10 月前完成终审。",
  },
  {
    id: "c-012",
    name: "许琳",
    company: "万象零售",
    email: "xulin@wanxiang-retail.cn",
    phone: "+86 158 7766 2145",
    title: "电商负责人",
    status: "trial",
    owner: "苏芮",
    value: 630_000,
    plan: "Growth",
    createdAt: "2026-08-28",
    lastTouchHours: 68,
    tags: ["试用第 13 天", "旺季前上线"],
    notes:
      "试用期在旺季前结束。能否在 11 月流量高峰前完成上线，是他们决策的唯一变量。",
  },
  {
    id: "c-013",
    name: "曹睿",
    company: "铁壁安全",
    email: "caorui@tiebi-sec.cn",
    phone: "+86 187 9900 3318",
    title: "首席安全官",
    status: "active",
    owner: "高子墨",
    value: 1_640_000,
    plan: "Enterprise",
    createdAt: "2026-04-09",
    lastTouchHours: 22,
    tags: ["旗舰客户", "等保测评", "安全合规"],
    notes:
      "首席安全官亲自完成安全评估并在四天内签字通过，是推动平台团队全面铺开的强内部支持者。",
  },
  {
    id: "c-014",
    name: "沈彤",
    company: "沙丘数据",
    email: "shentong@shaqiu-data.cn",
    phone: "+86 131 2244 7790",
    title: "董事总经理",
    status: "lead",
    owner: "潘丽",
    value: 580_000,
    plan: "Scale",
    createdAt: "2026-09-06",
    lastTouchHours: 36,
    tags: ["客户转介绍", "多地域部署"],
    notes:
      "由磐石资本转介绍。需要多地数据驻留能力，我们的华东与新加坡节点已可满足。",
  },
  {
    id: "c-015",
    name: "韩雪",
    company: "云翼航空",
    email: "hanxue@yunyi-aero.cn",
    phone: "+86 189 5533 4426",
    title: "项目总监",
    status: "at-risk",
    owner: "韦俊",
    value: 980_000,
    plan: "Scale",
    createdAt: "2026-01-15",
    lastTouchHours: 400,
    tags: ["Q4 续约", "合规审查"],
    notes:
      "项目因出口管制审查暂停。这不是产品问题，但若本月不重新接触，续约日期将顺延。",
  },
  {
    id: "c-016",
    name: "唐宁",
    company: "环宇通信",
    email: "tangning@huanyu-telecom.cn",
    phone: "+86 177 8899 1260",
    title: "网络运营经理",
    status: "active",
    owner: "苏芮",
    value: 1_210_000,
    plan: "Scale",
    createdAt: "2026-07-22",
    lastTouchHours: 40,
    tags: ["增购意向", "接口用量高"],
    notes:
      "上线后接口调用量增长到三倍。运营团队希望在下个账期前获得专属支持档位。",
  },
  {
    id: "c-017",
    name: "罗一鸣",
    company: "北境金科",
    email: "luoyiming@beijing-fintech.cn",
    phone: "+86 132 4411 8805",
    title: "平台负责人",
    status: "trial",
    owner: "陈美雅",
    value: 790_000,
    plan: "Growth",
    createdAt: "2026-09-01",
    lastTouchHours: 26,
    tags: ["试用第 10 天", "金融合规"],
    notes:
      "合规问题已由解决方案工程师答复完毕，目前在等对方架构评审委员会，该委员会每周五开会。",
  },
  {
    id: "c-018",
    name: "蒋薇",
    company: "尚衡律所",
    email: "jiangwei@shangheng-law.cn",
    phone: "+86 134 6622 9901",
    title: "运营合伙人",
    status: "churned",
    owner: "潘丽",
    value: 0,
    plan: "Starter",
    createdAt: "2025-09-30",
    lastTouchHours: 2160,
    tags: ["已流失", "转向竞品"],
    notes:
      "4 月因价格原因转向竞品。等基础版定价调整落地后，值得启动一次赢回尝试。",
  },
  {
    id: "c-019",
    name: "邓皓",
    company: "维斯制药",
    email: "denghao@weisi-pharma.cn",
    phone: "+86 185 3377 6614",
    title: "质量总监",
    status: "active",
    owner: "高子墨",
    value: 1_420_000,
    plan: "Enterprise",
    createdAt: "2026-05-27",
    lastTouchHours: 47,
    tags: ["GMP 认证", "审计追踪"],
    notes:
      "7 月通过 GMP 审计，审计追踪模块零缺陷项。质量团队目前已可作为标杆参考客户。",
  },
  {
    id: "c-020",
    name: "苏婉",
    company: "泛洋船务",
    email: "suwan@fanyang-ship.cn",
    phone: "+86 176 5588 3327",
    title: "区域物流负责人",
    status: "lead",
    owner: "苏芮",
    value: 470_000,
    plan: "Growth",
    createdAt: "2026-09-09",
    lastTouchHours: 6,
    tags: ["主动咨询", "报价中"],
    notes:
      "索要覆盖四个亚太港口的报价单。量级折扣档位是他们最关心的决策因素。",
  },
  {
    id: "c-021",
    name: "白泽",
    company: "迦南新能源",
    email: "baize@jianan-energy.cn",
    phone: "+86 175 6622 4471",
    title: "现场运营负责人",
    status: "trial",
    owner: "韦俊",
    value: 360_000,
    plan: "Starter",
    createdAt: "2026-09-07",
    lastTouchHours: 32,
    tags: ["试用第 4 天", "离线优先"],
    notes:
      "现场团队长期在网络不稳定环境下作业。离线同步能力是这次试用能否转化的唯一决定因素。",
  },
  {
    id: "c-022",
    name: "严青",
    company: "波罗的海货运",
    email: "yanqing@baltic-freight.cn",
    phone: "+86 178 2255 7739",
    title: "副主任",
    status: "active",
    owner: "陈美雅",
    value: 670_000,
    plan: "Growth",
    createdAt: "2026-08-12",
    lastTouchHours: 58,
    tags: ["季节性业务", "增购意向"],
    notes:
      "今年的季节性高峰处理得很顺利。正在讨论在春季合同中增加第二个区域。",
  },
]

/* -------------------------------------------------------------------------- */
/* 任务——横向拖拽看板                                                          */
/* -------------------------------------------------------------------------- */

export type TaskColumnId = "follow-up" | "call" | "proposal" | "demo" | "onboarding"

export interface CrmTask {
  id: string
  title: string
  /** 关联客户的 company 名称。 */
  company: string
  owner: string
  /** ISO 日期。 */
  due: string
  /** 0–100，低于 30 显示为逾期风险。 */
  progress: number
}

/** 列定义只保留 id；标题与副标题来自 i18n（`t.tasks.columns`）。 */
export const TASK_COLUMNS: { id: TaskColumnId }[] = [
  { id: "follow-up" },
  { id: "call" },
  { id: "proposal" },
  { id: "demo" },
  { id: "onboarding" },
]

export const CRM_TASKS: Record<TaskColumnId, CrmTask[]> = {
  "follow-up": [
    { id: "t-101", title: "重新破冰新任 IT 总监", company: "远航制造", owner: "苏芮", due: "2026-09-11", progress: 20 },
    { id: "t-102", title: "发送亚太港口报价单", company: "泛洋船务", owner: "苏芮", due: "2026-09-12", progress: 55 },
    { id: "t-103", title: "确认联合案例初稿", company: "磐石资本", owner: "陈美雅", due: "2026-09-15", progress: 70 },
  ],
  call: [
    { id: "t-201", title: "续约范围沟通会", company: "北辰物流", owner: "陈美雅", due: "2026-09-11", progress: 40 },
    { id: "t-202", title: "理赔团队健康检查", company: "安泰保险", owner: "潘丽", due: "2026-09-14", progress: 25 },
    { id: "t-203", title: "合规审查回访", company: "云翼航空", owner: "韦俊", due: "2026-09-16", progress: 15 },
  ],
  proposal: [
    { id: "t-301", title: "起草三年期合同条款", company: "云启医疗", owner: "陈美雅", due: "2026-09-12", progress: 65 },
    { id: "t-302", title: "按量计费方案测算", company: "晨曦能源", owner: "潘丽", due: "2026-09-18", progress: 35 },
  ],
  demo: [
    { id: "t-401", title: "车间平板离线演示", company: "恒锐精密", owner: "韦俊", due: "2026-09-11", progress: 45 },
    { id: "t-402", title: "多地域部署演示", company: "沙丘数据", owner: "潘丽", due: "2026-09-17", progress: 30 },
    { id: "t-403", title: "旺季上线排期评审", company: "万象零售", owner: "苏芮", due: "2026-09-19", progress: 50 },
  ],
  onboarding: [
    { id: "t-501", title: "车队遥测接口范围确认", company: "北辰物流", owner: "陈美雅", due: "2026-09-13", progress: 60 },
    { id: "t-502", title: "实验室系统上线复盘", company: "明澈诊断", owner: "苏芮", due: "2026-09-20", progress: 80 },
    { id: "t-503", title: "专属支持档位配置", company: "环宇通信", owner: "苏芮", due: "2026-09-22", progress: 10 },
  ],
}

/* -------------------------------------------------------------------------- */
/* 活动——客户时间线                                                            */
/* -------------------------------------------------------------------------- */

export type ActivityKind = "email" | "call" | "meeting" | "note" | "status"

export interface CrmActivity {
  id: string
  customerId: string
  kind: ActivityKind
  title: string
  detail: string
  actor: string
  /** 展示用相对时间。 */
  time: string
  /** ISO 时间戳，用于排序。 */
  at: string
}

/** 活动类型只保留图标；文案来自 i18n（`t.activities.kinds`）。 */
export const ACTIVITY_META: Record<ActivityKind, { icon: "mail" | "phone" | "calendar" | "note" | "status" }> = {
  email: { icon: "mail" },
  call: { icon: "phone" },
  meeting: { icon: "calendar" },
  note: { icon: "note" },
  status: { icon: "status" },
}

export const CRM_ACTIVITIES: CrmActivity[] = [
  { id: "a-001", customerId: "c-001", kind: "meeting", title: "完成续约方案评审", detail: "与运营及工程团队一起过完了车队遥测接口的功能范围。", actor: "陈美雅", time: "3 小时前", at: "2026-09-10T07:15:00Z" },
  { id: "a-002", customerId: "c-004", kind: "email", title: "发送三年期合同草案", detail: "附上企业版协议全文，并在第 7 条标注了等保三级补充条款。", actor: "陈美雅", time: "8 小时前", at: "2026-09-10T02:40:00Z" },
  { id: "a-003", customerId: "c-002", kind: "status", title: "进入试用阶段", detail: "安全问卷无风险项通过，试用期延长七天。", actor: "高子墨", time: "20 小时前", at: "2026-09-09T14:20:00Z" },
  { id: "a-004", customerId: "c-011", kind: "call", title: "联合案例启动沟通", detail: "与对方品牌团队确认了叙事主线与两周的审阅窗口。", actor: "陈美雅", time: "15 小时前", at: "2026-09-09T19:05:00Z" },
  { id: "a-005", customerId: "c-016", kind: "note", title: "接口调用量增长三倍", detail: "已标记为下个账期前需要推进专属支持档位的客户。", actor: "苏芮", time: "1 天前", at: "2026-09-09T06:00:00Z" },
  { id: "a-006", customerId: "c-010", kind: "status", title: "标记为流失风险", detail: "8 月两次 P2 工单升级后满意度下滑，问题均已解决。", actor: "潘丽", time: "2 天前", at: "2026-09-08T09:30:00Z" },
  { id: "a-007", customerId: "c-013", kind: "meeting", title: "安全评估签字通过", detail: "首席安全官亲自完成评估，并批准了平台团队的全面铺开计划。", actor: "高子墨", time: "2 天前", at: "2026-09-08T05:45:00Z" },
  { id: "a-008", customerId: "c-020", kind: "email", title: "跟进报价请求", detail: "对方索要覆盖四个亚太港口的量级折扣档位。", actor: "苏芮", time: "6 小时前", at: "2026-09-10T04:10:00Z" },
  { id: "a-009", customerId: "c-008", kind: "note", title: "上线复盘记录", detail: "实验室系统对接已稳定运行四周，通量报表是被提及最多的功能。", actor: "苏芮", time: "3 天前", at: "2026-09-07T08:00:00Z" },
  { id: "a-010", customerId: "c-019", kind: "status", title: "GMP 审计通过", detail: "审计追踪模块零缺陷项通过，质量团队愿意作为参考客户。", actor: "高子墨", time: "4 天前", at: "2026-09-06T11:25:00Z" },
  { id: "a-011", customerId: "c-005", kind: "email", title: "试用进度回访", detail: "首日即有十一名工程师加入，使用量远高于试用中位数。", actor: "韦俊", time: "1 天前", at: "2026-09-09T03:20:00Z" },
  { id: "a-012", customerId: "c-012", kind: "call", title: "旺季上线可行性沟通", detail: "讨论了能否在 11 月流量高峰前完成整体上线。", actor: "苏芮", time: "2 天前", at: "2026-09-08T13:50:00Z" },
  { id: "a-013", customerId: "c-022", kind: "note", title: "季节性高峰平稳度过", detail: "峰值流量零故障处理完成，正在讨论春季合同增加第二个区域。", actor: "陈美雅", time: "5 天前", at: "2026-09-05T07:40:00Z" },
  { id: "a-014", customerId: "c-007", kind: "status", title: "客户已流失", detail: "船队事业部预算冻结后终止合作，已安排在 1 月重启回访。", actor: "高子墨", time: "1 周前", at: "2026-09-03T10:15:00Z" },
  { id: "a-015", customerId: "c-009", kind: "call", title: "主动咨询并预约演示", detail: "核心问题是车间平板能否离线使用，演示定在周四。", actor: "韦俊", time: "12 小时前", at: "2026-09-09T22:05:00Z" },
  { id: "a-016", customerId: "c-017", kind: "email", title: "合规问题答复已发送", detail: "解决方案工程师完成答复，目前在等对方架构评审委员会。", actor: "陈美雅", time: "1 天前", at: "2026-09-09T01:30:00Z" },
  { id: "a-017", customerId: "c-021", kind: "note", title: "离线同步需求记录", detail: "现场团队长期处于弱网环境，离线同步能力直接决定这次试用结果。", actor: "韦俊", time: "2 天前", at: "2026-09-08T04:55:00Z" },
  { id: "a-018", customerId: "c-015", kind: "status", title: "标记为流失风险", detail: "项目因出口管制审查暂停，若不重新接触续约日期将顺延。", actor: "韦俊", time: "6 天前", at: "2026-09-04T09:05:00Z" },
  { id: "a-019", customerId: "c-003", kind: "note", title: "关键对接人离职记录", detail: "原对接人 7 月加入竞品公司，新任总监暂未响应。", actor: "苏芮", time: "1 周前", at: "2026-09-02T15:30:00Z" },
  { id: "a-020", customerId: "c-006", kind: "meeting", title: "计费模式工作坊", detail: "财务部正在按量计费结构下测算超量场景的成本。", actor: "潘丽", time: "4 天前", at: "2026-09-06T06:20:00Z" },
]

/* -------------------------------------------------------------------------- */
/* 图表数据                                                                     */
/* -------------------------------------------------------------------------- */

export interface PipelinePoint {
  month: string
  won: number
  pipeline: number
}

export const PIPELINE_SERIES: PipelinePoint[] = [
  { month: "10月", won: 1_180_000, pipeline: 2_650_000 },
  { month: "11月", won: 1_320_000, pipeline: 2_880_000 },
  { month: "12月", won: 1_560_000, pipeline: 2_710_000 },
  { month: "1月", won: 1_410_000, pipeline: 3_120_000 },
  { month: "2月", won: 1_680_000, pipeline: 3_340_000 },
  { month: "3月", won: 1_590_000, pipeline: 3_050_000 },
  { month: "4月", won: 1_840_000, pipeline: 3_480_000 },
  { month: "5月", won: 1_970_000, pipeline: 3_660_000 },
  { month: "6月", won: 2_120_000, pipeline: 3_520_000 },
  { month: "7月", won: 2_260_000, pipeline: 3_910_000 },
  { month: "8月", won: 2_440_000, pipeline: 4_120_000 },
  { month: "9月", won: 2_680_000, pipeline: 4_380_000 },
]

export interface StageSlice {
  name: string
  value: number
  color: string
}

/** 按当前客户状态实时计算的管道分布（在视图中由 store 数据派生）。 */
export const STAGE_COLORS: Record<CustomerStatus, string> = {
  lead: "var(--chart-1)",
  trial: "var(--chart-2)",
  active: "var(--chart-3)",
  "at-risk": "var(--chart-4)",
  churned: "var(--muted-foreground)",
}

/* -------------------------------------------------------------------------- */
/* 通知                                                                        */
/* -------------------------------------------------------------------------- */

export interface CrmNotification {
  id: string
  kind: "trial" | "payment" | "usage" | "report"
  title: string
  description: string
  time: string
  unread: boolean
  /** 关联客户——点击通知可直接进入该客户详情页。 */
  customerId?: string
}

export const CRM_NOTIFICATIONS: CrmNotification[] = [
  {
    id: "cn1",
    kind: "trial",
    title: "试用即将到期",
    description: "星河科技的试用将在 5 天后结束",
    time: "2 小时前",
    unread: true,
    customerId: "c-002",
  },
  {
    id: "cn2",
    kind: "payment",
    title: "合同已签署",
    description: "云启医疗已回签三年期合同",
    time: "5 小时前",
    unread: true,
    customerId: "c-004",
  },
  {
    id: "cn3",
    kind: "usage",
    title: "客户存在流失风险",
    description: "远航制造已 12 天没有新的联系记录",
    time: "1 天前",
    unread: true,
    customerId: "c-003",
  },
  {
    id: "cn4",
    kind: "report",
    title: "每周管道报告",
    description: "8 月 31 日 – 9 月 6 日的汇总已生成",
    time: "3 天前",
    unread: false,
  },
]
