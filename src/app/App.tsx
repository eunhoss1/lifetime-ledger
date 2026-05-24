import { useEffect, useMemo, useState } from 'react'
import { getCurrentMonthInfo } from '../domain/date'
import {
  initializeLedgerRepository,
  type LedgerBootstrapStatus,
} from '../repositories'

type AppState =
  | { status: 'loading' }
  | { status: 'ready'; bootstrap: LedgerBootstrapStatus }
  | { status: 'error'; message: string }

function App() {
  const [appState, setAppState] = useState<AppState>({ status: 'loading' })
  const currentMonth = useMemo(() => getCurrentMonthInfo(), [])

  useEffect(() => {
    let isMounted = true

    initializeLedgerRepository()
      .then((bootstrap) => {
        if (isMounted) {
          setAppState({ status: 'ready', bootstrap })
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
  }, [])

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 px-5 py-8 sm:px-8">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium text-teal-700">로컬 우선 PWA</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">
          Lifetime Ledger
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          1단계는 앱 실행, IndexedDB 스키마, 기본 데이터 seed, 날짜/금액
          유틸 안정화를 목표로 합니다.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <StatusPanel appState={appState} />

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">현재 월</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <InfoRow label="월 키" value={currentMonth.monthKey} />
            <InfoRow label="시작일" value={currentMonth.startsOn} />
            <InfoRow label="종료일" value={currentMonth.endsOn} />
            <InfoRow
              label="일수"
              value={`${currentMonth.daysInMonth.toString()}일`}
            />
          </dl>
        </section>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">다음 단계</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
          <li>거래 repository와 수입/지출 CRUD 흐름을 추가합니다.</li>
          <li>월별 거래 목록과 최소 입력 UI를 구현합니다.</li>
          <li>반복지출, 월마감, JSON 백업/복구는 기반 테스트 후 진행합니다.</li>
        </ul>
      </section>
    </main>
  )
}

interface StatusPanelProps {
  appState: AppState
}

function StatusPanel({ appState }: StatusPanelProps) {
  if (appState.status === 'loading') {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">
          IndexedDB 초기화
        </h2>
        <p className="mt-4 text-sm text-slate-600">초기화 중입니다.</p>
      </section>
    )
  }

  if (appState.status === 'error') {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="text-base font-semibold text-red-950">
          IndexedDB 초기화 실패
        </h2>
        <p className="mt-4 text-sm text-red-700">{appState.message}</p>
      </section>
    )
  }

  const { bootstrap } = appState

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">
        IndexedDB 초기화
      </h2>
      <dl className="mt-4 space-y-3 text-sm">
        <InfoRow label="상태" value={bootstrap.isOpen ? '열림' : '닫힘'} />
        <InfoRow label="DB" value={bootstrap.databaseName} />
        <InfoRow label="스키마 버전" value={bootstrap.databaseVersion.toString()} />
        <InfoRow
          label="카테고리"
          value={`${bootstrap.categoryCount.toString()}개 (${formatCreatedCount(
            bootstrap.seed.categoriesCreated,
          )})`}
        />
        <InfoRow
          label="계좌"
          value={`${bootstrap.accountCount.toString()}개 (${formatCreatedCount(
            bootstrap.seed.accountsCreated,
          )})`}
        />
        <InfoRow
          label="설정"
          value={bootstrap.seed.settingsCreated ? '생성됨' : '기존 데이터'}
        />
      </dl>
    </section>
  )
}

interface InfoRowProps {
  label: string
  value: string
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function formatCreatedCount(count: number): string {
  return count > 0 ? `${count.toString()}개 생성` : '기존 데이터'
}

export default App
