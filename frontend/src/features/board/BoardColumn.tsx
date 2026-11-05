import { useQuery } from '@tanstack/react-query'
import { getTasksByStatus } from '../../api/tasks'
import type { Status } from '../../api/types'
import styles from './BoardColumn.module.css'
import TaskCard from './TaskCard'

type Props = {
  status: Status
}

/** ボードの列。ステータスのタスクを取得して、カードを並べる。 */
function BoardColumn({ status }: Props) {
  const {
    data: tasks,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['tasks', 'status', status.id],
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
        <ul className={styles.cardList}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  )
}

export default BoardColumn
