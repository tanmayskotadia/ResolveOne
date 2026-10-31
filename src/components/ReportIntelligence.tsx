import { useEffect, useState } from 'react'
import type { ComplaintData } from '../types/complaint'
import { intelligence, estimateLabel, type DuplicateResult, type Estimate } from '../lib/intelligence'

export function ReportIntelligence({ data }: { data: ComplaintData }) {
  const [duplicates, setDuplicates] = useState<DuplicateResult | null>(null)
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const { description, category, lat, lng } = data

  useEffect(() => {
    const controller = new AbortController()
    setBusy(true); setErrors([]); setDuplicates(null); setEstimate(null)
    const options = { signal: controller.signal }
    Promise.allSettled([
      lat !== null && lng !== null && description.trim().length >= 12
        ? intelligence<DuplicateResult>('/duplicates', { ...options, body: { description, lat, lng } })
        : Promise.reject(new Error('Add a location and at least 12 characters to check nearby issues.')),
      intelligence<Estimate>('/estimate', { ...options, body: { category, lat, lng } }),
    ]).then(([matches, timing]) => {
      if (controller.signal.aborted) return
      const messages: string[] = []
      if (matches.status === 'fulfilled') setDuplicates(matches.value)
      else messages.push(`Nearby check: ${matches.reason instanceof Error ? matches.reason.message : 'Unavailable.'}`)
      if (timing.status === 'fulfilled') setEstimate(timing.value)
      else messages.push(`Resolution estimate: ${timing.reason instanceof Error ? timing.reason.message : 'Unavailable.'}`)
      setErrors(messages); setBusy(false)
    })
    return () => controller.abort()
  }, [description, category, lat, lng, attempt])

  return (
    <section className="assist-panel space-y-4" aria-label="Before you submit" aria-busy={busy}>
      <div className="flex items-center gap-2"><span className="assist-spark" aria-hidden="true">◎</span><h3 className="font-semibold">Before you submit</h3></div>
      <div role="status" aria-live="polite">
        {busy && <p className="assist-muted text-sm animate-pulse">Checking nearby reports and resolution history… You can submit while we check.</p>}
        {duplicates && <div>
          <h4 className="text-sm font-semibold">{duplicates.matches.length ? 'Similar issues nearby' : 'No similar open issues found nearby'}</h4>
          <p className="assist-muted text-xs mt-1">Within 250 m, reported in the last 30 days. {duplicates.limited ? 'This busy area was checked against the latest 500 reports.' : 'Similarity is a suggestion, not a confirmed duplicate.'}</p>
          <div className="space-y-2 mt-3">{duplicates.matches.map((match, index) => <article key={`${match.code}-${index}`} className="assist-inner flex flex-wrap justify-between gap-2">
            <div><p className="font-semibold text-sm">{match.category}</p><p className="assist-muted text-xs mt-1">{match.code || 'Nearby report'} · about {match.distance_m} m away · {match.status.replaceAll('-', ' ')}</p></div>
            <span className="assist-tag self-center">Possible duplicate</span>
          </article>)}</div>
          {duplicates.matches.length > 0 && <p className="text-sm assist-muted mt-3">Check whether it’s the same problem. You can still submit your own report, especially if you have new details.</p>}
        </div>}
      </div>
      {estimate && <div className="assist-inner"><h4 className="text-sm font-semibold">{estimateLabel(estimate)}</h4><p className="assist-muted text-xs mt-1">{estimate.message} {estimate.source !== 'unavailable' && `Based on ${estimate.sample_count} completed reports · ${estimate.source === 'catboost' ? 'ML estimate' : 'Historical range'}.`}</p></div>}
      {errors.length > 0 && <div className="text-xs assist-muted space-y-2"><p>Extra checks couldn’t finish. Your report can still be submitted.</p>{errors.map(error => <p key={error}>{error}</p>)}<button type="button" className="assist-link" onClick={() => setAttempt(v => v + 1)}>Retry checks</button></div>}
    </section>
  )
}
