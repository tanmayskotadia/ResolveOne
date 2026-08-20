import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { Badge } from '../../../components/ui'
import { Spinner } from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabaseClient'
import type { ComplaintRow, StatusHistoryRow } from '../../../types/complaint'
import { shortCode } from '../../citizen/components/ComplaintCard'
import { StatusUpdateControl } from './StatusUpdateControl'
import type { Profile } from '../../../types/profile'
import { useTheme } from '../../../context/ThemeContext'

// Fix default Leaflet icon
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] })
L.Marker.prototype.options.icon = DefaultIcon

const statusBadgeMap: Record<string, any> = {
  submitted: 'pending', open: 'open', in_progress: 'in_progress', resolved: 'resolved', rejected: 'rejected',
}

const statusLabel: Record<string, string> = {
  submitted: 'Submitted', open: 'Under Review', in_progress: 'In Progress', resolved: 'Resolved', rejected: 'Rejected',
}

const statusIcon = (status: string, className = "w-4 h-4") => {
  switch (status) {
    case 'submitted':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
          <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
          <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
        </svg>
      )
    case 'open':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
      )
    case 'in_progress':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      )
    case 'resolved':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
      )
    case 'rejected':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
      )
    default:
      return null
  }
}

function formatDatetime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const timelineNodeColors: Record<string, string> = {
  submitted:   'bg-primary border-primary',
  open:        'bg-danger border-danger',
  in_progress: 'bg-warning border-warning',
  resolved:    'bg-success border-success',
  rejected:    'bg-slate-400 border-slate-400',
}

interface AuthorityComplaintDetailProps {
  complaint: ComplaintRow
  onBack: () => void
  onUpdated: () => void
}

