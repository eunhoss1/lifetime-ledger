import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Category, TransactionType } from '../../domain/types'
import { formatTransactionType } from '../utils/format'

interface CategorySettingsProps {
  categoryName: string
  categoryType: TransactionType
  categories: Category[]
  onArchiveCategory: (category: Category) => void
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void
  onRenameCategory: (category: Category) => void
  setCategoryName: Dispatch<SetStateAction<string>>
  setCategoryType: Dispatch<SetStateAction<TransactionType>>
}

export function CategorySettings({
  categoryName,
  categoryType,
  categories,
  onArchiveCategory,
  onCreateCategory,
  onRenameCategory,
  setCategoryName,
  setCategoryType,
}: CategorySettingsProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">카테고리</h2>

      <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px_auto]" onSubmit={onCreateCategory}>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="카테고리 이름"
          value={categoryName}
          onChange={(event) => setCategoryName(event.target.value)}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={categoryType}
          onChange={(event) => setCategoryType(event.target.value as TransactionType)}
        >
          <option value="expense">지출</option>
          <option value="income">수입</option>
        </select>
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          type="submit"
        >
          추가
        </button>
      </form>

      <ul className="mt-4 divide-y divide-slate-100">
        {categories.map((category) => (
          <li
            className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            key={category.id}
          >
            <div>
              <div className="font-medium text-slate-950">{category.name}</div>
              <div className="mt-1 text-xs text-slate-500">
                {formatTransactionType(category.type)}
                {category.isArchived ? ' · 보관됨' : ''}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                type="button"
                onClick={() => onRenameCategory(category)}
              >
                이름 수정
              </button>
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                disabled={category.isArchived}
                type="button"
                onClick={() => onArchiveCategory(category)}
              >
                보관
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
