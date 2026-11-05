import { fetchJson } from './client'
import type { Task } from './types'

/** ステータス（ボードの列）のタスクを、列の中の並び順で取得する。 */
export function getTasksByStatus(statusId: number): Promise<Task[]> {
  return fetchJson<Task[]>(`/api/tasks/status/${statusId}`)
}
