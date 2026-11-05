import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../api/queryKeys'
import { moveTask } from '../../api/tasks'
import type { Task } from '../../api/types'
import { type CardPlace, moveCard } from './moveCard'

type Variables = {
  taskId: number
  from: CardPlace
  to: CardPlace
}

/**
 * ボードのカードを動かす（UC-12）。
 * 保存を待たずにすぐ画面の並びを変え、保存に失敗したら元の列と位置に戻す。
 * 終わったら、タスクに関するもの（列・タスク詳細）を読み直す。
 */
export function useMoveTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, to }: Variables) =>
      moveTask(taskId, { statusId: to.statusId, index: to.index }),

    onMutate: async ({ from, to }) => {
      // 読み込み中の結果で、動かした並びが上書きされないように止める
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasksByStatus(from.statusId),
      })
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasksByStatus(to.statusId),
      })

      const previousSource =
        queryClient.getQueryData<Task[]>(
          queryKeys.tasksByStatus(from.statusId),
        ) ?? []
      const previousDestination =
        queryClient.getQueryData<Task[]>(
          queryKeys.tasksByStatus(to.statusId),
        ) ?? []

      const { source, destination } = moveCard(
        previousSource,
        previousDestination,
        from,
        to,
      )
      queryClient.setQueryData(queryKeys.tasksByStatus(from.statusId), source)
      queryClient.setQueryData(
        queryKeys.tasksByStatus(to.statusId),
        destination,
      )

      return { previousSource, previousDestination }
    },

    onError: (_error, { from, to }, context) => {
      if (!context) return
      // 元の列と位置に戻す
      queryClient.setQueryData(
        queryKeys.tasksByStatus(from.statusId),
        context.previousSource,
      )
      if (from.statusId !== to.statusId) {
        queryClient.setQueryData(
          queryKeys.tasksByStatus(to.statusId),
          context.previousDestination,
        )
      }
    },

    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
  })
}
