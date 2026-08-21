import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Button, Skeleton } from '../../components/ui'
import { ComplaintCard } from './components/ComplaintCard'
import { ComplaintDetail } from './components/ComplaintDetail'
import type { ComplaintRow } from '../../types/complaint'

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 animate-fade-in">
      {/* Illustration */}
      <div className="relative w-32 h-32 mb-6">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full bg-primary-50 border-2 border-dashed border-primary-200 animate-pulse" />
        {/* Inner icon */}
        <div className={`absolute inset-4 rounded-full shadow-card flex items-center justify-center ${isDark ? 'bg-navy-900 border border-navy-800' : 'bg-white'}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-10 h-10 text-primary-300"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z"
              clipRule="evenodd"
            />
            <path
              fillRule="evenodd"
              d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zm9.586 4.594a.75.75 0 00-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.116-.062l3-3.75z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        {/* Floating dots for decoration */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full opacity-70" />
        <div className="absolute -bottom-1 -left-2 w-3 h-3 bg-success rounded-full opacity-60" />
      </div>

      <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>No complaints yet</h2>
      <p className={`text-sm max-w-xs leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        You haven't reported any issues yet. Spotted something that needs fixing in your city?
      </p>

      <Link to="/citizen/report">
        <Button size="lg" leftIcon={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
          </svg>
        }>
          Report an Issue
        </Button>
      </Link>

      <p className="text-xs text-slate-400 mt-4">
        Your reports help the municipality respond faster.
      </p>
    </div>
  )
}

// ── Error State ────────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-danger" aria-hidden="true">
          <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
        </svg>
      </div>
      <h2 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>Failed to load</h2>
      <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Could not fetch your complaints. Check your connection and try again.</p>
      <Button variant="secondary" onClick={onRetry}>Try Again</Button>
    </div>
  )
}

// ── Status filter tabs ─────────────────────────────────────────────────────────

const FILTERS = ['All', 'Submitted', 'In Progress', 'Resolved', 'Rejected'] as const
type Filter = typeof FILTERS[number]

const filterToStatus: Record<Filter, string | null> = {
  'All': null,
  'Submitted': 'submitted',
  'In Progress': 'in_progress',
  'Resolved': 'resolved',
  'Rejected': 'rejected',
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function ComplaintsPage() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [complaints, setComplaints] = useState<ComplaintRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [selected, setSelected] = useState<ComplaintRow | null>(null)

  const fetchComplaints = async () => {
    if (!user) return
    setLoading(true)
    setError(false)

    const { data, error: err } = await supabase
      .from('complaints')
      .select('*')
      .eq('citizen_id', user.id)
      .order('created_at', { ascending: false })

    if (err) {
      console.error('[ComplaintsPage] fetch:', err.message)
      setError(true)
    } else {
      setComplaints(data as ComplaintRow[])
    }
    setLoading(false)
  }

  useEffect(() => { fetchComplaints() }, [user])

  // Filter complaints client-side
  const statusFilter = filterToStatus[activeFilter]
  const filtered = statusFilter
    ? complaints.filter(c => c.status === statusFilter)
    : complaints

  // ── Detail view ──────────────────────────────────────────────────────────────

  if (selected) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24">
        <ComplaintDetail
          complaint={selected}
          onBack={() => setSelected(null)}
        />
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>My Complaints</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {loading ? 'Loading…' : `${complaints.length} complaint${complaints.length !== 1 ? 's' : ''} submitted`}
          </p>
        </div>
        <Link to="/citizen/report">
          <Button size="sm" leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
            </svg>
          }>
            New
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      {!loading && complaints.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={[
                'px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
                activeFilter === f
                  ? 'bg-primary text-white shadow-sm'
                  : (isDark ? 'bg-navy-900 text-slate-400 border border-navy-800 hover:border-primary-400 hover:text-primary-400' : 'bg-white text-slate-500 border border-slate-200 hover:border-primary-300 hover:text-primary'),
              ].join(' ')}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* States */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`rounded-2xl p-4 border shadow-sm flex items-start gap-4 ${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-100'}`}>
              <Skeleton className="w-12 h-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-16 h-4" />
                  <Skeleton className="w-20 h-4" />
                </div>
                <Skeleton className="w-full h-3" />
                <Skeleton className="w-2/3 h-3" />
                <Skeleton className="w-32 h-3 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={fetchComplaints} />
      ) : complaints.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        // Filter returned no results
        <div className="text-center py-12">
          <p className="text-slate-500 text-sm">No complaints match this filter.</p>
          <button
            onClick={() => setActiveFilter('All')}
            className="text-primary text-sm font-medium mt-2 hover:underline"
          >
            Show all
          </button>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {filtered.map(c => (
            <ComplaintCard
              key={c.id}
              complaint={c}
              onClick={() => setSelected(c)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
