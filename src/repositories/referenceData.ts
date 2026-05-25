import type {
  Account,
  AccountKind,
  Category,
  EntityId,
  TransactionType,
} from '../domain/types'
import { createId } from '../domain/id'
import { db, type LedgerDatabase } from '../db/schema'

export interface CreateCategoryInput {
  name: string
  type: TransactionType
}

export interface CreateAccountInput {
  name: string
  kind: AccountKind
}

export async function listCategories(
  database: LedgerDatabase = db,
): Promise<Category[]> {
  const categories = await database.categories.toArray()

  return categories
    .filter((category) => !category.deletedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export async function listActiveCategories(
  database: LedgerDatabase = db,
): Promise<Category[]> {
  return (await listCategories(database))
    .filter((category) => !category.deletedAt && !category.isArchived)
}

export async function createCategory(
  input: CreateCategoryInput,
  database: LedgerDatabase = db,
): Promise<Category> {
  const name = normalizeName(input.name, '카테고리 이름')
  const now = new Date().toISOString()
  const category: Category = {
    id: createId(),
    name,
    type: input.type,
    expenseRole: input.type === 'expense' ? 'variable' : undefined,
    color: input.type === 'expense' ? '#64748b' : '#0f766e',
    icon: 'circle',
    sortOrder: await getNextSortOrder(database.categories),
    isDefault: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    localRevision: 1,
  }

  await database.categories.add(category)

  return category
}

export async function updateCategoryName(
  id: EntityId,
  name: string,
  database: LedgerDatabase = db,
): Promise<Category> {
  return database.transaction('rw', database.categories, async () => {
    const category = await database.categories.get(id)

    if (!category || category.deletedAt) {
      throw new Error('수정할 카테고리를 찾을 수 없습니다.')
    }

    const updated: Category = {
      ...category,
      name: normalizeName(name, '카테고리 이름'),
      updatedAt: new Date().toISOString(),
      localRevision: category.localRevision + 1,
    }

    await database.categories.put(updated)

    return updated
  })
}

export async function archiveCategory(
  id: EntityId,
  database: LedgerDatabase = db,
): Promise<Category> {
  return database.transaction('rw', database.categories, async () => {
    const category = await database.categories.get(id)

    if (!category || category.deletedAt) {
      throw new Error('보관할 카테고리를 찾을 수 없습니다.')
    }

    const updated: Category = {
      ...category,
      isArchived: true,
      updatedAt: new Date().toISOString(),
      localRevision: category.localRevision + 1,
    }

    await database.categories.put(updated)

    return updated
  })
}

export async function listAccounts(
  database: LedgerDatabase = db,
): Promise<Account[]> {
  const accounts = await database.accounts.toArray()

  return accounts
    .filter((account) => !account.deletedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export async function listActiveAccounts(
  database: LedgerDatabase = db,
): Promise<Account[]> {
  return (await listAccounts(database))
    .filter((account) => !account.deletedAt && !account.isArchived)
}

export async function createAccount(
  input: CreateAccountInput,
  database: LedgerDatabase = db,
): Promise<Account> {
  const now = new Date().toISOString()
  const account: Account = {
    id: createId(),
    name: normalizeName(input.name, '계좌 이름'),
    kind: input.kind,
    color: '#64748b',
    sortOrder: await getNextSortOrder(database.accounts),
    isArchived: false,
    assetTrackingEnabled: false,
    createdAt: now,
    updatedAt: now,
    localRevision: 1,
  }

  await database.accounts.add(account)

  return account
}

export async function updateAccountName(
  id: EntityId,
  name: string,
  database: LedgerDatabase = db,
): Promise<Account> {
  return database.transaction('rw', database.accounts, async () => {
    const account = await database.accounts.get(id)

    if (!account || account.deletedAt) {
      throw new Error('수정할 계좌를 찾을 수 없습니다.')
    }

    const updated: Account = {
      ...account,
      name: normalizeName(name, '계좌 이름'),
      updatedAt: new Date().toISOString(),
      localRevision: account.localRevision + 1,
    }

    await database.accounts.put(updated)

    return updated
  })
}

export async function archiveAccount(
  id: EntityId,
  database: LedgerDatabase = db,
): Promise<Account> {
  return database.transaction('rw', database.accounts, async () => {
    const account = await database.accounts.get(id)

    if (!account || account.deletedAt) {
      throw new Error('보관할 계좌를 찾을 수 없습니다.')
    }

    const updated: Account = {
      ...account,
      isArchived: true,
      updatedAt: new Date().toISOString(),
      localRevision: account.localRevision + 1,
    }

    await database.accounts.put(updated)

    return updated
  })
}

async function getNextSortOrder(
  table: LedgerDatabase['categories'] | LedgerDatabase['accounts'],
): Promise<number> {
  const items = await table.toArray()
  const maxSortOrder = items.reduce(
    (max, item) => Math.max(max, item.sortOrder),
    0,
  )

  return maxSortOrder + 10
}

function normalizeName(value: string, fieldName: string): string {
  const normalized = value.trim()

  if (!normalized) {
    throw new Error(`${fieldName}을 입력해야 합니다.`)
  }

  return normalized
}
