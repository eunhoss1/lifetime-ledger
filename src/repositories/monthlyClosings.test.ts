import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ensureSeedData } from '../db/seed'
import { LedgerDatabase } from '../db/schema'
import { createId } from '../domain/id'
import { applyRecurringItemsForMonth, createRecurringItem } from './recurring'
import {
  closeMonth,
  CLOSED_MONTH_MESSAGE,
  isMonthClosed,
  reopenMonth,
} from './monthlyClosings'
import {
  createTransaction,
  softDeleteTransaction,
  updateTransaction,
} from './transactions'

describe('monthly closing repository', () => {
  let database: LedgerDatabase

  beforeEach(async () => {
    const databaseName = `lifetime-ledger-closing-test-${createId()}`
    database = new LedgerDatabase(databaseName)
    await database.delete()
    database.close()
    database = new LedgerDatabase(databaseName)
    await ensureSeedData(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('tracks whether a month is closed and can reopen it', async () => {
    expect(await isMonthClosed('2026-05', database)).toBe(false)

    await closeMonth('2026-05', '마감', database)
    expect(await isMonthClosed('2026-05', database)).toBe(true)

    await reopenMonth('2026-05', database)
    expect(await isMonthClosed('2026-05', database)).toBe(false)
  })

  it('blocks transaction create, update, and delete for a closed month', async () => {
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

    await closeMonth('2026-05', undefined, database)

    await expect(
      createTransaction(
        {
          type: 'expense',
          date: '2026-05-26',
          amount: 13000,
          categoryId: 'category-expense-food',
          accountId: 'account-cash',
        },
        database,
      ),
    ).rejects.toThrow(CLOSED_MONTH_MESSAGE)
    await expect(
      updateTransaction(transaction.id, { amount: 14000 }, database),
    ).rejects.toThrow(CLOSED_MONTH_MESSAGE)
    await expect(softDeleteTransaction(transaction.id, database)).rejects.toThrow(
      CLOSED_MONTH_MESSAGE,
    )
  })

  it('blocks recurring application for a closed month', async () => {
    const item = await createRecurringItem(
      {
        name: '월세',
        type: 'expense',
        amount: 500000,
        categoryId: 'category-expense-housing',
        accountId: 'account-bank-account',
        scheduleType: 'dayOfMonth',
        dayOfMonth: 25,
        startMonth: '2026-05',
        active: true,
      },
      database,
    )

    await closeMonth('2026-05', undefined, database)

    await expect(
      applyRecurringItemsForMonth('2026-05', [item.id], database),
    ).rejects.toThrow(CLOSED_MONTH_MESSAGE)
  })

  it('allows edits after reopening and refreshes snapshot when closed again', async () => {
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
    const firstClosing = await closeMonth('2026-05', undefined, database)

    expect(firstClosing.expenseTotal).toBe(12000)

    await reopenMonth('2026-05', database)
    await updateTransaction(transaction.id, { amount: 22000 }, database)

    const secondClosing = await closeMonth('2026-05', undefined, database)

    expect(secondClosing.expenseTotal).toBe(22000)
    expect(secondClosing.localRevision).toBeGreaterThan(firstClosing.localRevision)
  })
})
