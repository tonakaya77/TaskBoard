import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { getStatuses } from '../../api/statuses'

/** ボード画面（S-03）。プロジェクトのステータスを列として並べる。 */
function BoardPage() {
  const projectId = Number(useParams().projectId)

  const {
    data: statuses,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => getStatuses(projectId),
  })

  if (isPending) return <p>読み込み中...</p>
  if (isError) return <p role="alert">ボードを読み込めませんでした</p>

  return (
    <div>
      {statuses.map((status) => (
        <section key={status.id}>
          <h2>{status.name}</h2>
        </section>
      ))}
    </div>
  )
}

export default BoardPage
