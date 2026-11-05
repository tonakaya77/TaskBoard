// バックエンドの API が返す JSON の形。項目はバックエンドの record と同じ。
// 日付は JSON では文字列（日付は "2026-11-03"、日時は ISO 8601）。

/** プロジェクト。backend の Project.java。初期ステータス・完了ステータスは ID で判断する */
export type Project = {
  id: number
  userId: number
  title: string
  color: string
  defaultStatusId: number | null
  doneStatusId: number | null
  createdAt: string
  updatedAt: string
}

/** ステータス（ボードの列）。backend の Status.java */
export type Status = {
  id: number
  projectId: number
  name: string
  position: number
  createdAt: string
  updatedAt: string
}

/** 緊急度。backend の Urgency.java（高・中・通常） */
export type Urgency = 'HIGH' | 'MEDIUM' | 'NORMAL'

/** タスク。backend の Task.java */
export type Task = {
  id: number
  projectId: number
  statusId: number
  title: string
  description: string | null
  dueDate: string | null
  urgency: Urgency
  position: number
  todayDate: string | null
  todayOrder: number | null
  createdAt: string
  updatedAt: string
}

/** タスクを登録するときに送る JSON。backend の CreateTaskRequest.java */
export type CreateTaskInput = {
  title: string
  description: string | null
  dueDate: string | null
  urgency: Urgency
  statusId: number
}

/** タスクを移すときに送る JSON。backend の MoveTaskRequest.java */
export type MoveTaskInput = {
  /** 移った先のステータス。同じ列の中で並べ替えるときは、いまのステータス */
  statusId: number
  /** 移った先の列の中での位置（0 始まり）。動かすタスク自身を除いた並びに差し込む */
  index: number
}

/** タスクを更新するときに送る JSON。backend の UpdateTaskRequest.java。項目は登録と同じで、すべて送る */
export type UpdateTaskInput = CreateTaskInput
