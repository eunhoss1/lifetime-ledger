import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ensureSeedData } from '../db/seed'
import { LedgerDatabase } from '../db/schema'
import {
  applyRecurringItemsForMonth,
  createRecurringItem,
  previewRecurringItemsForMonth,
} from './recurring'

describe('recurring repository', () => {
  let database: LedgerDatabase

  beforeEach(async () => {
    const databaseName = `lifetime-ledger-recurring-test-${crypto.randomUUID()}`
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

  it('creates transaction and generated record together', async () => {
    const item = await createRecurringItem(
      {
        name: '월세',
        type: 'expense',
        amount: 500000,
        categoryId: 'category-expense-housing',
        accountId: 'account-bank-account',
        scheduleType: 'dayOfMonth',
        dayOfMonth: 31,
        startMonth: '2026-01',
        active: true,
      },
      database,
    )

    const created = await applyRecurringItemsForMonth('2026-02', [item.id], database)
    const records = await database.recurringGeneratedRecords.toArray()

    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({
      source: 'recurring',
      recurringItemId: item.id,
      recurringItemRevision: 1,
      date: '2026-02-28',
      expenseRole: 'fixed',
    })
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      recurringItemId: item.id,
      monthKey: '2026-02',
      transactionId: created[0].id,
      scheduledDate: '2026-02-28',
    })
  })

  it('does not generate the same recurring item twice for one month', async () => {
    const item = await createRecurringItem(
      {
        name: '통신비',
        type: 'expense',
        amount: 80000,
        categoryId: 'category-expense-communication',
        accountId: 'account-credit-card',
        scheduleType: 'lastDayOfMonth',
        startMonth: '2026-01',
        active: true,
      },
      database,
    )

    const first = await applyRecurringItemsForMonth('2026-05', [item.id], database)
    const second = await applyRecurringItemsForMonth('2026-05', [item.id], database)
    const preview = await previewRecurringItemsForMonth('2026-05', database)

    expect(first).toHaveLength(1)
    expect(second).toHaveLength(0)
    expect(await database.transactions.count()).toBe(1)
    expect(await database.recurringGeneratedRecords.count()).toBe(1)
    expect(preview).toHaveLength(0)
  })
})
