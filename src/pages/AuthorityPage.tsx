import { useEffect, useState } from 'react'
import { Badge, Button, Card, Skeleton } from '../components/ui'
import { supabase } from '../lib/supabaseClient'
import type { ComplaintRow } from '../types/complaint'
import { AuthorityStatCards } from './authority/components/AuthorityStatCards'
import { AuthorityComplaintsList } from './authority/components/AuthorityComplaintsList'
import { AuthorityComplaintsMap } from './authority/components/AuthorityComplaintsMap'
import { AuthorityComplaintDetail } from './authority/components/AuthorityComplaintDetail'
import { useTheme } from '../context/ThemeContext'

type ViewMode = 'list' | 'map' | 'map'

export function AuthorityPage() {
  const [complaints, setComplaints] = useState<ComplaintRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRow | null>(null)

  const fetchComplaints = async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false })

    if (err) {
      console.error('[AuthorityPage] fetch error:', err.message)
      setError('Failed to load complaints. Please try again.')
    } else {
      setComplaints(data as ComplaintRow[])
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchComplaints()
  }, [])

  if (selectedComplaint) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-navy-950' : 'bg-slate-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AuthorityComplaintDetail
            complaint={selectedComplaint}
            onBack={() => setSelectedComplaint(null)}
            onUpdated={() => {
              fetchComplaints()
              // We could also update the local selectedComplaint state to reflect the new status
              // But re-fetching the list is safer. To avoid UI jump, we can manually fetch the single complaint.
              supabase
                .from('complaints')
                .select('*')
                .eq('id', selectedComplaint.id)
                .single()
                .then(({ data, error }) => {
                  if (data && !error) setSelectedComplaint(data as ComplaintRow)
                })
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-navy-950' : 'bg-slate-50'}`}>
      {/* Authority header */}
      <div className={`${isDark ? 'bg-navy-900 border-b border-navy-800' : 'bg-gradient-to-r from-slate-800 to-slate-900'} text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="pending" size="sm">Authority Portal</Badge>
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Municipal Corporation</span>
              </div>
              <h1 className="text-2xl font-bold font-display mt-1">Operations Dashboard</h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                Last updated: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={fetchComplaints} loading={loading}>
                Refresh Data
              </Button>
              <Button variant="primary" size="sm">
                Export Report
              </Button>
            </div>
          </div>

          {/* Stat cards */}
          {!loading && !error && <AuthorityStatCards complaints={complaints} />}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-12">
        {loading ? (
          <div className="space-y-4 animate-fade-in">
            <Skeleton className="h-[72px] w-full max-w-[280px]" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`rounded-xl p-4 border flex items-start gap-4 shadow-sm ${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-100'}`}>
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-16 h-5 rounded" />
                      <Skeleton className="w-20 h-5 rounded" />
                      <Skeleton className="w-24 h-4 ml-2" />
                    </div>
                    <Skeleton className="w-3/4 h-3" />
                    <div className="flex items-center gap-3 mt-2">
                      <Skeleton className="w-24 h-3" />
                      <Skeleton className="w-32 h-3" />
                    </div>
                  </div>
                  <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className={`flex flex-col items-center justify-center py-20 rounded-xl shadow-card border ${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-100'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-danger'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchComplaints} className="mt-4">Try Again</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* View Toggle */}
            <Card noPadding className={`p-2 inline-flex shadow-sm border ${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-200'}`}>
              <button
                onClick={() => setViewMode('list')}
                className={['px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2', viewMode === 'list' ? (isDark ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-800') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')].join(' ')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
                </svg>
                List View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={['px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2', viewMode === 'map' ? (isDark ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-800') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')].join(' ')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.757.433l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                </svg>
                Map View
              </button>
            </Card>

            {/* View Content */}
            {viewMode === 'list' ? (
              <AuthorityComplaintsList complaints={complaints} onSelect={setSelectedComplaint} />
            ) : (
              <AuthorityComplaintsMap complaints={complaints} onSelect={setSelectedComplaint} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
