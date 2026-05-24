import { describe, expect, it } from 'vitest'
import { calculateMonthlyClosingSnapshot } from './closing'
import type { Account, Category, Transaction } from './types'

describe('monthly closing domain', () => {
  it('calculates a monthly closing snapshot from transactions', () => {
    const snapshot = calculateMonthlyClosingSnapshot({
      monthKey: '2026-05',
      transactions: [
        createTransaction('income-1', 'income', 5000000, 'category-income-salary'),
        createTransaction('fixed-1', 'expense', 1000000, 'category-expense-housing', 'fixed'),
        createTransaction('variable-1', 'expense', 2000000, 'category-expense-food', 'variable'),
        createTransaction(
          'saving-1',
          'expense',
          500000,
          'category-expense-saving-investment',
          'savingInvestment',
        ),
      ],
      categories,
      accounts,
      note: '5월 마감',
      status: 'closed',
    })

    expect(snapshot).toMatchObject({
      monthKey: '2026-05',
      status: 'closed',
      incomeTotal: 5000000,
      expenseTotal: 3000000,
      fixedExpenseTotal: 1000000,
      variableExpenseTotal: 2000000,
      savingInvestmentTotal: 500000,
      remaining: 1500000,
      transactionCount: 4,
      note: '5월 마감',
    })
    expect(snapshot.categorySummaries).toHaveLength(4)
    expect(snapshot.accountSummaries[0]).toMatchObject({
      accountId: 'account-cash',
      transactionCount: 4,
    })
  })
})

const categories: Category[] = [
  createCategory('category-income-salary', '월급', 'income'),
  createCategory('category-expense-housing', '주거', 'expense', 'fixed'),
  createCategory('category-expense-food', '식비', 'expense', 'variable'),
  createCategory(
    'category-expense-saving-investment',
    '저축/투자',
    'expense',
    'savingInvestment',
  ),
]

const accounts: Account[] = [
  {
    id: 'account-cash',
    name: '현금',
    kind: 'cash',
    color: '#0f766e',
    sortOrder: 1,
    isArchived: false,
    assetTrackingEnabled: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    localRevision: 1,
  },
]

function createTransaction(
  id: string,
  type: Transaction['type'],
  amount: number,
  categoryId: string,
  expenseRole?: Transaction['expenseRole'],
): Transaction {
  return {
    id,
    type,
    date: '2026-05-25',
    monthKey: '2026-05',
    amount,
    currency: 'KRW',
    categoryId,
    accountId: 'account-cash',
    source: 'manual',
    isRecurringOverride: false,
    expenseRole,
    createdAt: '2026-05-25T00:00:00.000Z',
    updatedAt: '2026-05-25T00:00:00.000Z',
    localRevision: 1,
  }
}

function createCategory(
  id: string,
  name: string,
  type: Category['type'],
  expenseRole?: Category['expenseRole'],
): Category {
  return {
    id,
    name,
    type,
    expenseRole,
    color: '#0f766e',
    icon: 'circle',
    sortOrder: 1,
    isDefault: true,
    isArchived: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    localRevision: 1,
  }
}
