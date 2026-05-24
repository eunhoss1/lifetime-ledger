import { calculateMonthlyTransactionSummary } from './transactions'
import type {
  Account,
  Category,
  MonthlyClosing,
  MonthlyClosingAccountSummary,
  MonthlyClosingCategorySummary,
  MonthlyClosingStatus,
  MonthKey,
  Transaction,
} from './types'

export interface MonthlyClosingSnapshotInput {
  monthKey: MonthKey
  transactions: ReadonlyArray<Transaction>
  categories: ReadonlyArray<Category>
  accounts: ReadonlyArray<Account>
  note?: string
  status: MonthlyClosingStatus
}

export type MonthlyClosingSnapshot = Omit<
  MonthlyClosing,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'localRevision' | 'closedAt' | 'reopenedAt'
>

export function calculateMonthlyClosingSnapshot({
  monthKey,
  transactions,
  categories,
  accounts,
  note,
  status,
}: MonthlyClosingSnapshotInput): MonthlyClosingSnapshot {
  const activeTransactions = transactions.filter(
    (transaction) => !transaction.deletedAt && transaction.monthKey === monthKey,
  )
  const totals = calculateMonthlyTransactionSummary(activeTransactions)

  return {
    monthKey,
    status,
    totals,
    incomeTotal: totals.income,
    expenseTotal: totals.expense,
    fixedExpenseTotal: totals.fixedExpense,
    variableExpenseTotal: totals.variableExpense,
    savingInvestmentTotal: totals.savingInvestment,
    remaining: totals.remaining,
    transactionCount: activeTransactions.length,
    categorySummaries: calculateCategorySummaries(
      activeTransactions,
      categories,
    ),
    accountSummaries: calculateAccountSummaries(activeTransactions, accounts),
    note: normalizeNote(note),
  }
}

function calculateCategorySummaries(
  transactions: ReadonlyArray<Transaction>,
  categories: ReadonlyArray<Category>,
): MonthlyClosingCategorySummary[] {
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  )
  const summaries = new Map<string, MonthlyClosingCategorySummary>()

  for (const transaction of transactions) {
    const category = categoryById.get(transaction.categoryId)
    const existing = summaries.get(transaction.categoryId)
    const summary =
      existing ??
      ({
        categoryId: transaction.categoryId,
        categoryName: category?.name ?? '알 수 없음',
        type: transaction.type,
        expenseRole: category?.expenseRole ?? transaction.expenseRole,
        incomeTotal: 0,
        expenseTotal: 0,
        transactionCount: 0,
      } satisfies MonthlyClosingCategorySummary)

    if (transaction.type === 'income') {
      summary.incomeTotal += transaction.amount
    } else {
      summary.expenseTotal += transaction.amount
    }

    summary.transactionCount += 1
    summaries.set(transaction.categoryId, summary)
  }

  return [...summaries.values()].sort((a, b) => {
    const totalDiff =
      b.incomeTotal + b.expenseTotal - (a.incomeTotal + a.expenseTotal)

    return totalDiff === 0 ? a.categoryName.localeCompare(b.categoryName) : totalDiff
  })
}

function calculateAccountSummaries(
  transactions: ReadonlyArray<Transaction>,
  accounts: ReadonlyArray<Account>,
): MonthlyClosingAccountSummary[] {
  const accountById = new Map(accounts.map((account) => [account.id, account]))
  const summaries = new Map<string, MonthlyClosingAccountSummary>()

  for (const transaction of transactions) {
    const account = accountById.get(transaction.accountId)
    const existing = summaries.get(transaction.accountId)
    const summary =
      existing ??
      ({
        accountId: transaction.accountId,
        accountName: account?.name ?? '알 수 없음',
        incomeTotal: 0,
        expenseTotal: 0,
        transactionCount: 0,
      } satisfies MonthlyClosingAccountSummary)

    if (transaction.type === 'income') {
      summary.incomeTotal += transaction.amount
    } else {
      summary.expenseTotal += transaction.amount
    }

    summary.transactionCount += 1
    summaries.set(transaction.accountId, summary)
  }

  return [...summaries.values()].sort((a, b) => {
    const totalDiff =
      b.incomeTotal + b.expenseTotal - (a.incomeTotal + a.expenseTotal)

    return totalDiff === 0 ? a.accountName.localeCompare(b.accountName) : totalDiff
  })
}

function normalizeNote(note: string | undefined): string | undefined {
  const trimmed = note?.trim()

  return trimmed ? trimmed : undefined
}
