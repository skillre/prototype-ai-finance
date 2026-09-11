import { FinanceDataBoundary } from "../_components/finance-data-boundary"
import { InsightsView } from "../_components/insights-view"
import { MonthlyBrief } from "../_components/overview-sections"

/** /finance/insights —— AI 财务洞察全量清单（含判定规则）。 */
export default function InsightsPage() {
  return (
    <FinanceDataBoundary route="insights">
      <div className="flex flex-col gap-8">
        <MonthlyBrief />
        <InsightsView />
      </div>
    </FinanceDataBoundary>
  )
}
