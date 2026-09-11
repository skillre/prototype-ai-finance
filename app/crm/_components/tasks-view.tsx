"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CalendarIcon, GripVerticalIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TASK_COLUMNS, type CrmTask, type TaskColumnId } from "@/lib/crm-data"
import { useCrmStore } from "@/stores/crm-store"
import { formatDateShort } from "@/lib/format"
import { useMessages } from "@/components/i18n/locale-provider"
import { cssEasings, durations, ms } from "@/lib/motion-presets"
import { cn } from "@/lib/utils"

export function TasksView() {
  const t = useMessages()
  const tasks = useCrmStore((s) => s.tasks)
  const moveTask = useCrmStore((s) => s.moveTask)
  const resetBoard = useCrmStore((s) => s.resetBoard)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  /** 任务 id → 所在列。 */
  const columnOf = useMemo(() => {
    const map = new Map<string, TaskColumnId>()
    for (const column of TASK_COLUMNS) {
      for (const task of tasks[column.id] ?? []) map.set(task.id, column.id)
    }
    return map
  }, [tasks])

  const activeTask = useMemo(
    () =>
      activeId
        ? TASK_COLUMNS.flatMap((c) => tasks[c.id] ?? []).find((task) => task.id === activeId) ?? null
        : null,
    [activeId, tasks]
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const taskId = String(active.id)
    const from = columnOf.get(taskId)
    if (!from) return

    const overId = String(over.id)
    // over 可能是另一张卡片，也可能是空列的 droppable 容器。
    const to = columnOf.get(overId) ?? (TASK_COLUMNS.some((c) => c.id === overId) ? (overId as TaskColumnId) : undefined)
    if (!to) return

    if (from === to) {
      const list = tasks[from] ?? []
      const oldIndex = list.findIndex((t) => t.id === taskId)
      const newIndex = list.findIndex((t) => t.id === overId)
      if (newIndex === -1 || oldIndex === newIndex) return
      const next = arrayMove(list, oldIndex, newIndex)
      moveTask(taskId, from, to, next.findIndex((t) => t.id === taskId))
      return
    }

    const targetList = tasks[to] ?? []
    const overIndex = targetList.findIndex((t) => t.id === overId)
    const toIndex = overIndex === -1 ? targetList.length : overIndex
    moveTask(taskId, from, to, toIndex)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 工具条是开放式的一行，不是又一块面板。 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
        <p className="text-caption text-muted-foreground">{t.tasks.hint}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetBoard}
          data-testid="reset-board"
        >
          <RotateCcwIcon />
          {t.tasks.resetBoard}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        {/*
          泳道不再是一张张面板：列头 + hairline + 开放式列表。
          这样整页的容器从「5 个列 Card × 13 个任务 Card」变成 0 个卡片容器，
          层级由排版和留白承担，拖拽仍然落在同一片 droppable 区域上。
          `xl:grid-cols-5` 让五条泳道排满一整行——3 列会在第 2 行留下一格空白，
          那种"缺一块"的构图比窄一点的列更伤。
        */}
        <div
          className="grid items-start gap-x-6 gap-y-9 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          data-testid="task-board"
        >
          {TASK_COLUMNS.map((column) => (
            <TaskColumn
              key={column.id}
              id={column.id}
              title={t.tasks.columns[column.id].title}
              hint={t.tasks.columns[column.id].hint}
              tasks={tasks[column.id] ?? []}
              dropHint={t.tasks.dropHere}
            />
          ))}
        </div>

        {/* dnd-kit 只接受数字与 CSS 字符串——从 motion token 派生，避免硬编码。 */}
        <DragOverlay
          dropAnimation={{ duration: ms(durations.modal), easing: cssEasings.outExpo }}
        >
          {activeTask ? <TaskCardBody task={activeTask} progressLabel={t.tasks.progress} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function TaskColumn({
  id,
  title,
  hint,
  tasks,
  dropHint,
}: {
  id: TaskColumnId
  title: string
  hint: string
  tasks: CrmTask[]
  dropHint: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      data-testid={`task-column-${id}`}
      className={cn(
        "flex flex-col rounded-panel transition-[background-color] duration-hover ease-standard",
        isOver && "bg-brand-soft/40"
      )}
    >
      <header className="flex flex-col gap-0.5 border-b border-hairline pb-2">
        <span className="flex items-baseline gap-2">
          <h3 className="text-body font-semibold">{title}</h3>
          <span className="numeric text-label text-muted-foreground">{tasks.length}</span>
        </span>
        <span className="truncate text-label text-muted-foreground">{hint}</span>
      </header>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex min-h-24 flex-1 flex-col gap-2 pt-3">
          {tasks.map((task) => (
            <SortableTask key={task.id} task={task} />
          ))}
          {tasks.length === 0 ? (
            <li className="flex flex-1 items-center justify-center rounded-card border border-dashed border-border px-3 py-6 text-center text-label text-muted-foreground">
              {dropHint}
            </li>
          ) : null}
        </ul>
      </SortableContext>
    </section>
  )
}

function SortableTask({ task }: { task: CrmTask }) {
  const t = useMessages()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  // 手写 transform（不依赖 @dnd-kit/utilities —— pnpm 12 对其存在链接 bug）
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`,
        transition,
      }
    : { transition }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn("touch-none", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <TaskCardBody task={task} progressLabel={t.tasks.progress} />
    </li>
  )
}

function TaskCardBody({
  task,
  dragging = false,
  progressLabel,
}: {
  task: CrmTask
  dragging?: boolean
  progressLabel: string
}) {
  const overdue = task.progress < 30
  return (
    <article
      className={cn(
        "group/card flex cursor-grab flex-col gap-2 rounded-card bg-surface p-3 ring-1 ring-border/70 transition-[box-shadow,transform,ring-color] duration-hover ease-standard active:cursor-grabbing",
        "hover:-translate-y-0.5 hover:shadow-card hover:ring-brand/25",
        dragging && "-translate-y-0.5 rotate-[0.6deg] shadow-floating ring-brand/40"
      )}
    >
      <div className="flex items-start gap-1.5">
        {/* 抓取手柄只在需要时出现——常驻的 ⠿ 会让一排卡片显得很吵。 */}
        <GripVerticalIcon className="mt-0.5 -ml-0.5 size-3.5 shrink-0 text-muted-foreground/0 transition-colors duration-hover group-hover/card:text-muted-foreground/70" />
        <span className="min-w-0 flex-1 text-body-sm leading-snug font-medium">{task.title}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-label text-muted-foreground">
          {task.company}
        </span>
        <span aria-hidden className="shrink-0 text-label text-muted-foreground/40">
          ·
        </span>
        <span className="shrink-0 text-label text-muted-foreground">{task.owner}</span>

        <span
          className={cn(
            "numeric inline-flex shrink-0 items-center gap-0.5 text-label",
            overdue ? "text-warning" : "text-muted-foreground"
          )}
        >
          <CalendarIcon className="size-3" />
          {formatDateShort(task.due)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="relative h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border/70">
          <span
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-[width] duration-slow ease-out-expo",
              overdue ? "bg-warning" : "bg-brand"
            )}
            style={{ width: `${task.progress}%` }}
          />
        </span>
        <span className="numeric shrink-0 text-label text-muted-foreground">
          {progressLabel} {task.progress}%
        </span>
      </div>
    </article>
  )
}
