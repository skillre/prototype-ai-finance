"use client"

import { CrmDataBoundary } from "../_components/crm-data-boundary"
import { TasksView } from "../_components/tasks-view"

/** /crm/tasks —— 可拖拽任务看板路由。 */
export default function CrmTasksPage() {
  return (
    <CrmDataBoundary route="tasks" loadingVariant="section">
      <TasksView />
    </CrmDataBoundary>
  )
}
