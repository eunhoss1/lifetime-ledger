import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { formatKrwAmount } from '../../domain/money'
import { RecurringForm } from '../forms/RecurringForm'
import type { LedgerViewData, RecurringFormState } from '../types'
import { formatExpenseRole } from '../utils/format'

interface RecurringViewProps {
  data: LedgerViewData
  form: RecurringFormState
  message: string
  onApplyRecurring: () => void
  onArchiveRecurring: (id: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  setForm: Dispatch<SetStateAction<RecurringFormState>>
}

export function RecurringView({
  data,
  form,
  message,
  onApplyRecurring,
  onArchiveRecurring,
  onSubmit,
  setForm,
}: RecurringViewProps) {
  return (
    <div className="grid gap-5">
      <RecurringForm
        accounts={data.accounts}
        categories={data.categories}
        form={form}
        isClosed={data.isClosed}
        message={message}
        onApplyRecurring={onApplyRecurring}
        onSubmit={onSubmit}
        setForm={setForm}
      />

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">이번 달 미반영 항목</h2>
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
                    <span className="font-medium text-slate-900">{preview.item.name}</span>
                    <span className="text-slate-500">{preview.scheduledDate}</span>
                  </div>
                  <div className="mt-1 text-slate-600">
                    {formatKrwAmount(preview.item.amount)} ·{' '}
                    {formatExpenseRole(preview.item.expenseRole ?? 'fixed')} ·{' '}
                    {preview.category.name} · {preview.account.name}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">등록된 반복지출</h2>
          {data.recurringItems.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              아직 등록된 반복지출이 없습니다.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.recurringItems.map((statusItem) => (
                <li
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm"
                  key={statusItem.item.id}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {statusItem.item.name}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {formatRecurringStatus(statusItem.status)}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-600">
                      {formatKrwAmount(statusItem.item.amount)} ·{' '}
                      {formatExpenseRole(statusItem.item.expenseRole ?? 'fixed')} ·{' '}
                      {statusItem.categoryName} · {statusItem.accountName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {statusItem.item.startMonth}
                      {statusItem.item.endMonth ? ` ~ ${statusItem.item.endMonth}` : ''}
                      {statusItem.scheduledDate ? ` · 예정일 ${statusItem.scheduledDate}` : ''}
                      {statusItem.generatedTransactionId
                        ? ` · 생성 거래 ${statusItem.generatedTransactionId}`
                        : ''}
                    </div>
                  </div>
                  {statusItem.status === 'archived' ? (
                    <span className="shrink-0 text-xs font-semibold text-slate-400">
                      보관됨
                    </span>
                  ) : (
                    <button
                      className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      type="button"
                      onClick={() => onArchiveRecurring(statusItem.item.id)}
                    >
                      보관
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function formatRecurringStatus(
  status: LedgerViewData['recurringItems'][number]['status'],
): string {
  const labels = {
    applied: '이번 달 반영 완료',
    unapplied: '이번 달 미반영',
    outOfPeriod: '기간 아님',
    archived: '보관됨',
  } as const

  return labels[status]
}
