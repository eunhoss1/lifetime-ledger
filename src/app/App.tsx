import {
  type FormEvent,
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createBackupFileName } from '../domain/backup'
import { getCurrentMonthInfo, toDateKey } from '../domain/date'
import { formatKrwAmount } from '../domain/money'
import type {
  Account,
  Category,
  MonthlyClosing,
  MonthlyClosingTotals,
  RecurringScheduleType,
  Transaction,
  TransactionType,
} from '../domain/types'
import {
  applyRecurringItemsForMonth,
  archiveRecurringItem,
  closeMonth,
  CLOSED_MONTH_MESSAGE,
  createFullBackup,
  createRecurringItem,
  createTransaction,
  getBackupSummary,
  getMonthlyClosing,
  getMonthlyTransactionSummary,
  initializeLedgerRepository,
  isMonthClosed,
  listActiveAccounts,
  listActiveCategories,
  listActiveRecurringItems,
  listTransactionsByMonth,
  previewRecurringItemsForMonth,
  reopenMonth,
  restoreFullBackup,
  softDeleteTransaction,
  updateTransaction,
  validateBackupJson,
  type BackupRoot,
  type BackupSummary,
  type LedgerBootstrapStatus,
  type RecurringPreviewItem,
} from '../repositories'

interface LedgerViewData {
  categories: Category[]
  accounts: Account[]
  transactions: Transaction[]
  summary: MonthlyClosingTotals
  recurringItems: Awaited<ReturnType<typeof listActiveRecurringItems>>
  recurringPreviews: RecurringPreviewItem[]
  monthlyClosing: MonthlyClosing | undefined
  isClosed: boolean
}

interface TransactionFormState {
  type: TransactionType
  date: string
  amount: string
  categoryId: string
  accountId: string
  memo: string
}

interface RecurringFormState {
  name: string
  amount: string
  categoryId: string
  accountId: string
  scheduleType: RecurringScheduleType
  dayOfMonth: string
  startMonth: string
  endMonth: string
  memoTemplate: string
}

type AppState =
  | { status: 'loading' }
  | { status: 'ready'; bootstrap: LedgerBootstrapStatus; data: LedgerViewData }
  | { status: 'error'; message: string }

