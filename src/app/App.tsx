import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { getCurrentMonthInfo, toDateKey } from '../domain/date'
import { formatKrwAmount } from '../domain/money'
import type {
  Account,
  Category,
  MonthlyClosingTotals,
  Transaction,
  TransactionType,
} from '../domain/types'
import {
  createTransaction,
  getMonthlyTransactionSummary,
  initializeLedgerRepository,
  listActiveAccounts,
  listActiveCategories,
  listTransactionsByMonth,
  softDeleteTransaction,
  updateTransaction,
  type LedgerBootstrapStatus,
} from '../repositories'

interface LedgerViewData {
  categories: Category[]
  accounts: Account[]
  transactions: Transaction[]
  summary: MonthlyClosingTotals
}

interface TransactionFormState {
  type: TransactionType
  date: string
  amount: string
  categoryId: string
  accountId: string
  memo: string
}

type AppState =
  | { status: 'loading' }
  | { status: 'ready'; bootstrap: LedgerBootstrapStatus; data: LedgerViewData }
  | { status: 'error'; message: string }

function App() {
  const currentMonth = useMemo(() => getCurrentMonthInfo(), [])
  const [appState, setAppState] = useState<AppState>({ status: 'loading' })
  const [form, setForm] = useState<TransactionFormState>(() =>
    createEmptyForm(toDateKey()),
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')

  async function refreshData(bootstrap: LedgerBootstrapStatus) {
    const [categories, accounts, transactions, summary] = await Promise.all([
      listActiveCategories(),
      listActiveAccounts(),
      listTransactionsByMonth(currentMonth.monthKey),
      getMonthlyTransactionSummary(currentMonth.monthKey),
    ])
    const data = { categories, accounts, transactions, summary }

    setAppState({ status: 'ready', bootstrap, data })
    setForm((current) => ensureFormDefaults(current, categories, accounts))
  }

  useEffect(() => {
    let isMounted = true

    initializeLedgerRepository()
      .then(async (bootstrap) => {
        if (!isMounted) {
          return
        }

        const [categories, accounts, transactions, summary] = await Promise.all([
          listActiveCategories(),
          listActiveAccounts(),
          listTransactionsByMonth(currentMonth.monthKey),
          getMonthlyTransactionSummary(currentMonth.monthKey),
        ])
        const data = { categories, accounts, transactions, summary }

        if (isMounted) {
          setAppState({ status: 'ready', bootstrap, data })
          setForm((current) => ensureFormDefaults(current, categories, accounts))
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setAppState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : '알 수 없는 초기화 오류가 발생했습니다.',
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [currentMonth.monthKey])

  if (appState.status === 'loading') {
    return <PageShell currentMonth={currentMonth.monthKey}>초기화 중입니다.</PageShell>
  }

  if (appState.status === 'error') {
    return (
      <PageShell currentMonth={currentMonth.monthKey}>
        <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {appState.message}
        </section>
      </PageShell>
    )
  }

  const { bootstrap, data } = appState
  const categoryOptions = data.categories.filter(
    (category) => category.type === form.type,
  )
  const categoryById = new Map(
    data.categories.map((category) => [category.id, category]),
  )
  const accountById = new Map(data.accounts.map((account) => [account.id, account]))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (appState.status !== 'ready') {
      return
    }

    try {
      if (editingId) {
        await updateTransaction(editingId, form)
        setMessage('거래를 수정했습니다.')
      } else {
        await createTransaction(form)
        setMessage('거래를 추가했습니다.')
      }

      setEditingId(null)
      setForm(createDefaultForm(data.categories, data.accounts, toDateKey()))
      await refreshData(bootstrap)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '거래 저장에 실패했습니다.')
    }
  }

  async function handleDelete(id: string) {
    setMessage('')

    try {
      await softDeleteTransaction(id)
      setMessage('거래를 삭제했습니다.')
      await refreshData(bootstrap)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '거래 삭제에 실패했습니다.')
    }
  }

  function startEdit(transaction: Transaction) {
    setEditingId(transaction.id)
    setMessage('거래를 수정 중입니다.')
    setForm({
      type: transaction.type,
      date: transaction.date,
      amount: transaction.amount.toString(),
      categoryId: transaction.categoryId,
      accountId: transaction.accountId,
      memo: transaction.memo ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setMessage('')
    setForm(createDefaultForm(data.categories, data.accounts, toDateKey()))
  }

  return (
    <PageShell currentMonth={currentMonth.monthKey}>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="수입" amount={data.summary.income} tone="income" />
        <SummaryCard label="지출" amount={data.summary.expense} tone="expense" />
        <SummaryCard
          label="고정지출"
          amount={data.summary.fixedExpense}
          tone="neutral"
        />
        <SummaryCard
          label="변동지출"
          amount={data.summary.variableExpense}
          tone="neutral"
        />
        <SummaryCard
          label="저축/투자"
          amount={data.summary.savingInvestment}
          tone="neutral"
        />
        <SummaryCard label="남은 돈" amount={data.summary.remaining} tone="income" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-950">
            {editingId ? '거래 수정' : '거래 입력'}
          </h2>
          <p className="text-sm text-slate-500">
            현재 월 거래만 표시합니다. 삭제는 soft delete로 처리됩니다.
          </p>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              유형
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.type}
                onChange={(event) => {
                  const nextType = event.target.value as TransactionType
                  const nextCategory = data.categories.find(
                    (category) => category.type === nextType,
                  )

                  setForm((current) => ({
                    ...current,
                    type: nextType,
                    categoryId: nextCategory?.id ?? '',
                  }))
                }}
              >
                <option value="expense">지출</option>
                <option value="income">수입</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              날짜
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, date: event.target.value }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              금액
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                inputMode="numeric"
                placeholder="예: 12000"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              카테고리
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.categoryId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
              >
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              계좌
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.accountId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    accountId: event.target.value,
                  }))
                }
              >
                {data.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              메모
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                placeholder="선택 입력"
                value={form.memo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, memo: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              type="submit"
            >
              {editingId ? '수정 저장' : '거래 추가'}
            </button>
            {editingId ? (
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                type="button"
                onClick={cancelEdit}
              >
                취소
              </button>
            ) : null}
            {message ? <p className="text-sm text-slate-600">{message}</p> : null}
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">현재 월 거래 목록</h2>
        {data.transactions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">아직 입력된 거래가 없습니다.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">날짜</th>
                  <th className="py-2 pr-3 font-medium">유형</th>
                  <th className="py-2 pr-3 text-right font-medium">금액</th>
                  <th className="py-2 pr-3 font-medium">카테고리</th>
                  <th className="py-2 pr-3 font-medium">계좌</th>
                  <th className="py-2 pr-3 font-medium">메모</th>
                  <th className="py-2 text-right font-medium">작업</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3 text-slate-700">{transaction.date}</td>
                    <td className="py-3 pr-3 text-slate-700">
                      {transaction.type === 'income' ? '수입' : '지출'}
                    </td>
                    <td className="py-3 pr-3 text-right font-medium text-slate-950">
                      {formatKrwAmount(transaction.amount)}
                    </td>
                    <td className="py-3 pr-3 text-slate-700">
                      {categoryById.get(transaction.categoryId)?.name ?? '알 수 없음'}
                    </td>
                    <td className="py-3 pr-3 text-slate-700">
                      {accountById.get(transaction.accountId)?.name ?? '알 수 없음'}
                    </td>
                    <td className="py-3 pr-3 text-slate-700">
                      {transaction.memo ?? '-'}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          type="button"
                          onClick={() => startEdit(transaction)}
                        >
                          수정
                        </button>
                        <button
                          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
                          type="button"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  )
}

interface PageShellProps {
  children: ReactNode
  currentMonth: string
}

function PageShell({ children, currentMonth }: PageShellProps) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-5 py-8 sm:px-8">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium text-teal-700">로컬 우선 PWA</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">
          Lifetime Ledger
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          현재 월({currentMonth}) 기준으로 수입과 지출을 입력하고 합계를 확인합니다.
        </p>
      </header>
      {children}
    </main>
  )
}

