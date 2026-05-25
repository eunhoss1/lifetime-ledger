import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ensureSeedData } from '../db/seed'
import { LedgerDatabase } from '../db/schema'
import {
  applyRecurringItemsForMonth,
  archiveRecurringItem,
  createRecurringItem,
  listRecurringItemsWithMonthStatus,
  previewRecurringItemsForMonth,
} from './recurring'
import { getMonthlyTransactionSummary } from './transactions'

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

  it('uses selected recurring expenseRole for generated transaction summary', async () => {
    const item = await createRecurringItem(
      {
        name: '운동 구독',
        type: 'expense',
        amount: 30000,
        categoryId: 'category-expense-culture',
        accountId: 'account-credit-card',
        expenseRole: 'variable',
        scheduleType: 'dayOfMonth',
        dayOfMonth: 5,
        startMonth: '2026-05',
        active: true,
      },
      database,
    )

    const created = await applyRecurringItemsForMonth('2026-05', [item.id], database)
    const summary = await getMonthlyTransactionSummary('2026-05', database)

    expect(created[0].expenseRole).toBe('variable')
    expect(summary.fixedExpense).toBe(0)
    expect(summary.variableExpense).toBe(30000)
  })

  it('archives recurring item without deleting already generated transactions', async () => {
    const item = await createRecurringItem(
      {
        name: '보험료',
        type: 'expense',
        amount: 100000,
        categoryId: 'category-expense-insurance',
        accountId: 'account-credit-card',
        scheduleType: 'dayOfMonth',
        dayOfMonth: 10,
        startMonth: '2026-05',
        active: true,
      },
      database,
    )

    await applyRecurringItemsForMonth('2026-05', [item.id], database)
    await archiveRecurringItem(item.id, database)

    const preview = await previewRecurringItemsForMonth('2026-06', database)
    const transactions = await database.transactions.toArray()
    const statuses = await listRecurringItemsWithMonthStatus('2026-05', database)
    const archivedStatus = statuses.find((statusItem) => statusItem.item.id === item.id)

    expect(preview.some((previewItem) => previewItem.item.id === item.id)).toBe(false)
    expect(transactions).toHaveLength(1)
    expect(archivedStatus?.status).toBe('archived')
  })

  it('shows applied and unapplied month statuses', async () => {
    const applied = await createRecurringItem(
      {
        name: '월세',
        type: 'expense',
        amount: 500000,
        categoryId: 'category-expense-housing',
        accountId: 'account-bank-account',
        scheduleType: 'dayOfMonth',
        dayOfMonth: 1,
        startMonth: '2026-05',
        active: true,
      },
      database,
    )
    const unapplied = await createRecurringItem(
      {
        name: '구독료',
        type: 'expense',
        amount: 12000,
        categoryId: 'category-expense-culture',
        accountId: 'account-credit-card',
        scheduleType: 'dayOfMonth',
        dayOfMonth: 2,
        startMonth: '2026-05',
        active: true,
      },
      database,
    )

    const [created] = await applyRecurringItemsForMonth('2026-05', [applied.id], database)
    const statuses = await listRecurringItemsWithMonthStatus('2026-05', database)

    expect(statuses.find((statusItem) => statusItem.item.id === applied.id)).toMatchObject({
      status: 'applied',
      generatedTransactionId: created.id,
    })
    expect(statuses.find((statusItem) => statusItem.item.id === unapplied.id)).toMatchObject({
      status: 'unapplied',
    })
  })
})
