import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ensureSeedData } from '../db/seed'
import { LedgerDatabase } from '../db/schema'
import { createId } from '../domain/id'
import { exportAllTransactionsCsv } from './csvExport'
import {
  archiveAccount,
  archiveCategory,
  createAccount,
  createCategory,
  listAccounts,
  listActiveAccounts,
  listActiveCategories,
  listCategories,
  updateAccountName,
  updateCategoryName,
} from './referenceData'
import { createTransaction } from './transactions'

describe('reference data repository', () => {
  let database: LedgerDatabase

  beforeEach(async () => {
    const databaseName = `lifetime-ledger-reference-test-${createId()}`
    database = new LedgerDatabase(databaseName)
    await database.delete()
    database.close()
    database = new LedgerDatabase(databaseName)
    await ensureSeedData(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('excludes archived categories from new transaction choices but keeps their names for existing data', async () => {
    const category = await createCategory(
      { name: '구독료', type: 'expense' },
      database,
    )
    await createTransaction(
      {
        type: 'expense',
        date: '2026-05-25',
        amount: 12000,
        categoryId: category.id,
        accountId: 'account-cash',
      },
      database,
    )

    await updateCategoryName(category.id, '정기구독', database)
    await archiveCategory(category.id, database)

    expect(
      (await listActiveCategories(database)).some((item) => item.id === category.id),
    ).toBe(false)
    expect(
      (await listCategories(database)).find((item) => item.id === category.id)?.name,
    ).toBe('정기구독')
    expect(await exportAllTransactionsCsv({}, database)).toContain('정기구독')
  })

  it('excludes archived accounts from new transaction choices but keeps their names for existing data', async () => {
    const account = await createAccount(
      { name: '생활비 카드', kind: 'creditCard' },
      database,
    )
    await createTransaction(
      {
        type: 'expense',
        date: '2026-05-25',
        amount: 12000,
        categoryId: 'category-expense-food',
        accountId: account.id,
      },
      database,
    )

    await updateAccountName(account.id, '메인 생활비 카드', database)
    await archiveAccount(account.id, database)

    expect(
      (await listActiveAccounts(database)).some((item) => item.id === account.id),
    ).toBe(false)
    expect(
      (await listAccounts(database)).find((item) => item.id === account.id)?.name,
    ).toBe('메인 생활비 카드')
    expect(await exportAllTransactionsCsv({}, database)).toContain(
      '메인 생활비 카드',
    )
  })
})
