import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Account, Category, RecurringScheduleType } from '../../domain/types'
import type { RecurringFormState } from '../types'

interface RecurringFormProps {
  accounts: Account[]
  categories: Category[]
  form: RecurringFormState
  isClosed: boolean
  message: string
  onApplyRecurring: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  setForm: Dispatch<SetStateAction<RecurringFormState>>
}

export function RecurringForm({
  accounts,
  categories,
  form,
  isClosed,
  message,
  onApplyRecurring,
  onSubmit,
  setForm,
}: RecurringFormProps) {
  const expenseCategories = categories.filter((category) => category.type === 'expense')

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-950">반복지출 등록</h2>
        <p className="text-sm text-slate-500">
          매월 고정으로 나가는 지출을 등록하고, 확인 후 이번 달 거래에 반영합니다.
        </p>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
        <fieldset className="grid gap-4 disabled:opacity-60" disabled={isClosed}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              이름
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                placeholder="예: 월세"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              금액
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                inputMode="numeric"
                placeholder="예: 500000"
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
                  setForm((current) => ({ ...current, categoryId: event.target.value }))
                }
              >
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              계좌/결제수단
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.accountId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, accountId: event.target.value }))
                }
              >
                {accounts.map((account) => (
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
                value={form.scheduleType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduleType: event.target.value as RecurringScheduleType,
                  }))
                }
              >
                <option value="dayOfMonth">매월 N일</option>
                <option value="lastDayOfMonth">매월 말일</option>
              </select>
            </label>

            {form.scheduleType === 'dayOfMonth' ? (
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                반복일
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  inputMode="numeric"
                  max="31"
                  min="1"
                  placeholder="1~31"
                  value={form.dayOfMonth}
                  onChange={(event) =>
                    setForm((current) => ({
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
                value={form.startMonth}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startMonth: event.target.value }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              종료월
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                type="month"
                value={form.endMonth}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endMonth: event.target.value }))
                }
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              메모
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                placeholder="선택 입력"
                value={form.memoTemplate}
                onChange={(event) =>
                  setForm((current) => ({
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
              onClick={onApplyRecurring}
            >
              이번 달 고정지출 반영
            </button>
            {message ? <p className="text-sm text-slate-600">{message}</p> : null}
          </div>
        </fieldset>
      </form>
    </section>
  )
}
