import { describe, expect, it } from 'vitest'
import { makeTask } from '../../test/fixtures'
import { badgeUrgency } from './urgency'

const DONE = 4

describe('badgeUrgency', () => {
  it('高・中のタスクには、その緊急度を返す', () => {
    expect(badgeUrgency(makeTask({ urgency: 'HIGH', statusId: 1 }), DONE)).toBe(
      'HIGH',
    )
    expect(
      badgeUrgency(makeTask({ urgency: 'MEDIUM', statusId: 1 }), DONE),
    ).toBe('MEDIUM')
  })

  it('通常のタスクには出さない', () => {
    expect(
      badgeUrgency(makeTask({ urgency: 'NORMAL', statusId: 1 }), DONE),
    ).toBeNull()
  })

  it('完了ステータスのタスクには、高でも出さない', () => {
    expect(
      badgeUrgency(makeTask({ urgency: 'HIGH', statusId: DONE }), DONE),
    ).toBeNull()
  })

  it('完了ステータスが決まっていないプロジェクトでは、どの列でも出す', () => {
    expect(badgeUrgency(makeTask({ urgency: 'HIGH', statusId: 1 }), null)).toBe(
      'HIGH',
    )
  })
})
