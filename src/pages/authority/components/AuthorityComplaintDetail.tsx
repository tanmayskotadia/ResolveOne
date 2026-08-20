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

// Fix default Leaflet icon
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] })
L.Marker.prototype.options.icon = DefaultIcon

const statusBadgeMap: Record<string, any> = {
  submitted: 'pending', open: 'open', in_progress: 'in_progress', resolved: 'resolved', rejected: 'rejected',
}

const statusLabel: Record<string, string> = {
  submitted: 'Submitted', open: 'Under Review', in_progress: 'In Progress', resolved: 'Resolved', rejected: 'Rejected',
}

const statusIcon: Record<string, string> = {
  submitted: '📥', open: '📋', in_progress: '⚙️', resolved: '✅', rejected: '❌',
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
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary mb-5 transition-colors"
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 flex justify-between items-start gap-4">
              <div>
                <p className="text-slate-400 text-xs font-mono">{shortCode(complaint.id)}</p>
                <h1 className="text-white text-lg font-bold mt-1">{complaint.category}</h1>
              </div>
              <Badge variant={statusVariant} />
            </div>
            
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{complaint.description}</p>
                {complaint.source === 'voice' && (
                  <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                    🎙️ Submitted via voice
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reported By</p>
                  <p className="text-sm font-medium text-slate-800">
                    {loading ? <Spinner size="sm" /> : citizen?.full_name || 'Anonymous Citizen'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Submitted Date</p>
                  <p className="text-sm font-medium text-slate-800">{formatDatetime(complaint.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          {complaint.lat && complaint.lng && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Address</p>
                <p className="text-sm text-slate-700">{complaint.address || 'No address provided'}</p>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  Lat: {complaint.lat.toFixed(5)}, Lng: {complaint.lng.toFixed(5)}
                </p>
              </div>
            </div>
          )}

          {/* Photo */}
          {(complaint.photo_url && !imgError) && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 pt-4 mb-3">Citizen Attached Photo</p>
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
            <div className="bg-white rounded-xl border border-success-200 shadow-sm overflow-hidden">
              <div className="bg-success-50 px-5 py-3 border-b border-success-100 flex items-center gap-2">
                <span className="text-success">✅</span>
                <p className="text-sm font-bold text-success-800 uppercase tracking-wider">Completion Proof</p>
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

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Status History</p>
            {loading ? (
              <div className="flex items-center gap-2 py-2">
                <Spinner size="sm" />
                <span className="text-sm text-slate-400">Loading history...</span>
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
                        {!isLast && <div className="w-px flex-1 bg-slate-200 my-1" />}
                      </div>
                      <div className={isLast ? 'pb-0' : 'pb-5'}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{statusIcon[item.status]}</span>
                          <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDatetime(item.at)}</p>
                        {item.note && (
                          <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
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
