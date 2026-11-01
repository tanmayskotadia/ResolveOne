import type { StatusHistoryRow } from '../types/complaint'

export function hasCoordinates<T extends { lat?: number | null; lng?: number | null }>(value: T): value is T & { lat: number; lng: number } {
  return typeof value.lat === 'number' && typeof value.lng === 'number' && Number.isFinite(value.lat) && Number.isFinite(value.lng)
    && Math.abs(value.lat) <= 90 && Math.abs(value.lng) <= 180
}

/** Keep the start of the latest transition, rather than a later note in that state. */
export function latestTransitions(history: StatusHistoryRow[]) {
  const transitions: Partial<Record<string, StatusHistoryRow>> = {}
  let previous = ''
  for (const row of [...history].sort((a, b) => Date.parse(a.changed_at) - Date.parse(b.changed_at))) {
    const status = String(row.status) === 'open' ? 'under-review' : row.status
    if (status !== previous) transitions[status] = { ...row, status }
    previous = status
  }
  return transitions
}

export const photoError = (file: File): string | null => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
    return 'Choose a non-empty JPEG, PNG or WebP photo up to 5 MB.'
  }
  return null
}
