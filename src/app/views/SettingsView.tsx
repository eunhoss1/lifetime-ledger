import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Account, AccountKind, Category, TransactionType } from '../../domain/types'
import { AccountSettings } from '../forms/AccountSettings'
import { CategorySettings } from '../forms/CategorySettings'
import type { LedgerViewData } from '../types'

interface SettingsViewProps {
  accountKind: AccountKind
  accountName: string
  categoryName: string
  categoryType: TransactionType
  data: LedgerViewData
  onArchiveAccount: (account: Account) => void
  onArchiveCategory: (category: Category) => void
  onCreateAccount: (event: FormEvent<HTMLFormElement>) => void
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void
  onRenameAccount: (account: Account) => void
  onRenameCategory: (category: Category) => void
  setAccountKind: Dispatch<SetStateAction<AccountKind>>
  setAccountName: Dispatch<SetStateAction<string>>
  setCategoryName: Dispatch<SetStateAction<string>>
  setCategoryType: Dispatch<SetStateAction<TransactionType>>
  settingsMessage: string
}

export function SettingsView({
  accountKind,
  accountName,
  categoryName,
  categoryType,
  data,
  onArchiveAccount,
  onArchiveCategory,
  onCreateAccount,
  onCreateCategory,
  onRenameAccount,
  onRenameCategory,
  setAccountKind,
  setAccountName,
  setCategoryName,
  setCategoryType,
  settingsMessage,
}: SettingsViewProps) {
  return (
    <div className="grid gap-5">
      <section>
        <h2 className="text-2xl font-semibold text-slate-950">설정</h2>
        <p className="mt-2 text-sm text-slate-500">
          보관된 항목은 새 거래 선택지에서 제외되지만 기존 거래와 CSV에는 이름이 유지됩니다.
        </p>
        {settingsMessage ? (
          <p className="mt-3 text-sm text-slate-600">{settingsMessage}</p>
        ) : null}
      </section>

      <CategorySettings
        categories={data.allCategories}
        categoryName={categoryName}
        categoryType={categoryType}
        onArchiveCategory={onArchiveCategory}
        onCreateCategory={onCreateCategory}
        onRenameCategory={onRenameCategory}
        setCategoryName={setCategoryName}
        setCategoryType={setCategoryType}
      />

      <AccountSettings
        accountKind={accountKind}
        accountName={accountName}
        accounts={data.allAccounts}
        onArchiveAccount={onArchiveAccount}
        onCreateAccount={onCreateAccount}
        onRenameAccount={onRenameAccount}
        setAccountKind={setAccountKind}
        setAccountName={setAccountName}
      />
    </div>
  )
}
