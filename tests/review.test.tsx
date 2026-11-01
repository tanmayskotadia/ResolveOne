import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TrackComplaintPage } from '../src/pages/citizen/TrackComplaintPage'
import { StatusUpdateControl } from '../src/pages/authority/components/StatusUpdateControl'
import { AuthorityComplaintDetail } from '../src/pages/authority/components/AuthorityComplaintDetail'
import { hasCoordinates, latestTransitions } from '../src/lib/complaintLogic'
import type { ComplaintRow, StatusHistoryRow } from '../src/types/complaint'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), upload: vi.fn(), history: vi.fn() }))
vi.mock('../src/context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light' }) }))
vi.mock('../src/lib/aadhaarHash', () => ({ hashAadhaar: async () => 'a'.repeat(64), validateAadhaar: () => ({ valid: true }) }))
vi.mock('../src/lib/supabaseClient', () => ({ supabase: {
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ order: mocks.history }) }) }),
  storage: { from: () => ({ upload: mocks.upload, getPublicUrl: () => ({ data: { publicUrl: 'https://example.test/new-proof.png' } }) }) },
} }))
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null, Marker: () => null,
}))
const complaint: ComplaintRow = {
  id: 'report-id', complaint_code: 'CC-2026-00001', citizen_id: null, citizen_identifier_hash: null,
  category: 'Road Damage/Potholes', description: 'Pothole at the junction', source: 'text',
  lat: 0, lng: 0, address: 'The junction', status: 'in-progress',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z',
  resolution_photo_url: 'https://example.test/old-proof.png',
}
const history = (status: StatusHistoryRow['status'], date: string, note: string | null = null): StatusHistoryRow => ({
  id: date, complaint_id: complaint.id, status, changed_at: date, changed_by: null, note,
})
beforeEach(() => {
  vi.clearAllMocks()
  mocks.upload.mockResolvedValue({ error: null })
  mocks.history.mockResolvedValue({ data: [], error: null })
})
afterEach(cleanup)

test('tracking reads a normalized code in one RPC and clears old results when the code changes', async () => {
  mocks.rpc.mockResolvedValue({ data: { complaint, history: [] }, error: null })
  render(<MemoryRouter initialEntries={['/citizen/track?id=cc-2026-00001']}><TrackComplaintPage /></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('Aadhaar Number'), { target: { value: '234567890123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Search' }))
  await screen.findByText(complaint.description)
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('track_complaint', { p_hash: 'a'.repeat(64), p_complaint_code: complaint.complaint_code })
  expect(screen.getByTestId('map')).toBeTruthy()
  expect((screen.getByLabelText('Aadhaar Number') as HTMLInputElement).value).toBe('')
  fireEvent.change(screen.getByLabelText('Complaint ID'), { target: { value: 'CC-OTHER' } })
  expect(screen.queryByText(complaint.description)).toBeNull()
})

test('latest resolution date comes from the last repair, not the first repair or a later note', () => {
  const first = history('resolved', '2026-01-02T00:00:00Z')
  const reopened = history('in-progress', '2026-01-03T00:00:00Z')
  const second = history('resolved', '2026-01-04T00:00:00Z')
  const note = history('resolved', '2026-01-05T00:00:00Z', 'Inspected')
  expect(latestTransitions([note, first, second, reopened]).resolved?.changed_at).toBe(second.changed_at)
  expect(hasCoordinates({ lat: 0, lng: 0 })).toBe(true)
  expect(hasCoordinates({ lat: NaN, lng: 0 })).toBe(false)
  expect(hasCoordinates({ lat: 1, lng: 181 })).toBe(false)
})

test('reopened complaint requires a fresh photo and freezes controls during saving', async () => {
  let finish!: (value: unknown) => void
  mocks.rpc.mockReturnValue(new Promise(resolve => { finish = resolve }))
  const onUpdated = vi.fn()
  render(<StatusUpdateControl complaint={complaint} onStatusUpdated={onUpdated} />)
  fireEvent.click(screen.getByRole('button', { name: 'Resolved' }))
  const save = screen.getByRole('button', { name: 'Save Update' }) as HTMLButtonElement
  expect(save.disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('Completion proof photo'), { target: { files: [new File(['photo'], 'proof.png', { type: 'image/png' })] } })
  expect(save.disabled).toBe(false)
  fireEvent.click(save)
  await waitFor(() => expect(mocks.rpc).toHaveBeenCalled())
  expect((screen.getByRole('button', { name: 'Rejected' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByLabelText(/Add a Note/) as HTMLTextAreaElement).disabled).toBe(true)
  expect(mocks.rpc.mock.calls[0][1].p_resolution_photo_url).toBe('https://example.test/new-proof.png')
  await act(async () => { finish({ error: null }) })
  expect(onUpdated).toHaveBeenCalledTimes(1)
})

test('failed status saves show an actionable inline error', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'Refresh it before saving' } })
  render(<StatusUpdateControl complaint={complaint} onStatusUpdated={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Under Review' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save Update' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Refresh it before saving')
})

test('history failure is visible and retry recovers without inventing a resolution date', async () => {
  mocks.history.mockResolvedValueOnce({ data: null, error: { message: 'Unavailable' } })
  render(<AuthorityComplaintDetail complaint={{ ...complaint, status: 'resolved' }} onBack={() => {}} onUpdated={() => {}} />)
  expect((await screen.findByRole('alert')).textContent).toContain('Status history could not be loaded')
  fireEvent.click(screen.getByRole('button', { name: 'Retry history' }))
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  expect(screen.getByTestId('map')).toBeTruthy()
  expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0)
})
