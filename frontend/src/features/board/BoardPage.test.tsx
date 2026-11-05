import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeProject, makeStatus, makeTask } from '../../test/fixtures'
import BoardPage from './BoardPage'

/**
 * URL ごとに返す JSON を決めて、fetch を差し替える。ないURLは 404。
 * GET 以外は「POST /api/...」のようにメソッドを付けたキーで決める。
 * 値に関数を渡すと、呼ばれるたびにその結果を返す（登録のあとで中身を変えるとき）。
 */
function mockApi(responses: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      const key = method === 'GET' ? url : `${method} ${url}`
      if (!(key in responses)) return new Response(null, { status: 404 })
      const value = responses[key]
      return Response.json(typeof value === 'function' ? value() : value)
    }),
  )
}

function renderBoard(projectId: number | string) {
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
      '/api/projects/1': makeProject({ id: 1 }),
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

  it('「+ タスクを追加」から登録すると、選んだ列の一番下にカードが出る', async () => {
    const doingTasks = [makeTask({ id: 1, statusId: 2, title: 'レポート提出' })]
    mockApi({
      '/api/projects/1': makeProject({ id: 1, defaultStatusId: 1 }),
      '/api/projects/1/statuses': [
        makeStatus({ id: 1, name: '未着手', position: 1 }),
        makeStatus({ id: 2, name: '進行中', position: 2 }),
      ],
      '/api/tasks/status/1': [],
      '/api/tasks/status/2': () => doingTasks,
      'POST /api/projects/1/tasks': () => {
        const created = makeTask({ id: 5, statusId: 2, title: '発表準備' })
        doingTasks.push(created)
        return created
      },
    })

    renderBoard(1)

    const addButton = await screen.findByRole('button', {
      name: '+ タスクを追加',
    })
    await waitFor(() => expect(addButton).toBeEnabled())
    fireEvent.click(addButton)

    const dialog = screen.getByRole('dialog', { name: 'タスクを追加' })
    fireEvent.change(within(dialog).getByLabelText(/タイトル/), {
      target: { value: '発表準備' },
    })
    fireEvent.change(within(dialog).getByLabelText('ステータス'), {
      target: { value: '2' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '保存' }))

    // ダイアログが閉じ、進行中の列の一番下に新しいカードが出る
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    const doing = screen.getByRole('region', { name: '進行中' })
    await waitFor(() =>
      expect(
        within(doing)
          .getAllByRole('listitem')
          .map((card) => card.getAttribute('title')),
      ).toEqual(['レポート提出', '発表準備']),
    )
  })

  it('カードを押すとタスク詳細を開き、編集して保存すると詳細とカードに反映される', async () => {
    let task = makeTask({
      id: 1,
      statusId: 1,
      title: 'レポート提出',
      description: '第3回課題',
    })
    mockApi({
      '/api/projects/1': makeProject({ id: 1, title: '課題' }),
      '/api/projects/1/statuses': [
        makeStatus({ id: 1, name: '未着手', position: 1 }),
        makeStatus({ id: 2, name: '進行中', position: 2 }),
      ],
      '/api/tasks/status/1': () => (task.statusId === 1 ? [task] : []),
      '/api/tasks/status/2': () => (task.statusId === 2 ? [task] : []),
      '/api/tasks/1': () => task,
      'PUT /api/tasks/1': () => {
        task = { ...task, title: 'レポート再提出', statusId: 2 }
        return task
      },
    })

    renderBoard(1)

    const todo = await screen.findByRole('region', { name: '未着手' })
    const card = await within(todo).findByRole('button', {
      name: /レポート提出/,
    })
    // プロジェクトを読み終えてから押す
    await screen.findByRole('button', { name: '+ タスクを追加' })
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '+ タスクを追加' }),
      ).toBeEnabled(),
    )
    fireEvent.click(card)

    // タスク詳細が開く
    const detail = await screen.findByRole('dialog', { name: 'レポート提出' })
    expect(within(detail).getByText('課題 / 未着手')).toBeInTheDocument()
    expect(within(detail).getByText('第3回課題')).toBeInTheDocument()

    // 「編集」で、いまの内容が入った編集ダイアログに切り替わる
    fireEvent.click(within(detail).getByRole('button', { name: '編集' }))
    const form = screen.getByRole('dialog', { name: 'タスクを編集' })
    expect(within(form).getByLabelText(/タイトル/)).toHaveValue('レポート提出')
    fireEvent.change(within(form).getByLabelText(/タイトル/), {
      target: { value: 'レポート再提出' },
    })
    fireEvent.change(within(form).getByLabelText('ステータス'), {
      target: { value: '2' },
    })
    fireEvent.click(within(form).getByRole('button', { name: '保存' }))

    // 保存するとタスク詳細に戻り、新しい内容が出る
    const updated = await screen.findByRole('dialog', {
      name: 'レポート再提出',
    })
    expect(within(updated).getByText('課題 / 進行中')).toBeInTheDocument()

    // カードは進行中の列に移る
    const doing = screen.getByRole('region', { name: '進行中' })
    await waitFor(() =>
      expect(within(doing).getByText('レポート再提出')).toBeInTheDocument(),
    )
    expect(within(todo).queryAllByRole('listitem')).toHaveLength(0)

    // ×で閉じる
    fireEvent.click(within(updated).getByRole('button', { name: '閉じる' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ステータスを取れないときは、エラーを表示する', async () => {
    mockApi({ '/api/projects/1': makeProject({ id: 1 }) })

    renderBoard(1)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ボードを読み込めませんでした',
    )
  })

  it('プロジェクトを取れないときは、エラーを表示する', async () => {
    mockApi({
      '/api/projects/1/statuses': [makeStatus({ id: 1, name: '未着手' })],
      '/api/tasks/status/1': [],
    })

    renderBoard(1)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ボードを読み込めませんでした',
    )
    expect(
      screen.queryByRole('region', { name: '未着手' }),
    ).not.toBeInTheDocument()
  })

  it('URL のプロジェクト ID が数字でないときは、API を呼ばずにエラーを表示する', async () => {
    mockApi({})

    renderBoard('abc')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ボードを読み込めませんでした',
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('列のタスクを取れないときは、その列にエラーを表示する', async () => {
    mockApi({
      '/api/projects/1': makeProject({ id: 1 }),
      '/api/projects/1/statuses': [makeStatus({ id: 1, name: '未着手' })],
    })

    renderBoard(1)

    const todo = await screen.findByRole('region', { name: '未着手' })
    expect(await within(todo).findByRole('alert')).toHaveTextContent(
      'タスクを読み込めませんでした',
    )
  })
})
