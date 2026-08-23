type BadgeVariant =
  | 'under-review'
  | 'in-progress'
  | 'resolved'
  | 'rejected'
  | 'pending'
  | 'default'

type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  label?: string
  children?: React.ReactNode
  dot?: boolean
}

const variantConfig: Record<
  BadgeVariant,
  { classes: string; dotColor: string; defaultLabel: string }
> = {
  'under-review': {
    classes: 'bg-red-50 text-danger border border-red-200',
    dotColor: 'bg-danger',
    defaultLabel: 'Open',
  },
  'in-progress': {
    classes: 'bg-amber-50 text-warning border border-amber-200',
    dotColor: 'bg-warning',
    defaultLabel: 'In Progress',
  },
  resolved: {
    classes: 'bg-emerald-50 text-success border border-emerald-200',
    dotColor: 'bg-success',
    defaultLabel: 'Resolved',
  },
  rejected: {
    classes: 'bg-slate-100 text-slate-500 border border-slate-200',
    dotColor: 'bg-slate-400',
    defaultLabel: 'Rejected',
  },
  pending: {
    classes: 'bg-blue-50 text-primary border border-blue-200',
    dotColor: 'bg-primary',
    defaultLabel: 'Pending',
  },
  default: {
    classes: 'bg-slate-100 text-slate-600 border border-slate-200',
    dotColor: 'bg-slate-400',
    defaultLabel: 'Default',
  },
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
}

export function Badge({
  variant = 'default',
  size = 'md',
  label,
  children,
  dot = true,
}: BadgeProps) {
  const config = variantConfig[variant]
  const displayText = children ?? label ?? config.defaultLabel

  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full',
        config.classes,
        sizeClasses[size],
      ].join(' ')}
    >
      {dot && (
        <span
          className={['rounded-full w-1.5 h-1.5 shrink-0', config.dotColor].join(
            ' '
          )}
          aria-hidden="true"
        />
      )}
      {displayText}
    </span>
  )
}