export function AuthorityComplaintDetail({ complaint, onBack, onUpdated }: AuthorityComplaintDetailProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [history, setHistory] = useState<StatusHistoryRow[]>([])
  const [citizen, setCitizen] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgError, setImgError] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    
    // 1. Fetch History
    const historyPromise = supabase
      .from('status_history')
      .select('*')
      .eq('complaint_id', complaint.id)
      .order('changed_at', { ascending: true })

    // 2. Fetch Citizen Profile (if not anonymous)
    let citizenPromise: any = Promise.resolve({ data: null, error: null })
    if (complaint.citizen_id) {
      citizenPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', complaint.citizen_id)
        .single()
    }

    const [historyRes, citizenRes] = await Promise.all([historyPromise, citizenPromise])
    
    if (historyRes.error) console.error('[AuthorityDetail] history error:', historyRes.error.message)
    else setHistory(historyRes.data ?? [])

    if (citizenRes.error) console.error('[AuthorityDetail] citizen error:', citizenRes.error?.message)
    else if (citizenRes.data) setCitizen(citizenRes.data as Profile)
    else setCitizen(null) // Anonymous citizen

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [complaint.id])

  const handleStatusUpdated = () => {
    // Refresh history and trigger parent to refresh complaints list
    fetchData()
    onUpdated()
  }

  const timelineItems = history.length > 0
    ? history.map(h => ({
        status: h.status,
        label: statusLabel[h.status] ?? h.status,
        note: h.note,
        at: h.changed_at,
        by: h.changed_by
      }))
    : [{ status: complaint.status, label: statusLabel[complaint.status] ?? complaint.status, note: null, at: complaint.created_at, by: null }]

  const statusVariant = statusBadgeMap[complaint.status] ?? 'default'

  return (
    <div className="animate-slide-up pb-10">
      {/* Back button */}
      <button
        onClick={onBack}
        className={`inline-flex items-center gap-1.5 text-sm font-medium hover:text-primary mb-5 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
        </svg>
        Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header Card */}
          <div className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-200'}`}>
            <div className={`px-5 py-4 flex justify-between items-start gap-4 ${isDark ? 'bg-navy-950/50' : 'bg-gradient-to-r from-slate-800 to-slate-900'}`}>
              <div>
                <p className="text-slate-400 text-xs font-mono">{shortCode(complaint.id)}</p>
                <h1 className="text-white text-lg font-bold mt-1">{complaint.category}</h1>
              </div>
              <Badge variant={statusVariant} />
            </div>
            
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Description</p>
                <p className={`text-sm leading-relaxed p-3 rounded-lg border ${isDark ? 'bg-navy-950 text-slate-300 border-navy-800' : 'bg-slate-50 text-slate-700 border-slate-100'}`}>{complaint.description}</p>
                {complaint.source === 'voice' && (
                  <span className={`inline-flex items-center gap-1 mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full border ${isDark ? 'text-slate-400 bg-navy-950 border-navy-800' : 'text-slate-400 bg-slate-50 border-slate-100'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                      <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
                    </svg>
                    Submitted via voice
                  </span>
                )}
              </div>

              <div className={`flex flex-col sm:flex-row gap-4 sm:gap-8 pt-2 border-t ${isDark ? 'border-navy-800' : 'border-slate-100'}`}>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Reported By</p>
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    {loading ? <Spinner size="sm" /> : citizen?.full_name || 'Anonymous Citizen'}
                  </p>
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Submitted Date</p>
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{formatDatetime(complaint.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          {complaint.lat && complaint.lng && (
            <div className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-200'}`}>
              <div className="h-64 w-full relative z-0">
                <MapContainer
                  center={[complaint.lat, complaint.lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[complaint.lat, complaint.lng]} />
                </MapContainer>
              </div>
              <div className={`px-5 py-3 border-t ${isDark ? 'bg-navy-950 border-navy-800' : 'bg-slate-50 border-slate-200'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Address</p>
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{complaint.address || 'No address provided'}</p>
                <p className={`text-xs font-mono mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  Lat: {complaint.lat.toFixed(5)}, Lng: {complaint.lng.toFixed(5)}
                </p>
              </div>
            </div>
          )}

          {/* Photo */}
          {(complaint.photo_url && !imgError) && (
            <div className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-200'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider px-5 pt-4 mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Citizen Attached Photo</p>
              <img
                src={complaint.photo_url}
                alt="Complaint photo"
                className="w-full max-h-96 object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          )}

          {/* Resolution Photo */}
          {complaint.resolution_photo_url && (
            <div className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? 'bg-navy-900 border-emerald-900/50' : 'bg-white border-success-200'}`}>
              <div className={`px-5 py-3 border-b flex items-center gap-2 ${isDark ? 'bg-emerald-900/20 border-emerald-900/50' : 'bg-success-50 border-success-100'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-success-600'}`}>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <p className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-success-800'}`}>Completion Proof</p>
              </div>
              <img
                src={complaint.resolution_photo_url}
                alt="Resolution photo"
                className="w-full max-h-96 object-cover"
              />
            </div>
          )}
        </div>

        {/* Right Column: Actions & Timeline */}
        <div className="space-y-4">
          <StatusUpdateControl complaint={complaint} onStatusUpdated={handleStatusUpdated} />

          <div className={`rounded-xl border shadow-sm px-5 py-4 ${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-200'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Status History</p>
            {loading ? (
              <div className="flex items-center gap-2 py-2">
                <Spinner size="sm" />
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Loading history...</span>
              </div>
            ) : (
              <ol className="relative">
                {timelineItems.map((item, idx) => {
                  const isLast = idx === timelineItems.length - 1
                  const nodeClass = timelineNodeColors[item.status] ?? 'bg-slate-400 border-slate-400'

                  return (
                    <li key={idx} className="flex gap-4 pb-1">
                      <div className="flex flex-col items-center">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5 z-10 ${nodeClass}`} />
                        {!isLast && <div className={`w-px flex-1 my-1 ${isDark ? 'bg-navy-800' : 'bg-slate-200'}`} />}
                      </div>
                      <div className={isLast ? 'pb-0' : 'pb-5'}>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{statusIcon(item.status, "w-4 h-4")}</span>
                          <span className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{item.label}</span>
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
      </div>
    </div>
  )
}
