import type {
  Account,
  Category,
  MonthlyClosing,
  MonthlyClosingTotals,
  ExpenseRole,
  RecurringScheduleType,
  Transaction,
  TransactionType,
} from '../domain/types'
import type {
  BackupRoot,
  BackupSummary,
  LedgerBootstrapStatus,
  RecurringMonthStatusItem,
  RecurringPreviewItem,
} from '../repositories'

export type AppView =
  | 'home'
  | 'entry'
  | 'recurring'
  | 'closing'
  | 'export'
  | 'settings'

export interface LedgerViewData {
  categories: Category[]
  accounts: Account[]
  allCategories: Category[]
  allAccounts: Account[]
  transactions: Transaction[]
  summary: MonthlyClosingTotals
  recurringItems: RecurringMonthStatusItem[]
  recurringPreviews: RecurringPreviewItem[]
  monthlyClosing: MonthlyClosing | undefined
  isClosed: boolean
}

export interface TransactionFormState {
  type: TransactionType
  date: string
  amount: string
  categoryId: string
  accountId: string
  memo: string
}

export interface RecurringFormState {
  name: string
  amount: string
  categoryId: string
  accountId: string
  expenseRole: ExpenseRole
  scheduleType: RecurringScheduleType
  dayOfMonth: string
  startMonth: string
  endMonth: string
  memoTemplate: string
}

export type AppState =
  | { status: 'loading' }
  | { status: 'ready'; bootstrap: LedgerBootstrapStatus; data: LedgerViewData }
  | { status: 'error'; message: string }

export interface BackupUiState {
  message: string
  selectedBackup: BackupRoot | null
  summary: BackupSummary | null
  restoreConfirmation: string
}
