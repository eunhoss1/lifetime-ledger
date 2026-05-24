import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ensureSeedData } from '../db/seed'
import { LedgerDatabase } from '../db/schema'
import { closeMonth } from './monthlyClosings'
import { applyRecurringItemsForMonth, createRecurringItem } from './recurring'
import { createTransaction, softDeleteTransaction } from './transactions'
import {
  createFullBackup,
  getBackupSummary,
  restoreFullBackup,
  validateBackupJson,
} from './backup'

describe('backup repository', () => {
  let database: LedgerDatabase

  beforeEach(async () => {
    database = await createTestDatabase()
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('creates a full backup containing every table and soft deleted data', async () => {
    await seedBackupScenario(database)

    const backup = await createFullBackup(database)
    const summary = getBackupSummary(backup)

    expect(Object.keys(backup.tables).sort()).toEqual([
      'accounts',
      'appSettings',
      'categories',
      'monthlyClosings',
      'recurringGeneratedRecords',
      'recurringItems',
      'transactions',
    ])
    expect(backup.schemaVersion).toBe(1)
    expect(backup.exportedAt).toBeTruthy()
    expect(backup.tableCounts.transactions).toBe(3)
    expect(backup.tables.transactions.some((transaction) => transaction.deletedAt)).toBe(
      true,
    )
    expect(summary.tableCounts.monthlyClosings).toBe(1)
  })

  it('validates normal backups and rejects count mismatches', async () => {
    await seedBackupScenario(database)
    const backup = await createFullBackup(database)

    expect(validateBackupJson(JSON.stringify(backup)).exportId).toBe(backup.exportId)
    expect(() =>
      validateBackupJson({
        ...backup,
        tableCounts: {
          ...backup.tableCounts,
          transactions: 999,
        },
      }),
    ).toThrow('테이블 개수가 백업 요약과 일치하지 않습니다')
  })

  it('restores transactions, categories, accounts, recurring data, and closings', async () => {
    await seedBackupScenario(database)
    const backup = await createFullBackup(database)
    const restoreDatabase = await createTestDatabase()

    try {
      await restoreFullBackup(backup, restoreDatabase)

      expect(await restoreDatabase.transactions.count()).toBe(
        backup.tableCounts.transactions,
      )
      expect(await restoreDatabase.categories.count()).toBe(
        backup.tableCounts.categories,
      )
      expect(await restoreDatabase.accounts.count()).toBe(backup.tableCounts.accounts)
      expect(await restoreDatabase.recurringItems.count()).toBe(
        backup.tableCounts.recurringItems,
      )
      expect(await restoreDatabase.recurringGeneratedRecords.count()).toBe(
        backup.tableCounts.recurringGeneratedRecords,
      )
      expect(await restoreDatabase.monthlyClosings.count()).toBe(
        backup.tableCounts.monthlyClosings,
      )
    } finally {
      restoreDatabase.close()
      await restoreDatabase.delete()
    }
  })
})

async function createTestDatabase(): Promise<LedgerDatabase> {
  const databaseName = `lifetime-ledger-backup-test-${crypto.randomUUID()}`
  const database = new LedgerDatabase(databaseName)
  await database.delete()
  database.close()

  const nextDatabase = new LedgerDatabase(databaseName)
  await ensureSeedData(nextDatabase)

  return nextDatabase
}

async function seedBackupScenario(database: LedgerDatabase): Promise<void> {
  const activeTransaction = await createTransaction(
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
      type: 'income',
      date: '2026-05-25',
      amount: 5000000,
      categoryId: 'category-income-salary',
      accountId: 'account-bank-account',
    },
    database,
  )
  await softDeleteTransaction(activeTransaction.id, database)

  const recurringItem = await createRecurringItem(
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
  await applyRecurringItemsForMonth('2026-05', [recurringItem.id], database)
  await closeMonth('2026-05', '백업 테스트', database)
}
