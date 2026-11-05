/**
 * 期限 "2026-11-03" をカード用の "11/03" にする。期限がないときは「期限なし」。
 * Date を通すとタイムゾーンで日付がずれることがあるので、文字列のまま切り出す。
 */
export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return '期限なし'
  const [, month, day] = dueDate.split('-')
  return `${month}/${day}`
}
