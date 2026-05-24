import { dateKeyToMonthKey, isDateKey } from './date'
import { normalizeKrwAmount } from './money'
import type {
  Category,
  EntityId,
  ExpenseRole,
  ISODateString,
  MonthlyClosingTotals,
  MonthKey,
  Transaction,
  TransactionType,
} from './types'

export interface TransactionInput {
  type: TransactionType
  date: ISODateString
  amount: number | string
  categoryId: EntityId
  accountId: EntityId
  memo?: string
}

export type TransactionPatch = Partial<TransactionInput>

export interface NormalizedTransactionInput {
  type: TransactionType
  date: ISODateString
  monthKey: MonthKey
  amount: number
  categoryId: EntityId
  accountId: EntityId
  memo?: string
  expenseRole?: ExpenseRole
}

export function normalizeTransactionInput(
  input: TransactionInput,
  category?: Category,
): NormalizedTransactionInput {
  assertTransactionType(input.type)

  if (!isDateKey(input.date)) {
    throw new Error('거래 날짜는 YYYY-MM-DD 형식이어야 합니다.')
  }

  const amount = normalizeKrwAmount(input.amount)

  if (amount <= 0) {
    throw new Error('거래 금액은 0보다 커야 합니다.')
  }

  if (!input.categoryId) {
    throw new Error('카테고리를 선택해야 합니다.')
  }

  if (!input.accountId) {
    throw new Error('계좌를 선택해야 합니다.')
  }

  if (category && category.type !== input.type) {
    throw new Error('거래 유형과 카테고리 유형이 일치해야 합니다.')
  }

  const memo = normalizeMemo(input.memo)

  return {
    type: input.type,
    date: input.date,
    monthKey: dateKeyToMonthKey(input.date),
    amount,
    categoryId: input.categoryId,
    accountId: input.accountId,
    memo,
    expenseRole:
      input.type === 'expense' ? (category?.expenseRole ?? 'variable') : undefined,
  }
}

export function normalizeTransactionPatch(
  existing: Transaction,
  patch: TransactionPatch,
  category?: Category,
): NormalizedTransactionInput {
  return normalizeTransactionInput(
    {
      type: patch.type ?? existing.type,
      date: patch.date ?? existing.date,
      amount: patch.amount ?? existing.amount,
      categoryId: patch.categoryId ?? existing.categoryId,
      accountId: patch.accountId ?? existing.accountId,
      memo: patch.memo ?? existing.memo,
    },
    category,
  )
}

export function calculateMonthlyTransactionSummary(
  transactions: ReadonlyArray<Transaction>,
): MonthlyClosingTotals {
  const totals = transactions.reduce<MonthlyClosingTotals>(
    (summary, transaction) => {
      if (transaction.deletedAt) {
        return summary
      }

      if (transaction.type === 'income') {
        summary.income += transaction.amount
        return summary
      }

      if (transaction.expenseRole === 'savingInvestment') {
        summary.savingInvestment += transaction.amount
        return summary
      }

      summary.expense += transaction.amount

      if (transaction.expenseRole === 'fixed') {
        summary.fixedExpense += transaction.amount
      } else {
        summary.variableExpense += transaction.amount
      }

      return summary
    },
    createEmptyMonthlySummary(),
  )

  totals.remaining = totals.income - totals.expense - totals.savingInvestment

  return totals
}

export function createEmptyMonthlySummary(): MonthlyClosingTotals {
  return {
    income: 0,
    expense: 0,
    fixedExpense: 0,
    variableExpense: 0,
    savingInvestment: 0,
    remaining: 0,
  }
}

function assertTransactionType(type: string): asserts type is TransactionType {
  if (type !== 'income' && type !== 'expense') {
    throw new Error('거래 유형은 수입 또는 지출이어야 합니다.')
  }
}

function normalizeMemo(memo: string | undefined): string | undefined {
  const trimmed = memo?.trim()

  return trimmed ? trimmed : undefined
}
