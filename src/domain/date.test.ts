import { describe, expect, it } from 'vitest'
import {
  getCurrentMonthInfo,
  getDateInMonth,
  getMonthEndKey,
  getMonthStartKey,
  isDateKey,
  isMonthKey,
} from './date'

describe('date utilities', () => {
  it('validates plain date and month keys', () => {
    expect(isDateKey('2024-02-29')).toBe(true)
    expect(isDateKey('2024-02-30')).toBe(false)
    expect(isMonthKey('2024-12')).toBe(true)
    expect(isMonthKey('2024-13')).toBe(false)
  })

  it('calculates calendar month boundaries', () => {
    expect(getMonthStartKey('2026-05')).toBe('2026-05-01')
    expect(getMonthEndKey('2026-05')).toBe('2026-05-31')
    expect(getMonthEndKey('2024-02')).toBe('2024-02-29')
  })

  it('clamps overflowing day-of-month schedules to month end', () => {
    expect(getDateInMonth('2024-02', 31)).toBe('2024-02-29')
    expect(getDateInMonth('2026-04', 31)).toBe('2026-04-30')
  })

  it('returns current month information from a supplied date', () => {
    expect(getCurrentMonthInfo(new Date(2026, 4, 25))).toEqual({
      monthKey: '2026-05',
      startsOn: '2026-05-01',
      endsOn: '2026-05-31',
      daysInMonth: 31,
    })
  })
})
