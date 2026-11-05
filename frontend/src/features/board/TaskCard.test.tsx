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

  it('緊急度が高のときは、タイトルの前に「高」のバッジを出す', () => {
    render(<TaskCard task={makeTask({ title: '資料作成', urgency: 'HIGH' })} />)

    expect(screen.getByText('高')).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent('緊急度高資料作成')
  })

  it('緊急度が中のときは、タイトルの前に「中」のバッジを出す', () => {
    render(
      <TaskCard
        task={makeTask({ title: 'レポート提出', urgency: 'MEDIUM' })}
      />,
    )

    expect(screen.getByRole('listitem')).toHaveTextContent(
      '緊急度中レポート提出',
    )
  })

  it('緊急度が通常のときは、バッジを出さない', () => {
    render(<TaskCard task={makeTask({ title: '掃除', urgency: 'NORMAL' })} />)

    expect(screen.queryByText('緊急度')).not.toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent(/^掃除/)
  })

  it('省略されても全文が分かるよう、タイトルをツールチップに出す', () => {
    render(<TaskCard task={makeTask({ title: 'とても長いタイトル' })} />)

    expect(screen.getByRole('listitem')).toHaveAttribute(
      'title',
      'とても長いタイトル',
    )
  })
})
