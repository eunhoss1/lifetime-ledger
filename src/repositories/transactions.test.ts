import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ensureSeedData } from '../db/seed'
import { LedgerDatabase } from '../db/schema'
import {
  createTransaction,
  getMonthlyTransactionSummary,
  listTransactionsByMonth,
  softDeleteTransaction,
} from './transactions'

describe('transaction repository', () => {
  let database: LedgerDatabase

  beforeEach(async () => {
    database = new LedgerDatabase()
    await database.delete()
    database = new LedgerDatabase()
    await ensureSeedData(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('creates transactions with monthKey derived from date', async () => {
    const transaction = await createTransaction(
      {
        type: 'expense',
        date: '2026-05-25',
        amount: 12000,
        categoryId: 'category-expense-food',
        accountId: 'account-cash',
        memo: '점심',
      },
      database,
    )

    expect(transaction).toMatchObject({
      date: '2026-05-25',
      monthKey: '2026-05',
      amount: 12000,
      source: 'manual',
      localRevision: 1,
    })
  })

  it('soft deletes transactions and excludes them from list and summary', async () => {
    const transaction = await createTransaction(
      {
        type: 'expense',
        date: '2026-05-25',
        amount: 12000,
        categoryId: 'category-expense-food',
        accountId: 'account-cash',
      },
      database,
    )

    const deleted = await softDeleteTransaction(transaction.id, database)
    const transactions = await listTransactionsByMonth('2026-05', database)
    const summary = await getMonthlyTransactionSummary('2026-05', database)

    expect(deleted.deletedAt).toBeDefined()
    expect(deleted.localRevision).toBe(2)
    expect(transactions).toEqual([])
    expect(summary.expense).toBe(0)
  })

  it('calculates monthly summary by income and expense role', async () => {
    await createTransaction(
      {
        type: 'income',
        date: '2026-05-01',
        amount: 5000000,
        categoryId: 'category-income-salary',
        accountId: 'account-bank-account',
      },
      database,
    )
    await createTransaction(
      {
        type: 'expense',
        date: '2026-05-02',
        amount: 1000000,
        categoryId: 'category-expense-housing',
        accountId: 'account-bank-account',
      },
      database,
    )
    await createTransaction(
      {
        type: 'expense',
        date: '2026-05-03',
        amount: 2000000,
        categoryId: 'category-expense-food',
        accountId: 'account-credit-card',
      },
      database,
    )
    await createTransaction(
      {
        type: 'expense',
        date: '2026-05-04',
        amount: 500000,
        categoryId: 'category-expense-saving-investment',
        accountId: 'account-bank-account',
      },
      database,
    )

    expect(await getMonthlyTransactionSummary('2026-05', database)).toEqual({
      income: 5000000,
      expense: 3000000,
      fixedExpense: 1000000,
      variableExpense: 2000000,
      savingInvestment: 500000,
      remaining: 1500000,
    })
  })
})
