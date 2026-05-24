import type { Account, AppSettings, Category, EntityBase } from '../domain/types'
import { db, type LedgerDatabase } from './schema'

export const APP_SETTINGS_ID = 'singleton' as const

type SeedEntity<T extends EntityBase> = Omit<
  T,
  'createdAt' | 'updatedAt' | 'deletedAt' | 'localRevision'
>

export const DEFAULT_CATEGORY_DEFINITIONS: ReadonlyArray<SeedEntity<Category>> = [
  {
    id: 'category-income-salary',
    name: '월급',
    type: 'income',
    color: '#0f766e',
    icon: 'briefcase',
    sortOrder: 10,
    isDefault: true,
    isArchived: false,
  },
  {
    id: 'category-income-other',
    name: '기타수입',
    type: 'income',
    color: '#2563eb',
    icon: 'plus',
    sortOrder: 20,
    isDefault: true,
    isArchived: false,
  },
  {
    id: 'category-expense-food',
    name: '식비',
    type: 'expense',
    expenseRole: 'variable',
    color: '#dc2626',
    icon: 'utensils',
    sortOrder: 110,
    isDefault: true,
    isArchived: false,
  },
  {
    id: 'category-expense-transport',
    name: '교통',
    type: 'expense',
    expenseRole: 'variable',
    color: '#ca8a04',
    icon: 'train',
    sortOrder: 120,
    isDefault: true,
    isArchived: false,
  },
  {
    id: 'category-expense-housing',
    name: '주거',
    type: 'expense',
    expenseRole: 'fixed',
    color: '#7c3aed',
    icon: 'home',
    sortOrder: 130,
    isDefault: true,
    isArchived: false,
  },
  {
    id: 'category-expense-utilities',
    name: '공과금',
    type: 'expense',
    expenseRole: 'fixed',
    color: '#0891b2',
    icon: 'receipt',
    sortOrder: 140,
    isDefault: true,
    isArchived: false,
  },
  {
    id: 'category-expense-communication',
    name: '통신',
    type: 'expense',
    expenseRole: 'fixed',
    color: '#4f46e5',
    icon: 'phone',
    sortOrder: 150,
    isDefault: true,
    isArchived: false,
  },
  {
    id: 'category-expense-insurance',
    name: '보험',
    type: 'expense',
    expenseRole: 'fixed',
    color: '#0e7490',
    icon: 'shield',
    sortOrder: 160,
    isDefault: true,
    isArchived: false,
  },
  {
    id: 'category-expense-shopping',
    name: '쇼핑',
    type: 'expense',
    expenseRole: 'variable',
    color: '#db2777',
    icon: 'shopping-bag',
    sortOrder: 170,
    isDefault: true,
    isArchived: false,
  },
  {
    id: 'category-expense-medical',
    name: '의료',
    type: 'expense',
    expenseRole: 'variable',
    color: '#16a34a',
    icon: 'heart-pulse',
    sortOrder: 180,
    isDefault: true,
    isArchived: false,
  },
  {
    id: 'category-expense-culture',
    name: '문화',
    type: 'expense',
    expenseRole: 'variable',
    color: '#ea580c',
    icon: 'ticket',
    sortOrder: 190,
    isDefault: true,
    isArchived: false,
  },
  {
    id: 'category-expense-saving-investment',
    name: '저축/투자',
    type: 'expense',
    expenseRole: 'savingInvestment',
    color: '#059669',
    icon: 'trending-up',
    sortOrder: 200,
    isDefault: true,
    isArchived: false,
  },
]

export const DEFAULT_ACCOUNT_DEFINITIONS: ReadonlyArray<SeedEntity<Account>> = [
  {
    id: 'account-cash',
    name: '현금',
    kind: 'cash',
    color: '#0f766e',
    sortOrder: 10,
    isArchived: false,
    assetTrackingEnabled: false,
  },
  {
    id: 'account-debit-card',
    name: '체크카드',
    kind: 'debitCard',
    color: '#2563eb',
    sortOrder: 20,
    isArchived: false,
    assetTrackingEnabled: false,
  },
  {
    id: 'account-credit-card',
    name: '신용카드',
    kind: 'creditCard',
    color: '#7c3aed',
    sortOrder: 30,
    isArchived: false,
    assetTrackingEnabled: false,
  },
  {
    id: 'account-bank-account',
    name: '은행계좌',
    kind: 'bankAccount',
    color: '#0891b2',
    sortOrder: 40,
    isArchived: false,
    assetTrackingEnabled: false,
  },
  {
    id: 'account-other',
    name: '기타',
    kind: 'other',
    color: '#475569',
    sortOrder: 50,
    isArchived: false,
    assetTrackingEnabled: false,
  },
]

export interface SeedResult {
  categoriesCreated: number
  accountsCreated: number
  settingsCreated: boolean
}

export async function ensureSeedData(
  database: LedgerDatabase = db,
): Promise<SeedResult> {
  const now = new Date().toISOString()

  return database.transaction(
    'rw',
    database.categories,
    database.accounts,
    database.appSettings,
    async () => {
      const categoryCount = await database.categories.count()
      const accountCount = await database.accounts.count()
      const settings = await database.appSettings.get(APP_SETTINGS_ID)
      let categoriesCreated = 0
      let accountsCreated = 0
      let settingsCreated = false

      if (categoryCount === 0) {
        const categories = DEFAULT_CATEGORY_DEFINITIONS.map((category) =>
          withEntityMetadata(category, now),
        )
        await database.categories.bulkPut(categories)
        categoriesCreated = categories.length
      }

      if (accountCount === 0) {
        const accounts = DEFAULT_ACCOUNT_DEFINITIONS.map((account) =>
          withEntityMetadata(account, now),
        )
        await database.accounts.bulkPut(accounts)
        accountsCreated = accounts.length
      }

      if (!settings) {
        await database.appSettings.put(createDefaultAppSettings())
        settingsCreated = true
      }

      return {
        categoriesCreated,
        accountsCreated,
        settingsCreated,
      }
    },
  )
}

function withEntityMetadata<T extends SeedEntity<EntityBase>>(
  entity: T,
  timestamp: string,
): T & Pick<EntityBase, 'createdAt' | 'updatedAt' | 'localRevision'> {
  return {
    ...entity,
    createdAt: timestamp,
    updatedAt: timestamp,
    localRevision: 1,
  }
}

function createDefaultAppSettings(): AppSettings {
  return {
    id: APP_SETTINGS_ID,
    schemaVersion: 1,
    currency: 'KRW',
    timezone: getDefaultTimezone(),
    monthStartDay: 1,
    backupReminderEnabled: true,
    recurringApplyMode: 'manual',
  }
}

function getDefaultTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul'
}
