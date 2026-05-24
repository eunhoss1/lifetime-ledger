import { describe, expect, it } from 'vitest'
import {
  BACKUP_APP_NAME,
  BACKUP_SCHEMA_VERSION,
  createBackupFileName,
  createTableCounts,
  parseBackupJson,
  type BackupRoot,
} from './backup'

describe('backup domain', () => {
  it('validates a normal v1 backup root', () => {
    const backup = createBackupFixture()

    expect(parseBackupJson(JSON.stringify(backup))).toMatchObject({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appName: BACKUP_APP_NAME,
      tableCounts: backup.tableCounts,
    })
  })

  it('rejects invalid JSON, missing tables, and unsupported schema versions', () => {
    expect(() => parseBackupJson('{')).toThrow('JSON 파일을 읽을 수 없습니다')

    const missingTables = createBackupFixture()
    expect(() =>
      parseBackupJson({
        ...missingTables,
        tables: {
          ...missingTables.tables,
          monthlyClosings: undefined,
        },
      }),
    ).toThrow('백업 형식이 올바르지 않습니다')

    expect(() =>
      parseBackupJson({
        ...createBackupFixture(),
        schemaVersion: 999,
      }),
    ).toThrow('지원하지 않는 백업 schemaVersion')
  })

  it('creates stable backup filenames', () => {
    expect(createBackupFileName(new Date(2026, 4, 25, 9, 7))).toBe(
      'lifetime-ledger-backup-2026-05-25-0907.json',
    )
  })
})

function createBackupFixture(): BackupRoot {
  const timestamp = '2026-05-25T00:00:00.000Z'
  const tables: BackupRoot['tables'] = {
    transactions: [
      {
        id: 'transaction-1',
        type: 'expense',
        date: '2026-05-25',
        monthKey: '2026-05',
        amount: 12000,
        currency: 'KRW',
        categoryId: 'category-expense-food',
        accountId: 'account-cash',
        source: 'manual',
        isRecurringOverride: false,
        expenseRole: 'variable',
        createdAt: timestamp,
        updatedAt: timestamp,
        localRevision: 1,
      },
    ],
    categories: [
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
        createdAt: timestamp,
        updatedAt: timestamp,
        localRevision: 1,
      },
    ],
    accounts: [
      {
        id: 'account-cash',
        name: '현금',
        kind: 'cash',
        color: '#0f766e',
        sortOrder: 1,
        isArchived: false,
        assetTrackingEnabled: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        localRevision: 1,
      },
    ],
    recurringItems: [],
    recurringGeneratedRecords: [],
    monthlyClosings: [],
    appSettings: [
      {
        id: 'singleton',
        schemaVersion: 1,
        currency: 'KRW',
        timezone: 'Asia/Seoul',
        monthStartDay: 1,
        backupReminderEnabled: true,
        recurringApplyMode: 'manual',
      },
    ],
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appName: BACKUP_APP_NAME,
    backupVersion: 1,
    exportedAt: timestamp,
    exportId: 'export-1',
    tables,
    tableCounts: createTableCounts(tables),
  }
}
