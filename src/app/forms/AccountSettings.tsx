import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Account, AccountKind } from '../../domain/types'
import { formatAccountKind } from '../utils/format'

interface AccountSettingsProps {
  accountKind: AccountKind
  accountName: string
  accounts: Account[]
  onArchiveAccount: (account: Account) => void
  onCreateAccount: (event: FormEvent<HTMLFormElement>) => void
  onRenameAccount: (account: Account) => void
  setAccountKind: Dispatch<SetStateAction<AccountKind>>
  setAccountName: Dispatch<SetStateAction<string>>
}

export function AccountSettings({
  accountKind,
  accountName,
  accounts,
  onArchiveAccount,
  onCreateAccount,
  onRenameAccount,
  setAccountKind,
  setAccountName,
}: AccountSettingsProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">계좌/결제수단</h2>

      <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]" onSubmit={onCreateAccount}>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="계좌/결제수단 이름"
          value={accountName}
          onChange={(event) => setAccountName(event.target.value)}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={accountKind}
          onChange={(event) => setAccountKind(event.target.value as AccountKind)}
        >
          <option value="cash">현금</option>
          <option value="debitCard">체크카드</option>
          <option value="creditCard">신용카드</option>
          <option value="bankAccount">은행계좌</option>
          <option value="other">기타</option>
        </select>
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          type="submit"
        >
          추가
        </button>
      </form>

      <ul className="mt-4 divide-y divide-slate-100">
        {accounts.map((account) => (
          <li
            className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            key={account.id}
          >
            <div>
              <div className="font-medium text-slate-950">{account.name}</div>
              <div className="mt-1 text-xs text-slate-500">
                {formatAccountKind(account.kind)}
                {account.isArchived ? ' · 보관됨' : ''}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                type="button"
                onClick={() => onRenameAccount(account)}
              >
                이름 수정
              </button>
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                disabled={account.isArchived}
                type="button"
                onClick={() => onArchiveAccount(account)}
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
