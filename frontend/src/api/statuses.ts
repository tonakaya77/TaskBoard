import { fetchJson } from './client'
import type { Status } from './types'

/** プロジェクトのステータス（ボードの列）を並び順で取得する。 */
export function getStatuses(projectId: number): Promise<Status[]> {
  return fetchJson<Status[]>(`/api/projects/${projectId}/statuses`)
}
