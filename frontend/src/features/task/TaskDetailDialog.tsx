import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef } from 'react'
import { getTask } from '../../api/tasks'
import type { Project, Status, Task, Urgency } from '../../api/types'
import { formatDueDate } from '../board/formatDueDate'
import styles from './TaskDetailDialog.module.css'
// ダイアログの枠・ボタンの見た目は、タスク作成・編集ダイアログと揃える
import dialogStyles from './TaskFormDialog.module.css'

type Props = {
  taskId: number
  project: Project
  statuses: Status[]
  onEdit: (task: Task) => void
  onClose: () => void
}

/** 緊急度のバッジ。通常は出さない（機能設計 F-11） */
const urgencyBadges: Record<
  Urgency,
  { label: string; className: string } | null
> = {
  HIGH: { label: '高', className: styles.high },
  MEDIUM: { label: '中', className: styles.medium },
  NORMAL: null,
}

/**
 * タスク詳細ダイアログ（S-05）。内容を表示し、「編集」でタスク作成・編集（S-06）を開く。
 * サブタスク・削除・期限アラートは、まだ作っていない。
 */
function TaskDetailDialog({
  taskId,
  project,
  statuses,
  onEdit,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingId = useId()

  // 編集で保存したあとに読み直されるよう、キーは ['tasks', …] の下に置く
  const {
    data: task,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => getTask(taskId),
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const statusName = statuses.find((s) => s.id === task?.statusId)?.name
  // 完了ステータスのタスクには、緊急度を出さない
  const badge =
    task && task.statusId !== project.doneStatusId
      ? urgencyBadges[task.urgency]
      : null

  return (
    <dialog
      ref={dialogRef}
      className={dialogStyles.dialog}
      aria-labelledby={headingId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className={dialogStyles.form}>
        <div className={dialogStyles.head}>
          <div className={styles.summary}>
            <h2 id={headingId} className={styles.title}>
              {badge && (
                <span className={`${styles.badge} ${badge.className}`}>
                  <span className={styles.srOnly}>緊急度</span>
                  {badge.label}
                </span>
              )}
              {task ? task.title : 'タスク詳細'}
            </h2>
            {task && (
              <>
                <div className={styles.meta}>
                  <span
                    className={styles.dot}
                    style={{ background: project.color }}
                    aria-hidden="true"
                  />
                  {project.title} / {statusName}
                </div>
                <div className={styles.due}>
                  {task.dueDate
                    ? `期限 ${formatDueDate(task.dueDate)}`
                    : '期限なし'}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            className={dialogStyles.iconButton}
            aria-label="閉じる"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className={dialogStyles.body}>
          {isPending && <p>読み込み中...</p>}
          {isError && (
            <p className={dialogStyles.errorBox} role="alert">
              タスクを読み込めませんでした
            </p>
          )}
          {task && (
            <>
              <h3 className={styles.sectionHeading}>説明</h3>
              {task.description ? (
                <p className={styles.description}>{task.description}</p>
              ) : (
                <p className={`${styles.description} ${styles.muted}`}>
                  説明はありません
                </p>
              )}
            </>
          )}
        </div>

        <div className={dialogStyles.foot}>
          <button
            type="button"
            className={`${dialogStyles.button} ${dialogStyles.primary}`}
            onClick={() => task && onEdit(task)}
            disabled={!task}
          >
            編集
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default TaskDetailDialog
