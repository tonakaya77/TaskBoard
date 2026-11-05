import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '../../api/types'
import { makeTask } from '../../test/fixtures'
import { useMoveTask } from './useMoveTask'

const a = makeTask({ id: 1, statusId: 1, title: 'A' })
const b = makeTask({ id: 2, statusId: 1, title: 'B' })
const x = makeTask({ id: 3, statusId: 2, title: 'X' })

/**
 * 列のキャッシュに A・B（未着手）と X（進行中）を入れて、フックを描く。
 * 移動 API は、resolve を呼ぶまで返事をしない（そのあいだの画面を確かめるため）。
 */
function setup(status = 200) {
  let resolve: () => void = () => {}
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((r) => {
        resolve = () =>
          r(
            status === 200
              ? Response.json(makeTask({ id: 2, statusId: 2 }))
              : new Response(null, { status }),
          )
      }),
  )
  vi.stubGlobal('fetch', fetchMock)

  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  queryClient.setQueryData(['tasks', 'status', 1], [a, b])
  queryClient.setQueryData(['tasks', 'status', 2], [x])

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useMoveTask(), { wrapper })

  function column(statusId: number) {
    return queryClient
      .getQueryData<Task[]>(['tasks', 'status', statusId])
      ?.map((t) => t.title)
  }

  return { result, fetchMock, column, respond: () => resolve() }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useMoveTask', () => {
  it('保存を待たずに、すぐ列の並びを変える', async () => {
    const { result, column, respond } = setup()

    act(() => {
      result.current.mutate({
        taskId: 2,
        from: { statusId: 1, index: 1 },
        to: { statusId: 2, index: 0 },
      })
    })

    await waitFor(() => expect(column(2)).toEqual(['B', 'X']))
    expect(column(1)).toEqual(['A'])

    respond()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('移動 API に、先の列と位置を送る', async () => {
    const { result, fetchMock, respond } = setup()

    act(() => {
      result.current.mutate({
        taskId: 2,
        from: { statusId: 1, index: 1 },
        to: { statusId: 2, index: 0 },
      })
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    respond()

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe('/api/tasks/2/position')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(String(init.body))).toEqual({ statusId: 2, index: 0 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('保存に失敗したら、元の列と位置に戻す', async () => {
    const { result, column, respond } = setup(500)

    act(() => {
      result.current.mutate({
        taskId: 2,
        from: { statusId: 1, index: 1 },
        to: { statusId: 2, index: 0 },
      })
    })
    await waitFor(() => expect(column(2)).toEqual(['B', 'X']))

    respond()
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(column(1)).toEqual(['A', 'B'])
    expect(column(2)).toEqual(['X'])
  })

  it('同じ列の中で並べ替えて失敗したときも、元の並びに戻す', async () => {
    const { result, column, respond } = setup(500)

    act(() => {
      result.current.mutate({
        taskId: 2,
        from: { statusId: 1, index: 1 },
        to: { statusId: 1, index: 0 },
      })
    })
    await waitFor(() => expect(column(1)).toEqual(['B', 'A']))

    respond()
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(column(1)).toEqual(['A', 'B'])
  })
})
