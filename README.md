# 智悟云 · AI 财务工作台 (AI Finance)

**AI-native financial command center** —— 面向中小企业经营者、财务负责人与管理层的交互式原型。

打开 `/finance`，第一屏回答的不是"这个月赚了多少"，而是**"还能撑多久"**：
现金头寸、现金跑道月数、未来 90 天推演共用同一个构图，并且**假设可以被拖动**——
收入达成率、成本系数、回款率三个滑杆一改，跑道、警戒线日期、预测曲线与全部结论
立刻重算。

```bash
pnpm install
pnpm dev --port 3210   # http://localhost:3210
pnpm test              # Playwright（自动起 3210 端口的 dev server）
pnpm build
```

## 产品信息架构

| 路由 | 页面 | 第一视觉 / 主角 |
| --- | --- | --- |
| `/finance` | 财务总览 | 现金跑道仪表（签名视觉）+ 推导洞察 |
| `/finance/cashflow` | 现金流 | 90 天推演 + 13 周可核对明细 + 账户分布 |
| `/finance/analysis` | 收支分析 | 收入 / 支出构成条 + 科目下钻 + 对手方排行 |
| `/finance/budget` | 预算执行 | 整体执行率 + 一条执行条 + 科目排行 |
| `/finance/insights` | AI 财务洞察 | 结论清单（每条附判定规则与依据） |
| `/finance/risks` | 风险与异常 | 风险敞口 + 应收账龄 + 异常支出 |
| `/finance/transactions` | 交易流水 | 账本（筛选 / 分页 / 凭证抽屉） |
| `⌘K` | **Command Center** | 导航 / 交易检索 / 智能指令 / 操作 |

## 签名视觉：Cash Runway Instrument

`app/finance/_components/cash-runway-hero.tsx`

1. **大数字与图形共面**：现金头寸（`text-metric`）在左，90 天推演在右，底部是同一条地平线（运营备付金警戒线）。
2. **区间是算出来的**：压力与优化两种情景各跑一遍同一套预测规则，两者之间就是那条带——可复算，不是装饰性阴影。
3. **假设可以被拖动**：`收入达成率 × 成本系数 × 回款率` → 月均净流出 → 跑道月数 → 警戒线日期。滑杆是原生 `range`，样式只取令牌。

基准读数：**¥842 万现金 · 14.8 个月跑道 · 2027 年 10 月触及警戒线**。

## AI Layer：不是聊天框

`lib/finance-insights.ts` —— **确定性推导，同输入同输出，不调用任何模型**。

七类结论：科目异常增长、预算超支、回款风险、现金流压力、成本优化机会、供应商集中度、情景推演。
每一条都带四样东西：**事实**（金额 / 百分比 / 日期 / 实体）、**影响金额**（决定排序）、
**依据条数**、**去处**（凭证抽屉 / 发票详情 / 筛选好的页面）。

例如：

> 2026年9月研发与工具支出 ¥41.2万，上月为 ¥21.4万，环比增加 92.5%。

这句话里的每个数字都来自账本，不是文案。改 `lib/finance-data.ts` 里的矩阵，句子自己会变。

## 数据模型：一个账本

```
lib/finance-data.ts     事实：12 个月 × 5 条收入线 × 8 个支出科目、供应商占比、4 个账户、
                             客户回款纪律、账期规则、季度预算
        ↓ 展开
lib/finance-ledger.ts   ~900 笔现金流水、应收发票、应付账单、内部资金调拨、账户余额
        ↓ 推导
lib/finance-metrics.ts  月度序列、跑道、90 天预测、预算执行、账龄、筛选与分页
        ↓ 结论
lib/finance-insights.ts 七类洞察
```

三条恒等式（`tests/finance-data.spec.ts` 精确断言）：

- 支出矩阵 = 已付供应商款 + 未付应付
- 收入矩阵 = 已收现金 + 未回款应收
- 账户期末余额 = 期初 + 全部经营收付（内部调拨不计入经营现金流，但仍改变单个账户余额）

因此"每个图表各造一份数"在结构上不可能发生：**现金头寸、月度序列、预算实际发生额、
账龄、凭证金额全部来自同一份流水**。

## 设计系统 V5 — Financial Instrument

