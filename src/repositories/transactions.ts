import {
  calculateMonthlyTransactionSummary,
  normalizeTransactionInput,
  normalizeTransactionPatch,
  type TransactionInput,
  type TransactionPatch,
} from '../domain/transactions'
import type {
  Account,
  Category,
  EntityId,
  MonthlyClosingTotals,
  MonthKey,
  Transaction,
} from '../domain/types'
import { db, type LedgerDatabase } from '../db/schema'

export type CreateTransactionInput = TransactionInput
export type UpdateTransactionPatch = TransactionPatch

export async function listTransactionsByMonth(
  monthKey: MonthKey,
  database: LedgerDatabase = db,
): Promise<Transaction[]> {
  const transactions = await database.transactions
    .where('monthKey')
    .equals(monthKey)
    .toArray()

  return transactions
    .filter((transaction) => !transaction.deletedAt)
    .sort((a, b) => {
      const dateOrder = b.date.localeCompare(a.date)
      return dateOrder === 0 ? b.updatedAt.localeCompare(a.updatedAt) : dateOrder
    })
}

export async function createTransaction(
  input: CreateTransactionInput,
  database: LedgerDatabase = db,
): Promise<Transaction> {
  return database.transaction(
    'rw',
    database.transactions,
    database.categories,
    database.accounts,
    async () => {
      const [category, account] = await Promise.all([
        getUsableCategory(input.categoryId, database),
        getUsableAccount(input.accountId, database),
      ])
      const normalized = normalizeTransactionInput(input, category)
      const now = new Date().toISOString()
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        ...normalized,
        currency: 'KRW',
        source: 'manual',
        isRecurringOverride: false,
        createdAt: now,
        updatedAt: now,
        localRevision: 1,
      }

      if (account.deletedAt) {
        throw new Error('삭제된 계좌는 사용할 수 없습니다.')
      }

      await database.transactions.add(transaction)

      return transaction
    },
  )
}

export async function updateTransaction(
  id: EntityId,
  patch: UpdateTransactionPatch,
  database: LedgerDatabase = db,
): Promise<Transaction> {
  return database.transaction(
    'rw',
    database.transactions,
    database.categories,
    database.accounts,
    async () => {
      const existing = await database.transactions.get(id)

      if (!existing || existing.deletedAt) {
        throw new Error('수정할 거래를 찾을 수 없습니다.')
      }

      const nextCategoryId = patch.categoryId ?? existing.categoryId
      const nextAccountId = patch.accountId ?? existing.accountId
      const [category] = await Promise.all([
        getUsableCategory(nextCategoryId, database),
        getUsableAccount(nextAccountId, database),
      ])
      const normalized = normalizeTransactionPatch(existing, patch, category)
      const updated: Transaction = {
        ...existing,
        ...normalized,
        updatedAt: new Date().toISOString(),
        localRevision: existing.localRevision + 1,
      }

      await database.transactions.put(updated)

      return updated
    },
  )
}

export async function softDeleteTransaction(
  id: EntityId,
  database: LedgerDatabase = db,
): Promise<Transaction> {
  return database.transaction('rw', database.transactions, async () => {
    const existing = await database.transactions.get(id)

    if (!existing || existing.deletedAt) {
      throw new Error('삭제할 거래를 찾을 수 없습니다.')
    }

    const timestamp = new Date().toISOString()
    const deleted: Transaction = {
      ...existing,
      deletedAt: timestamp,
      updatedAt: timestamp,
      localRevision: existing.localRevision + 1,
    }

    await database.transactions.put(deleted)

    return deleted
  })
}

export async function getMonthlyTransactionSummary(
  monthKey: MonthKey,
  database: LedgerDatabase = db,
): Promise<MonthlyClosingTotals> {
  const transactions = await listTransactionsByMonth(monthKey, database)

  return calculateMonthlyTransactionSummary(transactions)
}

async function getUsableCategory(
  id: EntityId,
  database: LedgerDatabase,
): Promise<Category> {
  const category = await database.categories.get(id)

  if (!category || category.deletedAt || category.isArchived) {
    throw new Error('사용할 수 없는 카테고리입니다.')
  }

  return category
}

async function getUsableAccount(
  id: EntityId,
  database: LedgerDatabase,
): Promise<Account> {
  const account = await database.accounts.get(id)

  if (!account || account.deletedAt || account.isArchived) {
    throw new Error('사용할 수 없는 계좌입니다.')
  }

  return account
}
