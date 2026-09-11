import { zhCN, type Messages } from "./zh-CN"

/**
 * Locale registry — the only place that knows which dictionaries exist.
 *
 * Default is `zh-CN`. Adding `en-US` is a two-line change: create
 * `lib/i18n/en-US.ts` exporting a `Messages`-shaped object, then append the tag
 * to `LOCALES` and the map below. No component needs to know.
 *
 * ## 覆盖范围（重要：把「界面文案」和「业务内容」分开）
 *
 * 词典负责 **界面文案**，以及由界面生成的文案模板：
 *   ✅ components/**        所有共享 UI（含 Sidebar / TopNav / FilterBar /
 *                           Pagination / DetailDrawer 等组件的默认文案）
 *   ✅ app/**               全部路由：财务工作台（/finance/**）、落地页（/）、404 页
 *   ✅ lib/finance-insights.ts  洞察句的**措辞模板**（事实由代码给出）
 *
 * 词典**不**负责 **业务记录内容**——那是数据，不是可翻译的文案：
 *   ⛔ lib/finance-data.ts   科目名、供应商名、客户名、账户名、月度矩阵
 *   ⛔ lib/finance-ledger.ts 凭证号、摘要、发票号等由规则生成的记录内容
 *
 * 因此 `app/**` 与 `components/**` 里不应再出现任何用户可见的字面文案；
 * 新增原型直接从词典取文案即可。
 */
export const LOCALES = ["zh-CN"] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "zh-CN"

const dictionaries: Record<Locale, Messages> = {
  "zh-CN": zhCN,
}

/** Messages for a locale, falling back to the default for anything unknown. */
export function getMessages(locale: Locale = DEFAULT_LOCALE): Messages {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

/** Non-hook accessor for server components and non-React modules. */
export const messages = getMessages(DEFAULT_LOCALE)

export { zhCN }
export type { Messages }
