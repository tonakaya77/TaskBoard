// バックエンドの API が返す JSON の形。項目はバックエンドの record と同じ。
// 日付は JSON では文字列（日付は "2026-11-03"、日時は ISO 8601）。

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
