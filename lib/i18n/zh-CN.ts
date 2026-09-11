import type { ExpenseCategoryId } from "@/lib/finance-data"

/**
 * zh-CN — 智悟云 · AI 财务工作台 的参考词典。
 *
 * 产品里每一句用户可见的话都在这里。组件不内联文案，一律经 `useMessages()`
 * 读取；新增一个 locale 只需要补一个同形状的文件（见 `lib/i18n/index.ts`）。
 *
 * 约定
 *   • 带参数的文案写成函数，不做字符串拼接。
 *   • 键名描述含义（`transactions.empty`），不描述位置。
 *   • **事实由代码给出，措辞由词典给出**：洞察句里的金额、百分比、日期、
 *     客户名都是 `lib/finance-insights.ts` 算出来的结构化事实，词典只负责
 *     把它们说成中文。换掉数据，句子自己会变。
 */

/** 金额在文案里一律以"已格式化好的字符串"传入——格式化规则属于 `lib/format.ts`。 */
type Money = string

export const zhCN = {
  /* ------------------------------------------------------------------ meta */
  locale: {
    label: "简体中文",
    short: "中",
  },

  common: {
    cancel: "取消",
    close: "关闭",
    confirm: "确认",
    save: "保存",
    back: "返回",
    retry: "重试",
    reset: "重置",
    search: "搜索",
    searchPlaceholder: "搜索…",
    clearSearch: "清除搜索",
    resetFilters: "重置筛选",
    clearFilters: "清除筛选",
    loading: "加载中",
    loadFailed: "数据加载失败",
    copy: "复制",
    copied: "已复制",
    openMenu: "打开菜单",
    more: "更多",
    none: "暂无",
    notAvailable: "—",
    viewAll: "查看全部",
    showMore: "展开",
    showLess: "收起",
    refresh: "刷新",
    justNow: "刚刚",
    unit: {
      day: "天",
      month: "个月",
      count: "笔",
      account: "个账户",
    },
  },

  a11y: {
    primaryNav: "主导航",
    sectionLabel: "工作区",
    openNav: "打开导航",
    openCommand: "打开命令中心",
    commandHint: "命令中心：搜索页面、交易与指令",
    toggleTheme: "切换深浅色",
    refreshData: "刷新账本",
    notifications: "通知",
    prototypeControls: "原型状态",
    accountMenu: "账户菜单",
    copyValue: "复制数值",
    closeOverlay: "关闭浮层",
  },

  /* ----------------------------------------------------------------- brand */
  brand: {
    name: "智悟云 · AI 财务工作台",
    short: "智悟云财务",
    mark: "智",
    subtitle: "现金流与预算指挥台",
    metaTitle: "智悟云 · AI 财务工作台",
    metaDescription:
      "面向中小企业经营者与财务负责人的 AI 财务指挥台：现金跑道、收支结构、预算执行与确定性财务洞察。",
    product: "AI 财务工作台",
  },

  account: {
    name: "陈嘉禾",
    email: "chenjiahe@zhiwu.cn",
    initials: "陈",
    role: "财务负责人",
    workspace: "智悟云科技（深圳）有限公司",
    plan: "企业版 · 财务中台",
  },

  /** 共享布局组件（Sidebar / TopNav / MobileNav）未注入配置时的默认身份。 */
  workspace: {
    brandName: "智悟云财务",
    brandSubtitle: "现金流与预算指挥台",
    userName: "陈嘉禾",
    userEmail: "chenjiahe@zhiwu.cn",
    userInitials: "陈",
    usageLabel: "季度预算",
    usageValue: "99%",
    usageHint: "2026 Q3 预算已执行 99%，三个科目超出额度。",
    quickStart: "个人资料",
    nav: {
      overview: "总览",
      cashflow: "现金流",
      analysis: "收支分析",
      budget: "预算执行",
      insights: "AI 洞察",
      risks: "风险与异常",
      transactions: "交易流水",
    },
  },

  /* ------------------------------------------------------------------ 导航 */
  nav: {
    overview: "财务总览",
    cashflow: "现金流",
    analysis: "收支分析",
    budget: "预算执行",
    insights: "AI 财务洞察",
    risks: "风险与异常",
    transactions: "交易流水",
    accounts: "账户与余额",
    forecast: "现金预测",
    aging: "应收账龄",
    composition: "支出结构",
    counterparties: "交易对手",
    workspaceSection: "财务工作台",
    intelligenceSection: "智能中心",
    commandCenter: "命令中心",
    addTransaction: "登记一笔收支",
    exportReport: "生成月度报表",
  },

  shell: {
    commandHint: "搜索页面、交易与指令",
    workspaceSection: "财务工作台",
    intelligenceSection: "智能中心",
    contextLabel: "季度预算",
    contextHint: "2026 Q3 · 三个科目已超支",
    syncing: "正在同步账本",
    live: "账本已同步",
    liveHint: "数据截至 2026-09-11",
    accountHint: "查看个人资料",
    goalLabel: "季度预算执行",
    goalHint: "含 8 个科目，超支集中在市场、工具与差旅。",
  },

  /* --------------------------------------------------------------- 页面元信息 */
  page: {
    breadcrumb: (title: string) => `财务工作台 / ${title}`,
    overview: {
      eyebrow: "现金指挥台",
      title: "财务总览",
      description: "现金头寸、跑道与本月收支——第一眼先看还能撑多久。",
    },
    cashflow: {
      eyebrow: "未来 13 周",
      title: "现金流",
      description: "按供应商周期与在手发票推演的现金预测，以及四个账户的余额分布。",
    },
    analysis: {
      eyebrow: "收入与支出",
      title: "收支分析",
      description: "收入结构、支出科目与交易对手——同一个账本，三种切法。",
    },
    budget: {
      eyebrow: "2026 Q3",
      title: "预算执行",
      description: "按科目下达的季度预算，以及部门维度的执行情况。",
    },
    insights: {
      eyebrow: "确定性推导",
      title: "AI 财务洞察",
      description: "每一条结论都可以回到产生它的那几笔记录。",
    },
    risks: {
      eyebrow: "异常与敞口",
      title: "风险与异常",
      description: "异常支出、预算超支与应收账款账龄。",
    },
    transactions: {
      eyebrow: "账本",
      title: "交易流水",
      description: "收付实现制下的全部现金收付，含内部资金调拨。",
    },
  },

  /* ---------------------------------------------------------------- 产品文案 */
  finance: {
    /** 口径说明：数据从哪来、覆盖多久——可信度的一部分。 */
    scope: {
      title: "数据口径",
      months: (count: number) => `${count} 个记账月份`,
      transactions: (count: number) => `${count} 笔现金收付`,
      reference: (date: string) => `报表基准日 ${date}`,
      receivable: (amount: Money) => `未回款应收 ${amount}`,
      payable: (amount: Money) => `未付应付 ${amount}`,
      transfer: (amount: Money) => `内部调拨 ${amount}（不计入经营现金流）`,
      standard: "人民币记账 · 收付实现制",
    },

    status: {
      ready: "账本已就绪",
      loading: "正在同步账本",
      error: "账本同步失败",
    },

    /* ------------------------------------------------------- 第一视觉：跑道 */
    hero: {
      sectionLabel: "现金跑道",
      cashLabel: "当前现金",
      runwayLabel: "预计现金跑道",
      runwayUnit: "个月",
      floorLabel: "运营备付金",
      forecastLabel: "未来 90 天现金",
      forecastEndingLabel: "预测期末",
      burnLabel: "月均净流出",
      chartLabel: "未来 90 天现金预测走势",
      chartCaption: "阴影是压力与优化两种情景的上下限，可复算，不是置信区间。",
      readHint: "把指针放在图上可读取该周读数",
      reading: (label: string) => `${label} 读数`,
      weekInflow: "当周流入",
      weekOutflow: "当周流出",
      weekNet: "当周净额",
      reset: "回到基准",
      pinned: "已固定",
      action: "查看现金流推演",
      live: "账本实时同步",
      liveHint: "更新于 2026-09-11 09:20",
      crossing: (month: string) => `预计 ${month} 触及现金警戒线`,
      noCrossing: "按当前推演，不会触及警戒线",
      baselineNote: "基准 = 近三个月实际收付结构",
      scenarioNote: "情景 = 你当前的假设",
    },

    /** 签名交互：可拖动的假设面板。 */
    scenario: {
      title: "假设面板",
      description: "拖动任何一项，跑道、警戒线日期与洞察都会立刻重算。",
      revenueFactor: "收入达成率",
      costFactor: "成本系数",
      collectionRate: "应收回款率",
      revenueHint: "未来收入相对近三个月的比例",
      costHint: "1.00 表示维持当前支出结构",
      collectionHint: "1.00 表示在手发票按历史节奏回款",
      presets: "预设情景",
      presetBase: "基准",
      presetStress: "压力",
      presetOptimized: "优化",
      reset: "重置假设",
      dirty: "已偏离基准",
      runwayNow: "跑道",
      burnNow: "月均净流出",
      floorNow: "警戒线日期",
      months: (value: string) => `${value} 个月`,
      deltaLonger: (value: string) => `较基准延长 ${value} 个月`,
      deltaShorter: (value: string) => `较基准缩短 ${value} 个月`,
      deltaFlat: "与基准一致",
      noFloor: "不会触及",
    },

    /* ------------------------------------------------------ AI 洞察层文案 */
    insight: {
      layerTitle: "财务洞察",
      layerEyebrow: "推导结论",
      layerDescription: (count: number, evidence: number) =>
        `${count} 条结论、${evidence} 条依据，全部由当前账本推导。`,
      empty: "当前账本没有触发任何异常规则。",
      severity: {
        high: "需立即处理",
        medium: "需要关注",
        low: "可以优化",
      },
      confidence: (value: number) => `置信度 ${value}%`,
      evidence: (count: number) => `${count} 条依据`,
      open: "查看详情",
      countLabel: (count: number) => `${count} 条`,
      /** 每条洞察的标题（短）与结论（含事实的整句）。 */
      kind: {
        "category-spike": {
          title: "科目异常增长",
          action: "查看该科目明细",
          sentence: (f: {
            category: string
            monthLabel: string
            amount: Money
            previousAmount: Money
            deltaPct: number
          }) =>
            `${f.monthLabel}${f.category}支出 ${f.amount}，上月为 ${f.previousAmount}，环比增加 ${f.deltaPct}%。`,
        },
        "budget-overrun": {
          title: "预算超支",
          action: "打开预算执行",
          sentence: (f: {
            quarterLabel: string
            count: number
            overrun: Money
            worst: { name: string; usage: number; overrun: Money }
          }) =>
            `${f.quarterLabel}已有 ${f.count} 个科目超出预算，合计超支 ${f.overrun}；其中${f.worst.name}执行率 ${f.worst.usage}%、超支 ${f.worst.overrun}。`,
        },
        "receivables-risk": {
          title: "回款风险",
          action: "查看应收账龄",
          sentence: (f: {
            openTotal: Money
            overdueCount: number
            overdueTotal: Money
            oldest: { customer: string; days: number; amount: Money }
          }) =>
            `未回款应收 ${f.openTotal}，其中 ${f.overdueCount} 笔已逾期、合计 ${f.overdueTotal}；${f.oldest.customer} 一笔 ${f.oldest.amount} 已逾期 ${f.oldest.days} 天。`,
        },
        "cash-pressure": {
          title: "现金流压力",
          action: "查看现金预测",
          sentence: (f: { runwayMonths: number; burn: Money; floorDateLabel: string }) =>
            `按近三个月支出结构推演，现金可支撑 ${f.runwayMonths} 个月（月均净流出 ${f.burn}），${f.floorDateLabel}将触及运营备付金下限。`,
        },
        "cost-opportunity": {
          title: "成本优化机会",
          action: "查看该科目",
          sentence: (f: {
            category: string
            cutPct: number
            monthlySaving: Money
            runwayNow: number
            runwayAfter: number
          }) =>
            `把${f.category}压降 ${f.cutPct}%（每月约 ${f.monthlySaving}），跑道可从 ${f.runwayNow} 个月延长到 ${f.runwayAfter} 个月。`,
        },
        "vendor-concentration": {
          title: "供应商集中",
          action: "查看交易对手",
          sentence: (f: { vendor: string; category: string; sharePct: number; amount: Money }) =>
            `${f.vendor}占${f.category}本月支出的 ${f.sharePct}%（${f.amount}），缺少备选供应商。`,
        },
        "runway-scenario": {
          title: "情景推演",
          action: "查看现金流",
          sentence: (f: {
            runwayMonths: number
            baselineRunway: number
            deltaMonths: number
            floorDateLabel: string
          }) =>
            `当前假设下跑道为 ${f.runwayMonths} 个月（基准 ${f.baselineRunway} 个月，${
              f.deltaMonths >= 0 ? "延长" : "缩短"
            } ${Math.abs(Math.round(f.deltaMonths * 10) / 10)} 个月），警戒线日期变为 ${f.floorDateLabel}。`,
        },
      },
      /** 管理层摘要（一句话结论）。 */
      brief: {
        title: "本月结论",
        generatedFrom: "由当前账本推导",
        line1: (f: { monthLabel: string; revenue: Money; expense: Money; net: Money }) =>
          `${f.monthLabel}确认收入 ${f.revenue}、支出 ${f.expense}，净现金流出 ${f.net}。`,
        line2: (f: { cash: Money; runwayMonths: number }) =>
          `账面现金 ${f.cash}，按当前结构可支撑 ${f.runwayMonths} 个月。`,
        line3: (f: { overBudgetCount: number; overdueCount: number; overdueTotal: Money }) =>
          `${f.overBudgetCount} 个科目超出季度预算，${f.overdueCount} 笔应收逾期共 ${f.overdueTotal}。`,
        line4: (f: { forecastEnding: Money }) => `未来 90 天预测期末现金 ${f.forecastEnding}。`,
      },
    },

    /* ------------------------------------------------------------ 指标带 */
    metrics: {
      label: "关键指标",
      cash: "现金头寸",
      cashHint: "四个账户合计",
      monthNet: "本月净现金",
      monthNetHint: "收付实现制",
      revenue: "本月收入",
      expense: "本月支出",
      operatingMargin: "经营利润率",
      operatingMarginHint: "（收入 − 支出）÷ 收入",
      burn: "月均净流出",
      burnHint: "近三个月平均",
      runway: "现金跑道",
      runwayHint: "现金 ÷ 月均净流出",
      receivables: "未回款应收",
      receivablesHint: (count: number, overdue: number) => `${count} 张发票，${overdue} 张逾期`,
      budgetUsage: "季度预算执行",
      budgetUsageHint: (count: number) => `${count} 个科目超出额度`,
      forecastEnding: "90 天预测期末",
      forecastEndingHint: (net: Money) => `预测期净额 ${net}`,
    },

    /* -------------------------------------------------------- 支出 / 收入 */
    composition: {
      expenseTitle: "支出结构",
      expenseDescription: (month: string, total: Money) => `${month}合计 ${total}`,
      revenueTitle: "收入结构",
      revenueDescription: (month: string, total: Money) => `${month}合计 ${total}`,
      legendHint: "点击任一项可下钻到对应流水",
      deltaUp: (pct: number) => `环比 +${pct}%`,
      deltaDown: (pct: number) => `环比 ${pct}%`,
      deltaFlat: "环比持平",
      rankTitle: "金额排行",
      rankHint: "按当月发生额排序",
    },

    /* --------------------------------------------------------------- 总览 */
    overview: {
      recentTitle: "最近交易",
      recentDescription: "账本里最新的现金收付，点击可打开凭证",
      recentEmpty: "近期没有现金收付记录",
      accountsTitle: "账户与余额",
      accountsDescription: "四个账户合计即现金头寸",
      insightTitle: "本月洞察",
      goToLedger: "打开完整账本",
      goToInsights: "查看全部洞察",
      goToCashflow: "查看现金流推演",
      categoryTitle: "超支科目",
      categoryDescription: "季度预算执行率最高的科目",
      qHighlights: "本月要点",
    },

    /* --------------------------------------------------------------- 现金流 */
    cashflow: {
      forecastTitle: "未来 13 周现金预测",
      forecastDescription: (from: string, to: string) => `${from} – ${to}`,
      weekLabel: (index: number) => `第 ${index} 周`,
      accountsTitle: "账户余额分布",
      accountsHint: "基本户承担工资与主要付款，一般户承担大额采购",
      inflowTitle: "流入构成",
      inflowHint: "当月实收与应收回款",
      outflowTitle: "流出构成",
      outflowHint: "供应商付款与到期应付",
      scheduledTitle: "排期应付",
      scheduledDescription: "已入账、尚未到付款日的账单",
      scheduledEmpty: "未来没有排期应付",
      assumptionsTitle: "预测口径",
      assumptionRecurring: "经常性回款按近三个月均值滚动",
      assumptionInvoices: "在手发票按历史回款节奏落到具体周",
      assumptionVendors: "供应商付款按其记账日重现",
      assumptionExcluded: "窗口内新开发票的回款不计入，因此预测偏保守",
      troughLabel: "预测最低点",
      endingLabel: "预测期末现金",
      netLabel: "预测期净额",
      breachLabel: "警戒线",
      noBreach: "预测期内不会触及警戒线",
      breachAt: (label: string) => `预计 ${label} 触及警戒线`,
      weekCount: (count: number) => `${count} 周`,
    },

    /* --------------------------------------------------------------- 分析 */
    analysis: {
      rangeTitle: "统计区间",
      rangeMonth: "本月",
      rangeQuarter: "本季度",
      rangeYear: "近 12 个月",
      categoryTitle: "科目明细",
      categoryEmpty: "该科目在当前区间没有发生额",
      counterpartyTitle: "交易对手排行",
      counterpartyHint: "按金额倒序，点击可筛选流水",
      trendTitle: "近 12 个月趋势",
      trendDescription: "收入、支出与净额共用一条时间轴",
      selectedCategory: (name: string) => `科目：${name}`,
      clearCategory: "清除科目筛选",
      voucherTitle: "相关凭证",
      voucherHint: "该科目在当月的付款记录",
      expenseOfRevenue: (pct: number) => `支出占收入 ${pct}%`,
    },

    /* --------------------------------------------------------------- 预算 */
    budget: {
      summaryTitle: "季度预算总览",
      summaryUsage: "整体执行率",
      summaryBudget: "预算总额",
      summaryActual: "实际发生",
      summaryOverrun: "超支合计",
      summaryOverCount: "超支科目",
      rowsTitle: "科目执行明细",
      departmentTitle: "部门维度",
      departmentHint: "按科目归口汇总",
      columnCategory: "科目",
      columnDepartment: "归口部门",
      columnBudget: "季度预算",
      columnActual: "实际发生",
      columnUsage: "执行率",
      columnRemaining: "剩余额度",
      overrunAmount: (amount: Money) => `超支 ${amount}`,
      remainingAmount: (amount: Money) => `剩余 ${amount}`,
      status: {
        "on-track": "正常",
        watch: "接近上限",
        over: "已超支",
      },
      empty: "本季度尚未下达预算",
      onlyOver: "只看超支科目",
      showAll: "显示全部科目",
      progressLabel: (name: string, pct: number) => `${name} 执行率 ${pct}%`,
    },

    /* ------------------------------------------------------------- 洞察页 */
    insights: {
      feedTitle: "洞察清单",
      feedDescription: "按严重度与影响金额排序",
      empty: "当前账本没有触发任何异常规则。",
      emptyHint: "调整假设或更换筛选条件后，结论会重新推导。",
      filterSeverity: "严重度",
      filterAll: "全部",
      countBySeverity: (high: number, medium: number, low: number) =>
        `${high} 条需立即处理 · ${medium} 条需要关注 · ${low} 条可优化`,
      exposureLabel: "影响金额",
      evidenceTitle: "依据记录",
      ruleTitle: "判定规则",
      ruleHint: "每条结论都对应一条可复核的规则",
      jumpTo: "前往处理",
      rules: {
        "category-spike": "科目环比增长超过 40% 且本月发生额不低于 15 万",
        "budget-overrun": "季度执行率超过 100% 即计为超支",
        "receivables-risk": "发票到期未回款即计为逾期，金额按发票原值统计",
        "cash-pressure": "现金跑道低于 24 个月进入观察，低于 12 个月为高风险",
        "cost-opportunity": "在可控科目中选中当月金额最高者，试算 12% 压降",
        "vendor-concentration": "单一供应商占该科目当月支出超过 45%",
        "runway-scenario": "假设偏离基准后跑道变化超过 0.4 个月",
      },
    },

    /* ------------------------------------------------------------- 风险页 */
    risks: {
      anomalyTitle: "异常支出",
      anomalyDescription: "单笔金额显著高于同科目历史水平的付款",
      anomalyEmpty: "没有检测到金额异常的单笔付款",
      spikeTitle: "科目异动",
      budgetTitle: "预算超支科目",
      agingTitle: "应收账龄",
      agingDescription: "按逾期天数分桶，金额取发票原值",
      agingEmpty: "当前没有未回款的发票",
      exposureTitle: "风险敞口",
      exposureHint: "金额 × 逾期系数 × 客户回款纪律",
      bucket: {
        "not-due": "未到期",
        "d1-30": "逾期 1–30 天",
        "d31-60": "逾期 31–60 天",
        "d60-plus": "逾期 60 天以上",
      },
      bucketCount: (count: number) => `${count} 张`,
      overdueDays: (days: number) => `逾期 ${days} 天`,
      dueDate: (date: string) => `${date} 到期`,
      openInvoice: "查看发票",
      severityHigh: "高风险",
      severityMedium: "中风险",
      itemsCount: (count: number) => `${count} 张发票`,
      amountVsAverage: (amount: Money) => `高于同科目历史均值 ${amount}`,
    },

    /* ------------------------------------------------------------- 流水页 */
    transactions: {
      filterDirection: "收支方向",
      directionAll: "全部",
      directionIn: "收入",
      directionOut: "支出",
      filterCategory: "科目",
      filterAccount: "账户",
      filterRange: "时间范围",
      range30: "近 30 天",
      range90: "近 90 天",
      range180: "近 180 天",
      rangeAll: "全部期间",
      columnDate: "日期",
      columnCounterparty: "交易对手",
      columnMemo: "摘要",
      columnCategory: "科目 / 收入线",
      columnAccount: "账户",
      columnAmount: "金额",
      columnMethod: "结算方式",
      empty: "没有匹配的交易",
      emptyHint: "换一个时间段，或清除筛选条件。",
      transferBadge: "内部调拨",
      transferHint: "内部资金调拨不是经营现金流，但会改变单个账户的余额。",
      count: (count: number) => `${count} 笔`,
      resultCaption: (from: number, to: number, total: number, amount: Money) =>
        `第 ${from}–${to} 条，共 ${total} 条 · 合计 ${amount}`,
      totalIn: "收入合计",
      totalOut: "支出合计",
      net: "净额",
      filterTitle: "筛选条件",
    },

    /* ------------------------------------------------------------- 详情 */
    drawer: {
      transactionTitle: "交易详情",
      invoiceTitle: "发票详情",
      amount: "金额",
      direction: "方向",
      directionIn: "收入",
      directionOut: "支出",
      date: "记账日期",
      account: "账户",
      category: "科目 / 收入线",
      counterparty: "交易对手",
      method: "结算方式",
      voucher: "凭证号",
      memo: "摘要",
      related: "同对手方近期记录",
      relatedEmpty: "该对手方没有其它记录",
      openLedger: "在流水中筛选",
      invoiceNumber: "发票号",
      invoiceDate: "开票日期",
      dueDate: "到期日",
      settledDate: "回款日期",
      unsettled: "尚未回款",
      status: {
        settled: "已回款",
        open: "未到期",
        overdue: "已逾期",
      },
      customer: "客户",
      discipline: "历史回款纪律",
      daysLate: (days: number) => `逾期 ${days} 天`,
      onTime: "按期回款",
      missing: "这笔记录不在当前账本里",
    },

    /* ------------------------------------------------------------- 状态 */
    state: {
      loadingTitle: "正在同步账本",
      loadingHint: "读取 12 个记账月份的现金收付记录…",
      errorTitle: "账本同步失败",
      errorHint: "演示环境可以重试，或用「原型状态」再演练一次失败。",
    },
  },

  /* ---------------------------------------------------------------- 落地页 */
  landing: {
    badge: "AI 财务指挥台 · 原型演示",
    title: "能撑多久，比赚了多少更先被看见",
    description:
      "智悟云 AI 财务工作台把现金跑道放在第一屏：现金头寸、跑道月数与 90 天推演共用同一个构图，任何假设的改变都会立刻重算。",
    primaryCta: "打开财务工作台",
    secondaryCta: "看现金流推演",
    tertiaryCta: "内容清单",
    highlights: [
      "现金跑道与 90 天推演",
      "8 个支出科目 · 12 个月账本",
      "确定性财务洞察（不调用模型）",
      "预算执行与应收账龄",
      "深浅色 · 中文优先 · 响应式",
      "Playwright 端到端覆盖",
    ],
    stackTitle: "它不是一张报表",
    stackDescriptionPrefix: "打开",
    stackDescriptionSuffix: "可以看到指挥台的完整结构：第一屏给跑道，然后产品开口说话，最后才是记录。",
    features: [
      {
        title: "签名视觉",
        description: "现金跑道仪表：大数字与预测区间共面，拖动假设就能看到跑道被改写。",
      },
      {
        title: "可复核的洞察",
        description: "每条结论都写明判定规则与依据记录数，并能一键跳到产生它的凭证。",
      },
      {
        title: "一个账本",
        description: "收入、支出、预算、应收与账户余额全部由同一份账本展开，数字之间对得上。",
      },
      {
        title: "真实交互",
        description: "没有假按钮：筛选、下钻、抽屉、命令中心与情景推演都作用于真实 local state。",
      },
    ],
    footer: "智悟云 · AI 财务工作台 —— 前端 + 本地状态 + 真实感账本数据，刻意不接后端。",
  },

  /* ----------------------------------------------------------- 命令中心 */
  palette: {
    title: "命令中心",
    placeholder: "搜索页面、交易、科目或指令…",
    aiPlaceholder: "问一个财务问题，或用指令直达结论…",
    empty: "没有匹配的命令",
    hint: "↑↓ 选择 · ↵ 执行 · esc 关闭",
    navigate: "导航",
    records: "交易检索",
    intelligence: "智能指令",
    actions: "操作",
    goOverview: "前往财务总览",
    goCashflow: "前往现金流",
    goAnalysis: "前往收支分析",
    goBudget: "前往预算执行",
    goInsights: "前往 AI 洞察",
    goRisks: "前往风险与异常",
    goTransactions: "前往交易流水",
    aiBrief: "生成本月结论",
    aiBriefDescription: "读取当前账本，输出一句话结论",
    aiCash: "推演现金跑道",
    aiCashDescription: (months: string) => `当前跑道 ${months} 个月，打开假设面板`,
    aiRisks: "列出逾期应收",
    aiRisksDescription: (count: number, amount: string) => `${count} 笔逾期共 ${amount}`,
    aiBudget: "检查超支科目",
    aiBudgetDescription: (count: number) => `${count} 个科目超出季度预算`,
    aiSoftware: "定位软件支出异动",
    aiSoftwareDescription: (amount: string) => `本月研发与工具共 ${amount}`,
    toggleTheme: "切换深浅色",
    refresh: "重新同步账本",
    simulateError: "模拟同步失败",
    reset: "重置账本与假设",
    searchHint: "输入两个字符即可检索交易",
    transactionDescription: (date: string, category: string, amount: string) =>
      `${date} · ${category} · ${amount}`,
    keywords: {
      overview: "dashboard 首页 总览 现金",
      cashflow: "预测 推演 跑道 现金流",
      analysis: "收入 支出 科目 结构",
      budget: "预算 执行 超支",
      insights: "ai 洞察 结论 建议",
      risks: "风险 异常 逾期 账龄",
      transactions: "流水 账本 交易 明细",
      brief: "摘要 结论 总结",
      cash: "跑道 现金 预测",
      theme: "深浅色 外观",
      refresh: "同步 刷新",
      error: "故障 演练",
      reset: "恢复 初始",
      software: "软件 订阅 工具 研发",
    },
  },

  /* --------------------------------------------------------------- 对话框 */
  dialogs: {
    profile: {
      title: "个人资料",
      description: (workspace: string) => `${workspace} 的演示账号，用于说明数据权限范围。`,
      email: "邮箱",
      role: "角色",
      workspace: "工作区",
      plan: "版本",
    },
    signOut: {
      title: "退出登录",
      description: (email: string) => `将以 ${email} 的身份退出，并重置账本与假设。`,
      confirm: "退出登录",
    },
    addTransaction: {
      title: "登记一笔收支",
      description: "新增记录会立刻进入流水，并影响当月合计与账户余额。",
      direction: "方向",
      directionIn: "收入",
      directionOut: "支出",
      counterparty: "交易对手",
      counterpartyPlaceholder: "例如：迈瑞医疗",
      amount: "金额（元）",
      amountPlaceholder: "例如：128000",
      category: "科目",
      categoryPlaceholder: "选择科目",
      account: "账户",
      accountPlaceholder: "选择账户",
      memo: "摘要",
      memoPlaceholder: "例如：季度服务费首款",
      submit: "登记",
      successTitle: "已登记",
      successDescription: (counterparty: string, amount: string) => `${counterparty} ${amount}`,
      errors: {
        counterparty: "请填写交易对手",
        amount: "金额必须是大于 0 的数字",
      },
    },
  },

  /* --------------------------------------------------------------- 通知 */
  notifications: {
    title: "通知",
    empty: "暂时没有通知",
    markAllRead: "全部标为已读",
    unreadCount: (count: number) => `${count} 条未读`,
  },

  /* -------------------------------------------------------- 原型控制面板 */
  prototype: {
    title: "原型状态",
    description: "演示用的账本状态：可以重新同步、演练失败，或把数据恢复原样。",
    simulateSlowLoad: "重新同步账本",
    simulateFailure: "模拟同步失败",
    resetData: "重置账本与假设",
    resetToastTitle: "已重置",
    resetToastDescription: "账本、筛选与假设已恢复为初始状态。",
  },

  toast: {
    refreshed: "账本已重新同步",
    refreshFailed: "同步失败",
    refreshFailedDescription: "请求在 10 秒后超时：GET /v1/ledger/sync",
    notificationsRead: "通知已全部标为已读",
    signedOut: "已退出登录",
    signedOutDescription: "演示数据已重置。",
    assumptionsReset: "假设已重置为基准情景",
    copied: "已复制到剪贴板",
  },

  /* ---------------------------------------------------------------- 404 */
  notFound: {
    app: {
      metaTitle: "页面不存在",
      title: "这个页面不在账本里",
      description: "链接可能已过期，或者这一段路径从未存在。",
      action: "回到财务总览",
      backHome: "返回首页",
    },
    finance: {
      metaTitle: "页面不存在",
      title: "没有找到这个财务页面",
      description: "财务工作台只有七个页面，选择其中一个继续。",
      action: "回到财务总览",
      backHome: "返回首页",
    },
  },

  /* ----------------------------------------------------------- 通用组件文案 */
  pagination: {
    nav: "分页",
    previous: "上一页",
    next: "下一页",
    page: (value: number) => `第 ${value} 页`,
    noResults: "暂无结果",
  },

  wizard: {
    title: "设置你的工作区",
    description: "一分钟即可完成设置，之后随时可以修改。",
    step: (index: number, total: number) => `第 ${index} 步，共 ${total} 步`,
    back: "上一步",
    next: "下一步",
    finish: "完成",
  },

  /**
   * 由表单动作**生成**的记录内容——不是界面文案，但同样是集中管理的用户可见文本。
   */
  data: {
    justNow: "刚刚",
    manualEntry: "手工登记",
    manualVoucher: "手工凭证",
    defaultMemo: "由「登记一笔收支」创建。",
    categoryFallback: (id: ExpenseCategoryId) => id,
  },
}

export type Messages = typeof zhCN
