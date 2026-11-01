import { useEffect, useRef, useState } from 'react'

interface RecognitionResult {
  isFinal: boolean
  0: { transcript: string }
}
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition
  webkitSpeechRecognition?: new () => Recognition
}

export function useVoiceTyping(language: string, value: string, onTranscript: (text: string) => void) {
  const [state, setState] = useState<'idle' | 'listening' | 'stopping'>('idle')
  const [error, setError] = useState('')
  const [interim, setInterim] = useState('')
  const recognition = useRef<Recognition | null>(null)
  const latest = useRef({ value, onTranscript })
  useEffect(() => { latest.current = { value, onTranscript } }, [value, onTranscript])
  const browser = typeof window === 'undefined' ? undefined : window as SpeechWindow
  const Constructor = browser?.SpeechRecognition ?? browser?.webkitSpeechRecognition
  const supported = !!Constructor && browser?.isSecureContext !== false

  function cancel() {
    const current = recognition.current
    recognition.current = null
    if (current) {
      current.onresult = null
      current.onerror = null
      current.onend = null
      current.abort()
    }
    setState('idle')
    setInterim('')
  }

  useEffect(() => () => {
    const current = recognition.current
    recognition.current = null
    if (current) {
      current.onresult = null
      current.onerror = null
      current.onend = null
      current.abort()
    }
  }, [language])

  function start() {
    if (!supported || !Constructor || recognition.current) return
    setError('')
    setInterim('')
    try {
      const current = new Constructor()
      recognition.current = current
      current.lang = language
      current.continuous = true
      current.interimResults = true
      const committed = new Set<number>()
      current.onresult = event => {
        if (recognition.current !== current) return
        const additions: string[] = []
        const preview: string[] = []
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal && !committed.has(i)) {
            committed.add(i)
            additions.push(result[0].transcript.trim())
          } else if (!result.isFinal) preview.push(result[0].transcript)
        }
        if (additions.some(Boolean)) {
          const text = [latest.current.value.trimEnd(), ...additions.filter(Boolean)].filter(Boolean).join(' ')
          latest.current.value = text.slice(0, 4000)
          latest.current.onTranscript(latest.current.value)
          if (text.length >= 4000) {
            cancel()
            setError('The description has reached the 4,000 character limit.')
            return
          }
        }
        setInterim(preview.join(' '))
      }
      current.onerror = event => {
        if (recognition.current !== current) return
        const messages: Record<string, string> = {
          'not-allowed': 'Microphone access was denied. Allow microphone access in your browser, or type your complaint.',
          'service-not-allowed': 'Speech recognition is not allowed in this browser. Please type your complaint.',
          'audio-capture': 'No microphone is available. Connect one or type your complaint.',
          'no-speech': 'No speech was detected. Please try again or type your complaint.',
          'network': 'Speech recognition could not connect. Check your connection or type your complaint.',
          'language-not-supported': 'Your browser cannot recognize this language. Please type your complaint.',
        }
        cancel()
        setError(messages[event.error] ?? 'Voice typing could not finish. Please try again or type your complaint.')
      }
      current.onend = () => {
        if (recognition.current !== current) return
        recognition.current = null
        setState('idle')
        setInterim('')
      }
      setState('listening')
      current.start()
    } catch {
      cancel()
      setError('Voice typing could not start. Please try again or type your complaint.')
    }
  }

  function stop() {
    if (!recognition.current) return
    setState('stopping')
    try { recognition.current.stop() } catch { cancel() }
  }

  return { supported, state, error, interim, start, stop, cancel }
}
