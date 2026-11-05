import type { Task } from '../../api/types'

/** カードの場所。列（ステータス）の ID と、その列の中での位置（0 始まり） */
export type CardPlace = {
  statusId: number
  index: number
}

/**
 * カードを動かしたあとの、元の列と先の列のタスク一覧を作る。渡した配列は変えない。
 * 同じ列の中で動かしたときは、どちらも同じ一覧になる。
 * 先の列に入れたタスクの statusId は、先の列のものにする。
 */
export function moveCard(
  sourceTasks: Task[],
  destinationTasks: Task[],
  from: CardPlace,
  to: CardPlace,
): { source: Task[]; destination: Task[] } {
  if (from.statusId === to.statusId) {
    const tasks = [...sourceTasks]
    const [moved] = tasks.splice(from.index, 1)
    tasks.splice(to.index, 0, moved)
    return { source: tasks, destination: tasks }
  }

  const source = [...sourceTasks]
  const [moved] = source.splice(from.index, 1)
  const destination = [...destinationTasks]
  destination.splice(to.index, 0, { ...moved, statusId: to.statusId })
  return { source, destination }
}
