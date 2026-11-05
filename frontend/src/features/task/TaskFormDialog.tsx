import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { queryKeys } from '../../api/queryKeys'
import { createTask, updateTask } from '../../api/tasks'
import type { Project, Status, Task, Urgency } from '../../api/types'
import styles from './TaskFormDialog.module.css'
import { URGENCIES, URGENCY_LABELS } from './urgency'

type Props = {
  project: Project
  statuses: Status[]
  /** 編集するタスク。渡すと編集モード、省くと作成モード */
  task?: Task
  onClose: () => void
}

type Form = {
  title: string
  description: string
  dueDate: string
  urgency: Urgency
  statusId: number
}

type Errors = {
  title?: string
  description?: string
}

/** 文字の入力欄のチェック。モック（mock/app.js の validateText）と同じ文言 */
function validateText(
  value: string,
  label: string,
  max: number,
  required: boolean,
): string | undefined {
  if (required && value.trim() === '') return `${label}を入力してください`
  if (value.length > max) return `${label}は${max}文字以内で入力してください`
  return undefined
}

function validate(form: Form): Errors {
  return {
    title: validateText(form.title, 'タイトル', 50, true),
    description: validateText(form.description, '説明', 1000, false),
  }
}

/**
 * タスク作成・編集ダイアログ（S-06）。task を渡すと編集モードになる。
 * 作成で保存すると、選んだ列の一番下にタスクが入る。
 * 編集でステータスを変えると、移った先の列の一番下に入る。
 * 保存したら、ボードの列とタスク詳細を読み直す。
 */
function TaskFormDialog({ project, statuses, task, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const queryClient = useQueryClient()
  const id = useId()

  // 編集のときは、いまの内容を入れる。
  // 作成のときは、緊急度は通常、ステータスは初期ステータス（未着手）
  const [initial] = useState<Form>(() =>
    task
      ? {
          title: task.title,
          description: task.description ?? '',
          dueDate: task.dueDate ?? '',
          urgency: task.urgency,
          statusId: task.statusId,
        }
      : {
          title: '',
          description: '',
          dueDate: '',
          urgency: 'NORMAL',
          statusId: project.defaultStatusId ?? statuses[0].id,
        },
  )
  const [form, setForm] = useState<Form>(initial)
  const [errors, setErrors] = useState<Errors>({})

  const mutation = useMutation({
    mutationFn: () => {
      const input = {
        title: form.title,
        description: form.description === '' ? null : form.description,
        dueDate: form.dueDate === '' ? null : form.dueDate,
        urgency: form.urgency,
        statusId: form.statusId,
      }
      return task ? updateTask(task.id, input) : createTask(project.id, input)
    },
    onSuccess: async () => {
      // ステータスを変えたときは移る前と後の両方の列が変わるので、
      // タスクに関するもの（列・タスク詳細）をまとめて読み直す
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      onClose()
    },
  })

  // 開いたときにモーダルで表示し、タイトルの入力欄にカーソルを置く
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /** キャンセル・×・Esc で閉じるとき。変更があれば未保存の確認を出す */
  function requestClose() {
    const dirty = JSON.stringify(form) !== JSON.stringify(initial)
    if (
      dirty &&
      !window.confirm('変更が保存されていません。閉じてもよいですか？')
    ) {
      return
    }
    onClose()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next = validate(form)
    setErrors(next)
    if (next.title || next.description) return
    mutation.mutate()
  }

  const titleId = `${id}-title`
  const descId = `${id}-desc`
  const dueId = `${id}-due`
  const statusId = `${id}-status`
  const urgencyLabelId = `${id}-urgency`

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={`${id}-heading`}
      // Esc で閉じるときも、未保存の確認を通す
      onCancel={(e) => {
        e.preventDefault()
        requestClose()
      }}
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.head}>
          <h2 id={`${id}-heading`} className={styles.heading}>
            {task ? 'タスクを編集' : 'タスクを追加'}
          </h2>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="閉じる"
            onClick={requestClose}
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label htmlFor={titleId}>
              タイトル <span className={styles.note}>（必須・50文字まで）</span>
            </label>
            <input
              id={titleId}
              className={styles.input}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? `${titleId}-err` : undefined}
              autoFocus
            />
            {errors.title && (
              <p id={`${titleId}-err`} className={styles.error}>
                {errors.title}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor={descId}>
              説明 <span className={styles.note}>（1000文字まで）</span>
            </label>
            <textarea
              id={descId}
              className={styles.input}
              rows={4}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={
                errors.description ? `${descId}-err` : undefined
              }
            />
            {errors.description && (
              <p id={`${descId}-err`} className={styles.error}>
                {errors.description}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor={dueId}>期限</label>
            <div className={styles.dueRow}>
              <input
                id={dueId}
                type="date"
                className={styles.input}
                value={form.dueDate}
                onChange={(e) => update('dueDate', e.target.value)}
              />
              <button
                type="button"
                className={styles.button}
                onClick={() => update('dueDate', '')}
              >
                期限なし
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <span id={urgencyLabelId} className={styles.label}>
              緊急度
            </span>
            <div
              role="group"
              aria-labelledby={urgencyLabelId}
              className={styles.urgency}
            >
              {/* 左から高・中・通常（画面設計 S-06） */}
              {URGENCIES.map((urgency) => (
                <button
                  key={urgency}
                  type="button"
                  className={styles.button}
                  aria-pressed={form.urgency === urgency}
                  onClick={() => update('urgency', urgency)}
                >
                  {URGENCY_LABELS[urgency]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor={statusId}>ステータス</label>
            <select
              id={statusId}
              className={`${styles.input} ${styles.select}`}
              value={form.statusId}
              onChange={(e) => update('statusId', Number(e.target.value))}
            >
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          {mutation.isError && (
            <p className={styles.errorBox} role="alert">
              タスクを保存できませんでした。時間をおいてもう一度お試しください
            </p>
          )}
        </div>

        <div className={styles.foot}>
          <button
            type="button"
            className={styles.button}
            onClick={requestClose}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className={`${styles.button} ${styles.primary}`}
            disabled={mutation.isPending}
          >
            保存
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default TaskFormDialog
