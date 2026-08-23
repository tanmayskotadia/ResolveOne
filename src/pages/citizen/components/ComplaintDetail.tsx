import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { useTheme } from '../../../context/ThemeContext'
import { Badge } from '../../../components/ui'
import { Spinner } from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabaseClient'
import type { ComplaintRow, StatusHistoryRow } from '../../../types/complaint'
import { shortCode } from './ComplaintCard'

// Fix default Leaflet icon
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] })
L.Marker.prototype.options.icon = DefaultIcon

// ── helpers ────────────────────────────────────────────────────────────────────

const statusBadgeMap: Record<string, 'pending' | 'in-progress' | 'resolved' | 'under-review' | 'rejected' | 'default'> = {
  submitted: 'pending', 'under-review': 'under-review', 'in-progress': 'in-progress', resolved: 'resolved', rejected: 'rejected',
}

const statusLabel: Record<string, string> = {
  submitted: 'Submitted', 'under-review': 'Under Review', 'in-progress': 'In Progress', resolved: 'Resolved', rejected: 'Rejected',
}

const statusIcon: Record<string, string> = {
  submitted: '📥', 'under-review': '📋', 'in-progress': '⚙️', resolved: '✅', rejected: '❌',
}

function formatDatetime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const timelineNodeColors: Record<string, string> = {
  submitted: 'bg-primary border-primary',
  'under-review': 'bg-danger border-danger',
  'in-progress': 'bg-warning border-warning',
  resolved: 'bg-success border-success',
  rejected: 'bg-slate-400 border-slate-400',
}

// ── component ──────────────────────────────────────────────────────────────────

interface ComplaintDetailProps {
  complaint: ComplaintRow
  onBack: () => void
}

export function ComplaintDetail({ complaint, onBack }: ComplaintDetailProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [history, setHistory] = useState<StatusHistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    async function fetchHistory() {
      setHistoryLoading(true)
      const { data, error } = await supabase
        .from('status_history')
        .select('*')
        .eq('complaint_id', complaint.id)
        .order('changed_at', { ascending: true })

      if (error) console.error('[ComplaintDetail] fetchHistory:', error.message)
      setHistory(data ?? [])
      setHistoryLoading(false)
    }
    fetchHistory()
  }, [complaint.id])

  // Build timeline: use real history if available, otherwise synthesise from complaint row
  const timelineItems: Array<{ status: string; label: string; note: string | null; at: string }> =
    history.length > 0
      ? history.map(h => ({
          status: h.status,
          label: statusLabel[h.status] ?? h.status,
          note: h.note,
          at: h.changed_at,
        }))
      : [{ status: complaint.status, label: statusLabel[complaint.status] ?? complaint.status, note: null, at: complaint.created_at }]

  const statusVariant = statusBadgeMap[complaint.status] ?? 'default'

  return (
    <div className="animate-slide-up">
      {/* ── back button ── */}
      <button
        onClick={onBack}
        className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors mb-5 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-primary'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
        </svg>
        Back to complaints
      </button>

      {/* ── header card ── */}
      <div className={`${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-100'} rounded-xl border shadow-card overflow-hidden mb-4`}>
        <div className="bg-gradient-to-r from-primary to-primary-700 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-primary-200 text-xs font-mono">{shortCode(complaint.id)}</p>
              <h1 className="text-white text-lg font-bold mt-0.5">{complaint.category}</h1>
            </div>
            <Badge variant={statusVariant} />
          </div>
          <p className="text-primary-200 text-xs mt-2">
            Submitted {formatDatetime(complaint.created_at)}
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Description */}
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Description
            </p>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{complaint.description}</p>
            {complaint.source === 'voice' && (
              <span className={`inline-flex items-center gap-1 mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full border ${isDark ? 'text-slate-400 bg-navy-950 border-navy-800' : 'text-slate-400 bg-slate-50 border-slate-100'}`}>
                🎙️ Submitted via voice
              </span>
            )}
          </div>

          {/* Address */}
          {complaint.address && (
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Location
              </p>
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{complaint.address}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── map ── */}
      {complaint.lat && complaint.lng && (
        <div className={`${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-100'} rounded-xl border shadow-card overflow-hidden mb-4`}>
          <div className="h-48 w-full relative z-0">
            <MapContainer
              center={[complaint.lat, complaint.lng]}
              zoom={15}
              scrollWheelZoom={false}
              dragging={false}
              zoomControl={false}
              attributionControl={false}
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[complaint.lat, complaint.lng]} />
            </MapContainer>
            {/* overlay gradient so map feels embedded */}
            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5 rounded-xl" />
          </div>
          <div className={`px-4 py-2.5 flex items-center gap-1.5 border-t ${isDark ? 'border-navy-800' : 'border-slate-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true">
              <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.757.433l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
            </svg>
            <p className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              {complaint.lat.toFixed(5)}, {complaint.lng.toFixed(5)}
            </p>
          </div>
        </div>
      )}

      {/* ── photo ── */}
      {complaint.photo_url && !imgError && (
        <div className={`${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-100'} rounded-xl border shadow-card overflow-hidden mb-4`}>
          <p className={`text-xs font-semibold uppercase tracking-wider px-5 pt-4 mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Attached Photo
          </p>
          <img
            src={complaint.photo_url}
            alt="Complaint photo"
            className="w-full max-h-64 object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      {/* ── status timeline ── */}
      <div className={`${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-100'} rounded-xl border shadow-card px-5 py-4 mb-4`}>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Status Timeline
        </p>

        {historyLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Spinner size="sm" />
            <span className="text-sm text-slate-400">Loading history…</span>
          </div>
        ) : (
          <ol className="relative">
            {timelineItems.map((item, idx) => {
              const isLast = idx === timelineItems.length - 1
              const nodeClass = timelineNodeColors[item.status] ?? 'bg-slate-400 border-slate-400'

              return (
                <li key={idx} className="flex gap-4 pb-1">
                  {/* Node + connecting line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5 z-10 ${nodeClass}`} />
                    {!isLast && (
                      <div className={`w-px flex-1 my-1 ${isDark ? 'bg-navy-800' : 'bg-slate-200'}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={isLast ? 'pb-0' : 'pb-5'}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm" aria-hidden="true">{statusIcon[item.status]}</span>
                      <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.label}</span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{formatDatetime(item.at)}</p>
                    {item.note && (
                      <p className={`text-xs mt-1 rounded-lg px-3 py-2 border ${isDark ? 'bg-navy-950/50 border-navy-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        {item.note}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
