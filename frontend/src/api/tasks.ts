import { fetchJson, postJson, putJson } from './client'
import type {
  CreateTaskInput,
  MoveTaskInput,
  Task,
  UpdateTaskInput,
} from './types'

/** ステータス（ボードの列）のタスクを、列の中の並び順で取得する。 */
export function getTasksByStatus(statusId: number): Promise<Task[]> {
  return fetchJson<Task[]>(`/api/tasks/status/${statusId}`)
}

/** タスクを1件取得する。 */
export function getTask(taskId: number): Promise<Task> {
  return fetchJson<Task>(`/api/tasks/${taskId}`)
}

/** タスクを登録する。列の一番下に入り、登録したタスクが返る。 */
export function createTask(
  projectId: number,
  input: CreateTaskInput,
): Promise<Task> {
  return postJson<Task>(`/api/projects/${projectId}/tasks`, input)
}

/** タスクの内容を置き換える。ステータスを変えると、移った先の列の一番下に入る。 */
export function updateTask(
  taskId: number,
  input: UpdateTaskInput,
): Promise<Task> {
  return putJson<Task>(`/api/tasks/${taskId}`, input)
}

/** タスクを、指定した列の指定した位置へ移す（ボードのドラッグ＆ドロップ）。 */
export function moveTask(taskId: number, input: MoveTaskInput): Promise<Task> {
  return putJson<Task>(`/api/tasks/${taskId}/position`, input)
}
