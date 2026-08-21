import type { HTMLAttributes, ReactNode } from 'react'
import { useTheme } from '../../context/ThemeContext'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Add a subtle hover lift effect */
  hoverable?: boolean
  /** Remove default padding for custom layouts */
  noPadding?: boolean
  /** Accent border color on the left side */
  accentColor?: 'primary' | 'success' | 'warning' | 'danger' | 'none'
}

const accentBorderClasses: Record<
  NonNullable<CardProps['accentColor']>,
  string
> = {
  primary: 'border-l-4 border-l-primary',
  success: 'border-l-4 border-l-success',
  warning: 'border-l-4 border-l-warning',
  danger: 'border-l-4 border-l-danger',
  none: '',
}

export function Card({
  children,
  hoverable = false,
  noPadding = false,
  accentColor = 'none',
  className = '',
  ...props
}: CardProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className={[
        isDark ? 'bg-navy-900 rounded-xl shadow-card border border-navy-800' : 'bg-white rounded-xl shadow-card border border-slate-100',
        'transition-all duration-200',
        hoverable ? 'hover:-translate-y-0.5 hover:shadow-card-hover cursor-pointer' : '',
        noPadding ? '' : 'p-5',
        accentBorderClasses[accentColor],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
        {subtitle && (
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>
        )}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  )
}
