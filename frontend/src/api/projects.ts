import { fetchJson } from './client'
import type { Project } from './types'

/** プロジェクトを1件取得する。初期ステータス・完了ステータスの ID も入っている。 */
export function getProject(projectId: number): Promise<Project> {
  return fetchJson<Project>(`/api/projects/${projectId}`)
}
