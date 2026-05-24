import { z } from 'zod'
import type {
  Account,
  AppSettings,
  Category,
  MonthlyClosing,
  RecurringGeneratedRecord,
  RecurringItem,
  Transaction,
} from './types'

export const BACKUP_APP_NAME = 'Lifetime Ledger'
export const BACKUP_SCHEMA_VERSION = 1
export const BACKUP_VERSION = 1

export const BACKUP_TABLE_NAMES = [
  'transactions',
  'categories',
  'accounts',
  'recurringItems',
  'recurringGeneratedRecords',
  'monthlyClosings',
  'appSettings',
] as const

export type BackupTableName = (typeof BACKUP_TABLE_NAMES)[number]

export interface BackupTables {
  transactions: Transaction[]
  categories: Category[]
  accounts: Account[]
  recurringItems: RecurringItem[]
  recurringGeneratedRecords: RecurringGeneratedRecord[]
  monthlyClosings: MonthlyClosing[]
  appSettings: AppSettings[]
}

export type BackupTableCounts = Record<BackupTableName, number>

export interface BackupRoot {
  schemaVersion: number
  appName: typeof BACKUP_APP_NAME
  backupVersion: number
  exportedAt: string
  exportId: string
  tables: BackupTables
  tableCounts: BackupTableCounts
}

export interface BackupSummary {
  schemaVersion: number
  backupVersion: number
  appName: string
  exportedAt: string
  exportId: string
  tableCounts: BackupTableCounts
}

const entityBaseSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  deletedAt: z.string().optional(),
  localRevision: z.number().int().nonnegative(),
})

const transactionSchema = entityBaseSchema
  .extend({
    type: z.enum(['income', 'expense']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    monthKey: z.string().regex(/^\d{4}-\d{2}$/),
    amount: z.number().int().nonnegative(),
    currency: z.literal('KRW'),
    categoryId: z.string().min(1),
    accountId: z.string().min(1),
    memo: z.string().optional(),
    source: z.enum(['manual', 'recurring']),
    recurringItemId: z.string().optional(),
    recurringGeneratedRecordId: z.string().optional(),
    recurringItemRevision: z.number().int().optional(),
    isRecurringOverride: z.boolean(),
    expenseRole: z.enum(['fixed', 'variable', 'savingInvestment']).optional(),
  })
  .passthrough()

const categorySchema = entityBaseSchema
  .extend({
    name: z.string().min(1),
    type: z.enum(['income', 'expense']),
    expenseRole: z.enum(['fixed', 'variable', 'savingInvestment']).optional(),
    color: z.string(),
    icon: z.string(),
    sortOrder: z.number().int(),
    isDefault: z.boolean(),
    isArchived: z.boolean(),
  })
  .passthrough()

const accountSchema = entityBaseSchema
  .extend({
    name: z.string().min(1),
    kind: z.enum(['cash', 'debitCard', 'creditCard', 'bankAccount', 'other']),
    color: z.string(),
    sortOrder: z.number().int(),
    isArchived: z.boolean(),
    assetTrackingEnabled: z.boolean(),
  })
  .passthrough()

const recurringItemSchema = entityBaseSchema
  .extend({
    name: z.string().min(1),
    type: z.enum(['income', 'expense']),
    amount: z.number().int().nonnegative(),
    categoryId: z.string().min(1),
    accountId: z.string().min(1),
    memoTemplate: z.string().optional(),
    scheduleType: z.enum(['dayOfMonth', 'lastDayOfMonth']),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    overflowPolicy: z.literal('clampToLastDay'),
    startMonth: z.string().regex(/^\d{4}-\d{2}$/),
    endMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    active: z.boolean(),
    autoCreate: z.boolean(),
    revision: z.number().int().positive(),
  })
  .passthrough()

const recurringGeneratedRecordSchema = entityBaseSchema
  .extend({
    recurringItemId: z.string().min(1),
    monthKey: z.string().regex(/^\d{4}-\d{2}$/),
    transactionId: z.string().min(1),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    generatedAt: z.string().min(1),
  })
  .passthrough()

const monthlyClosingSchema = entityBaseSchema
  .extend({
    monthKey: z.string().regex(/^\d{4}-\d{2}$/),
    status: z.enum(['draft', 'closed', 'reopened']),
    totals: z.object({
      income: z.number().int().nonnegative(),
      expense: z.number().int().nonnegative(),
      fixedExpense: z.number().int().nonnegative(),
      variableExpense: z.number().int().nonnegative(),
      savingInvestment: z.number().int().nonnegative(),
      remaining: z.number().int(),
    }),
    incomeTotal: z.number().int().nonnegative(),
    expenseTotal: z.number().int().nonnegative(),
    fixedExpenseTotal: z.number().int().nonnegative(),
    variableExpenseTotal: z.number().int().nonnegative(),
    savingInvestmentTotal: z.number().int().nonnegative(),
    remaining: z.number().int(),
    transactionCount: z.number().int().nonnegative(),
    categorySummaries: z.array(z.unknown()),
    accountSummaries: z.array(z.unknown()),
    note: z.string().optional(),
    closedAt: z.string().optional(),
    reopenedAt: z.string().optional(),
  })
  .passthrough()

const appSettingsSchema = z
  .object({
    id: z.literal('singleton'),
    schemaVersion: z.number().int().positive(),
    currency: z.literal('KRW'),
    timezone: z.string().min(1),
    monthStartDay: z.literal(1),
    backupReminderEnabled: z.boolean(),
    lastBackupAt: z.string().optional(),
    recurringApplyMode: z.literal('manual'),
  })
  .passthrough()

const backupTablesSchema = z.object({
  transactions: z.array(transactionSchema),
  categories: z.array(categorySchema),
  accounts: z.array(accountSchema),
  recurringItems: z.array(recurringItemSchema),
  recurringGeneratedRecords: z.array(recurringGeneratedRecordSchema),
  monthlyClosings: z.array(monthlyClosingSchema),
  appSettings: z.array(appSettingsSchema),
})

const tableCountsSchema = z.object(
  Object.fromEntries(BACKUP_TABLE_NAMES.map((name) => [name, z.number().int().nonnegative()])) as Record<
    BackupTableName,
    z.ZodNumber
  >,
)

export const backupRootSchema = z.object({
  schemaVersion: z.number().int().positive(),
  appName: z.literal(BACKUP_APP_NAME),
  backupVersion: z.number().int().positive(),
  exportedAt: z.string().min(1),
  exportId: z.string().min(1),
  tables: backupTablesSchema,
  tableCounts: tableCountsSchema,
})

export function parseBackupJson(json: string | unknown): BackupRoot {
  const raw = parseJsonIfNeeded(json)
  const parsed = backupRootSchema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(formatBackupValidationError(parsed.error))
  }

  return migrateBackupToCurrentVersion(parsed.data as BackupRoot)
}

