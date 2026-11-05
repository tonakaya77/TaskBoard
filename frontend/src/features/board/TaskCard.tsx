import type { Task, Urgency } from '../../api/types'
import styles from './TaskCard.module.css'
import { formatDueDate } from './formatDueDate'

type Props = {
  task: Task
}

/** 緊急度ごとの、バッジの文字とカードの見た目。通常は何も出さない（機能設計 F-11）。 */
const urgencyStyles: Record<
  Urgency,
  { label: string; className: string } | null
> = {
  HIGH: { label: '高', className: styles.high },
  MEDIUM: { label: '中', className: styles.medium },
  NORMAL: null,
}

/**
 * ボードのカード。緊急度（左端の色帯とタイトル前のバッジ）、タイトル（長いものは省略）、期限を出す。
 */
function TaskCard({ task }: Props) {
  const urgency = urgencyStyles[task.urgency]

  return (
    <li
      className={urgency ? `${styles.card} ${urgency.className}` : styles.card}
      title={task.title}
    >
      <div className={styles.titleRow}>
        {urgency && (
          <span className={styles.badge}>
            {/* 読み上げのときに、何の「高」「中」かがわかるようにする */}
            <span className={styles.srOnly}>緊急度</span>
            {urgency.label}
          </span>
        )}
        <span className={styles.title}>{task.title}</span>
      </div>
      <div className={styles.meta}>{formatDueDate(task.dueDate)}</div>
    </li>
  )
}

export default TaskCard
