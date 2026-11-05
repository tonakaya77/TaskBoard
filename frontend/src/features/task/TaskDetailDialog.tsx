import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef } from 'react'
import { deleteTask, getTask } from '../../api/tasks'
import { queryKeys } from '../../api/queryKeys'
import type { Project, Status, Task } from '../../api/types'
import { formatDueDate } from '../board/formatDueDate'
import styles from './TaskDetailDialog.module.css'
// ダイアログの枠・ボタンの見た目は、タスク作成・編集ダイアログと揃える
import dialogStyles from './TaskFormDialog.module.css'
import { type BadgeUrgency, URGENCY_LABELS, badgeUrgency } from './urgency'

type Props = {
  taskId: number
  project: Project
  statuses: Status[]
  onEdit: (task: Task) => void
  onClose: () => void
}

/** 緊急度ごとの、バッジの色 */
const badgeClassNames: Record<BadgeUrgency, string> = {
  HIGH: styles.high,
  MEDIUM: styles.medium,
}

/**
 * タスク詳細ダイアログ（S-05）。内容を表示し、「編集」でタスク作成・編集（S-06）を開く。
 * 「削除」は確認してからタスクを削除し、ダイアログを閉じる（UC-11）。
 * サブタスク・期限アラートは、まだ作っていない。
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
  const queryClient = useQueryClient()

  // 編集で保存したあとに読み直されるよう、キーは queryKeys.tasks の下にある
  const {
    data: task,
    isPending,
    isError,
  } = useQuery({
    queryKey: queryKeys.task(taskId),
    queryFn: () => getTask(taskId),
  })

  const deletion = useMutation({
    mutationFn: () => deleteTask(taskId),
    onSuccess: () => {
      // 先に閉じてから読み直す。開いたままだと、消したタスクの詳細まで読み直して 404 になる
      onClose()
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })

  function requestDelete() {
    if (window.confirm('このタスクを削除しますか？')) deletion.mutate()
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const statusName = statuses.find((s) => s.id === task?.statusId)?.name
  // 通常と、完了ステータスのタスクには、緊急度を出さない
  const badge = task ? badgeUrgency(task, project.doneStatusId) : null

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
                <span className={`${styles.badge} ${badgeClassNames[badge]}`}>
                  <span className={styles.srOnly}>緊急度</span>
                  {URGENCY_LABELS[badge]}
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
          {deletion.isError && (
            <p className={dialogStyles.errorBox} role="alert">
              削除できませんでした。もう一度お試しください
            </p>
          )}
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

        <div className={`${dialogStyles.foot} ${styles.foot}`}>
          <button
            type="button"
            className={`${dialogStyles.button} ${styles.danger}`}
            onClick={requestDelete}
            disabled={!task || deletion.isPending}
          >
            削除
          </button>
          <button
            type="button"
            className={`${dialogStyles.button} ${dialogStyles.primary}`}
            onClick={() => task && onEdit(task)}
            disabled={!task || deletion.isPending}
          >
            編集
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default TaskDetailDialog
