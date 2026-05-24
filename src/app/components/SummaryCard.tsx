import { formatSignedKrwAmount } from '../utils/format'

interface SummaryCardProps {
  label: string
  amount: number
  tone: 'income' | 'expense' | 'neutral'
}

export function SummaryCard({ label, amount, tone }: SummaryCardProps) {
  const toneClass =
    tone === 'income'
      ? 'text-teal-700'
      : tone === 'expense'
        ? 'text-red-700'
        : 'text-slate-950'

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-slate-500">{label}</h2>
      <p className={`mt-2 text-xl font-semibold ${toneClass}`}>
        {formatSignedKrwAmount(amount)}
      </p>
    </section>
  )
}
