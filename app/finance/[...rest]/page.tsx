import { notFound } from "next/navigation"

/**
 * 财务工作台的兜底段。
 *
 * 没有它，`/finance/cashfow` 这类手误会被上级的 404 接管，用户直接掉出
 * 工作台外壳（导航、命令中心全没了）。有了它，未匹配的财务路径会用
 * **财务工作台自己的 404**：留在同一套外壳里，建议的也是财务页面。
 */
export default function FinanceCatchAll() {
  notFound()
}
