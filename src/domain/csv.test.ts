import { describe, expect, it } from 'vitest'
import {
  createAllTransactionsCsvFileName,
  createTransactionsCsv,
  createTransactionsCsvFileNameForMonth,
  escapeCsvValue,
} from './csv'
import type { Account, Category, Transaction } from './types'

describe('csv domain', () => {
  it('creates a basic transaction CSV', () => {
    const csv = createTransactionsCsv([transactionFixture()], categories, accounts)

    expect(csv).toContain(
      'date,monthKey,type,amount,currency,categoryName,categoryId,accountName,accountId,memo,source,expenseRole,recurringItemId,recurringGeneratedRecordId,createdAt,updatedAt',
    )
    expect(csv).toContain('2026-05-25,2026-05,expense,12000,KRW,식비')
  })

  it('escapes commas, quotes, and line breaks', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"')
    expect(escapeCsvValue('a"b')).toBe('"a""b"')
    expect(escapeCsvValue('a\nb')).toBe('"a\nb"')

    const csv = createTransactionsCsv(
      [
        {
          ...transactionFixture(),
          memo: '점심, "김밥"\n커피',
        },
      ],
      categories,
      accounts,
    )

    expect(csv).toContain('"점심, ""김밥""\n커피"')
  })

  it('excludes soft deleted transactions by default and can include them by option', () => {
    const deleted = {
      ...transactionFixture('transaction-deleted'),
      deletedAt: '2026-05-26T00:00:00.000Z',
    }

    expect(createTransactionsCsv([deleted], categories, accounts)).not.toContain(
      'transaction-deleted',
    )
    expect(
      createTransactionsCsv([deleted], categories, accounts, { includeDeleted: true }),
    ).toContain('2026-05-25')
  })

  it('uses unknown labels when category or account is missing', () => {
    const csv = createTransactionsCsv([transactionFixture()], [], [])

    expect(csv).toContain('(알 수 없음)')
  })

  it('creates expected CSV filenames', () => {
    expect(createTransactionsCsvFileNameForMonth('2026-05')).toBe(
      'lifetime-ledger-transactions-2026-05.csv',
    )
    expect(createAllTransactionsCsvFileName(new Date(2026, 4, 25, 9, 7))).toBe(
      'lifetime-ledger-transactions-all-2026-05-25-0907.csv',
    )
  })
})

const categories: Category[] = [
  {
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
  },
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

function transactionFixture(id = 'transaction-1'): Transaction {
  return {
    id,
    type: 'expense',
    date: '2026-05-25',
    monthKey: '2026-05',
    amount: 12000,
    currency: 'KRW',
    categoryId: 'category-expense-food',
    accountId: 'account-cash',
    memo: '점심',
    source: 'manual',
    isRecurringOverride: false,
    expenseRole: 'variable',
    createdAt: '2026-05-25T00:00:00.000Z',
    updatedAt: '2026-05-25T00:00:00.000Z',
    localRevision: 1,
  }
}
