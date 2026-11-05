import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router'
import { getProject } from '../../api/projects'
import { getStatuses } from '../../api/statuses'
import type { Task } from '../../api/types'
import TaskDetailDialog from '../task/TaskDetailDialog'
import TaskFormDialog from '../task/TaskFormDialog'
import BoardColumn from './BoardColumn'
import styles from './BoardPage.module.css'
import { useMoveTask } from './useMoveTask'

/**
 * ボード画面（S-03）。プロジェクトのステータスを列として並べる。
 * カードを押すとタスク詳細（S-05）を開き、「編集」でタスク作成・編集（S-06）に切り替える。
 * 編集を閉じると（保存でもキャンセルでも）タスク詳細に戻る（UC-10）。
 * カードはドラッグ＆ドロップで、別の列へ移したり同じ列の中で並べ替えたりできる（UC-12）。
 */
function BoardPage() {
  const projectId = Number(useParams().projectId)
  const [isCreating, setIsCreating] = useState(false)
  // タスク詳細で開いているタスク
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null)
  // 編集しているタスク。編集のあいだは、タスク詳細を隠す
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const moveMutation = useMoveTask()

  const {
    data: statuses,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => getStatuses(projectId),
  })

  // タスク作成ダイアログのステータスの初期値（初期ステータス）と、
  // タスク詳細のプロジェクト名・完了ステータスの判断に使う
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
  })

  function handleDragEnd({ draggableId, source, destination }: DropResult) {
    // 列の外に落としたときと、元の場所に戻したときは何もしない
    if (!destination) return
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }
    moveMutation.mutate({
      taskId: Number(draggableId),
      from: { statusId: Number(source.droppableId), index: source.index },
      to: {
        statusId: Number(destination.droppableId),
        index: destination.index,
      },
    })
  }

  if (isPending) return <p>読み込み中...</p>
  if (isError) return <p role="alert">ボードを読み込めませんでした</p>

  return (
    <>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setIsCreating(true)}
          disabled={!project || statuses.length === 0}
        >
          + タスクを追加
        </button>
      </div>
      {/* 失敗の表示は、次に動かすと消える（mutate のたびに状態が新しくなる） */}
      {moveMutation.isError && (
        <p className={styles.error} role="alert">
          カードを移動できませんでした。時間をおいてもう一度お試しください
        </p>
      )}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={styles.board}>
          {statuses.map((status) => (
            <BoardColumn
              key={status.id}
              status={status}
              onOpenTask={setDetailTaskId}
            />
          ))}
        </div>
      </DragDropContext>
      {isCreating && project && (
        <TaskFormDialog
          project={project}
          statuses={statuses}
          onClose={() => setIsCreating(false)}
        />
      )}
      {detailTaskId !== null && !editingTask && project && (
        <TaskDetailDialog
          taskId={detailTaskId}
          project={project}
          statuses={statuses}
          onEdit={setEditingTask}
          onClose={() => setDetailTaskId(null)}
        />
      )}
      {editingTask && project && (
        <TaskFormDialog
          project={project}
          statuses={statuses}
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  )
}

export default BoardPage
