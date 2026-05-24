import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { createBackupFileName } from '../domain/backup'
import {
  createAllTransactionsCsvFileName,
  createTransactionsCsvFileNameForMonth,
} from '../domain/csv'
import { getCurrentMonthInfo, toDateKey } from '../domain/date'
import type {
  Account,
  AccountKind,
  Category,
  Transaction,
  TransactionType,
} from '../domain/types'
import {
  applyRecurringItemsForMonth,
  archiveAccount,
  archiveCategory,
  archiveRecurringItem,
  closeMonth,
  CLOSED_MONTH_MESSAGE,
  createAccount,
  createCategory,
  createFullBackup,
  createRecurringItem,
  createTransaction,
  exportAllTransactionsCsv,
  exportTransactionsCsvByMonth,
  getBackupSummary,
  getMonthlyClosing,
  getMonthlyTransactionSummary,
  initializeLedgerRepository,
  isMonthClosed,
  listAccounts,
  listActiveAccounts,
  listActiveCategories,
  listActiveRecurringItems,
  listCategories,
  listTransactionsByMonth,
  previewRecurringItemsForMonth,
  reopenMonth,
  restoreFullBackup,
  softDeleteTransaction,
  updateAccountName,
  updateCategoryName,
  updateTransaction,
  validateBackupJson,
  type BackupRoot,
  type BackupSummary,
  type LedgerBootstrapStatus,
} from '../repositories'
import { AppShell } from './AppShell'
import type {
  AppState,
  AppView,
  LedgerViewData,
  RecurringFormState,
  TransactionFormState,
} from './types'
import { downloadTextFile } from './utils/download'
import { ClosingView } from './views/ClosingView'
import { EntryView } from './views/EntryView'
import { ExportView } from './views/ExportView'
import { HomeView } from './views/HomeView'
import { RecurringView } from './views/RecurringView'
import { SettingsView } from './views/SettingsView'

