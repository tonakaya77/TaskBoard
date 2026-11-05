import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeStatus, makeTask } from '../../test/fixtures'
import BoardPage from './BoardPage'

/** URL ごとに返す JSON を決めて、fetch を差し替える。ないURLは 404。 */
function mockApi(responses: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url in responses
        ? Response.json(responses[url])
        : new Response(null, { status: 404 }),
    ),
  )
}

function renderBoard(projectId: number) {
  // テストでは失敗をすぐ表示させたいので、やり直しをしない
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/projects/${projectId}/board`]}>
        <Routes>
          <Route path="/projects/:projectId/board" element={<BoardPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BoardPage', () => {
  it('ステータスの列に、件数とタスクのカードを並べる', async () => {
    mockApi({
      '/api/projects/1/statuses': [
        makeStatus({ id: 1, name: '未着手', position: 1 }),
        makeStatus({ id: 2, name: '進行中', position: 2 }),
        makeStatus({ id: 3, name: '確認中', position: 3 }),
      ],
      '/api/tasks/status/1': [
        makeTask({
          id: 3,
          statusId: 1,
          title: '資料作成',
          dueDate: '2026-11-03',
        }),
        makeTask({ id: 4, statusId: 1, title: '振り返りを書く' }),
      ],
      '/api/tasks/status/2': [
        makeTask({
          id: 1,
          statusId: 2,
          title: 'レポート提出',
          dueDate: '2026-11-01',
        }),
      ],
      '/api/tasks/status/3': [],
    })

    renderBoard(1)

    // 列は並び順に出る
    expect(
      await screen.findByRole('heading', { name: '未着手 (2)' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual([
      '未着手 (2)',
      '進行中 (1)',
      '確認中 (0)',
    ])

    // カードは自分の列に入り、列の中の順に並ぶ
    const todo = screen.getByRole('region', { name: '未着手' })
    expect(
      within(todo)
        .getAllByRole('listitem')
        .map((card) => card.getAttribute('title')),
    ).toEqual(['資料作成', '振り返りを書く'])
    expect(within(todo).getByText('11/03')).toBeInTheDocument()
    expect(within(todo).getByText('期限なし')).toBeInTheDocument()

    const doing = screen.getByRole('region', { name: '進行中' })
    expect(within(doing).getByText('レポート提出')).toBeInTheDocument()

    const review = screen.getByRole('region', { name: '確認中' })
    expect(within(review).queryAllByRole('listitem')).toHaveLength(0)
  })

  it('ステータスを取れないときは、エラーを表示する', async () => {
    mockApi({})

    renderBoard(1)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ボードを読み込めませんでした',
    )
  })

  it('列のタスクを取れないときは、その列にエラーを表示する', async () => {
    mockApi({
      '/api/projects/1/statuses': [makeStatus({ id: 1, name: '未着手' })],
    })

    renderBoard(1)

    const todo = await screen.findByRole('region', { name: '未着手' })
    expect(await within(todo).findByRole('alert')).toHaveTextContent(
      'タスクを読み込めませんでした',
    )
  })
})