export function migrateBackupToCurrentVersion(backup: BackupRoot): BackupRoot {
  if (backup.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `지원하지 않는 백업 schemaVersion입니다. 현재 지원 버전: ${BACKUP_SCHEMA_VERSION}, 백업 버전: ${backup.schemaVersion}`,
    )
  }

  return verifyTableCounts(backup)
}

export function createBackupSummary(backup: BackupRoot): BackupSummary {
  return {
    schemaVersion: backup.schemaVersion,
    backupVersion: backup.backupVersion,
    appName: backup.appName,
    exportedAt: backup.exportedAt,
    exportId: backup.exportId,
    tableCounts: backup.tableCounts,
  }
}

export function createBackupFileName(exportedAt = new Date()): string {
  const pad = (value: number) => value.toString().padStart(2, '0')
  const year = exportedAt.getFullYear()
  const month = pad(exportedAt.getMonth() + 1)
  const day = pad(exportedAt.getDate())
  const hours = pad(exportedAt.getHours())
  const minutes = pad(exportedAt.getMinutes())

  return `lifetime-ledger-backup-${year}-${month}-${day}-${hours}${minutes}.json`
}

export function createTableCounts(tables: BackupTables): BackupTableCounts {
  return {
    transactions: tables.transactions.length,
    categories: tables.categories.length,
    accounts: tables.accounts.length,
    recurringItems: tables.recurringItems.length,
    recurringGeneratedRecords: tables.recurringGeneratedRecords.length,
    monthlyClosings: tables.monthlyClosings.length,
    appSettings: tables.appSettings.length,
  }
}

function parseJsonIfNeeded(json: string | unknown): unknown {
  if (typeof json !== 'string') {
    return json
  }

  try {
    return JSON.parse(json)
  } catch {
    throw new Error('JSON 파일을 읽을 수 없습니다. 올바른 JSON 백업 파일인지 확인해 주세요.')
  }
}

function verifyTableCounts(backup: BackupRoot): BackupRoot {
  const actualCounts = createTableCounts(backup.tables)

  for (const tableName of BACKUP_TABLE_NAMES) {
    if (backup.tableCounts[tableName] !== actualCounts[tableName]) {
      throw new Error(
        `${tableName} 테이블 개수가 백업 요약과 일치하지 않습니다. 요약: ${backup.tableCounts[tableName]}, 실제: ${actualCounts[tableName]}`,
      )
    }
  }

  return backup
}

function formatBackupValidationError(error: z.ZodError): string {
  const firstIssue = error.issues[0]
  const path = firstIssue?.path.length ? firstIssue.path.join('.') : 'root'
  const message = firstIssue?.message ?? '백업 형식이 올바르지 않습니다.'

  return `백업 형식이 올바르지 않습니다. 위치: ${path}, 이유: ${message}`
}
