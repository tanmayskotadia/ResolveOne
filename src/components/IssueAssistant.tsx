import { useEffect, useState } from 'react'
import { intelligence, type SuggestionResult } from '../lib/intelligence'

interface Props {
  description?: string
  photo?: File | null
  category: string
  onApply: (category: string) => void
}

export function IssueAssistant({ description, photo, category, onApply }: Props) {
  const [result, setResult] = useState<SuggestionResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const eligible = Boolean(photo) || (description?.trim().length ?? 0) >= 12

  useEffect(() => {
    setResult(null); setError(''); setBusy(false)
    if (!eligible) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setBusy(true)
      try {
        const form = photo ? new FormData() : undefined
        if (photo) form!.append('file', photo)
        const response = await intelligence<SuggestionResult>(photo ? '/classify/photo' : '/classify/text', {
          form, body: photo ? undefined : { description: description?.trim() }, signal: controller.signal,
        })
        if (!controller.signal.aborted) setResult(response)
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Suggestions are unavailable.')
      } finally {
        if (!controller.signal.aborted) setBusy(false)
      }
    }, photo ? 0 : 900)
    return () => { clearTimeout(timer); controller.abort() }
  }, [description, photo, eligible, attempt])

  return (
    <section className="assist-panel" aria-label={photo ? 'Photo category suggestions' : 'Description category suggestions'} aria-busy={busy}>
      <div className="flex flex-wrap items-center gap-2 mb-2"><span className="assist-spark" aria-hidden="true">✦</span><h3 className="font-semibold text-sm">{photo ? 'What does the photo show?' : 'Find the right category'}</h3><span className="assist-tag ml-auto">{photo ? 'Photo assistant' : 'Writing assistant'}</span></div>
      <div role="status" aria-live="polite">
        {!eligible && <p className="assist-muted text-sm">Describe the problem and we’ll suggest where it belongs. You always choose the final category.</p>}
        {busy && <p className="assist-muted text-sm animate-pulse">{photo ? 'Looking at your photo…' : 'Reading your description…'} First use can take a moment.</p>}
        {error && <div className="text-sm assist-muted"><p>{error}</p><button type="button" onClick={() => setAttempt(v => v + 1)} className="assist-link mt-2">Retry suggestions</button></div>}
        {result && <>
          <p className="text-sm assist-muted mb-3">{result.uncertain ? 'This could fit more than one category. Choose the closest match below or use the category menu.' : 'Suggested categories. Apply one or keep your own choice.'}</p>
          <div className="flex flex-wrap gap-2">{result.suggestions.map(suggestion => (
            <button key={suggestion.category} type="button" onClick={() => onApply(suggestion.category)} aria-pressed={category === suggestion.category} className={`assist-choice ${category === suggestion.category ? 'selected' : ''}`}>
              {category === suggestion.category ? '✓ ' : '+ '}{suggestion.category}
            </button>
          ))}</div>
          <p className="assist-muted text-xs mt-3">Suggestions can be wrong. Your selected category stays editable.</p>
        </>}
      </div>
    </section>
  )
}
