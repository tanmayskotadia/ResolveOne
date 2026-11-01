import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Step1Description } from '../src/pages/citizen/components/Step1Description'
import type { ComplaintData } from '../src/types/complaint'

vi.mock('../src/context/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }))
class MockRecognition {
  static instances: MockRecognition[] = []
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()
  constructor() { MockRecognition.instances.push(this) }
}
const initial: ComplaintData = { language: 'Tamil', description: 'Existing text.', category: 'Other', source: 'text', lat: null, lng: null, address: '', photoFile: null, photoUrl: null }
function Form() {
  const [data, setData] = useState(initial)
  return <><Step1Description data={data} onChange={updates => setData(previous => ({ ...previous, ...updates }))} onNext={() => {}} /><output>{data.source}</output></>
}
function result(instance: MockRecognition, texts: string[], final = true) {
  act(() => instance.onresult?.({ resultIndex: 0, results: texts.map(transcript => ({ isFinal: final, 0: { transcript } })) }))
}
function start() {
  fireEvent.click(screen.getByRole('button', { name: 'Start voice typing' }))
  return MockRecognition.instances.at(-1)!
}
beforeEach(() => { MockRecognition.instances = []; vi.stubGlobal('SpeechRecognition', MockRecognition) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

test('selected languages map to recognition locales, with native script preserved and final results deduplicated', () => {
  render(<Form />)
  const locales = [['English', 'en-IN'], ['Hindi', 'hi-IN'], ['Tamil', 'ta-IN'], ['Telugu', 'te-IN'], ['Malayalam', 'ml-IN'], ['Kannada', 'kn-IN']]
  for (const [language, locale] of locales) {
    fireEvent.change(screen.getByLabelText(/Preferred Language/), { target: { value: language } })
    const instance = start()
    expect(instance.lang).toBe(locale)
    expect(instance.continuous).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Stop voice typing' }))
    act(() => instance.onend?.())
  }
  const instance = start()
  result(instance, ['சாலையில் பள்ளம் உள்ளது'], false)
  expect((screen.getByLabelText(/Description/) as HTMLTextAreaElement).value).toBe(initial.description)
  result(instance, ['சாலையில் பள்ளம் உள்ளது'])
  result(instance, ['சாலையில் பள்ளம் உள்ளது'])
  expect((screen.getByLabelText(/Description/) as HTMLTextAreaElement).value).toBe('Existing text. சாலையில் பள்ளம் உள்ளது')
  expect(screen.getByText('voice')).toBeTruthy()
})

test('stop accepts the final transcript; manual editing cancels stale results', () => {
  render(<Form />)
  const instance = start()
  fireEvent.click(screen.getByRole('button', { name: 'Stop voice typing' }))
  expect(instance.stop).toHaveBeenCalledOnce()
  result(instance, ['road damage'])
  act(() => instance.onend?.())
  const next = start()
  const lateResult = next.onresult!
  fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'My edited complaint' } })
  expect(next.abort).toHaveBeenCalledOnce()
  act(() => lateResult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'stale words' } }] }))
  expect((screen.getByLabelText(/Description/) as HTMLTextAreaElement).value).toBe('My edited complaint')
  expect(screen.getByText('text')).toBeTruthy()
})

test('language changes and unmount abort microphone sessions and ignore late results', () => {
  const view = render(<Form />)
  const old = start()
  const late = old.onresult!
  fireEvent.change(screen.getByLabelText(/Preferred Language/), { target: { value: 'Hindi' } })
  expect(old.abort).toHaveBeenCalledOnce()
  act(() => late({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'old language' } }] }))
  expect((screen.getByLabelText(/Description/) as HTMLTextAreaElement).value).toBe(initial.description)
  const current = start()
  expect(current.lang).toBe('hi-IN')
  view.unmount()
  expect(current.abort).toHaveBeenCalledOnce()
  expect(current.onresult).toBeNull()
})

test('permission and network errors permit retry and manual typing', () => {
  render(<Form />)
  let instance = start()
  act(() => instance.onerror?.({ error: 'not-allowed' }))
  expect(screen.getByRole('alert').textContent).toContain('Microphone access was denied')
  instance = start()
  act(() => instance.onerror?.({ error: 'network' }))
  expect(screen.getByRole('alert').textContent).toContain('could not connect')
  expect((screen.getByRole('button', { name: 'Next Step' }) as HTMLButtonElement).disabled).toBe(false)
})

test('unsupported browsers retain the manual complaint form; prefixed recognition works', () => {
  vi.stubGlobal('SpeechRecognition', undefined)
  const view = render(<Form />)
  expect((screen.getByRole('button', { name: 'Start voice typing' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText(/Voice typing is unavailable/)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Next Step' }) as HTMLButtonElement).disabled).toBe(false)
  view.unmount()
  vi.stubGlobal('webkitSpeechRecognition', MockRecognition)
  render(<Form />)
  expect(start().start).toHaveBeenCalledOnce()
})

test('voice results respect the description length limit and release the microphone', () => {
  render(<Form />)
  const instance = start()
  result(instance, ['a'.repeat(4100)])
  expect((screen.getByLabelText(/Description/) as HTMLTextAreaElement).value.length).toBe(4000)
  expect(instance.abort).toHaveBeenCalledOnce()
  expect(screen.getByRole('alert').textContent).toContain('4,000 character limit')
})
