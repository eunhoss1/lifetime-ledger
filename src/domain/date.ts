import { format, getDate, isValid, lastDayOfMonth } from 'date-fns'
import type { ISODateString, MonthKey, RecurringScheduleType } from './types'

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/

export function toDateKey(date = new Date()): ISODateString {
  return format(date, 'yyyy-MM-dd')
}

export function toMonthKey(date = new Date()): MonthKey {
  return format(date, 'yyyy-MM')
}

export function dateKeyToMonthKey(dateKey: ISODateString): MonthKey {
  if (!isDateKey(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`)
  }

  return dateKey.slice(0, 7)
}

export function isDateKey(value: string): value is ISODateString {
  if (!DATE_KEY_PATTERN.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return (
    isValid(date) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export function isMonthKey(value: string): value is MonthKey {
  if (!MONTH_KEY_PATTERN.test(value)) {
    return false
  }

  const [year, month] = value.split('-').map(Number)

  return Number.isInteger(year) && month >= 1 && month <= 12
}

export function getMonthStartDate(monthKey: MonthKey): Date {
  const { year, monthIndex } = parseMonthKey(monthKey)

  return new Date(year, monthIndex, 1)
}

export function getMonthEndDate(monthKey: MonthKey): Date {
  return lastDayOfMonth(getMonthStartDate(monthKey))
}

export function getMonthStartKey(monthKey: MonthKey): ISODateString {
  return toDateKey(getMonthStartDate(monthKey))
}

export function getMonthEndKey(monthKey: MonthKey): ISODateString {
  return toDateKey(getMonthEndDate(monthKey))
}

export function getDateInMonth(
  monthKey: MonthKey,
  dayOfMonth: number,
): ISODateString {
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    throw new Error(`Invalid day of month: ${dayOfMonth}`)
  }

  const monthEnd = getMonthEndDate(monthKey)
  const clampedDay = Math.min(dayOfMonth, getDate(monthEnd))
  const { year, monthIndex } = parseMonthKey(monthKey)

  return toDateKey(new Date(year, monthIndex, clampedDay))
}

export function getRecurringScheduledDate(
  monthKey: MonthKey,
  scheduleType: RecurringScheduleType,
  dayOfMonth?: number,
): ISODateString {
  if (scheduleType === 'lastDayOfMonth') {
    return getMonthEndKey(monthKey)
  }

  if (dayOfMonth === undefined) {
    throw new Error('dayOfMonth is required for dayOfMonth schedules.')
  }

  return getDateInMonth(monthKey, dayOfMonth)
}

export function getCurrentMonthInfo(now = new Date()) {
  const monthKey = toMonthKey(now)

  return {
    monthKey,
    startsOn: getMonthStartKey(monthKey),
    endsOn: getMonthEndKey(monthKey),
    daysInMonth: getDate(getMonthEndDate(monthKey)),
  }
}

function parseMonthKey(monthKey: MonthKey) {
  if (!isMonthKey(monthKey)) {
    throw new Error(`Invalid month key: ${monthKey}`)
  }

  const [year, month] = monthKey.split('-').map(Number)

  return {
    year,
    monthIndex: month - 1,
  }
}
