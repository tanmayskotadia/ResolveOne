import { Badge } from '../../../components/ui'
import type { ComplaintRow } from '../../../types/complaint'

interface ComplaintCardProps {
  complaint: ComplaintRow
  onClick: () => void
}

// Short code from UUID (last 8 chars)
export function shortCode(id: string) {
  return 'CMP-' + id.slice(-8).toUpperCase()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Map DB status to Badge variant
const statusBadgeMap: Record<string, 'pending' | 'in_progress' | 'resolved' | 'open' | 'rejected' | 'default'> = {
  submitted: 'pending',
  open: 'open',
  in_progress: 'in_progress',
  resolved: 'resolved',
  rejected: 'rejected',
}

const categoryIcons: Record<string, string> = {
  'Garbage/Waste': '🗑️',
  'Road Damage/Potholes': '🛣️',
  'Streetlights': '💡',
  'Water Leakage/Supply': '💧',
  'Drainage/Sewage': '🌊',
  'Electricity': '⚡',
  'Public Infrastructure': '🏗️',
  'Other': '📋',
}

export function ComplaintCard({ complaint, onClick }: ComplaintCardProps) {
  const statusVariant = statusBadgeMap[complaint.status] ?? 'default'
  const icon = categoryIcons[complaint.category] ?? '📋'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-slate-100 shadow-card hover:shadow-card-hover hover:border-primary-200 hover:-translate-y-0.5 transition-all duration-200 group"
      aria-label={`View complaint ${shortCode(complaint.id)}`}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Category icon bubble */}
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 text-xl group-hover:bg-primary-50 transition-colors">
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-mono font-medium text-slate-400">
              {shortCode(complaint.id)}
            </span>
            <Badge variant={statusVariant} size="sm" />
          </div>

          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-primary transition-colors">
            {complaint.category}
          </p>

          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
            {complaint.description}
          </p>

          <div className="flex items-center gap-2 mt-2">
            {complaint.source === 'voice' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full border border-slate-100">
                🎙️ Voice
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              {formatDate(complaint.created_at)}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 text-slate-300 group-hover:text-primary shrink-0 mt-1 transition-colors"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </div>
    </button>
  )
}
