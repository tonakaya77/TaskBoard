import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeProject, makeStatus, makeTask } from '../../test/fixtures'
import TaskFormDialog from './TaskFormDialog'

const statuses = [
  makeStatus({ id: 1, name: '未着手', position: 1 }),
  makeStatus({ id: 2, name: '進行中', position: 2 }),
  makeStatus({ id: 3, name: '完了', position: 3 }),
]

/** タスクの登録 API を差し替える。送った JSON をそのままタスクにして返す。 */
function mockCreateApi(status = 201) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (status !== 201) return new Response(null, { status })
    const body = JSON.parse(String(init?.body))
    return Response.json(makeTask({ id: 10, ...body }), { status: 201 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderDialog() {
  const onClose = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <TaskFormDialog
        // 初期ステータスは、並び順の1番目ではなく ID で決まる
        project={makeProject({ id: 1, defaultStatusId: 2 })}
        statuses={statuses}
        onClose={onClose}
      />
    </QueryClientProvider>,
  )
  return { onClose }
}

function titleInput() {
  return screen.getByLabelText(/タイトル/)
}

function descriptionInput() {
  return screen.getByLabelText(/説明/)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('TaskFormDialog', () => {
  it('作成の見出しと、入力欄の初期値を出す', () => {
    renderDialog()

    expect(
      screen.getByRole('dialog', { name: 'タスクを追加' }),
    ).toBeInTheDocument()
    expect(titleInput()).toHaveValue('')
    expect(descriptionInput()).toHaveValue('')
    expect(screen.getByLabelText('期限')).toHaveValue('')
    // 緊急度は通常、ステータスはプロジェクトの初期ステータス
    expect(screen.getByRole('button', { name: '通常' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: '高' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByLabelText('ステータス')).toHaveValue('2')
  })

  it('タイトルが空のときは、エラーを出して保存しない', () => {
    const fetchMock = mockCreateApi()
    renderDialog()

    fireEvent.change(titleInput(), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByText('タイトルを入力してください')).toBeInTheDocument()
    expect(titleInput()).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('文字数を超えたときは、エラーを出して保存しない', () => {
    const fetchMock = mockCreateApi()
    renderDialog()

    fireEvent.change(titleInput(), { target: { value: 'あ'.repeat(51) } })
    fireEvent.change(descriptionInput(), {
      target: { value: 'い'.repeat(1001) },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(
      screen.getByText('タイトルは50文字以内で入力してください'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('説明は1000文字以内で入力してください'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('入力した内容で登録して、閉じる', async () => {
    const fetchMock = mockCreateApi()
    const { onClose } = renderDialog()

    fireEvent.change(titleInput(), { target: { value: '発表準備' } })
    fireEvent.change(descriptionInput(), {
      target: { value: 'スライドを作る' },
    })
    fireEvent.change(screen.getByLabelText('期限'), {
      target: { value: '2026-11-20' },
    })
    fireEvent.click(screen.getByRole('button', { name: '高' }))
    fireEvent.change(screen.getByLabelText('ステータス'), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/projects/1/tasks')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      title: '発表準備',
      description: 'スライドを作る',
      dueDate: '2026-11-20',
      urgency: 'HIGH',
      statusId: 3,
    })
  })

  it('説明と期限が空のときは、なしとして送る', async () => {
    const fetchMock = mockCreateApi()
    const { onClose } = renderDialog()

    fireEvent.change(titleInput(), { target: { value: 'メモ' } })
    fireEvent.change(screen.getByLabelText('期限'), {
      target: { value: '2026-11-20' },
    })
    fireEvent.click(screen.getByRole('button', { name: '期限なし' }))
    expect(screen.getByLabelText('期限')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      title: 'メモ',
      description: null,
      dueDate: null,
      urgency: 'NORMAL',
      statusId: 2,
    })
  })

  it('保存に失敗したときは、エラーを出して閉じない', async () => {
    mockCreateApi(500)
    const { onClose } = renderDialog()

    fireEvent.change(titleInput(), { target: { value: '発表準備' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'タスクを保存できませんでした',
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('何も変えていないときは、確認なしでキャンセルできる', () => {
    const confirm = vi.spyOn(window, 'confirm')
    const { onClose } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(confirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('変更があるときは未保存の確認を出し、取り消したら閉じない', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { onClose } = renderDialog()

    fireEvent.change(titleInput(), { target: { value: '書きかけ' } })
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }))

    expect(confirm).toHaveBeenCalledWith(
      '変更が保存されていません。閉じてもよいですか？',
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Esc でも未保存の確認を出し、OK なら閉じる', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { onClose } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: '中' }))
    // Esc を押すと、ブラウザは dialog に cancel イベントを送る
    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { cancelable: true }),
    )

    expect(confirm).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
