import { describe, expect, it } from 'vitest'
import { makeTask } from '../../test/fixtures'
import { moveCard } from './moveCard'

const a = makeTask({ id: 1, statusId: 1, title: 'A' })
const b = makeTask({ id: 2, statusId: 1, title: 'B' })
const c = makeTask({ id: 3, statusId: 1, title: 'C' })
const x = makeTask({ id: 4, statusId: 2, title: 'X' })
const y = makeTask({ id: 5, statusId: 2, title: 'Y' })

function titles(tasks: { title: string }[]) {
  return tasks.map((t) => t.title)
}

describe('moveCard', () => {
  it('同じ列の中で、下から上へ動かす', () => {
    const column = [a, b, c]
    const { source, destination } = moveCard(
      column,
      column,
      { statusId: 1, index: 2 },
      { statusId: 1, index: 0 },
    )

    expect(titles(source)).toEqual(['C', 'A', 'B'])
    expect(destination).toBe(source)
  })

  it('同じ列の中で、上から下へ動かす', () => {
    const column = [a, b, c]
    const { source } = moveCard(
      column,
      column,
      { statusId: 1, index: 0 },
      { statusId: 1, index: 1 },
    )

    expect(titles(source)).toEqual(['B', 'A', 'C'])
  })

  it('別の列の先頭・途中・末尾へ動かすと、ステータスも先の列になる', () => {
    const from = { statusId: 1, index: 1 }

    const top = moveCard([a, b, c], [x, y], from, { statusId: 2, index: 0 })
    expect(titles(top.source)).toEqual(['A', 'C'])
    expect(titles(top.destination)).toEqual(['B', 'X', 'Y'])
    expect(top.destination[0].statusId).toBe(2)

    const middle = moveCard([a, b, c], [x, y], from, { statusId: 2, index: 1 })
    expect(titles(middle.destination)).toEqual(['X', 'B', 'Y'])

    const bottom = moveCard([a, b, c], [x, y], from, { statusId: 2, index: 2 })
    expect(titles(bottom.destination)).toEqual(['X', 'Y', 'B'])
  })

  it('空の列へ動かせる', () => {
    const { source, destination } = moveCard(
      [a],
      [],
      { statusId: 1, index: 0 },
      { statusId: 2, index: 0 },
    )

    expect(source).toEqual([])
    expect(titles(destination)).toEqual(['A'])
  })

  it('渡した配列は変えない', () => {
    const column = [a, b, c]
    const other = [x, y]
    moveCard(
      column,
      other,
      { statusId: 1, index: 0 },
      { statusId: 2, index: 0 },
    )

    expect(titles(column)).toEqual(['A', 'B', 'C'])
    expect(titles(other)).toEqual(['X', 'Y'])
    expect(a.statusId).toBe(1)
  })
})
