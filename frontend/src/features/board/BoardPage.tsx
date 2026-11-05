import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router'
import { getProject } from '../../api/projects'
import { getStatuses } from '../../api/statuses'
import TaskFormDialog from '../task/TaskFormDialog'
import BoardColumn from './BoardColumn'
import styles from './BoardPage.module.css'

/** ボード画面（S-03）。プロジェクトのステータスを列として並べる。 */
function BoardPage() {
  const projectId = Number(useParams().projectId)
  const [isCreating, setIsCreating] = useState(false)

  const {
    data: statuses,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => getStatuses(projectId),
  })

  // タスク作成ダイアログで、ステータスの初期値（初期ステータス）を決めるのに使う
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
  })

  if (isPending) return <p>読み込み中...</p>
  if (isError) return <p role="alert">ボードを読み込めませんでした</p>

  return (
    <>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setIsCreating(true)}
          disabled={!project || statuses.length === 0}
        >
          + タスクを追加
        </button>
      </div>
      <div className={styles.board}>
        {statuses.map((status) => (
          <BoardColumn key={status.id} status={status} />
        ))}
      </div>
      {isCreating && project && (
        <TaskFormDialog
          project={project}
          statuses={statuses}
          onClose={() => setIsCreating(false)}
        />
      )}
    </>
  )
}

export default BoardPage
