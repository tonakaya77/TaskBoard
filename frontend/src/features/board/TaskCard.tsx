import type { Task } from '../../api/types'
import styles from './TaskCard.module.css'
import { formatDueDate } from './formatDueDate'

type Props = {
  task: Task
}

/** ボードのカード。タイトル（長いものは省略）と期限を出す。 */
function TaskCard({ task }: Props) {
  return (
    <li className={styles.card} title={task.title}>
      <div className={styles.title}>{task.title}</div>
      <div className={styles.meta}>{formatDueDate(task.dueDate)}</div>
    </li>
  )
}

export default TaskCard
