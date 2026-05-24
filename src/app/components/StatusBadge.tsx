interface StatusBadgeProps {
  children: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  const toneClass: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
    neutral: 'border-slate-200 bg-slate-100 text-slate-700',
    success: 'border-teal-200 bg-teal-50 text-teal-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    danger: 'border-red-200 bg-red-50 text-red-700',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}
    >
      {children}
    </span>
  )
}
