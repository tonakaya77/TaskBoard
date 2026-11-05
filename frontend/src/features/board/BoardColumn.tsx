import { Droppable } from '@hello-pangea/dnd'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../api/queryKeys'
import { getTasksByStatus } from '../../api/tasks'
import type { Status } from '../../api/types'
import styles from './BoardColumn.module.css'
import TaskCard from './TaskCard'

type Props = {
  status: Status
  /** プロジェクトの完了ステータス。カードに緊急度を出すかの判断に使う */
  doneStatusId: number | null
  /** カードを押したとき。タスク詳細を開く */
  onOpenTask: (taskId: number) => void
}

/** ボードの列。ステータスのタスクを取得して、カードを並べる。 */
function BoardColumn({ status, doneStatusId, onOpenTask }: Props) {
  const {
    data: tasks,
    isPending,
    isError,
  } = useQuery({
    queryKey: queryKeys.tasksByStatus(status.id),
    queryFn: () => getTasksByStatus(status.id),
  })

  return (
    <section className={styles.column} aria-label={status.name}>
      <h2 className={styles.head}>
        {status.name}
        {tasks && ` (${tasks.length})`}
      </h2>
      {isPending && <p className={styles.message}>読み込み中...</p>}
      {isError && (
        <p className={styles.message} role="alert">
          タスクを読み込めませんでした
        </p>
      )}
      {tasks && (
        // カードを落とせる場所。droppableId は列（ステータス）の ID
        <Droppable droppableId={String(status.id)}>
          {(provided, snapshot) => (
            <ul
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={
                snapshot.isDraggingOver
                  ? `${styles.cardList} ${styles.over}`
                  : styles.cardList
              }
            >
              {tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  doneStatusId={doneStatusId}
                  onClick={() => onOpenTask(task.id)}
                />
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      )}
    </section>
  )
}

export default BoardColumn