function App() {
  const currentMonth = useMemo(() => getCurrentMonthInfo(), [])
  const today = useMemo(() => toDateKey(), [])
  const [appState, setAppState] = useState<AppState>({ status: 'loading' })
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>(() =>
    createEmptyTransactionForm(today),
  )
  const [recurringForm, setRecurringForm] = useState<RecurringFormState>(() =>
    createEmptyRecurringForm(currentMonth.monthKey),
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')
  const [recurringMessage, setRecurringMessage] = useState<string>('')
  const [closingNote, setClosingNote] = useState<string>('')
  const [closingMessage, setClosingMessage] = useState<string>('')
  const [backupMessage, setBackupMessage] = useState<string>('')
  const [selectedBackup, setSelectedBackup] = useState<BackupRoot | null>(null)
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null)
  const [restoreConfirmation, setRestoreConfirmation] = useState<string>('')

  const loadData = useCallback(async (): Promise<LedgerViewData> => {
    const [
      categories,
      accounts,
      transactions,
      summary,
      recurringItems,
      recurringPreviews,
      monthlyClosing,
      closed,
    ] = await Promise.all([
      listActiveCategories(),
      listActiveAccounts(),
      listTransactionsByMonth(currentMonth.monthKey),
      getMonthlyTransactionSummary(currentMonth.monthKey),
      listActiveRecurringItems(),
      previewRecurringItemsForMonth(currentMonth.monthKey),
      getMonthlyClosing(currentMonth.monthKey),
      isMonthClosed(currentMonth.monthKey),
    ])

    return {
      categories,
      accounts,
      transactions,
      summary,
      recurringItems,
      recurringPreviews,
      monthlyClosing,
      isClosed: closed,
    }
  }, [currentMonth.monthKey])

  async function refreshData(bootstrap: LedgerBootstrapStatus) {
    const data = await loadData()

    setAppState({ status: 'ready', bootstrap, data })
    setTransactionForm((current) =>
      ensureTransactionFormDefaults(current, data.categories, data.accounts),
    )
    setRecurringForm((current) =>
      ensureRecurringFormDefaults(current, data.categories, data.accounts),
    )
    setClosingNote(data.monthlyClosing?.note ?? '')
  }

  useEffect(() => {
    let isMounted = true

    initializeLedgerRepository()
      .then(async (bootstrap) => {
        if (!isMounted) {
          return
        }

        const data = await loadData()

        if (isMounted) {
          setAppState({ status: 'ready', bootstrap, data })
          setTransactionForm((current) =>
            ensureTransactionFormDefaults(current, data.categories, data.accounts),
          )
          setRecurringForm((current) =>
            ensureRecurringFormDefaults(current, data.categories, data.accounts),
          )
          setClosingNote(data.monthlyClosing?.note ?? '')
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
  }, [currentMonth.monthKey, loadData])

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
  const transactionCategoryOptions = data.categories.filter(
    (category) => category.type === transactionForm.type,
  )
  const expenseCategoryOptions = data.categories.filter(
    (category) => category.type === 'expense',
  )
  const categoryById = new Map(
    data.categories.map((category) => [category.id, category]),
  )
  const accountById = new Map(data.accounts.map((account) => [account.id, account]))

  async function handleTransactionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (data.isClosed) {
      setMessage(CLOSED_MONTH_MESSAGE)
      return
    }

    try {
      if (editingId) {
        await updateTransaction(editingId, transactionForm)
        setMessage('거래를 수정했습니다.')
      } else {
        await createTransaction(transactionForm)
        setMessage('거래를 추가했습니다.')
      }

      setEditingId(null)
      setTransactionForm(createDefaultTransactionForm(data.categories, data.accounts, today))
      await refreshData(bootstrap)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '거래 저장에 실패했습니다.')
    }
  }

  async function handleDeleteTransaction(id: string) {
    setMessage('')

    if (data.isClosed) {
      setMessage(CLOSED_MONTH_MESSAGE)
      return
    }

    try {
      await softDeleteTransaction(id)
      setMessage('거래를 삭제했습니다.')
      await refreshData(bootstrap)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '거래 삭제에 실패했습니다.')
    }
  }

  async function handleRecurringSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRecurringMessage('')

    try {
      await createRecurringItem({
        name: recurringForm.name,
        type: 'expense',
        amount: recurringForm.amount,
        categoryId: recurringForm.categoryId,
        accountId: recurringForm.accountId,
        memoTemplate: recurringForm.memoTemplate,
        scheduleType: recurringForm.scheduleType,
        dayOfMonth:
          recurringForm.scheduleType === 'dayOfMonth'
            ? recurringForm.dayOfMonth
            : undefined,
        startMonth: recurringForm.startMonth,
        endMonth: recurringForm.endMonth || undefined,
        active: true,
      })
      setRecurringMessage('반복지출을 추가했습니다.')
      setRecurringForm(createDefaultRecurringForm(data.categories, data.accounts, currentMonth.monthKey))
      await refreshData(bootstrap)
    } catch (error) {
      setRecurringMessage(
        error instanceof Error ? error.message : '반복지출 저장에 실패했습니다.',
      )
    }
  }

  async function handleApplyRecurring() {
    setRecurringMessage('')

    if (data.isClosed) {
      setRecurringMessage(CLOSED_MONTH_MESSAGE)
      return
    }

    if (data.recurringPreviews.length === 0) {
      setRecurringMessage('이번 달에 반영할 반복지출이 없습니다.')
      return
    }

    try {
      const created = await applyRecurringItemsForMonth(
        currentMonth.monthKey,
        data.recurringPreviews.map((preview) => preview.item.id),
      )
      setRecurringMessage(`${created.length.toString()}건의 반복지출을 반영했습니다.`)
      await refreshData(bootstrap)
    } catch (error) {
      setRecurringMessage(
        error instanceof Error ? error.message : '반복지출 반영에 실패했습니다.',
      )
    }
  }

  async function handleArchiveRecurring(id: string) {
    setRecurringMessage('')

    try {
      await archiveRecurringItem(id)
      setRecurringMessage('반복지출을 보관했습니다.')
      await refreshData(bootstrap)
    } catch (error) {
      setRecurringMessage(
        error instanceof Error ? error.message : '반복지출 보관에 실패했습니다.',
      )
    }
  }

  function startEdit(transaction: Transaction) {
    if (data.isClosed) {
      setMessage(CLOSED_MONTH_MESSAGE)
      return
    }

    setEditingId(transaction.id)
    setMessage('거래를 수정 중입니다.')
    setTransactionForm({
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
    setTransactionForm(createDefaultTransactionForm(data.categories, data.accounts, today))
  }

  async function handleCloseMonth() {
    setClosingMessage('')

    try {
      const closing = await closeMonth(currentMonth.monthKey, closingNote)

      setClosingMessage('이번 달을 마감했습니다.')
      setClosingNote(closing.note ?? '')
      setEditingId(null)
      await refreshData(bootstrap)
    } catch (error) {
      setClosingMessage(error instanceof Error ? error.message : '월마감에 실패했습니다.')
    }
  }

  async function handleReopenMonth() {
    setClosingMessage('')

    try {
      await reopenMonth(currentMonth.monthKey)
      setClosingMessage('이번 달을 다시 열었습니다.')
      await refreshData(bootstrap)
    } catch (error) {
      setClosingMessage(
        error instanceof Error ? error.message : '월 다시 열기에 실패했습니다.',
      )
    }
  }

  async function handleExportBackup() {
    setBackupMessage('')

    try {
      const backup = await createFullBackup()
      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')

      anchor.href = url
      anchor.download = createBackupFileName(new Date(backup.exportedAt))
      anchor.click()
      URL.revokeObjectURL(url)
      setBackupMessage('전체 JSON 백업 파일을 다운로드했습니다.')
    } catch (error) {
      setBackupMessage(
        error instanceof Error ? error.message : '백업 내보내기에 실패했습니다.',
      )
    }
  }

  async function handleBackupFileChange(event: ChangeEvent<HTMLInputElement>) {
    setBackupMessage('')
    setSelectedBackup(null)
    setBackupSummary(null)
    setRestoreConfirmation('')

    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const backup = validateBackupJson(text)
      const summary = getBackupSummary(backup)

      setSelectedBackup(backup)
      setBackupSummary(summary)
      setBackupMessage('백업 파일 검증을 통과했습니다.')
    } catch (error) {
      setBackupMessage(
        error instanceof Error ? error.message : '백업 파일 검증에 실패했습니다.',
      )
    }
  }

  async function handleRestoreBackup() {
    setBackupMessage('')

    if (!selectedBackup) {
      setBackupMessage('먼저 백업 파일을 선택하고 검증해 주세요.')
      return
    }

    if (restoreConfirmation !== '복구합니다') {
      setBackupMessage('확인 문구를 정확히 입력해야 복구할 수 있습니다.')
      return
    }

    try {
      await restoreFullBackup(selectedBackup)
      setBackupMessage('백업 복구를 완료했습니다.')
      setSelectedBackup(null)
      setBackupSummary(null)
      setRestoreConfirmation('')
      setEditingId(null)
      await refreshData(bootstrap)
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : '백업 복구에 실패했습니다.')
    }
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
          <h2 className="text-lg font-semibold text-slate-950">월마감</h2>
          <p className="text-sm text-slate-500">
            현재 월 거래 데이터를 snapshot으로 저장합니다. 닫힌 월은 다시 열기 전까지 수정할 수 없습니다.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoTile
            label="상태"
            value={data.monthlyClosing?.status === 'closed' ? '마감됨' : data.monthlyClosing?.status === 'reopened' ? '다시 열림' : '미마감'}
          />
          <InfoTile
            label="마감 거래 수"
            value={(data.monthlyClosing?.transactionCount ?? data.transactions.length).toString()}
          />
          <InfoTile
            label="마감 지출"
            value={formatKrwAmount(data.monthlyClosing?.expenseTotal ?? data.summary.expense)}
          />
          <InfoTile
            label="마감 남은 돈"
            value={formatSignedKrwAmount(data.monthlyClosing?.remaining ?? data.summary.remaining)}
          />
        </div>

        <label className="mt-4 grid gap-1 text-sm font-medium text-slate-700">
          월마감 메모
          <textarea
            className="min-h-20 rounded-md border border-slate-300 px-3 py-2"
            placeholder="이번 달 특이사항을 적어 둡니다."
            value={closingNote}
            onChange={(event) => setClosingNote(event.target.value)}
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={data.isClosed}
            type="button"
            onClick={handleCloseMonth}
          >
            이번 달 마감하기
          </button>
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
            disabled={!data.monthlyClosing}
            type="button"
            onClick={handleReopenMonth}
          >
            다시 열기
          </button>
          {data.isClosed ? (
            <p className="text-sm font-medium text-red-700">
              닫힌 월입니다. 다시 열기 후 수정하세요.
            </p>
          ) : null}
          {closingMessage ? (
            <p className="text-sm text-slate-600">{closingMessage}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-950">백업/복구</h2>
          <p className="text-sm text-slate-500">
            전체 IndexedDB 데이터를 UTF-8 JSON으로 내보내고, 검증된 백업 파일로 복구합니다.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            type="button"
            onClick={handleExportBackup}
          >
            전체 JSON 백업 내보내기
          </button>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            JSON 백업 파일 선택
            <input
              accept="application/json,.json"
              className="text-sm"
              type="file"
              onChange={handleBackupFileChange}
            />
          </label>
        </div>

        {backupSummary ? (
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">백업 요약</h3>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <InfoTile label="exportedAt" value={backupSummary.exportedAt} />
              <InfoTile
                label="schemaVersion"
                value={backupSummary.schemaVersion.toString()}
              />
              <InfoTile
                label="transactions"
                value={backupSummary.tableCounts.transactions.toString()}
              />
              <InfoTile
                label="categories"
                value={backupSummary.tableCounts.categories.toString()}
              />
              <InfoTile
                label="accounts"
                value={backupSummary.tableCounts.accounts.toString()}
              />
              <InfoTile
                label="recurringItems"
                value={backupSummary.tableCounts.recurringItems.toString()}
              />
              <InfoTile
                label="recurringGeneratedRecords"
                value={backupSummary.tableCounts.recurringGeneratedRecords.toString()}
              />
              <InfoTile
                label="monthlyClosings"
                value={backupSummary.tableCounts.monthlyClosings.toString()}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-950">복구 전 확인</h3>
          <p className="mt-2 text-sm leading-6 text-red-700">
            복구는 현재 브라우저의 IndexedDB 데이터를 백업 파일 내용으로 교체합니다.
            필요하면 먼저 “전체 JSON 백업 내보내기”로 현재 데이터를 저장해 주세요.
          </p>
          <label className="mt-3 grid max-w-sm gap-1 text-sm font-medium text-red-950">
            확인 문구 입력: 복구합니다
            <input
              className="rounded-md border border-red-200 px-3 py-2"
              value={restoreConfirmation}
              onChange={(event) => setRestoreConfirmation(event.target.value)}
            />
          </label>
          <button
            className="mt-3 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!selectedBackup || restoreConfirmation !== '복구합니다'}
            type="button"
            onClick={handleRestoreBackup}
          >
            검증된 백업으로 복구
          </button>
        </div>

        {backupMessage ? (
          <p className="mt-4 text-sm text-slate-600">{backupMessage}</p>
        ) : null}
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

        <form className="mt-5 grid gap-4" onSubmit={handleTransactionSubmit}>
          <fieldset className="grid gap-4 disabled:opacity-60" disabled={data.isClosed}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              유형
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={transactionForm.type}
                onChange={(event) => {
                  const nextType = event.target.value as TransactionType
                  const nextCategory = data.categories.find(
                    (category) => category.type === nextType,
                  )

                  setTransactionForm((current) => ({
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
                value={transactionForm.date}
                onChange={(event) =>
                  setTransactionForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              금액
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                inputMode="numeric"
                placeholder="예: 12000"
                value={transactionForm.amount}
                onChange={(event) =>
                  setTransactionForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              카테고리
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={transactionForm.categoryId}
                onChange={(event) =>
                  setTransactionForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
              >
                {transactionCategoryOptions.map((category) => (
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
                value={transactionForm.accountId}
                onChange={(event) =>
                  setTransactionForm((current) => ({
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
                value={transactionForm.memo}
                onChange={(event) =>
                  setTransactionForm((current) => ({
                    ...current,
                    memo: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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
          </fieldset>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-950">반복지출</h2>
          <p className="text-sm text-slate-500">
            매월 고정지출을 등록하고, 이번 달 거래에 사용자 확인 후 반영합니다.
          </p>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={handleRecurringSubmit}>
          <fieldset className="grid gap-4 disabled:opacity-60" disabled={data.isClosed}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              이름
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                placeholder="예: 월세"
                value={recurringForm.name}
                onChange={(event) =>
                  setRecurringForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              금액
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                inputMode="numeric"
                placeholder="예: 500000"
                value={recurringForm.amount}
                onChange={(event) =>
                  setRecurringForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              카테고리
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={recurringForm.categoryId}
                onChange={(event) =>
                  setRecurringForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
              >
                {expenseCategoryOptions.map((category) => (
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
                value={recurringForm.accountId}
                onChange={(event) =>
                  setRecurringForm((current) => ({
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
              반복 방식
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={recurringForm.scheduleType}
                onChange={(event) =>
                  setRecurringForm((current) => ({
                    ...current,
                    scheduleType: event.target.value as RecurringScheduleType,
                  }))
                }
              >
                <option value="dayOfMonth">매월 N일</option>
                <option value="lastDayOfMonth">매월 말일</option>
              </select>
            </label>

            {recurringForm.scheduleType === 'dayOfMonth' ? (
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                반복일
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  inputMode="numeric"
                  max="31"
                  min="1"
                  placeholder="1~31"
                  value={recurringForm.dayOfMonth}
                  onChange={(event) =>
                    setRecurringForm((current) => ({
                      ...current,
                      dayOfMonth: event.target.value,
                    }))
                  }
                />
              </label>
            ) : null}

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              시작월
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                type="month"
                value={recurringForm.startMonth}
                onChange={(event) =>
                  setRecurringForm((current) => ({
                    ...current,
                    startMonth: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              종료월
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                type="month"
                value={recurringForm.endMonth}
                onChange={(event) =>
                  setRecurringForm((current) => ({
                    ...current,
                    endMonth: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              메모
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                placeholder="선택 입력"
                value={recurringForm.memoTemplate}
                onChange={(event) =>
                  setRecurringForm((current) => ({
                    ...current,
                    memoTemplate: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              type="submit"
            >
              반복지출 추가
            </button>
            <button
              className="rounded-md border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-300"
              type="button"
              onClick={handleApplyRecurring}
            >
              이번 달 고정지출 반영
            </button>
            {recurringMessage ? (
              <p className="text-sm text-slate-600">{recurringMessage}</p>
            ) : null}
          </div>
          </fieldset>
        </form>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              이번 달 미반영 항목
            </h3>
            {data.recurringPreviews.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">반영할 항목이 없습니다.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.recurringPreviews.map((preview) => (
                  <li
                    className="rounded-md border border-slate-200 p-3 text-sm"
                    key={preview.item.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-900">
                        {preview.item.name}
                      </span>
                      <span className="text-slate-500">{preview.scheduledDate}</span>
                    </div>
                    <div className="mt-1 text-slate-600">
                      {formatKrwAmount(preview.item.amount)} · {preview.category.name} ·{' '}
                      {preview.account.name}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              등록된 반복지출
            </h3>
            {data.recurringItems.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                아직 등록된 반복지출이 없습니다.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.recurringItems.map((item) => (
                  <li
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm"
                    key={item.id}
                  >
                    <div>
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="mt-1 text-slate-600">
                        {formatKrwAmount(item.amount)} · {item.startMonth}
                        {item.endMonth ? ` ~ ${item.endMonth}` : ''}
                      </div>
                    </div>
                    <button
                      className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      type="button"
                      onClick={() => handleArchiveRecurring(item.id)}
                    >
                      보관
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
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
                      {transaction.source === 'recurring' ? ' · 반복' : ''}
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
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                          disabled={data.isClosed}
                          type="button"
                          onClick={() => startEdit(transaction)}
                        >
                          수정
                        </button>
                        <button
                          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:text-slate-300"
                          disabled={data.isClosed}
                          type="button"
                          onClick={() => handleDeleteTransaction(transaction.id)}
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
          현재 월({currentMonth}) 기준으로 수입, 지출, 반복지출을 관리합니다.
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

interface InfoTileProps {
  label: string
  value: string
}

function InfoTile({ label, value }: InfoTileProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  )
}

function createEmptyTransactionForm(date: string): TransactionFormState {
  return {
    type: 'expense',
    date,
    amount: '',
    categoryId: '',
    accountId: '',
    memo: '',
  }
}

function createDefaultTransactionForm(
  categories: Category[],
  accounts: Account[],
  date: string,
): TransactionFormState {
  return ensureTransactionFormDefaults(
    createEmptyTransactionForm(date),
    categories,
    accounts,
  )
}

function ensureTransactionFormDefaults(
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

function createEmptyRecurringForm(monthKey: string): RecurringFormState {
  return {
    name: '',
    amount: '',
    categoryId: '',
    accountId: '',
    scheduleType: 'dayOfMonth',
    dayOfMonth: '1',
    startMonth: monthKey,
    endMonth: '',
    memoTemplate: '',
  }
}

function createDefaultRecurringForm(
  categories: Category[],
  accounts: Account[],
  monthKey: string,
): RecurringFormState {
  return ensureRecurringFormDefaults(
    createEmptyRecurringForm(monthKey),
    categories,
    accounts,
  )
}

function ensureRecurringFormDefaults(
  form: RecurringFormState,
  categories: Category[],
  accounts: Account[],
): RecurringFormState {
  const expenseCategories = categories.filter((category) => category.type === 'expense')
  const categoryStillValid = expenseCategories.some(
    (category) => category.id === form.categoryId,
  )
  const accountStillValid = accounts.some((account) => account.id === form.accountId)

  return {
    ...form,
    categoryId: categoryStillValid ? form.categoryId : (expenseCategories[0]?.id ?? ''),
    accountId: accountStillValid ? form.accountId : (accounts[0]?.id ?? ''),
  }
}

function formatSignedKrwAmount(amount: number): string {
  return amount < 0 ? `-${formatKrwAmount(Math.abs(amount))}` : formatKrwAmount(amount)
}

export default App
