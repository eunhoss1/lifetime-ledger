import { createTransactionsCsv } from '../domain/csv'
import type { MonthKey } from '../domain/types'
import { db, type LedgerDatabase } from '../db/schema'

export interface CsvExportOptions {
  excelCompatible?: boolean
  includeBom?: boolean
  includeDeleted?: boolean
}

export async function exportTransactionsCsvByMonth(
  monthKey: MonthKey,
  options: CsvExportOptions = {},
  database: LedgerDatabase = db,
): Promise<string> {
  const [transactions, categories, accounts] = await Promise.all([
    database.transactions.where('monthKey').equals(monthKey).toArray(),
    database.categories.toArray(),
    database.accounts.toArray(),
  ])

  return createTransactionsCsv(transactions, categories, accounts, {
    excelCompatible: true,
    includeBom: true,
    ...options,
  })
}

export async function exportAllTransactionsCsv(
  options: CsvExportOptions = {},
  database: LedgerDatabase = db,
): Promise<string> {
  const [transactions, categories, accounts] = await Promise.all([
    database.transactions.toArray(),
    database.categories.toArray(),
    database.accounts.toArray(),
  ])

  return createTransactionsCsv(transactions, categories, accounts, {
    excelCompatible: true,
    includeBom: true,
    ...options,
  })
}
