import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router'
import { getProject } from '../../api/projects'
import { queryKeys } from '../../api/queryKeys'
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
  // URL のプロジェクト ID が正の整数でないときは、API を呼ばずにエラーにする
  const isValidProjectId = Number.isInteger(projectId) && projectId > 0
  const [isCreating, setIsCreating] = useState(false)
  // タスク詳細で開いているタスク
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null)
  // 編集しているタスク。編集のあいだは、タスク詳細を隠す
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const moveMutation = useMoveTask()

  const statusesQuery = useQuery({
    queryKey: queryKeys.statuses(projectId),
    queryFn: () => getStatuses(projectId),
    enabled: isValidProjectId,
  })

  // タスク作成ダイアログのステータスの初期値（初期ステータス）と、
  // カード・タスク詳細の完了ステータスの判断、タスク詳細のプロジェクト名に使う
  const projectQuery = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: isValidProjectId,
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

  // プロジェクトとステータスの両方がそろってから表示する。どちらかを読み込めなければエラー
  if (!isValidProjectId || statusesQuery.isError || projectQuery.isError) {
    return <p role="alert">ボードを読み込めませんでした</p>
  }
  if (statusesQuery.isPending || projectQuery.isPending) {
    return <p>読み込み中...</p>
  }
  const statuses = statusesQuery.data
  const project = projectQuery.data

  return (
    <>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setIsCreating(true)}
          disabled={statuses.length === 0}
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
              doneStatusId={project.doneStatusId}
              onOpenTask={setDetailTaskId}
            />
          ))}
        </div>
      </DragDropContext>
      {isCreating && (
        <TaskFormDialog
          project={project}
          statuses={statuses}
          onClose={() => setIsCreating(false)}
        />
      )}
      {detailTaskId !== null && !editingTask && (
        <TaskDetailDialog
          taskId={detailTaskId}
          project={project}
          statuses={statuses}
          onEdit={setEditingTask}
          onClose={() => setDetailTaskId(null)}
        />
      )}
      {editingTask && (
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
