import { describe, expect, it } from 'vitest'
import {
  getRecurringItemScheduledDate,
  isRecurringItemCandidateForMonth,
  normalizeRecurringItemInput,
} from './recurring'
import type { RecurringItem } from './types'

describe('recurring domain', () => {
  it('clamps day 31 schedules to the last day of February', () => {
    expect(
      getRecurringItemScheduledDate(createRecurringItem({ dayOfMonth: 31 }), '2024-02'),
    ).toBe('2024-02-29')
    expect(
      getRecurringItemScheduledDate(createRecurringItem({ dayOfMonth: 31 }), '2026-02'),
    ).toBe('2026-02-28')
  })

  it('calculates lastDayOfMonth schedules from the target month', () => {
    expect(
      getRecurringItemScheduledDate(
        createRecurringItem({ scheduleType: 'lastDayOfMonth', dayOfMonth: undefined }),
        '2026-04',
      ),
    ).toBe('2026-04-30')
  })

  it('does not select candidates before startMonth or after endMonth', () => {
    const item = createRecurringItem({ startMonth: '2026-03', endMonth: '2026-05' })

    expect(isRecurringItemCandidateForMonth(item, '2026-02')).toBe(false)
    expect(isRecurringItemCandidateForMonth(item, '2026-03')).toBe(true)
    expect(isRecurringItemCandidateForMonth(item, '2026-05')).toBe(true)
    expect(isRecurringItemCandidateForMonth(item, '2026-06')).toBe(false)
  })

  it('validates MVP recurring expense input', () => {
    expect(
      normalizeRecurringItemInput({
        name: '월세',
        type: 'expense',
        amount: '500,000',
        categoryId: 'category-expense-housing',
        accountId: 'account-bank-account',
        scheduleType: 'dayOfMonth',
        dayOfMonth: '31',
        startMonth: '2026-01',
        active: true,
      }),
    ).toMatchObject({
      name: '월세',
      amount: 500000,
      dayOfMonth: 31,
      startMonth: '2026-01',
    })
  })
})

function createRecurringItem(
  override: Partial<RecurringItem> = {},
): RecurringItem {
  return {
    id: 'recurring-rent',
    name: '월세',
    type: 'expense',
    amount: 500000,
    categoryId: 'category-expense-housing',
    accountId: 'account-bank-account',
    scheduleType: 'dayOfMonth',
    dayOfMonth: 25,
    overflowPolicy: 'clampToLastDay',
    startMonth: '2026-01',
    active: true,
    autoCreate: false,
    revision: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    localRevision: 1,
    ...override,
  }
}