interface SummaryCardProps {
  label: string
  amount: number
  tone: 'income' | 'expense' | 'neutral'
}

function SummaryCard({ label, amount, tone }: SummaryCardProps) {
  const toneClass =
    tone === 'income'
      ? 'text-teal-700'
      : tone === 'expense'
        ? 'text-red-700'
        : 'text-slate-950'

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-slate-500">{label}</h2>
      <p className={`mt-2 text-xl font-semibold ${toneClass}`}>
        {formatSignedKrwAmount(amount)}
      </p>
    </section>
  )
}

function formatSignedKrwAmount(amount: number): string {
  return amount < 0 ? `-${formatKrwAmount(Math.abs(amount))}` : formatKrwAmount(amount)
}

function createEmptyForm(date: string): TransactionFormState {
  return {
    type: 'expense',
    date,
    amount: '',
    categoryId: '',
    accountId: '',
    memo: '',
  }
}

function createDefaultForm(
  categories: Category[],
  accounts: Account[],
  date: string,
): TransactionFormState {
  return ensureFormDefaults(createEmptyForm(date), categories, accounts)
}

function ensureFormDefaults(
  form: TransactionFormState,
  categories: Category[],
  accounts: Account[],
): TransactionFormState {
  const categoryStillValid = categories.some(
    (category) => category.id === form.categoryId && category.type === form.type,
  )
  const accountStillValid = accounts.some((account) => account.id === form.accountId)
  const fallbackCategory = categories.find((category) => category.type === form.type)
  const fallbackAccount = accounts[0]

  return {
    ...form,
    categoryId: categoryStillValid ? form.categoryId : (fallbackCategory?.id ?? ''),
    accountId: accountStillValid ? form.accountId : (fallbackAccount?.id ?? ''),
  }
}

export default App
