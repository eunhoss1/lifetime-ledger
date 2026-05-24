import Dexie, { type EntityTable } from 'dexie'
import type {
  Account,
  AppSettings,
  Category,
  MonthlyClosing,
  RecurringGeneratedRecord,
  RecurringItem,
  Transaction,
} from '../domain/types'

export const DB_NAME = 'lifetime-ledger'
export const DB_VERSION = 1

export class LedgerDatabase extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>
  categories!: EntityTable<Category, 'id'>
  accounts!: EntityTable<Account, 'id'>
  recurringItems!: EntityTable<RecurringItem, 'id'>
  recurringGeneratedRecords!: EntityTable<RecurringGeneratedRecord, 'id'>
  monthlyClosings!: EntityTable<MonthlyClosing, 'id'>
  appSettings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super(DB_NAME)

    this.version(DB_VERSION).stores({
      transactions:
        'id, monthKey, date, type, categoryId, accountId, source, deletedAt',
      categories: 'id, type, sortOrder, isArchived, deletedAt',
      accounts: 'id, kind, sortOrder, isArchived, deletedAt',
      recurringItems: 'id, type, active, startMonth, endMonth, deletedAt',
      recurringGeneratedRecords:
        'id, &[recurringItemId+monthKey], recurringItemId, monthKey, transactionId',
      monthlyClosings: 'id, &monthKey, status, deletedAt',
      appSettings: 'id',
    })
  }
}

export const db = new LedgerDatabase()
