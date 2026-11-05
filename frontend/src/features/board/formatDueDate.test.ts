import { describe, expect, it } from 'vitest'
import { formatDueDate } from './formatDueDate'

describe('formatDueDate', () => {
  it('期限を 月/日 にする', () => {
    expect(formatDueDate('2026-11-03')).toBe('11/03')
  })

  it('期限がないときは「期限なし」', () => {
    expect(formatDueDate(null)).toBe('期限なし')
  })
})