function App() {
  const currentMonth = useMemo(() => getCurrentMonthInfo(), [])
  const today = useMemo(() => toDateKey(), [])
  const [activeView, setActiveView] = useState<AppView>('home')
  const [appState, setAppState] = useState<AppState>({ status: 'loading' })
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>(() =>
    createEmptyTransactionForm(today),
  )
  const [recurringForm, setRecurringForm] = useState<RecurringFormState>(() =>
    createEmptyRecurringForm(currentMonth.monthKey),
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [recurringMessage, setRecurringMessage] = useState('')
  const [closingNote, setClosingNote] = useState('')
  const [closingMessage, setClosingMessage] = useState('')
  const [backupMessage, setBackupMessage] = useState('')
  const [selectedBackup, setSelectedBackup] = useState<BackupRoot | null>(null)
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null)
  const [restoreConfirmation, setRestoreConfirmation] = useState('')
  const [csvMessage, setCsvMessage] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryType, setCategoryType] = useState<TransactionType>('expense')
  const [accountName, setAccountName] = useState('')
  const [accountKind, setAccountKind] = useState<AccountKind>('cash')
  const [settingsMessage, setSettingsMessage] = useState('')

  const loadData = useCallback(async (): Promise<LedgerViewData> => {
    const [
      categories,
      accounts,
      allCategories,
      allAccounts,
      transactions,
      summary,
      recurringItems,
      recurringPreviews,
      monthlyClosing,
      closed,
    ] = await Promise.all([
      listActiveCategories(),
      listActiveAccounts(),
      listCategories(),
      listAccounts(),
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
      allCategories,
      allAccounts,
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
                : '앱 초기화 중 알 수 없는 오류가 발생했습니다.',
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [loadData])

  if (appState.status === 'loading') {
    return (
      <AppShell
        activeView={activeView}
        currentMonth={currentMonth.monthKey}
        isClosed={false}
        onViewChange={setActiveView}
      >
        <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          초기화 중입니다.
        </section>
      </AppShell>
    )
  }

  if (appState.status === 'error') {
    return (
      <AppShell
        activeView={activeView}
        currentMonth={currentMonth.monthKey}
        isClosed={false}
        onViewChange={setActiveView}
      >
        <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {appState.message}
        </section>
      </AppShell>
    )
  }

  const { bootstrap, data } = appState

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

  function startEdit(transaction: Transaction) {
    if (data.isClosed) {
      setMessage(CLOSED_MONTH_MESSAGE)
      return
    }

    setEditingId(transaction.id)
    setActiveView('entry')
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

      downloadTextFile(
        json,
        createBackupFileName(new Date(backup.exportedAt)),
        'application/json;charset=utf-8',
      )
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
    } finally {
      event.target.value = ''
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

  async function handleExportCurrentMonthCsv() {
    setCsvMessage('')

    try {
      const csv = await exportTransactionsCsvByMonth(currentMonth.monthKey)
      downloadTextFile(
        csv,
        createTransactionsCsvFileNameForMonth(currentMonth.monthKey),
        'text/csv;charset=utf-8',
      )
      setCsvMessage('현재 월 거래 CSV를 다운로드했습니다.')
    } catch (error) {
      setCsvMessage(
        error instanceof Error ? error.message : '현재 월 CSV 내보내기에 실패했습니다.',
      )
    }
  }

  async function handleExportAllTransactionsCsv() {
    setCsvMessage('')

    try {
      const csv = await exportAllTransactionsCsv()
      downloadTextFile(
        csv,
        createAllTransactionsCsvFileName(),
        'text/csv;charset=utf-8',
      )
      setCsvMessage('전체 거래 CSV를 다운로드했습니다.')
    } catch (error) {
      setCsvMessage(
        error instanceof Error ? error.message : '전체 거래 CSV 내보내기에 실패했습니다.',
      )
    }
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSettingsMessage('')

    try {
      await createCategory({ name: categoryName, type: categoryType })
      setCategoryName('')
      setSettingsMessage('카테고리를 추가했습니다.')
      await refreshData(bootstrap)
    } catch (error) {
      setSettingsMessage(
        error instanceof Error ? error.message : '카테고리 추가에 실패했습니다.',
      )
    }
  }

  async function handleRenameCategory(category: Category) {
    const nextName = window.prompt('새 카테고리 이름', category.name)

    if (nextName === null) {
      return
    }

    setSettingsMessage('')

    try {
      await updateCategoryName(category.id, nextName)
      setSettingsMessage('카테고리 이름을 수정했습니다.')
      await refreshData(bootstrap)
    } catch (error) {
      setSettingsMessage(
        error instanceof Error ? error.message : '카테고리 수정에 실패했습니다.',
      )
    }
  }

  async function handleArchiveCategory(category: Category) {
    setSettingsMessage('')

    try {
      await archiveCategory(category.id)
      setSettingsMessage('카테고리를 보관했습니다.')
      await refreshData(bootstrap)
    } catch (error) {
      setSettingsMessage(
        error instanceof Error ? error.message : '카테고리 보관에 실패했습니다.',
      )
    }
  }

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSettingsMessage('')

    try {
      await createAccount({ name: accountName, kind: accountKind })
      setAccountName('')
      setSettingsMessage('계좌/결제수단을 추가했습니다.')
      await refreshData(bootstrap)
    } catch (error) {
      setSettingsMessage(
        error instanceof Error ? error.message : '계좌/결제수단 추가에 실패했습니다.',
      )
    }
  }

  async function handleRenameAccount(account: Account) {
    const nextName = window.prompt('새 계좌/결제수단 이름', account.name)

    if (nextName === null) {
      return
    }

    setSettingsMessage('')

    try {
      await updateAccountName(account.id, nextName)
      setSettingsMessage('계좌/결제수단 이름을 수정했습니다.')
      await refreshData(bootstrap)
    } catch (error) {
      setSettingsMessage(
        error instanceof Error ? error.message : '계좌/결제수단 수정에 실패했습니다.',
      )
    }
  }

  async function handleArchiveAccount(account: Account) {
    setSettingsMessage('')

    try {
      await archiveAccount(account.id)
      setSettingsMessage('계좌/결제수단을 보관했습니다.')
      await refreshData(bootstrap)
    } catch (error) {
      setSettingsMessage(
        error instanceof Error ? error.message : '계좌/결제수단 보관에 실패했습니다.',
      )
    }
  }

  return (
    <AppShell
      activeView={activeView}
      currentMonth={currentMonth.monthKey}
      isClosed={data.isClosed}
      onViewChange={setActiveView}
    >
      {renderActiveView()}
    </AppShell>
  )

  function renderActiveView() {
    switch (activeView) {
      case 'home':
        return (
          <HomeView
            currentMonth={currentMonth.monthKey}
            data={data}
            onNavigate={setActiveView}
          />
        )
      case 'entry':
        return (
          <EntryView
            data={data}
            editingId={editingId}
            form={transactionForm}
            message={message}
            onCancelEdit={cancelEdit}
            onDeleteTransaction={handleDeleteTransaction}
            onStartEdit={startEdit}
            onSubmit={handleTransactionSubmit}
            setForm={setTransactionForm}
          />
        )
      case 'recurring':
        return (
          <RecurringView
            data={data}
            form={recurringForm}
            message={recurringMessage}
            onApplyRecurring={handleApplyRecurring}
            onArchiveRecurring={handleArchiveRecurring}
            onSubmit={handleRecurringSubmit}
            setForm={setRecurringForm}
          />
        )
      case 'closing':
        return (
          <ClosingView
            closingMessage={closingMessage}
            closingNote={closingNote}
            currentMonth={currentMonth.monthKey}
            data={data}
            onCloseMonth={handleCloseMonth}
            onReopenMonth={handleReopenMonth}
            setClosingNote={setClosingNote}
          />
        )
      case 'export':
        return (
          <ExportView
            backupMessage={backupMessage}
            backupSummary={backupSummary}
            csvMessage={csvMessage}
            onBackupFileChange={handleBackupFileChange}
            onExportAllTransactionsCsv={handleExportAllTransactionsCsv}
            onExportBackup={handleExportBackup}
            onExportCurrentMonthCsv={handleExportCurrentMonthCsv}
            onRestoreBackup={handleRestoreBackup}
            restoreConfirmation={restoreConfirmation}
            selectedBackup={selectedBackup}
            setRestoreConfirmation={setRestoreConfirmation}
          />
        )
      case 'settings':
        return (
          <SettingsView
            accountKind={accountKind}
            accountName={accountName}
            categoryName={categoryName}
            categoryType={categoryType}
            data={data}
            onArchiveAccount={handleArchiveAccount}
            onArchiveCategory={handleArchiveCategory}
            onCreateAccount={handleCreateAccount}
            onCreateCategory={handleCreateCategory}
            onRenameAccount={handleRenameAccount}
            onRenameCategory={handleRenameCategory}
            setAccountKind={setAccountKind}
            setAccountName={setAccountName}
            setCategoryName={setCategoryName}
            setCategoryType={setCategoryType}
            settingsMessage={settingsMessage}
          />
        )
    }
  }
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

export default App
