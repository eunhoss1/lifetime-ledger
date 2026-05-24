import { describe, expect, it } from 'vitest'
import { db, DB_NAME, DB_VERSION } from './schema'

describe('Dexie schema', () => {
  it('defines the v1 database and tables', () => {
    expect(db.name).toBe(DB_NAME)
    expect(db.verno).toBe(DB_VERSION)
    expect(db.tables.map((table) => table.name).sort()).toEqual([
      'accounts',
      'appSettings',
      'categories',
      'monthlyClosings',
      'recurringGeneratedRecords',
      'recurringItems',
      'transactions',
    ])
  })
})
