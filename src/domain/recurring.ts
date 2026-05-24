import { getRecurringScheduledDate, isMonthKey } from './date'
import { normalizeKrwAmount } from './money'
import type {
  Category,
  EntityId,
  ExpenseRole,
  ISODateString,
  MonthKey,
  RecurringItem,
  RecurringScheduleType,
} from './types'

export interface RecurringItemInput {
  name: string
  type: 'expense'
  amount: number | string
  categoryId: EntityId
  accountId: EntityId
  memoTemplate?: string
  scheduleType: RecurringScheduleType
  dayOfMonth?: number | string
  startMonth: MonthKey
  endMonth?: MonthKey
  active: boolean
}

export type RecurringItemPatch = Partial<RecurringItemInput>

export interface NormalizedRecurringItemInput {
  name: string
  type: 'expense'
  amount: number
  categoryId: EntityId
  accountId: EntityId
  memoTemplate?: string
  scheduleType: RecurringScheduleType
  dayOfMonth?: number
  startMonth: MonthKey
  endMonth?: MonthKey
  active: boolean
}

export interface RecurringTransactionDraft {
  type: 'expense'
  date: ISODateString
  monthKey: MonthKey
  amount: number
  categoryId: EntityId
  accountId: EntityId
  memo?: string
  expenseRole: ExpenseRole
}

export function normalizeRecurringItemInput(
  input: RecurringItemInput,
  category?: Category,
): NormalizedRecurringItemInput {
  const name = input.name.trim()

  if (!name) {
    throw new Error('반복지출 이름을 입력해야 합니다.')
  }

  if (input.type !== 'expense') {
    throw new Error('MVP에서는 반복지출만 지원합니다.')
  }

  if (!input.categoryId) {
    throw new Error('카테고리를 선택해야 합니다.')
  }

  if (!input.accountId) {
    throw new Error('계좌를 선택해야 합니다.')
  }

  if (category && category.type !== 'expense') {
    throw new Error('반복지출에는 지출 카테고리만 사용할 수 있습니다.')
  }

  if (!isMonthKey(input.startMonth)) {
    throw new Error('시작월은 YYYY-MM 형식이어야 합니다.')
  }

  if (input.endMonth && !isMonthKey(input.endMonth)) {
    throw new Error('종료월은 YYYY-MM 형식이어야 합니다.')
  }

  if (input.endMonth && input.endMonth < input.startMonth) {
    throw new Error('종료월은 시작월보다 빠를 수 없습니다.')
  }

  const amount = normalizeKrwAmount(input.amount)

  if (amount <= 0) {
    throw new Error('반복지출 금액은 0보다 커야 합니다.')
  }

  const dayOfMonth = normalizeDayOfMonth(input.scheduleType, input.dayOfMonth)
  const memoTemplate = normalizeMemo(input.memoTemplate)

  return {
    name,
    type: 'expense',
    amount,
    categoryId: input.categoryId,
    accountId: input.accountId,
    memoTemplate,
    scheduleType: input.scheduleType,
    dayOfMonth,
    startMonth: input.startMonth,
    endMonth: input.endMonth || undefined,
    active: input.active,
  }
}

export function normalizeRecurringItemPatch(
  existing: RecurringItem,
  patch: RecurringItemPatch,
  category?: Category,
): NormalizedRecurringItemInput {
  return normalizeRecurringItemInput(
    {
      name: patch.name ?? existing.name,
      type: patch.type ?? 'expense',
      amount: patch.amount ?? existing.amount,
      categoryId: patch.categoryId ?? existing.categoryId,
      accountId: patch.accountId ?? existing.accountId,
      memoTemplate: patch.memoTemplate ?? existing.memoTemplate,
      scheduleType: patch.scheduleType ?? existing.scheduleType,
      dayOfMonth: patch.dayOfMonth ?? existing.dayOfMonth,
      startMonth: patch.startMonth ?? existing.startMonth,
      endMonth: patch.endMonth ?? existing.endMonth,
      active: patch.active ?? existing.active,
    },
    category,
  )
}

export function isRecurringItemCandidateForMonth(
  item: RecurringItem,
  monthKey: MonthKey,
): boolean {
  if (!isMonthKey(monthKey)) {
    throw new Error('대상월은 YYYY-MM 형식이어야 합니다.')
  }

  if (item.deletedAt || !item.active) {
    return false
  }

  if (item.type !== 'expense') {
    return false
  }

  if (monthKey < item.startMonth) {
    return false
  }

  if (item.endMonth && monthKey > item.endMonth) {
    return false
  }

  return true
}

export function getRecurringItemScheduledDate(
  item: RecurringItem,
  monthKey: MonthKey,
): ISODateString {
  return getRecurringScheduledDate(monthKey, item.scheduleType, item.dayOfMonth)
}

export function createRecurringTransactionDraft(
  item: RecurringItem,
  monthKey: MonthKey,
  category?: Category,
): RecurringTransactionDraft {
  const scheduledDate = getRecurringItemScheduledDate(item, monthKey)

  return {
    type: 'expense',
    date: scheduledDate,
    monthKey,
    amount: item.amount,
    categoryId: item.categoryId,
    accountId: item.accountId,
    memo: item.memoTemplate,
    expenseRole: category?.expenseRole ?? 'fixed',
  }
}

function normalizeDayOfMonth(
  scheduleType: RecurringScheduleType,
  value: number | string | undefined,
): number | undefined {
  if (scheduleType === 'lastDayOfMonth') {
    return undefined
  }

  if (scheduleType !== 'dayOfMonth') {
    throw new Error('반복 방식이 올바르지 않습니다.')
  }

  const day = typeof value === 'string' ? Number(value) : value

  if (day === undefined || !Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error('반복일은 1일부터 31일 사이여야 합니다.')
  }

  return day
}

function normalizeMemo(memo: string | undefined): string | undefined {
  const trimmed = memo?.trim()

  return trimmed ? trimmed : undefined
}
