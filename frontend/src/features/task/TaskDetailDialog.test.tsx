import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '../../api/types'
import { makeProject, makeStatus, makeTask } from '../../test/fixtures'
import TaskDetailDialog from './TaskDetailDialog'

const statuses = [
  makeStatus({ id: 1, name: '未着手', position: 1 }),
  makeStatus({ id: 2, name: '進行中', position: 2 }),
  makeStatus({ id: 4, name: '完了', position: 3 }),
]

/** タスクを1件取得する API を差し替える。status を渡すと失敗させる */
function mockGetTask(task: Task, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      status === 200 ? Response.json(task) : new Response(null, { status }),
    ),
  )
}

function renderDialog(taskId = 1) {
  const onEdit = vi.fn()
  const onClose = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <TaskDetailDialog
        taskId={taskId}
        // 完了ステータスは ID 4
        project={makeProject({ id: 1, title: '課題', doneStatusId: 4 })}
        statuses={statuses}
        onEdit={onEdit}
        onClose={onClose}
      />
    </QueryClientProvider>,
  )
  return { onEdit, onClose }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TaskDetailDialog', () => {
  it('タイトル・プロジェクト名とステータス名・期限・説明を出す', async () => {
    mockGetTask(
      makeTask({
        id: 1,
        statusId: 2,
        title: 'レポート提出',
        description: '第3回課題の\nレポートを出す',
        dueDate: '2026-11-01',
        urgency: 'MEDIUM',
      }),
    )
    renderDialog(1)

    // 見出しは、緊急度のバッジとタイトル
    expect(
      await screen.findByRole('dialog', { name: '緊急度中レポート提出' }),
    ).toBeInTheDocument()
    expect(screen.getByText('課題 / 進行中')).toBeInTheDocument()
    expect(screen.getByText('期限 11/01')).toBeInTheDocument()
    // 改行はそのまま残す
    expect(
      screen.getByText(
        (_, el) => el?.textContent === '第3回課題の\nレポートを出す',
      ),
    ).toBeInTheDocument()
  })

  it('期限と説明がないときは「期限なし」「説明はありません」と出す', async () => {
    mockGetTask(makeTask({ id: 1, dueDate: null, description: null }))
    renderDialog(1)

    expect(await screen.findByText('説明はありません')).toBeInTheDocument()
    expect(screen.getByText('期限なし')).toBeInTheDocument()
  })

  it('緊急度が通常のときは、バッジを出さない', async () => {
    mockGetTask(makeTask({ id: 1, title: '掃除', urgency: 'NORMAL' }))
    renderDialog(1)

    expect(
      await screen.findByRole('heading', { name: '掃除' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('緊急度')).not.toBeInTheDocument()
  })

  it('完了ステータスのタスクには、緊急度のバッジを出さない', async () => {
    mockGetTask(
      makeTask({ id: 1, statusId: 4, title: '提出済み', urgency: 'HIGH' }),
    )
    renderDialog(1)

    expect(
      await screen.findByRole('heading', { name: '提出済み' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('高')).not.toBeInTheDocument()
  })

  it('「編集」を押すと、表示しているタスクを渡す', async () => {
    const task = makeTask({ id: 1, title: 'レポート提出' })
    mockGetTask(task)
    const { onEdit } = renderDialog(1)

    await screen.findByRole('heading', { name: 'レポート提出' })
    fireEvent.click(screen.getByRole('button', { name: '編集' }))

    expect(onEdit).toHaveBeenCalledWith(task)
  })

  it('×と Esc で閉じる', async () => {
    mockGetTask(makeTask({ id: 1 }))
    const { onClose } = renderDialog(1)

    fireEvent.click(await screen.findByRole('button', { name: '閉じる' }))
    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { cancelable: true }),
    )

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('タスクを取れないときは、エラーを出して編集できない', async () => {
    mockGetTask(makeTask(), 404)
    renderDialog(1)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'タスクを読み込めませんでした',
    )
    expect(screen.getByRole('button', { name: '編集' })).toBeDisabled()
  })
})
