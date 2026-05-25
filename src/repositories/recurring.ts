import {
  createRecurringTransactionDraft,
  getRecurringItemScheduledDate,
  isRecurringItemCandidateForMonth,
  normalizeRecurringItemInput,
  normalizeRecurringItemPatch,
  type RecurringItemInput,
  type RecurringItemPatch,
} from '../domain/recurring'
import { createId } from '../domain/id'
import type {
  Account,
  Category,
  EntityId,
  MonthKey,
  RecurringGeneratedRecord,
  RecurringItem,
  Transaction,
} from '../domain/types'
import { db, type LedgerDatabase } from '../db/schema'
import { assertMonthOpen } from './monthlyClosings'

export type CreateRecurringItemInput = RecurringItemInput
export type UpdateRecurringItemPatch = RecurringItemPatch

export interface RecurringPreviewItem {
  item: RecurringItem
  scheduledDate: string
  category: Category
  account: Account
  alreadyGenerated: boolean
}

export type RecurringMonthStatus =
  | 'applied'
  | 'unapplied'
  | 'outOfPeriod'
  | 'archived'

export interface RecurringMonthStatusItem {
  item: RecurringItem
  status: RecurringMonthStatus
  scheduledDate?: string
  categoryName: string
  accountName: string
  generatedTransactionId?: EntityId
}

const UNKNOWN_LABEL = '(알 수 없음)'

export async function listRecurringItemsWithMonthStatus(
  monthKey: MonthKey,
  database: LedgerDatabase = db,
): Promise<RecurringMonthStatusItem[]> {
  const items = await database.recurringItems.toArray()
  const statusItems = await Promise.all(
    items
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(async (item) => {
        const [generatedRecord, category, account] = await Promise.all([
          database.recurringGeneratedRecords
            .where('[recurringItemId+monthKey]')
            .equals([item.id, monthKey])
            .first(),
          database.categories.get(item.categoryId),
          database.accounts.get(item.accountId),
        ])
        const isArchived = Boolean(item.deletedAt) || !item.active
        const isInPeriod = isRecurringItemInPeriod(item, monthKey)
        const status: RecurringMonthStatus = isArchived
          ? 'archived'
          : generatedRecord
            ? 'applied'
            : isInPeriod && item.type === 'expense'
              ? 'unapplied'
              : 'outOfPeriod'

        return {
          item,
          status,
          scheduledDate:
            !isArchived && isInPeriod && item.type === 'expense'
              ? getRecurringItemScheduledDate(item, monthKey)
              : undefined,
          categoryName: category?.name ?? UNKNOWN_LABEL,
          accountName: account?.name ?? UNKNOWN_LABEL,
          generatedTransactionId: generatedRecord?.transactionId,
        }
      }),
  )

  return statusItems
}

