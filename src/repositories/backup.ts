import {
  BACKUP_APP_NAME,
  BACKUP_SCHEMA_VERSION,
  BACKUP_VERSION,
  createBackupSummary,
  createTableCounts,
  parseBackupJson,
  type BackupRoot,
  type BackupSummary,
  type BackupTables,
} from '../domain/backup'
import { createId } from '../domain/id'
import { db, type LedgerDatabase } from '../db/schema'

export async function createFullBackup(
  database: LedgerDatabase = db,
): Promise<BackupRoot> {
  const tables: BackupTables = {
    transactions: await database.transactions.toArray(),
    categories: await database.categories.toArray(),
    accounts: await database.accounts.toArray(),
    recurringItems: await database.recurringItems.toArray(),
    recurringGeneratedRecords:
      await database.recurringGeneratedRecords.toArray(),
    monthlyClosings: await database.monthlyClosings.toArray(),
    appSettings: await database.appSettings.toArray(),
  }
  const exportedAt = new Date().toISOString()

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appName: BACKUP_APP_NAME,
    backupVersion: BACKUP_VERSION,
    exportedAt,
    exportId: createId(),
    tables,
    tableCounts: createTableCounts(tables),
  }
}

export function validateBackupJson(json: string | unknown): BackupRoot {
  return parseBackupJson(json)
}

export function getBackupSummary(backup: BackupRoot): BackupSummary {
  return createBackupSummary(backup)
}

export async function restoreFullBackup(
  backup: BackupRoot,
  database: LedgerDatabase = db,
): Promise<void> {
  const validatedBackup = validateBackupJson(backup)

  await database.transaction(
    'rw',
    [
      database.transactions,
      database.categories,
      database.accounts,
      database.recurringItems,
      database.recurringGeneratedRecords,
      database.monthlyClosings,
      database.appSettings,
    ],
    async () => {
      await Promise.all([
        database.transactions.clear(),
        database.categories.clear(),
        database.accounts.clear(),
        database.recurringItems.clear(),
        database.recurringGeneratedRecords.clear(),
        database.monthlyClosings.clear(),
        database.appSettings.clear(),
      ])

      await Promise.all([
        database.transactions.bulkPut(validatedBackup.tables.transactions),
        database.categories.bulkPut(validatedBackup.tables.categories),
        database.accounts.bulkPut(validatedBackup.tables.accounts),
        database.recurringItems.bulkPut(validatedBackup.tables.recurringItems),
        database.recurringGeneratedRecords.bulkPut(
          validatedBackup.tables.recurringGeneratedRecords,
        ),
        database.monthlyClosings.bulkPut(validatedBackup.tables.monthlyClosings),
        database.appSettings.bulkPut(validatedBackup.tables.appSettings),
      ])
    },
  )
}
