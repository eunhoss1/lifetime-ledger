import type { Dispatch, SetStateAction } from 'react'
import { SummaryCard } from '../components/SummaryCard'
import { InfoTile } from '../components/InfoTile'
import { StatusBadge } from '../components/StatusBadge'
import type { LedgerViewData } from '../types'
import { formatClosingStatus } from '../utils/format'

interface ClosingViewProps {
  closingMessage: string
  closingNote: string
  currentMonth: string
  data: LedgerViewData
  onCloseMonth: () => void
  onReopenMonth: () => void
  setClosingNote: Dispatch<SetStateAction<string>>
}

export function ClosingView({
  closingMessage,
  closingNote,
  currentMonth,
  data,
  onCloseMonth,
  onReopenMonth,
  setClosingNote,
}: ClosingViewProps) {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">{currentMonth}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">월마감</h2>
            <p className="mt-1 text-sm text-slate-500">
              현재 월 거래 데이터를 기준으로 snapshot을 저장합니다.
            </p>
          </div>
          <StatusBadge tone={data.isClosed ? 'danger' : 'success'}>
            {formatClosingStatus(data.monthlyClosing?.status)}
          </StatusBadge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <InfoTile
            label="마감 상태"
            value={data.isClosed ? '닫힘' : '입력 가능'}
          />
          <InfoTile
            label="거래 수"
            value={`${data.transactions.length.toString()}건`}
          />
          <InfoTile
            label="마감 메모"
            value={data.monthlyClosing?.note ? '있음' : '없음'}
          />
        </div>

        <label className="mt-5 grid gap-1 text-sm font-medium text-slate-700">
          월마감 메모
          <textarea
            className="min-h-24 rounded-md border border-slate-300 px-3 py-2"
            placeholder="이번 달 특이사항을 적어 두세요."
            value={closingNote}
            onChange={(event) => setClosingNote(event.target.value)}
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            type="button"
            onClick={onCloseMonth}
          >
            이번 달 마감하기
          </button>
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
            disabled={!data.isClosed}
            type="button"
            onClick={onReopenMonth}
          >
            다시 열기
          </button>
          {closingMessage ? (
            <p className="text-sm text-slate-600">{closingMessage}</p>
          ) : null}
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
    </div>
  )
}
