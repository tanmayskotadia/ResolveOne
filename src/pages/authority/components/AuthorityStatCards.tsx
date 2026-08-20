import { useTheme } from '../../../context/ThemeContext'
import type { ComplaintRow } from '../../../types/complaint'

interface AuthorityStatCardsProps {
  complaints: ComplaintRow[]
}

export function AuthorityStatCards({ complaints }: AuthorityStatCardsProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const total = complaints.length
  const submitted = complaints.filter(c => c.status === 'submitted').length
  const inProgress = complaints.filter(c => c.status === 'in_progress').length
  const resolved = complaints.filter(c => c.status === 'resolved').length

  const stats = [
    { label: 'Total Complaints', value: total.toString(), delta: 'All time', positive: true, color: 'text-slate-800' },
    { label: 'Pending Review', value: submitted.toString(), delta: 'Needs attention', positive: false, color: 'text-danger' },
    { label: 'In Progress', value: inProgress.toString(), delta: 'Currently assigned', positive: true, color: 'text-warning' },
    { label: 'Resolved', value: resolved.toString(), delta: 'Successfully closed', positive: true, color: 'text-success' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-xl p-4 shadow-sm border ${isDark ? 'bg-navy-800/50 border-navy-700/50' : 'bg-white/10 backdrop-blur border-white/20'}`}>
          <p className={['text-3xl font-bold', s.color === 'text-slate-800' ? 'text-white' : s.color].join(' ')}>
            {s.value}
          </p>
          <p className="text-slate-200 text-xs mt-1 font-medium">{s.label}</p>
          <p className={['text-[10px] mt-1 font-medium', s.positive ? 'text-emerald-400' : 'text-amber-400'].join(' ')}>
            {s.delta}
          </p>
        </div>
      ))}
    </div>
  )
}
