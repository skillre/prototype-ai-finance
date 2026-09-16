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

## 视觉语言 — Prototype Kits · `cinematic` Style Pack（Source Installation）

产品的视觉语言不再由本仓库自己定义，而是**从已安装的 Prototype Kits 源码取值**。

```
Finance JSX（类名与文案一行没改）
  ↑ Finance 语义令牌（--background / --brand / --hairline / --data-income …）
  ↑ lib/kits/adapters/finance-tokens.css        ← 产品所有
  ↑ lib/kits/installed/**（kits add 装进来的 Kits 源码）
```

- **安装**：`prototype-kits@v0.1.0`（`main` @ `64279eaf`），8 个资产 / 42 个托管文件，
  清单在 `lib/kits/kits.lock.json`（含来源 commit 与逐文件 checksum）。
- **分发方式**：Source Installation。产品里**没有** `@kits/*` 依赖、没有 `link:`、
  不需要 `transpilePackages` / `externalDir` / `turbopack.root` /
  `allowImportingTsExtensions` —— `next.config.ts` 与 `tsconfig.json` 都未改动。
  把 `prototype-kits` 仓库移走，typecheck / test / build 仍然通过。
- **签名组件**：`AnimatedGrid`（场景背板）、`DataCursor`（账本行的精确读数）、
  `InsightReveal`（结论的阅读节奏）；效果包 `ambient-glow`（三点环境光）。
- **两个产品色仍然属于这个产品**：深青 `--brand`（机构感，刻意不用"AI 紫"）
  + 黄铜 `--data-accent`（预算与预测）——只是取值改为指向 pack 的 palette。
  图表语义色（收入 / 支出 / 预算 / 风险）映射到 pack 的 `--kits-data-series-*`
  与强调色，**同一张图里的每个颜色仍在回答"这条线是什么"**。
- **圆角 / 投影 / 排版刻度 / 间距节奏 / 动效时长**全部由 pack 决定；
  动效时长经 `motionToCssVars()` 编译成 CSS 变量注入 `<html>`，产品里没有一份拷贝。

完整记录（交付链路、与 Local Link 实验的逐项对照、发现的问题）见
[`docs/kits-integration.md`](docs/kits-integration.md)。

