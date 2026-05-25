import { describe, expect, it } from 'vitest'
import { createId } from './id'
import {
  calculateMonthlyTransactionSummary,
  normalizeTransactionInput,
} from './transactions'
import type { Category, Transaction } from './types'

const baseCategory: Category = {
  id: 'category-expense-food',
  name: '식비',
  type: 'expense',
  expenseRole: 'variable',
  color: '#dc2626',
  icon: 'utensils',
  sortOrder: 1,
  isDefault: true,
  isArchived: false,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  localRevision: 1,
}

describe('transaction domain', () => {
  it('validates create input and derives monthKey from date', () => {
    expect(
      normalizeTransactionInput(
        {
          type: 'expense',
          date: '2026-05-25',
          amount: '12,000',
          categoryId: 'category-expense-food',
          accountId: 'account-cash',
        },
        baseCategory,
      ),
    ).toMatchObject({
      type: 'expense',
      date: '2026-05-25',
      monthKey: '2026-05',
      amount: 12000,
      expenseRole: 'variable',
    })
  })

  it('rejects invalid amount and mismatched category type', () => {
    expect(() =>
      normalizeTransactionInput(
        {
          type: 'expense',
          date: '2026-05-25',
          amount: '12.5',
          categoryId: 'category-expense-food',
          accountId: 'account-cash',
        },
        baseCategory,
      ),
    ).toThrow()

    expect(() =>
      normalizeTransactionInput(
        {
          type: 'income',
          date: '2026-05-25',
          amount: 1000,
          categoryId: 'category-expense-food',
          accountId: 'account-cash',
        },
        baseCategory,
      ),
    ).toThrow()
  })

  it('excludes deleted transactions and calculates monthly totals', () => {
    const transactions: Transaction[] = [
      createTransactionFixture('income', 5000000),
      createTransactionFixture('expense', 1000000, 'fixed'),
      createTransactionFixture('expense', 2000000, 'variable'),
      createTransactionFixture('expense', 500000, 'savingInvestment'),
      {
        ...createTransactionFixture('expense', 999999, 'variable'),
        deletedAt: '2026-05-26T00:00:00.000Z',
      },
    ]

    expect(calculateMonthlyTransactionSummary(transactions)).toEqual({
      income: 5000000,
      expense: 3000000,
      fixedExpense: 1000000,
      variableExpense: 2000000,
      savingInvestment: 500000,
      remaining: 1500000,
    })
  })
})

function createTransactionFixture(
  type: Transaction['type'],
  amount: number,
  expenseRole?: Transaction['expenseRole'],
): Transaction {
  return {
    id: createId(),
    type,
    date: '2026-05-25',
    monthKey: '2026-05',
    amount,
    currency: 'KRW',
    categoryId: type === 'income' ? 'category-income-salary' : 'category-expense-food',
    accountId: 'account-cash',
    source: 'manual',
    isRecurringOverride: false,
    expenseRole,
    createdAt: '2026-05-25T00:00:00.000Z',
    updatedAt: '2026-05-25T00:00:00.000Z',
    localRevision: 1,
  }
}
