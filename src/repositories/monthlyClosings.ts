import { calculateMonthlyClosingSnapshot } from '../domain/closing'
import type { MonthlyClosing, MonthKey } from '../domain/types'
import { db, type LedgerDatabase } from '../db/schema'

export const CLOSED_MONTH_MESSAGE = '닫힌 월입니다. 다시 열기 후 수정하세요.'

export async function getMonthlyClosing(
  monthKey: MonthKey,
  database: LedgerDatabase = db,
): Promise<MonthlyClosing | undefined> {
  return database.monthlyClosings.where('monthKey').equals(monthKey).first()
}

export async function isMonthClosed(
  monthKey: MonthKey,
  database: LedgerDatabase = db,
): Promise<boolean> {
  const closing = await getMonthlyClosing(monthKey, database)

  return closing?.status === 'closed' && !closing.deletedAt
}

export async function assertMonthOpen(
  monthKey: MonthKey,
  database: LedgerDatabase = db,
): Promise<void> {
  if (await isMonthClosed(monthKey, database)) {
    throw new Error(CLOSED_MONTH_MESSAGE)
  }
}

export async function closeMonth(
  monthKey: MonthKey,
  note?: string,
  database: LedgerDatabase = db,
): Promise<MonthlyClosing> {
  return database.transaction(
    'rw',
    [
      database.monthlyClosings,
      database.transactions,
      database.categories,
      database.accounts,
    ],
    async () => {
      const [existing, transactions, categories, accounts] = await Promise.all([
        getMonthlyClosing(monthKey, database),
        database.transactions.where('monthKey').equals(monthKey).toArray(),
        database.categories.toArray(),
        database.accounts.toArray(),
      ])
      const now = new Date().toISOString()
      const snapshot = calculateMonthlyClosingSnapshot({
        monthKey,
        transactions,
        categories,
        accounts,
        note,
        status: 'closed',
      })
      const closing: MonthlyClosing = {
        id: existing?.id ?? crypto.randomUUID(),
        ...snapshot,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        localRevision: (existing?.localRevision ?? 0) + 1,
        closedAt: now,
        reopenedAt: existing?.reopenedAt,
      }

      await database.monthlyClosings.put(closing)

      return closing
    },
  )
}

export async function reopenMonth(
  monthKey: MonthKey,
  database: LedgerDatabase = db,
): Promise<MonthlyClosing> {
  return database.transaction('rw', database.monthlyClosings, async () => {
    const existing = await getMonthlyClosing(monthKey, database)

    if (!existing || existing.deletedAt) {
      throw new Error('다시 열 월마감 기록을 찾을 수 없습니다.')
    }

    const now = new Date().toISOString()
    const reopened: MonthlyClosing = {
      ...existing,
      status: 'reopened',
      updatedAt: now,
      reopenedAt: now,
      localRevision: existing.localRevision + 1,
    }

    await database.monthlyClosings.put(reopened)

    return reopened
  })
}
