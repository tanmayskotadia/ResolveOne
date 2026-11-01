import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Step1Description } from '../src/pages/citizen/components/Step1Description'
import { Step2Location } from '../src/pages/citizen/components/Step2Location'
import { Step3Photo } from '../src/pages/citizen/components/Step3Photo'
import { Step4Review } from '../src/pages/citizen/components/Step4Review'
import type { ComplaintData } from '../src/types/complaint'

const mocks = vi.hoisted(() => ({
  intelligence: vi.fn(), rpc: vi.fn(), upload: vi.fn(),
  map: { click: null as null | ((event: { latlng: { lat: number; lng: number } }) => void) },
}))
vi.mock('../src/context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light' }) }))
vi.mock('../src/context/CitizenContext', () => ({ useCitizen: () => ({ citizenHash: 'a'.repeat(64) }) }))
vi.mock('../src/lib/intelligence', () => ({ intelligence: mocks.intelligence, CATEGORIES: ['Road Damage/Potholes'] }))
vi.mock('../src/lib/supabaseClient', () => ({ supabase: {
  rpc: mocks.rpc,
  storage: { from: () => ({ upload: mocks.upload, getPublicUrl: () => ({ data: { publicUrl: 'https://example.test/photo.png' } }) }) },
} }))
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null, Marker: () => null,
  useMapEvents: (handlers: typeof mocks.map) => { mocks.map.click = handlers.click },
}))

const initial: ComplaintData = { language: 'English', description: 'A large pothole on the road', category: 'Road Damage/Potholes',
  source: 'text', lat: 23, lng: 72, address: 'Original address', photoFile: null, photoUrl: null }
const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.upload.mockResolvedValue({ error: null })
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function LocationForm({ data = initial }: { data?: ComplaintData }) {
  const [value, setValue] = useState(data)
  return <Step2Location data={value} onChange={updates => setValue(old => ({ ...old, ...updates }))} onNext={() => {}} onBack={() => {}} />
}

test('a slow old address lookup cannot replace the latest pin address', async () => {
  const first = deferred<Response>(), second = deferred<Response>()
  const fetch = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  vi.stubGlobal('fetch', fetch)
  render(<LocationForm />)
  act(() => { mocks.map.click!({ latlng: { lat: 24, lng: 73 } }) })
  act(() => { mocks.map.click!({ latlng: { lat: 25, lng: 74 } }) })
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
  await act(async () => { second.resolve({ ok: true, json: async () => ({ display_name: 'Latest pin address' }) } as Response) })
  await act(async () => { first.resolve({ ok: true, json: async () => ({ display_name: 'Stale address' }) } as Response) })
  expect((screen.getByLabelText(/Address/) as HTMLInputElement).value).toBe('Latest pin address')
})

test('lookup is cancelled when leaving the location step', () => {
  const fetch = vi.fn().mockReturnValue(new Promise(() => {}))
  vi.stubGlobal('fetch', fetch)
  const view = render(<LocationForm />)
  act(() => { mocks.map.click!({ latlng: { lat: 24, lng: 73 } }) })
  view.unmount()
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
})

test('zero-valued coordinates allow progression', () => {
  render(<LocationForm data={{ ...initial, lat: 0, lng: 0 }} />)
  expect((screen.getByRole('button', { name: 'Next Step' }) as HTMLButtonElement).disabled).toBe(false)
})

test('submission retry reuses its request ID and returns its exact tracking code', async () => {
  mocks.upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { statusCode: '409' } })
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Temporary connection error' } })
    .mockResolvedValueOnce({ data: 'CC-2026-00001', error: null })
  const photo = new File(['photo'], 'photo.png', { type: 'image/png' })
  render(<MemoryRouter><Step4Review data={{ ...initial, photoFile: photo }} submissionId="request-123" onBack={() => {}} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Submit Complaint' }))
  await screen.findByText(/Failed to submit complaint/)
  fireEvent.click(screen.getByRole('button', { name: 'Submit Complaint' }))
  await screen.findByText('CC-2026-00001')
  expect(mocks.rpc.mock.calls.map(call => [call[0], call[1].p_id])).toEqual([
    ['submit_complaint', 'request-123'], ['submit_complaint', 'request-123'],
  ])
  expect(mocks.upload.mock.calls[0][0]).toBe(mocks.upload.mock.calls[1][0])
})

function DescriptionForm() {
  const [value, setValue] = useState(initial)
  return <Step1Description data={value} onChange={updates => setValue(old => ({ ...old, ...updates }))} onNext={() => {}} />
}

test('manual reporting works without the intelligence service', () => {
  render(<DescriptionForm />)
  expect(screen.queryByRole('button', { name: 'Speak' })).toBeNull()
  fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'The streetlight outside the park is broken' } })
  fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'Streetlights' } })
  expect((screen.getByRole('button', { name: 'Next Step' }) as HTMLButtonElement).disabled).toBe(false)
  expect(mocks.intelligence).not.toHaveBeenCalled()
})

test('failed required photo upload keeps the report unsubmitted and allows retry', async () => {
  mocks.upload.mockResolvedValueOnce({ error: { message: 'Storage unavailable', statusCode: '503' } })
  mocks.rpc.mockResolvedValueOnce({ data: 'CC-RETRY', error: null })
  const photo = new File(['photo'], 'photo.png', { type: 'image/png' })
  render(<MemoryRouter><Step4Review data={{ ...initial, photoFile: photo }} submissionId="photo-retry" onBack={() => {}} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Submit Complaint' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Photo upload failed')
  expect(mocks.rpc).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Submit Complaint' }))
  await screen.findByText('CC-RETRY')
  expect(mocks.rpc).toHaveBeenCalledTimes(1)
})

function PhotoForm() {
  const [value, setValue] = useState(initial)
  return <Step3Photo data={value} onChange={updates => setValue(old => ({ ...old, ...updates }))} onNext={() => {}} onBack={() => {}} />
}

test('photo picker works with keyboard and rejects empty or unreadable images', async () => {
  render(<PhotoForm />)
  const input = screen.getByLabelText('Complaint photo') as HTMLInputElement
  const click = vi.spyOn(input, 'click')
  fireEvent.keyDown(screen.getByRole('button', { name: 'Choose complaint photo' }), { key: 'Enter' })
  expect(click).toHaveBeenCalledTimes(1)
  fireEvent.change(input, { target: { files: [new File([], 'empty.png', { type: 'image/png' })] } })
  expect(screen.getByRole('alert').textContent).toContain('non-empty')
  expect((screen.getByRole('button', { name: 'Next Step' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(input, { target: { files: [new File(['broken'], 'bad.png', { type: 'image/png' })] } })
  fireEvent.error(await screen.findByAltText('Complaint preview'))
  await waitFor(() => expect((screen.getByRole('button', { name: 'Next Step' }) as HTMLButtonElement).disabled).toBe(true))
  expect(screen.getByRole('alert').textContent).toContain('could not be opened')
})
