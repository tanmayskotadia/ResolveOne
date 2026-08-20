import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../../components/ui'
import { hashAadhaar, validateAadhaar, DEMO_AADHAAR_NUMBERS } from '../../lib/aadhaarHash'
import type { ComplaintRow, StatusHistoryRow, ComplaintStatus } from '../../types/complaint'
import { useTheme } from '../../context/ThemeContext'

// Fix default Leaflet icon (required when bundling with Vite)
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] })
L.Marker.prototype.options.icon = DefaultIcon

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  submitted:    'Complaint Registered',
  open:         'Under Review',
  in_progress:  'In Progress',
  resolved:     'Resolved',
  rejected:     'Rejected',
}

// The 4-stage civic pipeline shown in the timeline
const PIPELINE_STAGES: { key: ComplaintStatus | 'submitted'; label: string; description: string }[] = [
  { key: 'submitted',   label: 'Complaint Registered', description: 'Your complaint has been received.' },
  { key: 'open',        label: 'Under Review',         description: 'Our team is reviewing your complaint.' },
  { key: 'in_progress', label: 'In Progress',          description: 'Work has begun to resolve this issue.' },
  { key: 'resolved',    label: 'Resolved',             description: 'Issue has been resolved. Thank you.' },
]

// Ordering for comparing progress
const STATUS_ORDER: Record<string, number> = {
  submitted:   0,
  open:        1,
  in_progress: 2,
  resolved:    3,
  rejected:    99,
}

function getStageState(stageKey: string, currentStatus: ComplaintStatus): 'done' | 'current' | 'upcoming' {
  if (currentStatus === 'rejected') return stageKey === 'submitted' ? 'done' : 'upcoming'
  const stageOrder = STATUS_ORDER[stageKey] ?? 0
  const currentOrder = STATUS_ORDER[currentStatus] ?? 0
  if (stageOrder < currentOrder) return 'done'
  if (stageOrder === currentOrder) return 'current'
  return 'upcoming'
}

function statusBadgeClass(status: ComplaintStatus): string {
  const map: Record<ComplaintStatus, string> = {
    submitted:   'bg-slate-100 text-slate-700 ring-slate-200',
    open:        'bg-blue-50   text-blue-700   ring-blue-200',
    in_progress: 'bg-amber-50 text-amber-700 ring-amber-200',
    resolved:    'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected:    'bg-red-50   text-red-700   ring-red-200',
  }
  return map[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Demo offline fallback ────────────────────────────────────────────────────

const DEMO_COMPLAINT: ComplaintRow = {
  id: 'demo-0000-0000-00000000',
  citizen_id: null,
  citizen_identifier_hash: null,
  description: 'Large pothole near the main road junction causing vehicle damage and traffic hazard.',
  category: 'Road & Infrastructure',
  source: 'text',
  lat: 23.0225,
  lng: 72.5714,
  address: 'Main Road Junction, Ward 12, Ahmedabad',
  photo_url: null,
  status: 'in_progress',
  created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
}

const DEMO_HISTORY: StatusHistoryRow[] = [
  { id: 'h1', complaint_id: 'demo-0000-0000-00000000', status: 'submitted',   note: null,                             changed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), changed_by: null },
  { id: 'h2', complaint_id: 'demo-0000-0000-00000000', status: 'open',        note: 'Complaint logged and assigned.', changed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), changed_by: null },
  { id: 'h3', complaint_id: 'demo-0000-0000-00000000', status: 'in_progress', note: 'Road repair crew dispatched.',   changed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), changed_by: null },
]

