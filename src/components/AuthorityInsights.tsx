import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { ComplaintRow } from '../types/complaint'
import { CATEGORIES, estimateLabel, intelligence, type Hotspot, type Insights } from '../lib/intelligence'

function FitHotspots({ hotspots }: { hotspots: Hotspot[] }) {
  const map = useMap()
  useEffect(() => {
    if (hotspots.length) map.fitBounds(hotspots.map(h => [h.lat, h.lng] as [number, number]), { padding: [45, 45], maxZoom: 15 })
  }, [map, hotspots])
  return null
}

export function AuthorityInsights({ complaints, onSelect }: { complaints: ComplaintRow[]; onSelect: (complaint: ComplaintRow) => void }) {
  const [data, setData] = useState<Insights | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [training, setTraining] = useState(false)
  const [trainingMessage, setTrainingMessage] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState<Hotspot | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setBusy(true); setError(''); setSelected(null)
    intelligence<Insights>('/insights', { authority: true, signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) setData(response)
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Insights are unavailable.')
    }).finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [refresh])

  const hotspots = useMemo(() => data?.hotspots.filter(h => category === 'All' || h.category === category) ?? [], [data, category])
  const members = selected ? complaints.filter(c => selected.complaint_ids.includes(c.id)) : []
  const active = complaints.filter(c => c.status !== 'resolved' && c.status !== 'rejected')
  const predictions = active.filter(c => data?.predictions[c.id])

  async function train() {
    setTraining(true); setTrainingMessage('')
    try {
      await intelligence('/train', { authority: true, method: 'POST' })
      setTrainingMessage('Training completed. Estimates now use the updated model.')
      setRefresh(value => value + 1)
    } catch (reason) {
      setTrainingMessage(reason instanceof Error ? reason.message : 'Training could not complete.')
    } finally { setTraining(false) }
  }

  return (
    <div className="space-y-6">
      <section className="insight-hero">
        <div><span className="assist-tag">Operations intelligence</span><h2 className="text-2xl font-bold mt-3">See the patterns. Plan the repairs.</h2><p className="text-sm mt-2 opacity-80 max-w-xl">Find recurring issue clusters and use real resolution history to set better expectations.</p></div>
        <button className="assist-choice shrink-0" type="button" disabled={busy} onClick={() => setRefresh(value => value + 1)}>{busy ? 'Refreshing…' : 'Refresh insights'}</button>
      </section>
      {busy && <div className="assist-panel animate-pulse" role="status">Analyzing issue locations and resolution history…</div>}
      {error && <div className="assist-panel" role="alert"><p className="font-semibold">Insights couldn’t refresh</p><p className="assist-muted text-sm mt-2">{error}</p><button className="assist-link mt-3" type="button" onClick={() => setRefresh(value => value + 1)}>Try again</button></div>}
      {data && !error && <>
        <div className="grid sm:grid-cols-3 gap-4">
          {[['Active issue clusters', String(data.hotspots.length), 'Same category · 250 m neighborhoods'], ['Recorded resolutions', String(data.completed_samples), 'Completed reports with status history'], ['ETA model', data.model ? 'Trained' : 'Collecting history', data.model ? `${data.model.sample_count} training records` : '50 located, resolved reports needed']].map(([label, value, note]) => <article key={label} className="assist-panel"><p className="assist-muted text-xs uppercase tracking-wider">{label}</p><p className="text-2xl font-bold mt-2">{value}</p><p className="assist-muted text-xs mt-2">{note}</p></article>)}
        </div>
        <section className="assist-panel space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-bold text-lg">Where issues repeat</h3><p className="assist-muted text-sm mt-1">Open reports from the last 30 days. At least 3 reports form a DBSCAN cluster; connected clusters can extend beyond 250 m.</p></div><label className="text-xs font-medium">Issue category<select className="assist-select mt-1" value={category} onChange={event => { setCategory(event.target.value); setSelected(null) }}><option value="All">All categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label></div>
          {hotspots.length ? <div className="grid lg:grid-cols-[1fr_300px] gap-4">
            <div className="h-[360px] rounded-xl overflow-hidden relative z-0" aria-label="Issue hotspot map">
              <MapContainer center={[hotspots[0].lat, hotspots[0].lng]} zoom={13} className="h-full w-full"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' /><FitHotspots hotspots={hotspots} />{hotspots.map((h, i) => <CircleMarker key={`${h.category}-${i}`} center={[h.lat, h.lng]} radius={Math.min(32, 10 + h.count * 2)} pathOptions={{ color: '#e76f51', fillColor: '#e76f51', fillOpacity: .45 }} eventHandlers={{ click: () => setSelected(h) }}><Popup><strong>{h.category}</strong><br />{h.count} active reports<button type="button" className="block mt-2 text-blue-700 underline" onClick={() => setSelected(h)}>Review reports</button></Popup></CircleMarker>)}</MapContainer>
            </div>
            <div className="space-y-2 max-h-[360px] overflow-auto">{hotspots.map((h, i) => <button key={`${h.category}-${i}`} type="button" className={`assist-inner text-left w-full ${selected === h ? 'ring-2 ring-primary-400' : ''}`} onClick={() => setSelected(h)}><span className="assist-tag float-right">{h.count} reports</span><p className="font-semibold text-sm pr-20">{h.category}</p><p className="assist-muted text-xs mt-2">Area {i + 1} · {h.lat.toFixed(3)}, {h.lng.toFixed(3)}</p><span className="assist-link text-xs mt-3 inline-block">Review cluster →</span></button>)}</div>
          </div> : <div className="assist-inner py-8 text-center"><p className="font-semibold">No recurring clusters in this view</p><p className="assist-muted text-sm mt-2">Clusters appear when at least 3 nearby active reports share a category.</p></div>}
          {selected && <div className="assist-inner"><div className="flex justify-between gap-2"><h4 className="font-semibold">{selected.category} · cluster reports</h4><button type="button" className="assist-link text-xs" onClick={() => setSelected(null)}>Close</button></div><div className="divide-y divide-slate-200/20 mt-2">{members.map(c => <button type="button" key={c.id} onClick={() => onSelect(c)} className="w-full text-left py-3 text-sm"><span className="assist-link font-medium">{c.complaint_code || c.id.slice(0, 8)} →</span><p className="assist-muted mt-1 line-clamp-2">{c.description}</p></button>)}{!members.length && <p className="assist-muted text-sm mt-2">Refresh complaint data to load these reports.</p>}</div></div>}
        </section>
        <section className="assist-panel space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-lg">Resolution outlook</h3><p className="assist-muted text-sm mt-1">Ranges describe total time from submission. They are estimates, not promised deadlines.</p></div><button type="button" className="assist-choice" disabled={training || data.completed_samples < 50} onClick={train}>{training ? 'Training model…' : data.model ? 'Retrain ETA model' : 'Train ETA model'}</button></div>
          {data.completed_samples < 50 && <p className="assist-muted text-xs">Collect at least 50 resolved reports with valid locations and resolution history before training.</p>}
          {trainingMessage && <p role="status" className="text-sm assist-inner">{trainingMessage}</p>}
          {data.model && <div className="assist-inner text-xs assist-muted">Time-based holdout: average error {data.model.mae_hours.toFixed(1)} hours across {data.model.validation_count} reports; median baseline error {data.model.baseline_mae_hours.toFixed(1)} hours. Trained {new Date(data.model.trained_at).toLocaleDateString('en-IN')}.{data.model.mae_hours >= data.model.baseline_mae_hours && <p className="mt-2 font-medium">The model has not beaten the historical baseline. Treat its estimates cautiously and collect more varied data.</p>}</div>}
          <div className="grid sm:grid-cols-2 gap-3">{Object.entries(data.estimates).map(([name, estimate]) => <article key={name} className="assist-inner"><p className="text-sm font-semibold">{name}</p><p className="text-sm mt-2">{estimateLabel(estimate)}</p><p className="assist-muted text-xs mt-1">{estimate.sample_count} recorded resolutions · historical range</p></article>)}</div>
          {predictions.length > 0 && <div><h4 className="font-semibold text-sm mb-2">ML outlook for active reports</h4><div className="max-h-72 overflow-auto space-y-2">{predictions.map(c => <button type="button" className="assist-inner w-full text-left text-sm flex flex-wrap justify-between gap-2" key={c.id} onClick={() => onSelect(c)}><span className="assist-link">{c.complaint_code || c.id.slice(0, 8)} · {c.category}</span><span>{estimateLabel(data.predictions[c.id])}</span></button>)}</div></div>}
        </section>
        <p className="assist-muted text-xs">Analyzed {data.total} reports · updated {new Date(data.generated_at).toLocaleString('en-IN')}</p>
      </>}
    </div>
  )
}
