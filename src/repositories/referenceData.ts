import type { Account, Category } from '../domain/types'
import { db, type LedgerDatabase } from '../db/schema'

export async function listActiveCategories(
  database: LedgerDatabase = db,
): Promise<Category[]> {
  const categories = await database.categories.toArray()

  return categories
    .filter((category) => !category.deletedAt && !category.isArchived)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export async function listActiveAccounts(
  database: LedgerDatabase = db,
): Promise<Account[]> {
  const accounts = await database.accounts.toArray()

  return accounts
    .filter((account) => !account.deletedAt && !account.isArchived)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}
