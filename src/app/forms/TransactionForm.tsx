import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Account, Category, TransactionType } from '../../domain/types'
import type { TransactionFormState } from '../types'

interface TransactionFormProps {
  accounts: Account[]
  categories: Category[]
  editingId: string | null
  form: TransactionFormState
  isClosed: boolean
  message: string
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  setForm: Dispatch<SetStateAction<TransactionFormState>>
}

export function TransactionForm({
  accounts,
  categories,
  editingId,
  form,
  isClosed,
  message,
  onCancel,
  onSubmit,
  setForm,
}: TransactionFormProps) {
  const categoryOptions = categories.filter((category) => category.type === form.type)

  function updateType(type: TransactionType) {
    const fallbackCategory = categories.find((category) => category.type === type)

    setForm((current) => ({
      ...current,
      type,
      categoryId: fallbackCategory?.id ?? '',
    }))
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-950">
          {editingId ? '거래 수정' : '거래 입력'}
        </h2>
        <p className="text-sm text-slate-500">
          금액은 KRW 정수로 입력합니다. 닫힌 월은 다시 열기 전까지 수정할 수 없습니다.
        </p>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
        <fieldset className="grid gap-4 disabled:opacity-60" disabled={isClosed}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              유형
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.type}
                onChange={(event) => updateType(event.target.value as TransactionType)}
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
                  setForm((current) => ({ ...current, categoryId: event.target.value }))
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
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              type="submit"
            >
              {editingId ? '수정 저장' : '거래 추가'}
            </button>
            {editingId ? (
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                type="button"
                onClick={onCancel}
              >
                취소
              </button>
            ) : null}
            {message ? <p className="text-sm text-slate-600">{message}</p> : null}
          </div>
        </fieldset>
      </form>
    </section>
  )
}
