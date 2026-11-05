import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeTask } from '../../test/fixtures'
import TaskCard from './TaskCard'

describe('TaskCard', () => {
  it('タイトルと期限を表示する', () => {
    render(
      <TaskCard
        task={makeTask({ title: '資料作成', dueDate: '2026-11-03' })}
      />,
    )

    expect(screen.getByText('資料作成')).toBeInTheDocument()
    expect(screen.getByText('11/03')).toBeInTheDocument()
  })

  it('期限がないときは「期限なし」と表示する', () => {
    render(
      <TaskCard task={makeTask({ title: '振り返りを書く', dueDate: null })} />,
    )

    expect(screen.getByText('期限なし')).toBeInTheDocument()
  })

  it('省略されても全文が分かるよう、タイトルをツールチップに出す', () => {
    render(<TaskCard task={makeTask({ title: 'とても長いタイトル' })} />)

    expect(screen.getByRole('listitem')).toHaveAttribute(
      'title',
      'とても長いタイトル',
    )
  })
})
