import type { ActivityKind, CustomerPlan, CustomerStatus, TaskColumnId } from "@/lib/crm-data"

/**
 * zh-CN — the reference dictionary.
 *
 * Every user-visible string in the product lives here. Components never inline
 * copy: they read it through `useMessages()`. Adding a locale therefore means
 * adding one sibling file (`en-US.ts`) that satisfies the same shape — no
 * component needs to change.
 *
 * Conventions
 *   • Parameterised copy is a function, never string concatenation.
 *   • Keys describe meaning (`customers.empty.noMatch`), not position.
 *   • Route slugs, code identifiers, keyboard shortcuts and brand names that
 *     are genuinely proper nouns stay as-is by design.
 */
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
    unit: {
      customer: "位客户",
      task: "项任务",
      event: "条活动",
      day: "天",
      hour: "小时",
    },
    /** 时间线按天分组的分组名（仪表盘与活动页共用）。 */
    activityGroups: {
      today: "今天",
      yesterday: "昨天",
      week: "本周内",
      earlier: "更早",
    },
  },

  /**
   * 内置演示（/demo）的全部文案。
   *
   * 开头的几个键（品牌 / 用户 / 用量 / 导航）同时是共享布局组件 Sidebar、
   * TopNav、MobileNav **未注入配置时**的默认身份；其余键是演示应用自己的页面
   * 文案。放在同一组里，是因为它们描述的就是同一个演示工作区——组件本身依旧
   * 不含任何硬编码文案。
   */
  demo: {
    brandName: "云图分析",
    brandSubtitle: "增长分析工作区",
    userName: "吴桐",
    userEmail: "wutong@yuntu.cn",
    userInitials: "吴",
    usageLabel: "用量",
    usageValue: "64%",
    usageHint: "专业版已使用 206 / 320 个席位。",
    quickStart: "快速上手",
    nav: {
      overview: "总览",
      customers: "客户",
      activity: "动态",
      settings: "快速上手",
    },

    meta: {
      title: "演示仪表盘",
      description: "云图分析 —— 一个真实可交互的 SaaS 仪表盘原型。",
    },
    workspace: "云图分析",
    pages: {
      overview: { title: "总览", subtitle: "云图分析 · 9月1日 – 9月7日" },
      customers: { title: "客户", subtitle: "专业版及以下套餐的账户" },
      activity: { title: "动态", subtitle: "工作区内的所有事件" },
    },
    commandHint: "打开命令面板",

    palette: {
      navigate: "导航",
      actions: "操作",
      overview: "前往总览",
      customers: "前往客户",
      activity: "前往动态",
      addCustomer: "添加客户",
      refresh: "刷新数据",
      wizard: "快速上手",
      theme: "切换主题",
      reset: "重置演示数据",
      keywords: {
        overview: "dashboard 首页 概览",
        customers: "账户 列表 表格",
        activity: "通知 动态",
        addCustomer: "新建 账户",
        refresh: "重新加载 同步",
        wizard: "引导 设置",
        theme: "深浅色 外观",
        reset: "恢复 初始",
      },
    },

    overview: {
      kpi: {
        mrr: "月经常性收入",
        accounts: "活跃账号",
        conversion: "试用转化率",
        session: "平均会话时长",
        vsLastMonth: "较上月",
      },
      revenue: {
        title: "月度经常性收入",
        description: "近 12 个月收入与支出对比",
        seriesRevenue: "收入",
        seriesExpenses: "支出",
      },
      channel: {
        title: "获客渠道",
        description: "本月新增注册占比",
      },
      focus: {
        title: "本周聚焦",
        description: "拖拽排序，顺序保存在本地状态。",
      },
      recent: {
        title: "最近动态",
        description: "工作区最新事件。",
      },
    },

    customers: {
      searchPlaceholder: "搜索公司、联系人或地区…",
      resultCaption: (visible: number, total: number) => `显示 ${visible} / ${total} 位客户`,
      addCustomer: "添加客户",
      allStatuses: "全部状态",
      allPlans: "全部套餐",
      sortPrefix: "排序：",
      sort: {
        lastActiveHours: "最近活跃",
        mrr: "月经常性收入",
        name: "名称",
        since: "入驻时间",
      },
      columns: {
        customer: "客户",
        plan: "套餐",
        status: "状态",
        mrr: "月经常性收入",
        region: "地区",
        lastActive: "最近活跃",
      },
      empty: {
        title: "没有符合条件的客户",
        noSearch: "当前筛选条件下没有记录，试试清除筛选或切换状态。",
        withSearch: (query: string) => `未找到与「${query}」匹配的记录。`,
      },
      clearFilters: "清除筛选",
      drawer: {
        contact: "联系人",
        plan: "套餐",
        status: "状态",
        mrr: "月经常性收入",
        seats: "席位",
        region: "地区",
        since: "入驻时间",
        lastActive: "最近活跃",
        noteLabel: "账户备注",
        note: (contact: string, since: string) =>
          `${contact} 每周会收到摘要邮件，并已签署数据处理协议。续费将在 ${since} 的周年日自动进行。`,
        copyEmail: "复制邮箱",
        reopen: "重新启用",
        closeAccount: "关停账户",
      },
      dialog: {
        title: "添加客户",
        description: "在本地 store 中创建一条真实记录，筛选、排序与表格会立即响应。",
        company: "公司名称",
        contact: "联系人",
        email: "邮箱",
        plan: "套餐",
        status: "状态",
        mrr: "月经常性收入（元）",
        seats: "席位",
        region: "地区",
        placeholderCompany: "瀚舟数据",
        placeholderContact: "张启明",
        placeholderEmail: "zhangqiming@hanzhou-data.cn",
        placeholderRegion: "上海",
        submit: "添加客户",
        validation: {
          company: "请填写公司名称。",
          contact: "请填写联系人。",
          email: "请输入有效的邮箱地址。",
          mrr: "月经常性收入必须是非负数字。",
          seats: "席位至少为 1。",
        },
      },
      toast: {
        reopened: "账户已重新启用",
        reopenedDescription: (name: string, value: string) =>
          `${name} 已恢复为活跃状态，月经常性收入 ${value}。`,
        closed: "账户已关停",
        closedDescription: (name: string) => `${name} 已标记为已流失，月经常性收入归零。`,
        added: (name: string) => `已添加 ${name}`,
        addedDescription: (plan: string, value: string) =>
          `套餐 ${plan}，月经常性收入 ${value}。表格中已实时生效。`,
      },
    },

    activity: {
      tabAll: "全部",
      tabUnread: "未读",
      title: "通知",
      description: "点击条目标记为已读，顶栏与侧栏的徽标会同步更新。",
      markAllRead: "全部标为已读",
      emptyTitle: "没有未读通知",
      emptyDescription: "所有通知都已读——切换到「全部」查看历史记录。",
      emptyAction: "查看全部通知",
    },

    wizard: {
      welcome: {
        title: "欢迎使用",
        description: (workspace: string) => `简单告诉我们你将如何使用${workspace}。`,
        team: "团队共享",
        personal: "主要用于个人原型",
      },
      role: {
        title: "你的角色",
        description: "我们会据此定制引导流程。",
        designer: "产品设计师",
        engineer: "工程师",
        founder: "创始人 / 产品经理",
        required: "请选择一个角色后再继续。",
      },
      confirm: {
        title: "确认信息",
        description: "检查你的答案，然后完成设置。",
        workspace: "工作区：",
        team: "团队账户：",
        role: "角色：",
        yes: "是",
        no: "否",
      },
      done: {
        title: "工作区设置完成",
        description: "这个向导是可复用的通用组件，见 components/prototype/onboarding-wizard。",
      },
    },

    toast: {
      reset: "演示数据已重置",
    },
  },

  /**
   * 原型 Starter 自身的落地页（/）。这里描述的是 Starter 而不是某个业务产品，
   * 因此技术栈名称（Next.js、Playwright…）与命令按约定保留原文。
   */
  landing: {
    badge: "Next.js 16 · Tailwind v4 · shadcn/ui · Motion",
    title: "交互式原型 Starter",
    description:
      "面向高保真产品原型的可复用基础：纯前端 + 本地状态 + 真实感 mock 数据——没有任何静态假页面。",
    primaryCta: "打开 AI CRM 原型",
    secondaryCta: "打开演示仪表盘",
    tertiaryCta: "里面有什么",
    highlights: [
      "shadcn/ui（Base UI）基础组件",
      "Motion 驱动的动画组件库",
      "Zustand 本地状态 + 真实感 mock 数据",
      "Recharts 图表、拖拽排序与命令面板",
      "设计 Token：排版 / 间距 / 圆角 / 动效",
      "Playwright 端到端测试",
    ],
    stackTitle: "为高效迭代而生",
    /** 路由以 <code> 呈现，所以拆成前后两段，避免在文案里混入 JSX。 */
    stackDescriptionPrefix: "打开",
    stackDescriptionSuffix: "即可看到一整套 SaaS 仪表盘演示，随后直接复用其中的模式。",
    features: [
      {
        title: "真实交互",
        description: "没有假按钮。筛选、拖拽、增删、恢复——每个可见控件都作用于本地状态。",
      },
      {
        title: "设计 Token",
        description: "排版、间距、圆角、动效时长与内容宽度集中在同一层，杜绝散落的魔法数字。",
      },
      {
        title: "对 Agent 友好",
        description:
          "AGENTS.md 规则与 interactive-prototype Skill 要求先检查、复用组件、并在浏览器中验证。",
      },
      {
        title: "测试把关",
        description: "lint、类型检查、Playwright 与生产构建全绿后才算完成：pnpm check。",
      },
    ],
    commands: [
      "pnpm dev — 打开 /demo",
      "pnpm check — lint + 类型检查 + Playwright",
      "pnpm build — 交付前的生产构建",
    ],
    footer: "原型 Starter —— 前端 + 本地状态 + 真实感 mock 数据。刻意不做后端。",
  },

  /** 通用分页文案——Pagination 的默认标签取这里，调用方无需重复传入。 */
  pagination: {
    nav: "分页",
    previous: "上一页",
    next: "下一页",
    page: (value: number) => `第 ${value} 页`,
    noResults: "暂无结果",
    range: (from: number, to: number, total: number) =>
      `第 ${from}–${to} 条，共 ${total} 条`,
  },

  /** 通用多步向导文案——OnboardingWizard 的默认文案。 */
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
    tagInbound: "主动咨询",
    tagNew: "新建",
    placeholderNote: "由「添加客户」表单创建。",
    createdActivityTitle: "新建客户",
    createdActivityDetail: (owner: string, company: string) =>
      `${owner} 将「${company}」加入管道。`,
    justNow: "刚刚",
    /** 新建记录时的「入驻时间」——与 REFERENCE_MONTH 保持同步。 */
    currentMonth: "2026年9月",
  },

  a11y: {
    primaryNav: "主导航",
    openNav: "打开导航",
    openCommand: "打开命令面板",
    commandHint: "搜索或运行命令",
    toggleTheme: "切换主题",
    refreshData: "刷新数据",
    notifications: "通知",
    accountMenu: "账户菜单",
    prototypeControls: "演示控制",
    backToTop: "回到顶部",
    sectionLabel: "工作区",
    skipToContent: "跳到主要内容",
  },

  brand: {
    name: "智悟云",
    subtitle: "AI 销售工作台",
    mark: "智",
    metaTitle: "智悟云 · AI CRM 原型",
    metaDescription:
      "高保真交互式 AI CRM 原型——管道仪表盘、客户名册、客户档案、可拖拽任务看板与活动时间线。",
  },

  nav: {
    dashboard: "总览",
    customers: "客户",
    opportunities: "机会",
    tasks: "任务",
    activities: "活动",
    addCustomer: "添加客户",
    /* 智能中心——三个入口都指向真实结果：聚焦洞察层、带筛选条件的名册、AI 命令面板。 */
    insights: "销售洞察",
    risks: "风险预警",
    assistant: "AI 助手",
  },

  /**
   * 外壳（Sidebar / TopNav）里不属于某个具体页面的文案。
   * 侧栏的工作区上下文与实时状态都由真实数据派生——不是装饰。
   */
  shell: {
    workspaceSection: "工作台",
    intelligenceSection: "智能中心",
    goalLabel: "本季度目标",
    goalHint: "距季度结算还有 12 天",
    goalUnit: "本季度",
    live: "数据实时同步",
    liveHint: "更新于 2026 年 9 月",
    liveAt: (time: string) => `最近同步 ${time}`,
    syncing: "正在同步…",
    accountHint: "打开个人资料",
    commandHint: "搜索或运行命令",
    /* 侧栏「销售洞察」聚焦到仪表盘的洞察层时，给布局的提示文案。 */
    focusInsight: "已定位到智能洞察",
  },

  page: {
    dashboard: {
      eyebrow: "销售管道",
      title: "总览",
      description: "管道健康度 · 2026 年 9 月",
    },
    customers: {
      eyebrow: "客户管理",
      title: "客户",
      description: "名册中的全部客户",
    },
    opportunities: {
      eyebrow: "销售执行",
      title: "机会",
      description: "全部在谈与已签约机会",
    },
    tasks: {
      eyebrow: "销售执行",
      title: "任务",
      description: "在列之间拖动卡片即可调整顺序",
    },
    activities: {
      eyebrow: "互动记录",
      title: "活动",
      description: "完整的客户互动时间线",
    },
    breadcrumb: (section: string) => `智悟云 / ${section}`,
  },

  /* --------------------------------------------------------------- statuses */
  status: {
    lead: "线索",
    trial: "试用",
    active: "合作中",
    "at-risk": "流失风险",
    churned: "已流失",
  } satisfies Record<CustomerStatus, string>,

  plan: {
    Starter: "基础版",
    Growth: "成长版",
    Scale: "规模版",
    Enterprise: "旗舰版",
  } satisfies Record<CustomerPlan, string>,

  /* -------------------------------------------------------------- dashboard */
  dashboard: {
    kpi: {
      totalCustomers: "客户总数",
      newThisMonth: "本月新增",
      activeDeals: "进行中商机",
      revenue: "合同总额",
      conversionRate: "成交转化率",
      viewAllCustomers: "查看全部客户",
      viewOpenLeads: "查看线索与试用中的客户",
      viewSignedTasks: "查看已签约客户的跟进任务",
      viewActive: "查看合作中的客户",
      vsLastMonth: "环比上月",
      closedWonShare: "已签约占比",
      activate: (label: string) => `${label} —— 查看明细`,
    },

    /**
     * 主视觉（Hero）：Revenue Intelligence —— 整个产品的第一视觉焦点。
     *
     * 大数字与大型图形共用同一条排版列：悬停图表时，"合同总额"这个位置
     * 本身就是读数面板（`hero.readingLabel` 替换眉标，数字被换成当月值），
     * 而不是在旁边再浮一个 tooltip。这就是本产品的签名交互。
     */
    hero: {
      sectionLabel: "销售管道 · 收入智能",
      label: "合同总额",
      rangeLabel: "统计区间",
      range: {
        m12: "12 个月",
        m6: "6 个月",
        m3: "3 个月",
      },
      chartLabel: "近 12 个月已签约金额与在谈管道走势",
      /* 悬停读数：眉标与三个事实读数一起同步到光标所在月份。 */
      readingLabel: "读数",
      reading: (month: string) => `${month} 读数`,
      readingHint: "悬停图表，读数会跟着光标走",
      won: "已签约",
      pipeline: "在谈管道",
      coverage: "管道覆盖",
      coverageValue: (ratio: string) => `${ratio} 倍`,
      coverageHint: "在谈管道 ÷ 已签约",
      growthLabel: "环比上月",
      growthValue: (percent: string) => `${percent}%`,
      live: "实时数据",
      liveHint: "数据更新于 2026 年 9 月",
      action: "查看已签约客户的跟进任务",
      currentMonth: "当前月",
      readingOf: (month: string) => `正在读 ${month}`,
      reset: "回到当月",
    },

    /**
     * Hero 图形的题注。`title` 是这条图形的名字（图表本身不是 Card，所以
     * 它需要一行题注来交代自己是什么），`description` 说明两条序列。
     */
    pipeline: {
      title: "管道表现",
      description: "近 12 个月已签约金额与在谈管道",
    },

    /* 次级指标：一条轻量指标带，不是五张卡。 */
    metrics: {
      sectionLabel: "关键指标",
      cumulativeHint: "截至 2026 年 9 月",
      trend: (label: string) => `${label}近 12 个月走势`,
    },

    /**
     * AI 洞察层：仪表盘的第二视觉层级。
     *
     * 全部内容由 `lib/insights.ts` 从当前客户与活动确定性推导——不调用任何
     * 外部接口，也不是装饰文案：换掉数据，句子里的公司、金额与百分比都会变。
     */
    insight: {
      sectionLabel: "AI 洞察",
      status: "自动分析",
      analyzing: "正在分析管道数据…",
      analysisWindow: (count: number) => `基于 ${count} 位客户的互动记录`,
      /** 区块标题：这一层是"对本月管道的一段解读"，增长与风险都在里面。 */
      title: "管道解读",
      /* 刻意不用「高价值客户」四个字：那是下方区块的标题，同一个词在一屏里
         指两件事，读者会以为它们说的是同一份名单。 */
      attribution: (percent: string) => `本月合同额增长 ${percent}%，主要由 3 个近期活跃的重点客户推动。`,
      contributors: "贡献客户",
      contributorShare: (share: string) => `三家合计占管道 ${share}%`,
      viewKeyAccounts: "查看重点客户",
      riskTitle: "风险预警",
      risk: (company: string, days: number, value: string) =>
        `${company} 已 ${days} 天未更新，当前合同金额 ${value}。`,
      riskSummary: (count: number, value: string) => `另有 ${count} 位客户停滞超过 7 天，涉及合同额 ${value}。`,
      riskAction: (company: string) => `优先跟进「${company}」`,
      openCustomer: (company: string, value: string) => `查看「${company}」，合同金额 ${value}`,
      confidence: (value: number) => `置信度 ${value}%`,
      highlightHint: "悬停贡献客户，下方同名记录会同步高亮。",
      highlightOn: (company: string) => `已高亮下方「${company}」的记录`,
    },

    /* 机会雷达：编辑式编号区块，替代"再来一张卡片"。 */
    spotlight: {
      sectionLabel: "机会雷达",
      title: "高优先级机会",
      description: "按合同金额与停滞天数加权排序——贵且卡住的机会排在前面。",
      open: (company: string, value: string, note: string) =>
        `查看「${company}」，合同金额 ${value}，${note}`,
      noteStale: (days: number) => `${days} 天未更新`,
      noteRecent: (days: number) => `${days} 天前已触达`,
      noteFresh: (hours: number) => `${hours} 小时内已触达`,
      allOpportunities: "全部机会",
    },

    /* 阶段分布：一条构成条 + 可下钻列表，而不是"行 + 右值"的报表。 */
    stage: {
      title: "阶段分布",
      description: "按当前阶段统计合同金额，点击构成条或列表可下钻",
      customers: (value: number) => `${value} 位客户`,
      countUnit: (value: number) => `${value} 位`,
      shareOf: (percent: number) => `占比 ${percent}%`,
      drilldown: (status: string) => `查看「${status}」的客户名单`,
      total: "管道总额",
      excludeHint: "已流失记录不计入",
    },

    /* 负责人业绩：竖向视觉排行，取代原来的头像行 + 进度条。 */
    owners: {
      sectionLabel: "团队",
      title: "负责人业绩",
      description: "在管客户的合同金额排名",
      deals: (value: number) => `${value} 位客户`,
      rank: (index: number) => `第 ${index} 名`,
      leader: "领先",
    },

    /* 实时数据层：真实事件流 + 时间戳，不是装饰指示灯。 */
    live: {
      sectionLabel: "实时",
      title: "实时数据流",
      description: "互动发生时即刻进入管道。",
      syncing: "正在同步…",
      updatedAt: (time: string) => `更新于 ${time}`,
      waiting: "等待新事件…",
      exhausted: "已同步到最新一条事件。",
      replay: "重新播放",
      inserted: "新事件",
      open: (company: string, title: string) => `查看「${company} · ${title}」`,
      counter: (value: number) => `本次已接收 ${value} 条`,
    },

    recentActivity: {
      title: "最近动态",
      description: "名册中最新发生的触达记录。",
      open: (company: string, title: string) => `打开「${company} · ${title}」`,
    },

    tasksOverview: {
      title: "任务总览",
      summary: (open: number, dueThisWeek: number) =>
        `待办 ${open} 项 · 本周到期 ${dueThisWeek} 项`,
      openBoard: "打开看板",
      nothingQueued: "暂无排期",
      openColumn: (title: string) => `在看板中打开「${title}」列`,
      insight: (count: number, column: string) =>
        `未来五天内有 ${count} 项任务到期，建议先清空「${column}」列。`,
      /* 按到期时间排序的优先队列。 */
      queueLabel: "按到期时间排序",
      dueOn: (date: string) => `${date} 到期`,
      overdue: "已逾期",
      openTask: (title: string, company: string) => `打开「${company} · ${title}」`,
    },

    accounts: {
      title: "高价值客户",
      description: "按年度合同金额排序。",
      live: "实时数据",
      columns: {
        account: "客户",
        owner: "负责人",
        status: "状态",
        touch: "最近触达",
        value: "合同金额",
      },
      open: (company: string, value: string) => `打开「${company}」，合同金额 ${value}`,
      showingTop: (count: number, total: number) => `前 ${count} 位 / 共 ${total} 位`,
      rank: (index: number) => `第 ${index} 位`,
    },
  },

  /* -------------------------------------------------------------- customers */
  customers: {
    searchPlaceholder: "搜索客户名称、公司或邮箱…",
    addCustomer: "添加客户",
    resultCaption: (visible: number, total: number) => `共 ${total} 位客户，当前显示 ${visible} 位`,
    filters: {
      allStatuses: "全部状态",
      allOwners: "全部负责人",
      sortPrefix: "排序",
    },
    sort: {
      createdAt: "创建时间",
      value: "合同金额",
      name: "客户名称",
      company: "公司",
      lastTouchHours: "最近联系",
      aria: (label: string) => `按${label}排序`,
    },
    columns: {
      customer: "客户",
      status: "状态",
      owner: "负责人",
      value: "合同金额",
      createdAt: "创建时间",
      updatedAt: "最近联系",
    },
    empty: {
      title: "没有匹配的客户",
      noSearch: "当前状态或负责人下没有记录。重置筛选即可查看完整名册。",
      withSearch: (query: string) =>
        `没有找到与「${query}」匹配的记录，换一个名称、公司或邮箱试试。`,
    },
  },

  /* ---------------------------------------------------------- customer page */
  customer: {
    eyebrow: "客户档案",
    windowLabel: "年度合同额",
    notFound: {
      pageTitle: "未找到客户",
      title: "找不到这位客户",
      description: (id: string) =>
        `没有与 id「${id}」匹配的记录。它可能已被移除，或者链接已经过期。`,
      back: "返回客户列表",
      dashboard: "前往总览",
    },
    actions: {
      back: "返回列表",
      openInList: "在列表中查看",
      openAccount: "查看客户档案",
      copyEmail: "复制邮箱",
    },
    sections: {
      account: "客户资料",
      accountDescription: "这条记录的全部档案信息。",
      activities: "活动时间线",
      activitiesDescription: (count: number) => `该客户共记录 ${count} 条活动。`,
      openTasks: "待办任务",
      openTasksDescription: "与这位客户关联的待办。",
      owner: "负责人",
      ownerDescription: "对接的客户经理",
      notes: "内部备注",
      notesDescription: "仅内部可见",
    },
    fields: {
      contact: "主要联系人",
      title: "职位",
      email: "邮箱",
      phone: "电话",
      owner: "负责人",
      since: "合作起始",
      tags: "标签",
      notes: "备注",
      lastTouch: "最近联系",
      created: "创建时间",
    },
    empty: {
      activities: "暂无活动记录",
      activitiesDescription: "与该客户相关的邮件、通话与会议会显示在这里。",
      browseActivities: "查看全部活动",
      tasks: "暂无待办任务",
      tasksDescription: "这位客户当前没有排期中的任务。",
      openBoard: "打开任务看板",
    },
  },

  /* ------------------------------------------------------------------- tasks */
  tasks: {
    hint: "拖动卡片到其他列即可调整顺序，结果会直接写入状态。",
    resetBoard: "重置看板",
    progress: "进度",
    dropHere: "拖放任务到此处",
    columns: {
      "follow-up": { title: "跟进", hint: "等待客户回复" },
      call: { title: "电话沟通", hint: "电话交流" },
      proposal: { title: "发送方案", hint: "报价或合同" },
      demo: { title: "产品演示", hint: "在线演示" },
      onboarding: { title: "交付上线", hint: "启动阶段" },
    } satisfies Record<TaskColumnId, { title: string; hint: string }>,
  },

  /* -------------------------------------------------------------- activities */
  activities: {
    allTypes: "全部类型",
    allOwners: "全部负责人",
    resultCaption: (visible: number, total: number) => `共 ${total} 条记录，显示 ${visible} 条`,
    resetFilters: "重置筛选",
    timelineTitle: "活动时间线",
    timelineDescription: "覆盖全部客户的邮件、通话、会议、备注与状态变更。",
    empty: {
      title: "没有匹配的活动",
      description: "当前类型与负责人组合下没有记录。重置筛选即可查看完整时间线。",
    },
    kinds: {
      email: "邮件",
      call: "通话",
      meeting: "会议",
      note: "备注",
      status: "状态变更",
    } satisfies Record<ActivityKind, string>,
  },

  /* --------------------------------------------------------------- ai brief */
  aiSummary: {
    title: "AI 智能摘要",
    description: "基于这条记录确定性生成，不调用任何外部 API。",
    generate: "生成 AI 摘要",
    regenerate: "重新生成",
    generating: "生成中",
    generatingSr: "正在生成摘要…",
    idleHint: "还没有摘要。根据客户所处阶段、金额与互动历史生成一份简报。",
    recommendedNextStep: "建议的下一步",
    confidence: (value: number) => `置信度 ${value}%`,
    failed: "生成失败，请重试。",
    /** 生成摘要的文案模板——与 lib/ai-summary.ts 的确定性逻辑一一对应。 */
    generated: {
      ageToday: "今天",
      ageYesterday: "昨天",
      ageDays: (days: number) => `${days} 天前`,
      ageLastWeek: "上周",
      ageWeeks: (weeks: number) => `${weeks} 周前`,
      ageMonths: (months: number) => `${months} 个月前`,
      touchJustNow: "刚刚",
      touchToday: "今天",
      touchYesterday: "昨天",

      headlineLead: (company: string, age: string, touch: string) =>
        `${company} 是${age}进入的主动咨询线索，最近一次触达在${touch}。`,
      headlineTrial: (company: string, plan: string, age: string, value: string) =>
        `${company} 正处于${plan}试用期，${age}开始，预估年度合同额 ${value}。`,
      headlineActive: (company: string, plan: string, value: string, touch: string) =>
        `${company} 是健康的${plan}客户，年度合同额 ${value}，最近一次触达在${touch}。`,
      headlineAtRisk: (company: string, value: string, touch: string) =>
        `${company} 存在续约风险：对应 ${value} 的年度合同额，最后一次触达已经是${touch}。`,
      headlineChurned: (company: string, plan: string) =>
        `${company} 已流失，退出${plan}版本，目前不再产生经常性收入。`,

      nextStepLead: (name: string) =>
        `48 小时内与${name}约一次 30 分钟的沟通电话，确认预算归属，避免线索继续降温。`,
      nextStepTrial: (name: string, plan: string) =>
        `在试用窗口关闭前，与${name}的团队安排一次技术验证会，并附上${plan}报价单。`,
      nextStepActive: (name: string) =>
        `与${name}开启一次增购沟通——这位客户已经具备升级到下一档位的条件。`,
      nextStepAtRisk: (name: string) =>
        `升级到高管层面介入，并在本周内与${name}安排一次 20 分钟的客户健康检查。`,
      nextStepChurned: (company: string) =>
        `把${company}加入 FY27 赢回名单，等基础版定价调整落地后重新做一次需求确认。`,

      signalStage: (status: string, plan: string) =>
        `客户生命周期阶段为「${status}」，当前版本为${plan}。`,
      signalValue: (value: string) =>
        `预估年度合同额为 ${value}，在团队在谈名册中处于较前位置。`,
      signalNoValue: "这条记录目前尚未关联任何经常性收入。",
      signalTouchFresh: "24 小时内有过触达，客户热度仍在。",
      signalTouchStale: (days: number, beyond: boolean) =>
        `距离最近一次触达已有 ${days} 天，${beyond ? "已明显超出" : "正在接近"}30 天的跟进阈值。`,
      signalTags: (tags: string) => `记录中的标签：${tags}。`,
      signalNote: (note: string) => `最新备注：${note}`,
    },
  },

  /* ---------------------------------------------------------- command palette */
  /**
   * Command Center：不再是一个导航菜单，而是产品的核心入口——
   * 导航 / AI 命令 / 记录检索 / 全局操作四组，且每一组都能落到真实结果。
   */
  palette: {
    title: "命令面板",
    placeholder: "输入命令或搜索…",
    /** AI 模式下的占位文案：向 AI 提问而不是执行命令。 */
    aiPlaceholder: "向 AI 提问，或搜索客户…",
    empty: "没有匹配的命令。",
    emptyCustomer: "没有匹配的客户。",
    navigate: "导航",
    actions: "操作",
    /** 由当前数据实时生成的记录检索结果。 */
    customers: "客户",
    intelligence: "智能",
    goDashboard: "前往总览",
    goCustomers: "前往客户",
    goOpportunities: "前往机会",
    goTasks: "前往任务",
    goActivities: "前往活动",
    addCustomer: "添加客户",
    toggleTheme: "切换主题",
    refresh: "刷新数据",
    simulateError: "模拟接口失败",
    /* AI 命令——全部走确定性本地逻辑，不调用外部接口。 */
    aiSummary: "生成销售摘要",
    aiRisks: "查看风险客户",
    aiKeyAccounts: "查看高价值客户",
    aiInsight: "定位智能洞察",
    aiDescription: {
      summary: (company: string) => `为「${company}」生成确定性简报`,
      risks: (count: number) => `筛选出 ${count} 位停滞客户`,
      keyAccounts: (count: number) => `按合同金额排序的前 ${count} 位客户`,
      insight: "跳到总览的 AI 洞察层",
    },
    customerDescription: (value: string, status: string) => `${value} · ${status}`,
    hint: "↑↓ 选择 · ↵ 打开 · esc 关闭",
    keywords: {
      dashboard: "首页 概览 指标 仪表盘",
      customers: "客户 名册 列表 表格",
      opportunities: "机会 商机 交易 管道",
      tasks: "任务 看板 拖动",
      activities: "活动 时间线 邮件 通话",
      addCustomer: "新建 客户 添加",
      theme: "深色 浅色 外观 主题",
      refresh: "刷新 重新加载 同步",
      error: "错误 失败 离线",
      summary: "AI 摘要 简报 生成",
      risks: "风险 流失 停滞 预警",
      keyAccounts: "高价值 大客户 金额",
      insight: "洞察 归因 智能",
    },
  },

  /* ------------------------------------------------------------ opportunities */
  opportunities: {
    searchPlaceholder: "搜索公司、联系人或负责人…",
    summary: (open: number) => `${open} 个在谈机会`,
    closedSummary: (won: number, value: string) => `已签约 ${won} 个 · ${value}`,
    resultCaption: (visible: number, total: number) => `共 ${total} 个机会，当前显示 ${visible} 个`,
    addOpportunity: "添加机会",
    filters: {
      allStages: "全部阶段",
      allOwners: "全部负责人",
      sortPrefix: "排序",
    },
    sort: {
      value: "合同金额",
      createdAt: "创建时间",
      lastTouchHours: "最近联系",
      company: "公司",
    },
    columns: {
      deal: "机会",
      stage: "阶段",
      owner: "负责人",
      touch: "最近触达",
      value: "合同金额",
    },
    open: (company: string, value: string) => `打开「${company}」，合同金额 ${value}`,
    empty: {
      title: "没有匹配的机会",
      noSearch: "当前阶段或负责人下没有机会。重置筛选即可查看全部管道。",
      withSearch: (query: string) => `没有找到与「${query}」匹配的机会，换一个关键词试试。`,
    },
  },

  /* ---------------------------------------------------------------- dialogs */
  dialogs: {
    addCustomer: {
      title: "添加客户",
      description: "会在本地状态中真实创建一条记录——表格、指标与活动流会立即更新。",
      name: "联系人姓名",
      company: "公司名称",
      email: "邮箱",
      phone: "电话",
      owner: "负责人",
      status: "状态",
      value: "合同金额（元）",
      notes: "备注",
      notesPlaceholder: "补充背景、下一步动作、采购限制等…",
      placeholderName: "陈晨",
      placeholderCompany: "北辰物流",
      placeholderEmail: "chenchen@beichen-logistics.cn",
      placeholderPhone: "+86 138 0013 8462",
      submit: "添加客户",
      created: (company: string) => `已添加「${company}」`,
      validation: {
        name: "请输入联系人姓名。",
        company: "请输入公司名称。",
        email: "请输入有效的邮箱地址。",
        phone: "请输入电话号码。",
        value: "合同金额必须是非负数字。",
      },
    },
    profile: {
      title: "个人资料",
      description: (workspace: string) => `你当前登录的是 ${workspace} 工作区。`,
      email: "邮箱",
      workspace: "工作区",
      role: "角色",
      plan: "版本",
    },
    signOut: {
      title: "确认退出登录？",
      description: (email?: string) =>
        `这是一个纯前端原型，没有真实鉴权。继续会把本地会话${
          email ? `（${email}）` : ""
        }恢复到初始状态——所有客户、任务与筛选都会回到最初的样子。`,
      confirm: "退出登录",
    },
  },

  /* --------------------------------------------------------- notifications */
  notifications: {
    title: "通知",
    empty: "没有新通知了。",
    markAllRead: "全部标为已读",
    unreadCount: (count: number) => `${count} 条未读`,
  },

  /* ----------------------------------------------------- prototype controls */
  prototype: {
    title: "原型状态",
    description: "强制触发加载、错误与重置流程，预览所有状态。",
    simulateSlowLoad: "模拟慢加载",
    simulateFailure: "模拟接口失败",
    resetData: "重置原型数据",
    resetToastTitle: "原型数据已重置",
    resetToastDescription: "所有客户、任务与筛选都已恢复初始状态。",
  },

  /* ----------------------------------------------------------------- toasts */
  toast: {
    refreshed: "数据已刷新",
    refreshFailed: "请求失败",
    refreshFailedDescription: "已切换到错误状态。",
    emailCopied: "邮箱已复制",
    clipboardUnavailable: "无法访问剪贴板",
    clipboardUnavailableDescription: "请授予剪贴板权限后重试。",
    notificationsRead: "已将全部通知标为已读",
    signedOut: "已退出登录",
    signedOutDescription: "本地会话状态已重置。",
  },

  /* ------------------------------------------------------------------- 404 */
  notFound: {
    app: {
      metaTitle: "页面不存在",
      title: "这个页面不存在",
      description: "你访问的地址不属于这个原型，下面都是真实可用的入口。",
      action: "AI CRM 总览",
      backHome: "返回首页",
    },
    crm: {
      metaTitle: "页面不存在",
      title: "找不到这个 CRM 页面",
      description: "这个页面不在原型范围内，选择一个入口继续浏览。",
      action: "返回总览",
    },
  },

  /* ---------------------------------------------------------------- account */
  account: {
    name: "陈美雅",
    initials: "陈",
    email: "meiya.chen@zhiwu.cn",
    role: "高级客户经理",
    workspace: "智悟云",
    plan: "成长版（内部）",
  },
}

/** Shape every locale must satisfy. */
export type Messages = typeof zhCN
