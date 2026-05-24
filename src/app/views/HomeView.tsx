import { SummaryCard } from '../components/SummaryCard'
import { InfoTile } from '../components/InfoTile'
import { StatusBadge } from '../components/StatusBadge'
import type { AppView, LedgerViewData } from '../types'
import {
  formatClosingStatus,
  formatSignedKrwAmount,
  formatTransactionType,
} from '../utils/format'

interface HomeViewProps {
  currentMonth: string
  data: LedgerViewData
  onNavigate: (view: AppView) => void
}

export function HomeView({ currentMonth, data, onNavigate }: HomeViewProps) {
  const categoryById = new Map(
    data.allCategories.map((category) => [category.id, category]),
  )
  const accountById = new Map(data.allAccounts.map((account) => [account.id, account]))
  const recentTransactions = data.transactions.slice(0, 5)

  return (
    <div className="grid gap-5">
      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">{currentMonth}</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">홈</h2>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
              type="button"
              onClick={() => onNavigate('entry')}
            >
              거래 입력
            </button>
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              type="button"
              onClick={() => onNavigate('recurring')}
            >
              반복지출
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="수입" amount={data.summary.income} tone="income" />
        <SummaryCard label="지출" amount={data.summary.expense} tone="expense" />
        <SummaryCard label="고정지출" amount={data.summary.fixedExpense} tone="neutral" />
        <SummaryCard label="변동지출" amount={data.summary.variableExpense} tone="neutral" />
        <SummaryCard
          label="저축/투자"
          amount={data.summary.savingInvestment}
          tone="neutral"
        />
        <SummaryCard label="남은 돈" amount={data.summary.remaining} tone="income" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-950">월 상태</h3>
            <StatusBadge tone={data.isClosed ? 'danger' : 'success'}>
              {formatClosingStatus(data.monthlyClosing?.status)}
            </StatusBadge>
          </div>
          <div className="mt-4 grid gap-3">
            <InfoTile
              label="이번 달 마감"
              value={data.isClosed ? '수정 잠김' : '입력 가능'}
            />
            <InfoTile
              label="미반영 반복지출"
              value={`${data.recurringPreviews.length.toString()}건`}
            />
            <InfoTile
              label="이번 달 거래"
              value={`${data.transactions.length.toString()}건`}
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-950">최근 거래</h3>
            <button
              className="text-sm font-semibold text-teal-700"
              type="button"
              onClick={() => onNavigate('entry')}
            >
              전체 보기
            </button>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">아직 입력된 거래가 없습니다.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {recentTransactions.map((transaction) => (
                <li
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                  key={transaction.id}
                >
                  <div>
                    <div className="font-medium text-slate-950">
                      {categoryById.get(transaction.categoryId)?.name ?? '(알 수 없음)'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {transaction.date} · {formatTransactionType(transaction.type)} ·{' '}
                      {accountById.get(transaction.accountId)?.name ?? '(알 수 없음)'}
                    </div>
                  </div>
                  <div className="font-semibold text-slate-950">
                    {formatSignedKrwAmount(transaction.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
