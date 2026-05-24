const KRW_FORMATTER = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
})

const KRW_NUMBER_FORMATTER = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 0,
})

export function normalizeKrwAmount(input: number | string): number {
  const amount =
    typeof input === 'number' ? input : parseAmountString(input.trim())

  assertKrwAmount(amount)

  return amount
}

export function assertKrwAmount(
  amount: number,
  fieldName = 'amount',
): asserts amount is number {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error(`${fieldName} must be a non-negative integer KRW amount.`)
  }
}

export function formatKrwAmount(amount: number): string {
  assertKrwAmount(amount)

  return KRW_FORMATTER.format(amount)
}

export function formatKrwNumber(amount: number): string {
  assertKrwAmount(amount)

  return KRW_NUMBER_FORMATTER.format(amount)
}

function parseAmountString(value: string): number {
  const normalized = value.replaceAll(',', '')

  if (!/^\d+$/.test(normalized)) {
    throw new Error('KRW amount strings must contain digits and optional commas only.')
  }

  return Number(normalized)
}
