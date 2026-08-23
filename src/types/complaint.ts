// ─── Form State (used by multi-step wizard) ───────────────────────────────────

export type ComplaintStatus = 'submitted' | 'under-review' | 'in-progress' | 'resolved' | 'rejected'

export interface ComplaintData {
  language: string
  description: string
  category: string
  source: 'text' | 'voice'
  lat: number | null
  lng: number | null
  address: string
  photoFile: File | null
  photoUrl: string | null
}

// ─── DB Row Types (Supabase responses) ────────────────────────────────────────

export interface ComplaintRow {
  id: string
  complaint_code?: string | null         // generated unique code e.g. CC-2026-00001
  citizen_id: string | null              // legacy – may be null for anonymous complaints
  citizen_identifier_hash: string | null // SHA-256 hash of Aadhaar (anonymous citizens)
  description: string
  category: string
  source: 'text' | 'voice'
  lat?: number | null
  lng?: number | null
  address?: string | null
  photo_url?: string | null
  resolution_photo_url?: string | null
  status: ComplaintStatus
  created_at: string
  updated_at?: string | null
}

export interface StatusHistoryRow {
  id: string
  complaint_id: string
  status: ComplaintStatus
  note: string | null
  changed_at: string
  changed_by: string | null
}
