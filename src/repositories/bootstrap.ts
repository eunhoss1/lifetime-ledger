import type { AppSettings } from '../domain/types'
import { ensureSeedData, type SeedResult } from '../db/seed'
import { db, DB_NAME, DB_VERSION, type LedgerDatabase } from '../db/schema'

export interface LedgerBootstrapStatus {
  databaseName: string
  databaseVersion: number
  isOpen: boolean
  seed: SeedResult
  categoryCount: number
  accountCount: number
  settings: AppSettings
}

export async function initializeLedgerRepository(
  database: LedgerDatabase = db,
): Promise<LedgerBootstrapStatus> {
  await database.open()

  const seed = await ensureSeedData(database)
  const [categoryCount, accountCount, settings] = await Promise.all([
    database.categories.count(),
    database.accounts.count(),
    database.appSettings.get('singleton'),
  ])

  if (!settings) {
    throw new Error('App settings were not initialized.')
  }

  return {
    databaseName: DB_NAME,
    databaseVersion: DB_VERSION,
    isOpen: database.isOpen(),
    seed,
    categoryCount,
    accountCount,
    settings,
  }
}
