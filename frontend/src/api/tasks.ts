import { fetchJson, postJson } from './client'
import type { CreateTaskInput, Task } from './types'

/** ステータス（ボードの列）のタスクを、列の中の並び順で取得する。 */
export function getTasksByStatus(statusId: number): Promise<Task[]> {
  return fetchJson<Task[]>(`/api/tasks/status/${statusId}`)
}

/** タスクを登録する。列の一番下に入り、登録したタスクが返る。 */
export function createTask(
  projectId: number,
  input: CreateTaskInput,
): Promise<Task> {
  return postJson<Task>(`/api/projects/${projectId}/tasks`, input)
}
