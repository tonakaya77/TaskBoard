import { Draggable } from '@hello-pangea/dnd'
import type { Task, Urgency } from '../../api/types'
import styles from './TaskCard.module.css'
import { formatDueDate } from './formatDueDate'

type Props = {
  task: Task
  /** 列の中での位置（0 始まり）。ドラッグ＆ドロップで使う */
  index: number
  /** カードを押したとき。タスク詳細を開く */
  onClick?: () => void
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
 * 押す（キーボードでは Enter）とタスク詳細を開く。
 * ドラッグ＆ドロップで、別の列へ移したり同じ列の中で並べ替えたりできる（F-05）。
 * キーボードでは Space で持ち上げ、矢印キーで動かし、Space で置く。
 */
function TaskCard({ task, index, onClick }: Props) {
  const urgency = urgencyStyles[task.urgency]

  return (
    <Draggable
      draggableId={String(task.id)}
      index={index}
      // つかむ場所がボタンなので、ボタンからもドラッグを始められるようにする
      disableInteractiveElementBlocking
    >
      {(provided, snapshot) => (
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={styles.item}
          title={task.title}
        >
          <button
            type="button"
            // ボタンをつかんでドラッグする。Tab で止まる場所はこのボタン1つ
            {...provided.dragHandleProps}
            className={[
              styles.card,
              urgency?.className,
              snapshot.isDragging && styles.dragging,
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={onClick}
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
          </button>
        </li>
      )}
    </Draggable>
  )
}

export default TaskCard
