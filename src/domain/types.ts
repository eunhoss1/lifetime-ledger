export type EntityId = string
export type ISODateString = string
export type ISODateTimeString = string
export type MonthKey = string
export type CurrencyCode = 'KRW'

export interface EntityBase {
  id: EntityId
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
  deletedAt?: ISODateTimeString
  localRevision: number
}

export type TransactionType = 'income' | 'expense'
export type TransactionSource = 'manual' | 'recurring'
export type ExpenseRole = 'fixed' | 'variable' | 'savingInvestment'

export interface Transaction extends EntityBase {
  type: TransactionType
  date: ISODateString
  monthKey: MonthKey
  amount: number
  currency: CurrencyCode
  categoryId: EntityId
  accountId: EntityId
  memo?: string
  source: TransactionSource
  recurringItemId?: EntityId
  recurringGeneratedRecordId?: EntityId
  recurringItemRevision?: number
  isRecurringOverride: boolean
  expenseRole?: ExpenseRole
}

export interface Category extends EntityBase {
  name: string
  type: TransactionType
  expenseRole?: ExpenseRole
  color: string
  icon: string
  sortOrder: number
  isDefault: boolean
  isArchived: boolean
}

export type AccountKind =
  | 'cash'
  | 'debitCard'
  | 'creditCard'
  | 'bankAccount'
  | 'other'

export interface Account extends EntityBase {
  name: string
  kind: AccountKind
  color: string
  sortOrder: number
  isArchived: boolean
  assetTrackingEnabled: boolean
}

export type RecurringScheduleType = 'dayOfMonth' | 'lastDayOfMonth'
export type RecurringOverflowPolicy = 'clampToLastDay'

export interface RecurringItem extends EntityBase {
  name: string
  type: TransactionType
  amount: number
  categoryId: EntityId
  accountId: EntityId
  memoTemplate?: string
  scheduleType: RecurringScheduleType
  dayOfMonth?: number
  overflowPolicy: RecurringOverflowPolicy
  startMonth: MonthKey
  endMonth?: MonthKey
  active: boolean
  autoCreate: boolean
  revision: number
}

export interface RecurringGeneratedRecord extends EntityBase {
  recurringItemId: EntityId
  monthKey: MonthKey
  transactionId: EntityId
  scheduledDate: ISODateString
  generatedAt: ISODateTimeString
}

export type MonthlyClosingStatus = 'draft' | 'closed' | 'reopened'

export interface MonthlyClosingTotals {
  income: number
  expense: number
  fixedExpense: number
  variableExpense: number
  savingInvestment: number
  remaining: number
}

export interface MonthlyClosing extends EntityBase {
  monthKey: MonthKey
  status: MonthlyClosingStatus
  totals: MonthlyClosingTotals
  note?: string
  closedAt?: ISODateTimeString
  reopenedAt?: ISODateTimeString
}

export interface AppSettings {
  id: 'singleton'
  schemaVersion: number
  currency: CurrencyCode
  timezone: string
  monthStartDay: 1
  backupReminderEnabled: boolean
  lastBackupAt?: ISODateTimeString
  recurringApplyMode: 'manual'
}
