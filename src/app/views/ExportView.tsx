import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { BackupRoot, BackupSummary } from '../../repositories'

interface ExportViewProps {
  backupMessage: string
  backupSummary: BackupSummary | null
  csvMessage: string
  onBackupFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onExportAllTransactionsCsv: () => void
  onExportBackup: () => void
  onExportCurrentMonthCsv: () => void
  onRestoreBackup: () => void
  restoreConfirmation: string
  selectedBackup: BackupRoot | null
  setRestoreConfirmation: Dispatch<SetStateAction<string>>
}

export function ExportView({
  backupMessage,
  backupSummary,
  csvMessage,
  onBackupFileChange,
  onExportAllTransactionsCsv,
  onExportBackup,
  onExportCurrentMonthCsv,
  onRestoreBackup,
  restoreConfirmation,
  selectedBackup,
  setRestoreConfirmation,
}: ExportViewProps) {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-950">JSON 백업/복구</h2>
          <p className="text-sm text-slate-500">
            JSON은 전체 복구용입니다. 복구는 현재 IndexedDB 데이터를 교체합니다.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
            type="button"
            onClick={onExportBackup}
          >
            전체 JSON 백업 내보내기
          </button>
          <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            JSON 파일 선택
            <input
              accept="application/json,.json"
              className="sr-only"
              type="file"
              onChange={onBackupFileChange}
            />
          </label>
        </div>

        {backupSummary ? (
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
            <h3 className="font-semibold text-slate-950">백업 요약</h3>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <SummaryItem label="exportedAt" value={backupSummary.exportedAt} />
              <SummaryItem
                label="schemaVersion"
                value={backupSummary.schemaVersion.toString()}
              />
              <SummaryItem
                label="transactions"
                value={backupSummary.tableCounts.transactions.toString()}
              />
              <SummaryItem
                label="categories"
                value={backupSummary.tableCounts.categories.toString()}
              />
              <SummaryItem
                label="accounts"
                value={backupSummary.tableCounts.accounts.toString()}
              />
              <SummaryItem
                label="recurringItems"
                value={backupSummary.tableCounts.recurringItems.toString()}
              />
              <SummaryItem
                label="recurringGeneratedRecords"
                value={backupSummary.tableCounts.recurringGeneratedRecords.toString()}
              />
              <SummaryItem
                label="monthlyClosings"
                value={backupSummary.tableCounts.monthlyClosings.toString()}
              />
            </dl>
          </div>
        ) : null}

        {selectedBackup ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              복구하면 현재 브라우저의 모든 Lifetime Ledger 데이터가 백업 내용으로
              교체됩니다.
            </p>
            <label className="mt-3 grid gap-1 text-sm font-medium text-red-700">
              계속하려면 “복구합니다”를 입력하세요.
              <input
                className="rounded-md border border-red-200 px-3 py-2 text-slate-950"
                value={restoreConfirmation}
                onChange={(event) => setRestoreConfirmation(event.target.value)}
              />
            </label>
            <button
              className="mt-3 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={restoreConfirmation !== '복구합니다'}
              type="button"
              onClick={onRestoreBackup}
            >
              백업 복구 실행
            </button>
          </div>
        ) : null}

        {backupMessage ? <p className="mt-4 text-sm text-slate-600">{backupMessage}</p> : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-950">CSV 내보내기</h2>
          <p className="text-sm text-slate-500">
            CSV는 엑셀/구글시트 분석과 장기 보관용입니다. 복구는 JSON을 사용합니다.
            Excel에서 날짜가 ######처럼 보이면 열 너비를 넓히면 보입니다.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="rounded-md border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-700"
            type="button"
            onClick={onExportCurrentMonthCsv}
          >
            현재 월 거래 CSV 내보내기
          </button>
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            type="button"
            onClick={onExportAllTransactionsCsv}
          >
            전체 거래 CSV 내보내기
          </button>
        </div>
        {csvMessage ? <p className="mt-4 text-sm text-slate-600">{csvMessage}</p> : null}
      </section>
    </div>
  )
}

interface SummaryItemProps {
  label: string
  value: string
}

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-all font-semibold text-slate-900">{value}</dd>
    </div>
  )
}