export async function listActiveRecurringItems(
  database: LedgerDatabase = db,
): Promise<RecurringItem[]> {
  const items = await database.recurringItems.toArray()

  return items
    .filter((item) => !item.deletedAt && item.active)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function createRecurringItem(
  input: CreateRecurringItemInput,
  database: LedgerDatabase = db,
): Promise<RecurringItem> {
  return database.transaction(
    'rw',
    database.recurringItems,
    database.categories,
    database.accounts,
    async () => {
      const [category] = await Promise.all([
        getUsableExpenseCategory(input.categoryId, database),
        getUsableAccount(input.accountId, database),
      ])
      const normalized = normalizeRecurringItemInput(input, category)
      const now = new Date().toISOString()
      const item: RecurringItem = {
        id: createId(),
        ...normalized,
        overflowPolicy: 'clampToLastDay',
        autoCreate: false,
        revision: 1,
        createdAt: now,
        updatedAt: now,
        localRevision: 1,
      }

      await database.recurringItems.add(item)

      return item
    },
  )
}

export async function updateRecurringItem(
  id: EntityId,
  patch: UpdateRecurringItemPatch,
  database: LedgerDatabase = db,
): Promise<RecurringItem> {
  return database.transaction(
    'rw',
    database.recurringItems,
    database.categories,
    database.accounts,
    async () => {
      const existing = await database.recurringItems.get(id)

      if (!existing || existing.deletedAt) {
        throw new Error('수정할 반복지출을 찾을 수 없습니다.')
      }

      const nextCategoryId = patch.categoryId ?? existing.categoryId
      const nextAccountId = patch.accountId ?? existing.accountId
      const [category] = await Promise.all([
        getUsableExpenseCategory(nextCategoryId, database),
        getUsableAccount(nextAccountId, database),
      ])
      const normalized = normalizeRecurringItemPatch(existing, patch, category)
      const updated: RecurringItem = {
        ...existing,
        ...normalized,
        updatedAt: new Date().toISOString(),
        revision: existing.revision + 1,
        localRevision: existing.localRevision + 1,
      }

      await database.recurringItems.put(updated)

      return updated
    },
  )
}

export async function archiveRecurringItem(
  id: EntityId,
  database: LedgerDatabase = db,
): Promise<RecurringItem> {
  return database.transaction('rw', database.recurringItems, async () => {
    const existing = await database.recurringItems.get(id)

    if (!existing || existing.deletedAt) {
      throw new Error('보관할 반복지출을 찾을 수 없습니다.')
    }

    const now = new Date().toISOString()
    const archived: RecurringItem = {
      ...existing,
      active: false,
      deletedAt: now,
      updatedAt: now,
      localRevision: existing.localRevision + 1,
    }

    await database.recurringItems.put(archived)

    return archived
  })
}

export async function previewRecurringItemsForMonth(
  monthKey: MonthKey,
  database: LedgerDatabase = db,
): Promise<RecurringPreviewItem[]> {
  const items = await listActiveRecurringItems(database)
  const previews = await Promise.all(
    items
      .filter((item) => isRecurringItemCandidateForMonth(item, monthKey))
      .map(async (item) => {
        const [generatedRecord, category, account] = await Promise.all([
          database.recurringGeneratedRecords
            .where('[recurringItemId+monthKey]')
            .equals([item.id, monthKey])
            .first(),
          getUsableExpenseCategory(item.categoryId, database),
          getUsableAccount(item.accountId, database),
        ])

        return {
          item,
          scheduledDate: getRecurringItemScheduledDate(item, monthKey),
          category,
          account,
          alreadyGenerated: Boolean(generatedRecord),
        }
      }),
  )

  return previews.filter((preview) => !preview.alreadyGenerated)
}

export async function applyRecurringItemsForMonth(
  monthKey: MonthKey,
  recurringItemIds?: EntityId[],
  database: LedgerDatabase = db,
): Promise<Transaction[]> {
  return database.transaction(
    'rw',
    [
      database.recurringItems,
      database.recurringGeneratedRecords,
      database.transactions,
      database.categories,
      database.accounts,
      database.monthlyClosings,
    ],
    async () => {
      await assertMonthOpen(monthKey, database)

      const idFilter = recurringItemIds ? new Set(recurringItemIds) : undefined
      const items = (await listActiveRecurringItems(database)).filter(
        (item) =>
          isRecurringItemCandidateForMonth(item, monthKey) &&
          (!idFilter || idFilter.has(item.id)),
      )
      const createdTransactions: Transaction[] = []

      for (const item of items) {
        const existingRecord = await database.recurringGeneratedRecords
          .where('[recurringItemId+monthKey]')
          .equals([item.id, monthKey])
          .first()

        if (existingRecord) {
          continue
        }

        const [category, account] = await Promise.all([
          getUsableExpenseCategory(item.categoryId, database),
          getUsableAccount(item.accountId, database),
        ])
        const now = new Date().toISOString()
        const transactionId = createId()
        const generatedRecordId = createId()
        const draft = createRecurringTransactionDraft(item, monthKey, category)
        const transaction: Transaction = {
          id: transactionId,
          ...draft,
          currency: 'KRW',
          source: 'recurring',
          recurringItemId: item.id,
          recurringGeneratedRecordId: generatedRecordId,
          recurringItemRevision: item.revision,
          isRecurringOverride: false,
          createdAt: now,
          updatedAt: now,
          localRevision: 1,
        }
        const generatedRecord: RecurringGeneratedRecord = {
          id: generatedRecordId,
          recurringItemId: item.id,
          monthKey,
          transactionId,
          scheduledDate: draft.date,
          generatedAt: now,
          createdAt: now,
          updatedAt: now,
          localRevision: 1,
        }

        if (account.deletedAt) {
          throw new Error('삭제된 계좌는 사용할 수 없습니다.')
        }

        await database.transactions.add(transaction)
        await database.recurringGeneratedRecords.add(generatedRecord)
        createdTransactions.push(transaction)
      }

      return createdTransactions
    },
  )
}

async function getUsableExpenseCategory(
  id: EntityId,
  database: LedgerDatabase,
): Promise<Category> {
  const category = await database.categories.get(id)

  if (!category || category.deletedAt || category.isArchived) {
    throw new Error('사용할 수 없는 카테고리입니다.')
  }

  if (category.type !== 'expense') {
    throw new Error('반복지출에는 지출 카테고리만 사용할 수 있습니다.')
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

function isRecurringItemInPeriod(item: RecurringItem, monthKey: MonthKey): boolean {
  if (monthKey < item.startMonth) {
    return false
  }

  if (item.endMonth && monthKey > item.endMonth) {
    return false
  }

  return true
}
