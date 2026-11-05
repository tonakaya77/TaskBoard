// TanStack Query のキャッシュのキー。キーは部品どうしで同じものを使う必要があるので、ここでまとめて作る。
// タスクに関するものは ['tasks', …] の下に置き、queryKeys.tasks で一度に読み直せるようにする。

export const queryKeys = {
  /** プロジェクト1件 */
  project: (projectId: number) => ['project', projectId] as const,
  /** プロジェクトのステータス（ボードの列） */
  statuses: (projectId: number) => ['statuses', projectId] as const,
  /** タスクに関するものすべて（列・タスク詳細）。保存したあとにまとめて読み直すときに使う */
  tasks: ['tasks'] as const,
  /** ステータス（列）のタスク一覧 */
  tasksByStatus: (statusId: number) => ['tasks', 'status', statusId] as const,
  /** タスク1件（タスク詳細） */
  task: (taskId: number) => ['tasks', taskId] as const,
}
