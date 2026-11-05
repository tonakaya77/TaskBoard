import type { Task, Urgency } from '../../api/types'

/** 緊急度の画面での呼び名 */
export const URGENCY_LABELS: Record<Urgency, string> = {
  HIGH: '高',
  MEDIUM: '中',
  NORMAL: '通常',
}

/** 緊急度の並び。選ぶボタンはこの順に左から並べる（画面設計 S-06） */
export const URGENCIES: readonly Urgency[] = ['HIGH', 'MEDIUM', 'NORMAL']

/** バッジと色帯を出す緊急度 */
export type BadgeUrgency = Exclude<Urgency, 'NORMAL'>

/**
 * タスクに出す緊急度のバッジ（と色帯）。出さないときは null（機能設計 F-11）。
 * 通常のタスクと、完了ステータスのタスクには出さない。緊急度の値はそのまま残るので、未完了に戻すとまた出る。
 */
export function badgeUrgency(
  task: Pick<Task, 'urgency' | 'statusId'>,
  doneStatusId: number | null,
): BadgeUrgency | null {
  if (task.urgency === 'NORMAL' || task.statusId === doneStatusId) return null
  return task.urgency
}
