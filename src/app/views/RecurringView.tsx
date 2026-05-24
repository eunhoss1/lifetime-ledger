import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { formatKrwAmount } from '../../domain/money'
import { RecurringForm } from '../forms/RecurringForm'
import type { LedgerViewData, RecurringFormState } from '../types'

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
                    {formatKrwAmount(preview.item.amount)} · {preview.category.name} ·{' '}
                    {preview.account.name}
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
                    onClick={() => onArchiveRecurring(item.id)}
                  >
                    보관
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
