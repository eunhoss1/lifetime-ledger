import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Transaction } from '../../domain/types'
import { TransactionForm } from '../forms/TransactionForm'
import type { LedgerViewData, TransactionFormState } from '../types'
import {
  formatSignedKrwAmount,
  formatTransactionSource,
  formatTransactionType,
} from '../utils/format'

interface EntryViewProps {
  data: LedgerViewData
  editingId: string | null
  form: TransactionFormState
  message: string
  onCancelEdit: () => void
  onDeleteTransaction: (id: string) => void
  onStartEdit: (transaction: Transaction) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  setForm: Dispatch<SetStateAction<TransactionFormState>>
}

export function EntryView({
  data,
  editingId,
  form,
  message,
  onCancelEdit,
  onDeleteTransaction,
  onStartEdit,
  onSubmit,
  setForm,
}: EntryViewProps) {
  const categoryById = new Map(
    data.allCategories.map((category) => [category.id, category]),
  )
  const accountById = new Map(data.allAccounts.map((account) => [account.id, account]))

  return (
    <div className="grid gap-5">
      <TransactionForm
        accounts={data.accounts}
        categories={data.categories}
        editingId={editingId}
        form={form}
        isClosed={data.isClosed}
        message={message}
        onCancel={onCancelEdit}
        onSubmit={onSubmit}
        setForm={setForm}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-950">현재 월 거래 목록</h2>
          {data.isClosed ? (
            <p className="text-sm text-red-600">닫힌 월입니다. 다시 열기 후 수정하세요.</p>
          ) : null}
        </div>

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
                      {formatTransactionType(transaction.type)} ·{' '}
                      {formatTransactionSource(transaction.source)}
                    </td>
                    <td className="py-3 pr-3 text-right font-medium text-slate-950">
                      {formatSignedKrwAmount(transaction.amount)}
                    </td>
                    <td className="py-3 pr-3 text-slate-700">
                      {categoryById.get(transaction.categoryId)?.name ?? '(알 수 없음)'}
                    </td>
                    <td className="py-3 pr-3 text-slate-700">
                      {accountById.get(transaction.accountId)?.name ?? '(알 수 없음)'}
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
                          onClick={() => onStartEdit(transaction)}
                        >
                          수정
                        </button>
                        <button
                          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:text-slate-300"
                          disabled={data.isClosed}
                          type="button"
                          onClick={() => onDeleteTransaction(transaction.id)}
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
    </div>
  )
}
