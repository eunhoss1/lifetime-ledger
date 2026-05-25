import type { Account, Category, Transaction } from './types'

export const UNKNOWN_LABEL = '(알 수 없음)'
export const UTF8_BOM = '\uFEFF'

export interface TransactionCsvExportOptions {
  excelCompatible?: boolean
  includeBom?: boolean
  includeDeleted?: boolean
}

export interface TransactionCsvRow {
  date: string
  monthKey: string
  type: string
  amount: number
  currency: string
  categoryName: string
  categoryId: string
  accountName: string
  accountId: string
  memo: string
  source: string
  expenseRole: string
  recurringItemId: string
  recurringGeneratedRecordId: string
  createdAt: string
  updatedAt: string
}

export const TRANSACTION_CSV_COLUMNS: ReadonlyArray<keyof TransactionCsvRow> = [
  'date',
  'monthKey',
  'type',
  'amount',
  'currency',
  'categoryName',
  'categoryId',
  'accountName',
  'accountId',
  'memo',
  'source',
  'expenseRole',
  'recurringItemId',
  'recurringGeneratedRecordId',
  'createdAt',
  'updatedAt',
]

export function createTransactionsCsv(
  transactions: ReadonlyArray<Transaction>,
  categories: ReadonlyArray<Category>,
  accounts: ReadonlyArray<Account>,
  options: TransactionCsvExportOptions = {},
): string {
  const categoryById = new Map(
    categories.map((category) => [category.id, category.name]),
  )
  const accountById = new Map(accounts.map((account) => [account.id, account.name]))
  const rows = transactions
    .filter((transaction) => options.includeDeleted || !transaction.deletedAt)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map((transaction) =>
      createTransactionCsvRow(
        transaction,
        categoryById.get(transaction.categoryId) ?? UNKNOWN_LABEL,
        accountById.get(transaction.accountId) ?? UNKNOWN_LABEL,
        options,
      ),
    )

  return stringifyCsvRows(rows, options)
}

export function stringifyCsvRows(
  rows: ReadonlyArray<TransactionCsvRow>,
  options: Pick<TransactionCsvExportOptions, 'includeBom'> = {},
): string {
  const lines = [
    TRANSACTION_CSV_COLUMNS.join(','),
    ...rows.map((row) =>
      TRANSACTION_CSV_COLUMNS.map((column) => escapeCsvValue(row[column])).join(','),
    ),
  ]
  const csv = `${lines.join('\r\n')}\r\n`

  return options.includeBom ? `${UTF8_BOM}${csv}` : csv
}

export function escapeCsvValue(value: string | number): string {
  const raw = String(value)

  if (raw === '') {
    return ''
  }

  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replaceAll('"', '""')}"`
  }

  return raw
}

export function createTransactionsCsvFileNameForMonth(monthKey: string): string {
  return `lifetime-ledger-transactions-${monthKey}.csv`
}

export function createAllTransactionsCsvFileName(exportedAt = new Date()): string {
  const pad = (value: number) => value.toString().padStart(2, '0')
  const year = exportedAt.getFullYear()
  const month = pad(exportedAt.getMonth() + 1)
  const day = pad(exportedAt.getDate())
  const hours = pad(exportedAt.getHours())
  const minutes = pad(exportedAt.getMinutes())

  return `lifetime-ledger-transactions-all-${year}-${month}-${day}-${hours}${minutes}.csv`
}

function createTransactionCsvRow(
  transaction: Transaction,
  categoryName: string,
  accountName: string,
  options: Pick<TransactionCsvExportOptions, 'excelCompatible'>,
): TransactionCsvRow {
  return {
    date: transaction.date,
    monthKey: options.excelCompatible
      ? createExcelTextValue(transaction.monthKey)
      : transaction.monthKey,
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    categoryName,
    categoryId: transaction.categoryId,
    accountName,
    accountId: transaction.accountId,
    memo: transaction.memo ?? '',
    source: transaction.source,
    expenseRole: transaction.expenseRole ?? '',
    recurringItemId: transaction.recurringItemId ?? '',
    recurringGeneratedRecordId: transaction.recurringGeneratedRecordId ?? '',
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  }
}

function createExcelTextValue(value: string): string {
  return `="${value}"`
}
