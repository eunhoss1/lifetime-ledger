import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ensureSeedData } from '../db/seed'
import { LedgerDatabase } from '../db/schema'
import { createTransaction, softDeleteTransaction } from './transactions'
import {
  exportAllTransactionsCsv,
  exportTransactionsCsvByMonth,
} from './csvExport'

describe('csv export repository', () => {
  let database: LedgerDatabase

  beforeEach(async () => {
    const databaseName = `lifetime-ledger-csv-test-${crypto.randomUUID()}`
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

  it('exports only the requested month', async () => {
    await createTransaction(
      {
        type: 'expense',
        date: '2026-05-25',
        amount: 12000,
        categoryId: 'category-expense-food',
        accountId: 'account-cash',
      },
      database,
    )
    await createTransaction(
      {
        type: 'expense',
        date: '2026-06-01',
        amount: 99000,
        categoryId: 'category-expense-food',
        accountId: 'account-cash',
      },
      database,
    )

    const csv = await exportTransactionsCsvByMonth('2026-05', {}, database)

    expect(csv).toContain('2026-05-25')
    expect(csv).not.toContain('2026-06-01')
  })

  it('exports all transactions and maps category/account names', async () => {
    await addKoreanReferenceData(database)
    await createTransaction(
      {
        type: 'expense',
        date: '2026-05-25',
        amount: 12000,
        categoryId: 'category-expense-custom-food',
        accountId: 'account-custom-cash',
      },
      database,
    )

    const csv = await exportAllTransactionsCsv({}, database)

    expect(csv).toContain('식비')
    expect(csv).toContain('현금')
  })

  it('excludes soft deleted transactions by default', async () => {
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
    await softDeleteTransaction(transaction.id, database)

    expect(await exportAllTransactionsCsv({}, database)).not.toContain('2026-05-25')
    expect(
      await exportAllTransactionsCsv({ includeDeleted: true }, database),
    ).toContain('2026-05-25')
  })

  it('uses unknown labels when referenced category/account no longer exists', async () => {
    await database.transactions.add({
      id: 'orphan-transaction',
      type: 'expense',
      date: '2026-05-25',
      monthKey: '2026-05',
      amount: 12000,
      currency: 'KRW',
      categoryId: 'missing-category',
      accountId: 'missing-account',
      source: 'manual',
      isRecurringOverride: false,
      createdAt: '2026-05-25T00:00:00.000Z',
      updatedAt: '2026-05-25T00:00:00.000Z',
      localRevision: 1,
    })

    expect(await exportAllTransactionsCsv({}, database)).toContain('(알 수 없음)')
  })

  it('exports Excel-compatible CSV by default', async () => {
    await addKoreanReferenceData(database)
    await createTransaction(
      {
        type: 'expense',
        date: '2026-05-25',
        amount: 12000,
        categoryId: 'category-expense-custom-food',
        accountId: 'account-custom-cash',
        memo: '한글 메모',
      },
      database,
    )

    const csv = await exportTransactionsCsvByMonth('2026-05', {}, database)

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"=""2026-05"""')
    expect(csv).toContain('한글 메모')
    expect(csv).toContain('식비')
    expect(csv).toContain('현금')
  })
})

async function addKoreanReferenceData(database: LedgerDatabase) {
  const now = '2026-05-01T00:00:00.000Z'

  await database.categories.put({
    id: 'category-expense-custom-food',
    name: '식비',
    type: 'expense',
    expenseRole: 'variable',
    color: '#dc2626',
    icon: 'utensils',
    sortOrder: 999,
    isDefault: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    localRevision: 1,
  })
  await database.accounts.put({
    id: 'account-custom-cash',
    name: '현금',
    kind: 'cash',
    color: '#0f766e',
    sortOrder: 999,
    isArchived: false,
    assetTrackingEnabled: false,
    createdAt: now,
    updatedAt: now,
    localRevision: 1,
  })
}
