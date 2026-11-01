import { supabase } from './supabaseClient'

export { CATEGORIES } from './categories'
export interface SuggestionResult {
  model: string
  uncertain: boolean
  message: string
  suggestions: { category: string; score: number }[]
}
export interface DuplicateResult {
  matches: { code: string | null; category: string; status: string; distance_m: number; score: number }[]
  limited: boolean
}
export interface Estimate {
  source: 'unavailable' | 'history' | 'catboost'
  sample_count: number
  low_days?: number
  high_days?: number
  message: string
}
export interface Hotspot {
  category: string
  count: number
  lat: number
  lng: number
  complaint_ids: string[]
}
export interface ModelInfo {
  sample_count: number
  validation_count: number
  mae_hours: number
  baseline_mae_hours: number
  trained_at: string
}
export interface Insights {
  hotspots: Hotspot[]
  estimates: Record<string, Estimate>
  predictions: Record<string, Estimate>
  completed_samples: number
  trainable_samples: number
  model: ModelInfo | null
  total: number
  generated_at: string
}

const base = (import.meta.env.VITE_ML_API_URL || '/api/ml').replace(/\/$/, '')

export async function intelligence<T>(path: string, options: { body?: unknown; form?: FormData; signal?: AbortSignal; authority?: boolean; method?: string } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.authority) {
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw new Error('Sign in with an authority account to view insights.')
    headers.Authorization = `Bearer ${data.session.access_token}`
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const timeout = AbortSignal.timeout(path === '/train' ? 240000 : 120000)
  try {
    const response = await fetch(`${base}${path}`, {
      method: options.method || (options.body !== undefined || options.form ? 'POST' : 'GET'),
      headers,
      body: options.form || (options.body !== undefined ? JSON.stringify(options.body) : undefined),
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : 'The intelligence service is unavailable. Please retry.')
    if (!data) throw new Error('The intelligence service returned an invalid response.')
    return data as T
  } catch (error) {
    if (options.signal?.aborted) throw error
    if (error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError')) {
      throw new Error('The assistant is unavailable or warming up. You can continue manually and retry later.')
    }
    throw error
  }
}

export function estimateLabel(estimate: Estimate): string {
  if (estimate.source === 'unavailable') return 'Learning from completed issues'
  const low = estimate.low_days ?? 0
  const high = estimate.high_days ?? 0
  return high < 1 ? 'Usually within a day' : `${low.toFixed(1)}–${high.toFixed(1)} days from submission`
}
