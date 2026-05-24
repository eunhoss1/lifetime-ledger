import { formatKrwAmount } from '../../domain/money'
import type {
  AccountKind,
  ExpenseRole,
  MonthlyClosingStatus,
  TransactionSource,
  TransactionType,
} from '../../domain/types'

export function formatSignedKrwAmount(amount: number): string {
  return amount < 0 ? `-${formatKrwAmount(Math.abs(amount))}` : formatKrwAmount(amount)
}

export function formatTransactionType(type: TransactionType): string {
  return type === 'income' ? '수입' : '지출'
}

export function formatTransactionSource(source: TransactionSource): string {
  return source === 'recurring' ? '반복' : '수동'
}

export function formatExpenseRole(role: ExpenseRole | undefined): string {
  if (role === 'fixed') {
    return '고정지출'
  }

  if (role === 'savingInvestment') {
    return '저축/투자'
  }

  return '변동지출'
}

export function formatClosingStatus(status: MonthlyClosingStatus | undefined): string {
  if (status === 'closed') {
    return '마감됨'
  }

  if (status === 'reopened') {
    return '다시 열림'
  }

  return '미마감'
}

export function formatAccountKind(kind: AccountKind): string {
  const labels: Record<AccountKind, string> = {
    cash: '현금',
    debitCard: '체크카드',
    creditCard: '신용카드',
    bankAccount: '은행계좌',
    other: '기타',
  }

  return labels[kind]
}
