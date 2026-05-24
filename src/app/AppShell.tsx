import type { ReactNode } from 'react'
import { useState } from 'react'
import type { AppView } from './types'
import { StatusBadge } from './components/StatusBadge'

interface AppShellProps {
  activeView: AppView
  children: ReactNode
  currentMonth: string
  isClosed: boolean
  onViewChange: (view: AppView) => void
}

const desktopNavItems: ReadonlyArray<{ view: AppView; label: string }> = [
  { view: 'home', label: '홈' },
  { view: 'entry', label: '입력' },
  { view: 'recurring', label: '반복지출' },
  { view: 'closing', label: '월마감' },
  { view: 'export', label: '백업/내보내기' },
  { view: 'settings', label: '설정' },
]

const mobilePrimaryItems: ReadonlyArray<{ view: AppView; label: string }> = [
  { view: 'home', label: '홈' },
  { view: 'entry', label: '입력' },
  { view: 'recurring', label: '반복' },
  { view: 'closing', label: '마감' },
]

export function AppShell({
  activeView,
  children,
  currentMonth,
  isClosed,
  onViewChange,
}: AppShellProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const isMoreActive = activeView === 'export' || activeView === 'settings'

  function changeView(view: AppView) {
    setMoreOpen(false)
    onViewChange(view)
  }

  return (
    <div className="min-h-svh bg-slate-50 text-slate-950">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col md:flex-row">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-5 py-8 md:block">
          <AppHeader currentMonth={currentMonth} isClosed={isClosed} />
          <nav className="mt-8 grid gap-2">
            {desktopNavItems.map((item) => (
              <button
                className={`rounded-md px-3 py-2 text-left text-sm font-semibold ${
                  activeView === item.view
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
                key={item.view}
                type="button"
                onClick={() => changeView(item.view)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          <header className="border-b border-slate-200 bg-white px-5 py-4 md:hidden">
            <AppHeader currentMonth={currentMonth} isClosed={isClosed} compact />
          </header>

          <div className="w-full px-5 py-6 sm:px-8 md:py-8">
            <div className="mx-auto w-full max-w-5xl">{children}</div>
          </div>
        </main>
      </div>

      {moreOpen ? (
        <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 rounded-lg border border-slate-200 bg-white p-2 shadow-lg md:hidden">
          <button
            className={`w-full rounded-md px-3 py-3 text-left text-sm font-semibold ${
              activeView === 'export'
                ? 'bg-teal-50 text-teal-800'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
            type="button"
            onClick={() => changeView('export')}
          >
            백업/내보내기
          </button>
          <button
            className={`mt-1 w-full rounded-md px-3 py-3 text-left text-sm font-semibold ${
              activeView === 'settings'
                ? 'bg-teal-50 text-teal-800'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
            type="button"
            onClick={() => changeView('settings')}
          >
            설정
          </button>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-lg md:hidden">
        <div className="grid grid-cols-5 gap-1 py-2">
          {mobilePrimaryItems.map((item) => (
            <button
              className={`rounded-md py-2 text-xs font-semibold ${
                activeView === item.view
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              key={item.view}
              type="button"
              onClick={() => changeView(item.view)}
            >
              {item.label}
            </button>
          ))}
          <button
            className={`rounded-md py-2 text-xs font-semibold ${
              isMoreActive || moreOpen
                ? 'bg-teal-700 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            type="button"
            onClick={() => setMoreOpen((current) => !current)}
          >
            더보기
          </button>
        </div>
      </nav>
    </div>
  )
}

interface AppHeaderProps {
  compact?: boolean
  currentMonth: string
  isClosed: boolean
}

function AppHeader({ compact = false, currentMonth, isClosed }: AppHeaderProps) {
  return (
    <div>
      <p className="text-xs font-semibold text-teal-700">로컬 우선 PWA</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h1 className={compact ? 'text-xl font-semibold' : 'text-2xl font-semibold'}>
          Lifetime Ledger
        </h1>
        <StatusBadge tone={isClosed ? 'danger' : 'success'}>
          {isClosed ? '닫힌 월' : '열린 월'}
        </StatusBadge>
      </div>
      <p className="mt-2 text-sm text-slate-500">현재 월 {currentMonth}</p>
    </div>
  )
}
