import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Task } from '../../api/types'
import { makeTask } from '../../test/fixtures'
import TaskCard from './TaskCard'

/** カードはドラッグ＆ドロップの列の中でしか描けないので、列で包んで描く */
const DONE_STATUS_ID = 4

function renderCard(task: Task, onClick?: () => void) {
  render(
    <DragDropContext onDragEnd={() => {}}>
      <Droppable droppableId="1">
        {(provided) => (
          <ul ref={provided.innerRef} {...provided.droppableProps}>
            <TaskCard
              task={task}
              index={0}
              doneStatusId={DONE_STATUS_ID}
              onClick={onClick}
            />
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>,
  )
}

describe('TaskCard', () => {
  it('タイトルと期限を表示する', () => {
    renderCard(makeTask({ title: '資料作成', dueDate: '2026-11-03' }))

    expect(screen.getByText('資料作成')).toBeInTheDocument()
    expect(screen.getByText('11/03')).toBeInTheDocument()
  })

  it('期限がないときは「期限なし」と表示する', () => {
    renderCard(makeTask({ title: '振り返りを書く', dueDate: null }))

    expect(screen.getByText('期限なし')).toBeInTheDocument()
  })

  it('緊急度が高のときは、タイトルの前に「高」のバッジを出す', () => {
    renderCard(makeTask({ title: '資料作成', urgency: 'HIGH' }))

    expect(screen.getByText('高')).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent('緊急度高資料作成')
  })

  it('緊急度が中のときは、タイトルの前に「中」のバッジを出す', () => {
    renderCard(makeTask({ title: 'レポート提出', urgency: 'MEDIUM' }))

    expect(screen.getByRole('listitem')).toHaveTextContent(
      '緊急度中レポート提出',
    )
  })

  it('緊急度が通常のときは、バッジを出さない', () => {
    renderCard(makeTask({ title: '掃除', urgency: 'NORMAL' }))

    expect(screen.queryByText('緊急度')).not.toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent(/^掃除/)
  })

  it('完了ステータスのタスクには、緊急度が高でもバッジと色帯を出さない', () => {
    renderCard(
      makeTask({
        title: '参考書を買う',
        urgency: 'HIGH',
        statusId: DONE_STATUS_ID,
      }),
    )

    expect(screen.queryByText('緊急度')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /参考書を買う/ }),
    ).not.toHaveClass(/high/)
  })

  it('完了以外のステータスに戻すと、また緊急度を出す', () => {
    renderCard(
      makeTask({ title: '参考書を買う', urgency: 'HIGH', statusId: 2 }),
    )

    expect(screen.getByRole('listitem')).toHaveTextContent(
      '緊急度高参考書を買う',
    )
    expect(screen.getByRole('button', { name: /参考書を買う/ })).toHaveClass(
      /high/,
    )
  })

  it('押すと onClick を呼ぶ', () => {
    const onClick = vi.fn()
    renderCard(makeTask({ title: '資料作成' }), onClick)

    fireEvent.click(screen.getByRole('button', { name: /資料作成/ }))

    expect(onClick).toHaveBeenCalled()
  })

  it('省略されても全文が分かるよう、タイトルをツールチップに出す', () => {
    renderCard(makeTask({ title: 'とても長いタイトル' }))

    expect(screen.getByRole('listitem')).toHaveAttribute(
      'title',
      'とても長いタイトル',
    )
  })
})