function displayCode(complaint: ComplaintRow): string {
  if ((complaint as any).complaint_code) return (complaint as any).complaint_code
  return 'CC-' + complaint.id.slice(-8).toUpperCase()
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TrackResult {
  complaint: ComplaintRow
  history: StatusHistoryRow[]
  isDemo?: boolean
}

// ─── Main component ────────────────────────────────────────────────────────────

export function TrackComplaintPage() {
  const [searchParams] = useSearchParams()
  const [complaintCode, setComplaintCode] = useState(searchParams.get('id') || '')
  const [aadhaar, setAadhaar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TrackResult | null>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // ── Input handling ──────────────────────────────────────────────────────────

  const handleAadhaarInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 12)
    const formatted = digits.replace(/(.{4})(.{4})(.{1,4})/, '$1 $2 $3').trim()
    setAadhaar(formatted)
    setError(null)
  }

  // ── Real lookup ─────────────────────────────────────────────────────────────

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    const rawAadhaar = aadhaar.replace(/\s/g, '')
    const { valid, error: validErr } = validateAadhaar(rawAadhaar)
    if (!valid) { setError(validErr ?? 'Invalid Aadhaar.'); return }
    if (!complaintCode.trim()) { setError('Please enter your Complaint ID.'); return }

    setLoading(true)
    try {
      const hash = await hashAadhaar(rawAadhaar)
      setAadhaar('') // Clear immediately after hashing – never keep raw

      const { data: complaints, error: dbErr } = await supabase
        .rpc('get_complaints_by_hash', { p_hash: hash, p_complaint_code: complaintCode.trim() })

      if (dbErr) throw new Error(dbErr.message)
      if (!complaints || complaints.length === 0) {
        setError('Complaint not found. Please check your Complaint ID and Aadhaar number and try again.')
        return
      }

      const complaint = complaints[0] as ComplaintRow

      const { data: history, error: histErr } = await supabase
        .rpc('get_status_history_by_hash', { p_hash: hash, p_complaint_code: complaintCode.trim() })

      if (histErr) throw new Error(histErr.message)
      setResult({ complaint, history: (history ?? []) as StatusHistoryRow[] })
    } catch (err: any) {
      setError(err.message || 'Lookup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Demo mode ───────────────────────────────────────────────────────────────

  const handleDemoLoad = () => {
    setError(null)
    setComplaintCode('CC-DEMO1024')
    setAadhaar('')
    setResult({ complaint: DEMO_COMPLAINT, history: DEMO_HISTORY, isDemo: true })
  }

  // ── Timeline items ──────────────────────────────────────────────────────────

  // Show the fixed 4-stage pipeline; if rejected, also show a rejection node at the end
  const isRejected = result?.complaint.status === 'rejected'

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 ${isDark ? 'bg-navy-950' : 'bg-gradient-to-br from-primary-50 via-white to-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-4 w-full">
        {/* ── Page header ── */}
        <div className="mb-6">
          <Link
            to="/citizen/report"
            className={`inline-flex items-center gap-1.5 text-sm transition-colors mb-5 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-primary'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
            Report Issue
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${isDark ? 'bg-primary/20 text-primary-300 border border-primary/30' : 'bg-primary text-white'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className={`text-xl font-bold font-display ${isDark ? 'text-white' : 'text-slate-800'}`}>Track My Complaint</h1>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>View the current status and progress of your complaint</p>
            </div>
          </div>
        </div>

        {/* ── Lookup form (Compact & Horizontal on Desktop) ── */}
        <div className={`rounded-2xl shadow-sm p-4 sm:p-6 mb-8 max-w-4xl ${isDark ? 'bg-navy-900 border border-navy-800' : 'bg-white border border-slate-100'}`}>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:flex-1">
              <label htmlFor="complaint-id" className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Complaint ID
              </label>
              <input
                id="complaint-id"
                type="text"
                placeholder="e.g. CC-2026-00001"
                value={complaintCode}
                onChange={e => { setComplaintCode(e.target.value.toUpperCase()); setError(null) }}
                className={`w-full rounded-xl border px-4 py-2.5 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow ${
                  isDark ? 'bg-navy-950 border-navy-700 text-white placeholder:text-navy-600' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-300'
                }`}
              />
            </div>

            <div className="w-full md:flex-1">
              <label htmlFor="track-aadhaar" className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Aadhaar Number
              </label>
              <input
                id="track-aadhaar"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="XXXX XXXX XXXX"
                value={aadhaar}
                onChange={e => handleAadhaarInput(e.target.value)}
                className={`w-full rounded-xl border px-4 py-2.5 font-mono tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow ${
                  isDark ? 'bg-navy-950 border-navy-700 text-white placeholder:text-navy-600' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-300'
                }`}
                maxLength={14}
              />
            </div>

            <div className="w-full md:w-auto">
              <Button type="submit" size="lg" loading={loading} className="w-full md:w-auto py-2.5 px-6">
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </form>

          {error && (
            <div className={`flex items-start gap-2.5 p-3.5 mt-4 text-sm rounded-xl animate-fade-in ${isDark ? 'bg-red-950/30 border border-red-900/50 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
        </div>


        {/* ── Dashboard Result ── */}
        {loading && !result && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className={`w-10 h-10 border-4 rounded-full animate-spin mb-4 ${isDark ? 'border-primary/20 border-t-primary' : 'border-primary/20 border-t-primary'}`}></div>
            <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Searching for your complaint...</p>
          </div>
        )}

        {result && (
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 animate-fade-in">
            {/* ── LEFT COLUMN (approx 75%) ── */}
            <div className="lg:w-3/4 space-y-6">
              {result.isDemo && (
                <div className={`flex items-center gap-2 text-xs border rounded-xl px-4 py-2.5 ${isDark ? 'bg-amber-950/30 border-amber-900/50 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>This is demo data for illustration purposes.</span>
                </div>
              )}

              {/* COMPACT COMPLAINT DETAILS CARD */}
              <div className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col md:flex-row ${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-100'}`}>
                <div className="p-6 md:p-8 flex-1">
                  <h2 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>Complaint Details</h2>
                  
                  <div className="grid grid-cols-2 gap-y-6 gap-x-8 mb-6">
                    <div>
                      <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Complaint ID</p>
                      <p className={`text-sm font-mono font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{displayCode(result.complaint)}</p>
                    </div>
                    <div>
                      <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Submitted On</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{formatDate(result.complaint.created_at)}</p>
                    </div>
                    <div>
                      <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Category</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{result.complaint.category}</p>
                    </div>
                    <div>
                      <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Status</p>
                      <span className={`inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full ring-1 ${statusBadgeClass(result.complaint.status)}`}>
                        {isRejected ? 'Rejected' : STATUS_LABELS[result.complaint.status]}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Description</p>
                    <p className={`text-sm leading-relaxed border rounded-xl px-4 py-3 ${isDark ? 'bg-navy-950 text-slate-300 border-navy-800' : 'bg-slate-50 text-slate-700 border-slate-100'}`}>
                      {result.complaint.description}
                    </p>
                  </div>
                </div>

                {/* Photo Side-panel inside Details Card */}
                {result.complaint.photo_url && (
                  <div className={`md:w-64 border-t md:border-t-0 md:border-l p-4 flex flex-col items-center justify-center shrink-0 ${isDark ? 'border-navy-800 bg-navy-950/50' : 'border-slate-100 bg-slate-50'}`}>
                    <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 w-full text-left ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Attached Photo</p>
                    <div className={`rounded-xl overflow-hidden shadow-sm border w-full h-40 relative ${isDark ? 'border-navy-700' : 'border-slate-200'}`}>
                      <img src={result.complaint.photo_url} alt="Complaint Attachment" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              {/* RESOLUTION DETAILS (if any) */}
              {(() => {
                if (result.complaint.status !== 'resolved' || !result.complaint.resolution_photo_url) return null;
                const resolvedHistory = result.history.find(h => h.status === 'resolved');
                return (
                  <div className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col md:flex-row ${isDark ? 'bg-emerald-900/20 border-emerald-900/50' : 'bg-white border-success-200'}`}>
                    <div className={`p-6 md:p-8 flex-1 ${isDark ? 'bg-emerald-900/10' : 'bg-success-50/50'}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-success-600'}`}>
                          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                        </svg>
                        <h2 className={`text-lg font-bold ${isDark ? 'text-emerald-400' : 'text-success-800'}`}>Resolution Details</h2>
                      </div>
                      <p className={`text-sm leading-relaxed font-medium mb-4 ${isDark ? 'text-emerald-200' : 'text-success-700'}`}>
                        Your complaint has been successfully resolved by the municipal authority. 
                        Please see the attached completion proof photo.
                      </p>
                      {resolvedHistory && (
                        <div className={`border rounded-xl p-4 mt-4 ${isDark ? 'bg-navy-900/60 border-emerald-800/60' : 'bg-white/60 border-success-200/60'}`}>
                          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                            <div>
                              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-emerald-500' : 'text-success-600/70'}`}>Resolved On</p>
                              <p className={`text-sm font-semibold ${isDark ? 'text-emerald-300' : 'text-success-800'}`}>{formatDate(resolvedHistory.changed_at)}</p>
                            </div>
                            {resolvedHistory.note && (
                              <div className="flex-1">
                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-emerald-500' : 'text-success-600/70'}`}>Authority Note</p>
                                <p className={`text-sm font-medium ${isDark ? 'text-emerald-300' : 'text-success-800'}`}>{resolvedHistory.note}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={`md:w-64 border-t md:border-t-0 md:border-l p-4 flex flex-col items-center justify-center shrink-0 ${isDark ? 'border-emerald-900/50 bg-navy-900' : 'border-success-100 bg-white'}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 w-full text-left ${isDark ? 'text-emerald-500' : 'text-success-600'}`}>Completion Proof</p>
                      <div className={`rounded-xl overflow-hidden shadow-sm border w-full h-40 relative ${isDark ? 'border-emerald-800/50' : 'border-success-200'}`}>
                        <img src={result.complaint.resolution_photo_url} alt="Resolution Attachment" className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* LOCATION & TIMELINE (SIDE BY SIDE) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Location Card */}
                <div className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col ${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-100'}`}>
                  <div className={`px-6 py-5 border-b ${isDark ? 'border-navy-800' : 'border-slate-100'}`}>
                    <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Complaint Location</h2>
                  </div>
                  <div className="p-6 space-y-4 flex-1 flex flex-col">
                    <div>
                      <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Address</p>
                      <div className="flex items-start gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.757.433l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                        </svg>
                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{result.complaint.address || 'Location provided via map coordinates.'}</p>
                      </div>
                    </div>
                    {result.complaint.lat && result.complaint.lng && (
                      <div className={`rounded-xl overflow-hidden border mt-auto flex-1 min-h-[200px] flex flex-col ${isDark ? 'border-navy-700' : 'border-slate-200'}`}>
                        <div className="flex-1 w-full relative z-0">
                          <MapContainer
                            center={[result.complaint.lat, result.complaint.lng]}
                            zoom={15}
                            scrollWheelZoom={false}
                            className="absolute inset-0 w-full h-full"
                            attributionControl={false}
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[result.complaint.lat, result.complaint.lng]} />
                          </MapContainer>
                        </div>
                        <div className={`px-4 py-2 text-xs font-mono border-t shrink-0 ${isDark ? 'bg-navy-950 text-slate-500 border-navy-700' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {result.complaint.lat.toFixed(5)}, {result.complaint.lng.toFixed(5)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Timeline Card */}
                <div className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col ${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-100'}`}>
                  <div className={`px-6 py-5 border-b ${isDark ? 'border-navy-800' : 'border-slate-100'}`}>
                    <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Status Timeline</h2>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-center">
                    {isRejected ? (
                      <RejectedTimeline history={result.history} createdAt={result.complaint.created_at} isDark={isDark} />
                    ) : (
                      <PipelineTimeline currentStatus={result.complaint.status} history={result.history} createdAt={result.complaint.created_at} isDark={isDark} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN (approx 25%) ── */}
            <div className="lg:w-1/4 space-y-6">
              {/* Current Status Widget */}
              <StatusWidget status={result.complaint.status} isRejected={isRejected} isDark={isDark} />

              {/* Need Help Widget */}
              <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-100'}`}>
                <div className={`px-5 py-4 border-b ${isDark ? 'border-navy-800' : 'border-slate-100'}`}>
                  <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Need Help?</h2>
                </div>
                <div className="p-2">
                  <button className={`w-full flex flex-col text-left px-4 py-3 transition-colors rounded-xl group ${isDark ? 'hover:bg-navy-800' : 'hover:bg-slate-50'}`}>
                    <span className={`text-sm font-semibold transition-colors ${isDark ? 'text-slate-300 group-hover:text-primary-300' : 'text-slate-800 group-hover:text-primary'}`}>Having issues?</span>
                    <span className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Contact our support team.</span>
                  </button>
                  <button className={`w-full flex flex-col text-left px-4 py-3 transition-colors rounded-xl group mt-1 ${isDark ? 'hover:bg-navy-800' : 'hover:bg-slate-50'}`}>
                    <span className={`text-sm font-semibold transition-colors ${isDark ? 'text-slate-300 group-hover:text-primary-300' : 'text-slate-800 group-hover:text-primary'}`}>General Information</span>
                    <span className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Learn more about the process.</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      {icon ? (
        <div className="flex items-start gap-1.5">
          {icon}
          <p className="text-sm text-slate-700">{value}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-700">{value}</p>
      )}
    </div>
  )
}

function PipelineTimeline({ currentStatus, history, createdAt, isDark }: { currentStatus: ComplaintStatus; history: StatusHistoryRow[]; createdAt: string; isDark?: boolean }) {
  // Build a timestamp map from real history
  const timestampMap: Partial<Record<string, string>> = { submitted: createdAt }
  history.forEach(h => { if (!timestampMap[h.status]) timestampMap[h.status] = h.changed_at })

  // Note map
  const noteMap: Partial<Record<string, string>> = {}
  history.forEach(h => { if (h.note && !noteMap[h.status]) noteMap[h.status] = h.note })

  return (
    <ol className="relative">
      {PIPELINE_STAGES.map((stage, idx) => {
        const state = getStageState(stage.key, currentStatus)
        const isLast = idx === PIPELINE_STAGES.length - 1
        const timestamp = timestampMap[stage.key]
        const note = noteMap[stage.key]

        return (
          <li key={stage.key} className="flex gap-4">
            {/* Dot + connector */}
            <div className="flex flex-col items-center">
              <div className={[
                'w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center',
                state === 'done'    ? 'bg-primary border-primary' :
                state === 'current' ? (isDark ? 'bg-navy-900 border-primary ring-4 ring-primary/20' : 'bg-white border-primary ring-4 ring-primary/20') :
                                      (isDark ? 'bg-navy-900 border-navy-700' : 'bg-white border-slate-200')
              ].join(' ')}>
                {state === 'done' && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="white" className="w-2.5 h-2.5">
                    <path fillRule="evenodd" d="M10.293 2.293a1 1 0 011.414 1.414l-6 6a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L5 7.586l5.293-5.293z" clipRule="evenodd" />
                  </svg>
                )}
                {state === 'current' && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 my-1 ${state === 'done' ? 'bg-primary' : (isDark ? 'bg-navy-800' : 'bg-slate-200')}`} />
              )}
            </div>

            {/* Label + content */}
            <div className={`pb-6 flex-1 ${isLast ? 'pb-0' : ''}`}>
              <p className={`text-sm font-semibold ${state === 'upcoming' ? (isDark ? 'text-slate-600' : 'text-slate-400') : (isDark ? 'text-white' : 'text-slate-800')}`}>
                {stage.label}
              </p>
              {state !== 'upcoming' && timestamp && (
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{formatDateTime(timestamp)}</p>
              )}
              {state === 'upcoming' && (
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stage.description}</p>
              )}
              {note && state !== 'upcoming' && (
                <p className={`text-xs mt-1.5 border rounded-lg px-3 py-2 ${isDark ? 'bg-navy-950/50 border-navy-800 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                  {note}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function StatusWidget({ status, isRejected, isDark }: { status: ComplaintStatus, isRejected: boolean, isDark?: boolean }) {
  const isResolved = status === 'resolved'
  const isInProgress = status === 'in_progress'
  
  let icon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-primary">
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
    </svg>
  )
  let title = STATUS_LABELS[status] || status
  let description = "Your complaint is currently under review."
  let bgClass = "bg-primary-50"
  
  if (isResolved) {
    icon = (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-green-600">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
      </svg>
    )
    description = "Your complaint has been successfully resolved."
    bgClass = "bg-green-50"
  } else if (isInProgress) {
    icon = (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-amber-500">
        <path fillRule="evenodd" d="M11.983 2.193a.75.75 0 011.034 0l6.335 5.761a.75.75 0 01.248.552v9.744a.75.75 0 01-.75.75h-3.35a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75v4.5a.75.75 0 01-.75.75h-3.35a.75.75 0 01-.75-.75V8.506a.75.75 0 01.248-.552l6.335-5.761z" clipRule="evenodd" />
      </svg>
    )
    description = "Work has begun to resolve this issue."
    bgClass = "bg-amber-50"
  } else if (isRejected) {
    icon = (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-red-500">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
      </svg>
    )
    title = "Rejected"
    description = "This complaint could not be processed."
    bgClass = "bg-red-50"
  }

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden text-center p-6 sm:p-8 ${isDark ? 'bg-navy-900 border-navy-800' : 'bg-white border-slate-100'}`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
        bgClass.includes('primary') ? (isDark ? 'bg-primary/20 text-primary-300' : 'bg-primary-50 text-primary') : 
        bgClass.includes('green') ? (isDark ? 'bg-emerald-900/40' : 'bg-green-50') : 
        bgClass.includes('amber') ? (isDark ? 'bg-amber-900/40' : 'bg-amber-50') : 
        (isDark ? 'bg-red-900/40' : 'bg-red-50')
      }`}>
        {icon}
      </div>
      <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h2>
      <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
    </div>
  )
}

function RejectedTimeline({ history, createdAt, isDark }: { history: StatusHistoryRow[]; createdAt: string; isDark?: boolean }) {
  const allItems = [
    { status: 'submitted' as ComplaintStatus, changed_at: createdAt, note: null },
    ...history.filter(h => h.status !== 'submitted'),
  ]

  return (
    <ol className="relative">
      {allItems.map((item, idx) => {
        const isLast = idx === allItems.length - 1
        return (
          <li key={idx} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 ${isLast && item.status === 'rejected' ? 'bg-red-500 border-red-500' : 'bg-primary border-primary'}`} />
              {!isLast && <div className={`w-0.5 flex-1 my-1 ${isDark ? 'bg-navy-800' : 'bg-slate-200'}`} />}
            </div>
            <div className={`flex-1 ${isLast ? '' : 'pb-6'}`}>
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {STATUS_LABELS[item.status] || item.status}
              </p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{formatDateTime(item.changed_at)}</p>
              {item.note && (
                <p className={`text-xs mt-1.5 border rounded-lg px-3 py-2 ${isDark ? 'bg-red-950/30 border-red-900/50 text-slate-300' : 'bg-red-50 border-red-100 text-slate-600'}`}>
                  {item.note}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