排版沿用工厂的中文红线：中文不加负字距、行高高于拉丁方案、CJK 回退栈显式接在
pack 的拉丁字体之后。

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
pnpm test    # 301 个 Playwright 断言，16 个 spec
```

产品自己的 9 个 spec：

| spec | 覆盖 |
| --- | --- |
| `finance-data.spec.ts` | 账本恒等式（三条不变量在 `product-contract.json` 登记）、派生指标一致性、确定性（不打开浏览器） |
| `finance-overview.spec.ts` | 跑道读数、图形读数、假设重算、洞察层、记录层 |
| `finance-navigation.spec.ts` | 七个深链、侧栏导航、404、三态、主题、账户菜单 |
| `finance-ledger.spec.ts` | 筛选 / 搜索 / 分页 / 凭证抽屉 / 登记一笔收支 |
| `finance-budget.spec.ts` | 执行率、科目排行、只看超支、部门维度、下钻 |
| `finance-risks.spec.ts` | 账龄分桶筛选、敞口清单、发票详情、异常支出 |
| `finance-command.spec.ts` | 命令中心四组、账本检索、智能指令、AI 模式 |
| `finance-responsive.spec.ts` | 1440×900 / 390×844、命中区、重排 |
| `localization.spec.ts` | 全部路由与浮层的零英文泄漏审查 |

继承自 Factory Core 的 7 个契约 spec（**它们守的是工具链本身，不是这个产品的页面**）：

| spec | 覆盖 |
| --- | --- |
| `qa-probes.spec.ts` | 探针本身：`measure()` 在没量到时必须 fail loudly、DOM == AX 的配套扫描、样式基线判据 |
| `online-qa.spec.ts` | REMOTE 观察者：身份先于 QA、不创建 token、LOCAL 与 REMOTE 共用同一套判据 |
| `deploy-contract.spec.ts` | 部署身份 / 授权矩阵 / 受保护与 public 的区别 / `vercel curl` 的副作用披露 |
| `release-contract.spec.ts` | 发布状态机、RC ↔ Production 的 SHA 一致、tag 规矩、文档与实现说的是同一件事 |
| `factory-contract.spec.ts` | Core 中立性（产品源码不得出现 Kits 资产 id）、共享组件不得耦合产品数据、QA 端口契约、Manifest 校验器本身 |
| `product-contract.spec.ts` | 契约的声明方向：形状拒绝、声明 ↔ 登记双向核对、门禁 CLI 的真实退出码 |
| `kits-seam.spec.ts` | Kits 接缝：托管区/适配层的边界、说明符扫描、空扫描必须失败（baseline 专属两条显式 skip） |

> 门禁与它自己的测试都要走 `pnpm test`：**一个自身失效方式是"静默通过"的门，不能靠读代码来确认它是好的。**

## Factory 出身

本项目由 **Prototype Factory v1.0.0**（`prototype-starter@v1.0.0`）生产：

- **保留**：设计令牌层与语义命名、motion presets、i18n 架构、`components/prototype` 与
  `components/motion` 与 `components/layout`、Playwright 装置、AGENTS.md/Skills 的规则体系。
- **有选择地复用并改造**：TopNav / Sidebar 去掉了对上一个产品 store 的耦合（数据源由调用方注入）、
  `SectionHeading` 的操作区在移动端独占一行、命令中心泛化为"注入式分组"。
- **移除**：上一个产品的全部业务实现（页面、数据、store、洞察与测试）。

换句话说：**工厂提供基础设施与设计语言，产品提供构图与事实。**

### 治理层（2026-09-15 对齐 Factory Core Policy v1.3.0）

| 面 | 文件 | 门禁 |
| --- | --- | --- |
| 策略与并发 | `factory-policy.json` · `AGENTS.md` 的 `factory-core-policy` 管理块 | `pnpm factory:agents` |
| 工厂锁（product 形状；factory 1.2.0 / policy 1.3.0，未知项与依据记在 `notes[]`） | `factory.lock.json` | 同上 |
| 初始化边界 | `init-contract.json` | `pnpm factory:init` |
| 产品语义不变量（三条账本恒等式） | `product-contract.json` | `pnpm factory:contract` |
| 视觉方向 | `visual-manifest.json` | `pnpm factory:manifest` |
| 部署授权与身份 | `scripts/lib/deploy-contract.mjs` · `scripts/lib/release-contract.mjs` | `pnpm factory:deploy` |
| Browser QA（LOCAL + REMOTE 共用一套判据） | `.qa/sweep.mjs` · `.qa/browser-qa.mjs` · `.qa/online-qa.mjs` | `pnpm qa` · `pnpm qa:online` |
| Kits 安装状态（Source Installation） | `lib/kits/kits.lock.json` · `scripts/doctor-gate.mjs` · `scripts/install-kits.mjs` | `pnpm qa:doctor` · `pnpm factory:kits`（默认 dry-run） |
| CI（只做质量门，不部署） | `.github/workflows/ci.yml` | GitHub Actions |

`pnpm check` = `factory:agents` → `factory:init` → `factory:contract` → `factory:manifest` → `qa:doctor`
→ lint → typecheck → test → build → qa（策略门禁是第一项，Kits doctor 排在 lint 之前 —— 安装状态不可信时，
后面那些绿没有意义；test 与 qa **串行**）。
QA 端口 3210 只有一个来源（`.qa/qa.config.mjs`），`reuseExistingServer` 恒为 `false`。

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
lib/kits/                     # ← Prototype Kits 安装区（见 docs/kits-integration.md）
  installed/                  #   Kits 托管源码（kits add 覆盖，产品只读）
  adapters/                   #   产品适配层（Kits 永不覆盖）
  .kits/                      #   Installer 副本（脱离 Kits 仓库也能跑 doctor/diff）
  kits.lock.json              #   安装清单（来源 commit + 逐文件 checksum）
tests/                        # 9 个 spec
docs/kits-integration.md      # 视觉语言来源与集成记录
docs/browser-qa.md            # Browser QA 标准（判据、矩阵、REMOTE 模式）
docs/release-runbook.md       # 发布顺序（RC → Preview → 在线 QA → HVA → 源码发布 → Production）
docs/vercel-bootstrap.md      # Vercel 授权边界（第 0 节是部署授权契约）
.qa/qa.config.mjs             # QA 唯一真相：端口 3210 / 路由 / 视口 / 主题 / 容差
.qa/sweep.mjs                 # 一套判据，LOCAL 与 REMOTE 共用
.qa/browser-qa.mjs            # `pnpm qa`：LOCAL_MANAGED，自己起 server、自己停
.qa/online-qa.mjs             # `pnpm qa:online`：REMOTE 观察者（不部署、不建 token）
.qa/shots.mjs                 # 人工 QA 截图与错误检查
.qa/kits-qa.mjs               # 人工 QA（强判据：视口/文档宽度/实际横向滚动 + 降级探针）
.qa/standalone.sh             # Standalone 验证（隐藏 Kits 仓库后跑完整套关卡）
scripts/                      # 契约与门禁：guard-agent-policy / verify-init / verify-product-contract
                              #                 / validate-manifest / verify-deployment / check-qa-port
```