- **画布**：暖白纸（不是冷灰）——读的是报表，不是控制台。
- **两个产品色**：深青 `--brand`（机构感，刻意不用"AI 紫"）+ 黄铜 `--data-accent`（预算与预测）。
- **图表语义色**：`--data-income` 青 / `--data-expense` 陶土橙 / `--data-budget` 黄铜 / `--data-risk` 红。
  同一张图里的每个颜色都在回答"这条线是什么"。
- **更紧的圆角**（`--radius: 0.5rem`）：这是一台仪表，不是一组卡片。
- **Light**：暖白纸 + 纯白面，靠亮度差分层而不靠描边。**Dark**：石墨底 + 下沉的 Hero，深青从中透出来。
- **一屏一个光源**：带 Hero 的页面关掉全局环境光。

排版沿用工厂的中文红线：中文不加负字距、行高高于拉丁方案、字体栈以 Geist 起头回落 PingFang/YaHei。

## 本地化

默认 `zh-CN`，词典在 `lib/i18n/zh-CN.ts`。
`app/**` 与 `components/**` 里**没有**硬编码的用户可见文案；新增语言只需要加一个同形状的文件。
`tests/localization.spec.ts` 断言落地页与全部财务路由（含浮层）零英文泄漏——允许列表集中在
`tests/support/localization.ts`（品牌名、邮箱、SaaS 供应商产品名、凭证号、快捷键）。

## 响应式

| | 1440×900 | 390×844 |
| --- | --- | --- |
| 导航 | 固定 Sidebar + TopNav | 顶栏 + 抽屉导航 |
| 跑道 | 数字与图形左右共面 | 数字 → 图形 → 假设面板（重新排序，不是压缩） |
| 明细 | 表格 / 多栏 | 两行记录 / 单列 |
| 命中区 | — | ≥ 24px |

`tests/finance-responsive.spec.ts` 覆盖七个路由在两种视口下的横向溢出、导航形态与命中区。

## 测试

```bash
pnpm test    # 119 个 Playwright 断言，8 个 spec
```

| spec | 覆盖 |
| --- | --- |
| `finance-data.spec.ts` | 账本恒等式、派生指标一致性、确定性（不打开浏览器） |
| `finance-overview.spec.ts` | 跑道读数、图形读数、假设重算、洞察层、记录层 |
| `finance-navigation.spec.ts` | 七个深链、侧栏导航、404、三态、主题、账户菜单 |
| `finance-ledger.spec.ts` | 筛选 / 搜索 / 分页 / 凭证抽屉 / 登记一笔收支 |
| `finance-budget.spec.ts` | 执行率、科目排行、只看超支、部门维度、下钻 |
| `finance-risks.spec.ts` | 账龄分桶筛选、敞口清单、发票详情、异常支出 |
| `finance-command.spec.ts` | 命令中心四组、账本检索、智能指令、AI 模式 |
| `finance-responsive.spec.ts` | 1440×900 / 390×844、命中区、重排 |
| `localization.spec.ts` | 全部路由与浮层的零英文泄漏审查 |

## Factory 出身

本项目由 **Prototype Factory v1.0.0**（`prototype-starter@v1.0.0`）生产：

- **保留**：设计令牌层与语义命名、motion presets、i18n 架构、`components/prototype` 与
  `components/motion` 与 `components/layout`、Playwright 装置、AGENTS.md/Skills 的规则体系。
- **有选择地复用并改造**：TopNav / Sidebar 去掉了对上一个产品 store 的耦合（数据源由调用方注入）、
  `SectionHeading` 的操作区在移动端独占一行、命令中心泛化为"注入式分组"。
- **移除**：上一个产品的全部业务实现（页面、数据、store、洞察与测试）。

换句话说：**工厂提供基础设施与设计语言，产品提供构图与事实。**

## 结构

```
app/
  finance/                    # 七个路由 + 外壳
    _components/              # 跑道仪表、洞察层、账本、预算、风险、抽屉与对话框
  page.tsx                    # 落地页（数字与产品内一致）
lib/
  finance-data.ts             # 事实
  finance-ledger.ts           # 展开成流水
  finance-metrics.ts          # 派生指标
  finance-insights.ts         # 确定性洞察
  format.ts / motion-presets.ts / i18n/
stores/finance-store.ts       # 用户改了什麼（假设 / 筛选 / 分页 / 选中记录）
components/                   # 从工厂继承的复用件
tests/                        # 8 个 spec
.qa/shots.mjs                 # Browser QA 截图与错误检查
```
