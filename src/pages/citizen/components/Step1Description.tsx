import { useState, useRef } from 'react'
import { Card, Button } from '../../../components/ui'
import { Spinner } from '../../../components/ui/Spinner'
import type { ComplaintData } from '../../../types/complaint'
import { useTheme } from '../../../context/ThemeContext'

interface Step1Props {
  data: ComplaintData
  onChange: (updates: Partial<ComplaintData>) => void
  onNext: () => void
}

const CATEGORIES = [
  'Garbage/Waste',
  'Road Damage/Potholes',
  'Streetlights',
  'Water Leakage/Supply',
  'Drainage/Sewage',
  'Electricity',
  'Public Infrastructure',
  'Other'
]

const LANGUAGES = [
  { name: 'English', code: 'en-IN' },
  { name: 'Hindi', code: 'hi-IN' },
  { name: 'Tamil', code: 'ta-IN' },
  { name: 'Telugu', code: 'te-IN' },
  { name: 'Malayalam', code: 'ml-IN' },
  { name: 'Kannada', code: 'kn-IN' },
]

export function Step1Description({ data, onChange, onNext }: Step1Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [activeTab, setActiveTab] = useState<'type' | 'speak'>(data.source === 'voice' ? 'speak' : 'type')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [sttError, setSttError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      setSttError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        stream.getTracks().forEach(track => track.stop())
        await transcribeAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err: any) {
      console.error('Microphone error:', err)
      if (err.name === 'NotAllowedError') {
        setSttError('Microphone access denied. Please allow mic access or use the "Type" tab.')
      } else {
        setSttError('Could not access microphone. Please try typing instead.')
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true)
    onChange({ source: 'voice' })
    try {
      const formData = new FormData()
      formData.append('file', blob, 'audio.wav')
      formData.append('model', 'saaras:v3')
      formData.append('mode', 'translate') // Ensures output is in English
      
      const langCode = LANGUAGES.find(l => l.name === data.language)?.code || 'unknown'
      formData.append('language_code', langCode)

      const response = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: {
          'api-subscription-key': import.meta.env.VITE_SARVAM_API_KEY as string,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }

      const result = await response.json()
      // result.transcript contains the English translated text
      const transcript = result.transcript || result.text || ''
      if (transcript) {
        onChange({ description: transcript })
      } else {
        setSttError('Could not understand the audio. Please try again or type.')
      }
    } catch (error) {
      console.error('Transcription error:', error)
      setSttError('Failed to transcribe audio. Please type your issue instead.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleTabChange = (tab: 'type' | 'speak') => {
    setActiveTab(tab)
    if (tab === 'type' && data.source !== 'text') {
      onChange({ source: 'text' })
    }
    setSttError(null)
    if (isRecording) stopRecording()
  }

  const isNextDisabled = !data.description.trim() || !data.category || !data.language

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className={isDark ? '!bg-navy-900 !border-navy-800' : ''}>
        <div className="space-y-2">
          <label htmlFor="language" className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Preferred Language <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <select
              id="language"
              className={`w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none ${isDark ? 'bg-navy-950 border-navy-800 text-white' : 'bg-white border-slate-200'}`}
              value={data.language}
              onChange={(e) => onChange({ language: e.target.value })}
            >
              {LANGUAGES.map(lang => (
                <option key={lang.name} value={lang.name}>{lang.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </Card>

      <Card noPadding className={isDark ? '!bg-navy-900 !border-navy-800' : ''}>
        {/* Tabs Header */}
        <div className={`flex border-b ${isDark ? 'border-navy-800' : 'border-slate-100'}`}>
          <button
            onClick={() => handleTabChange('type')}
            className={[
              'flex-1 py-3 text-sm font-medium transition-colors',
              activeTab === 'type' ? (isDark ? 'text-primary-400 border-b-2 border-primary-400' : 'text-primary border-b-2 border-primary') : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
            ].join(' ')}
          >
            Type
          </button>
          <button
            onClick={() => handleTabChange('speak')}
            className={[
              'flex-1 py-3 text-sm font-medium transition-colors',
              activeTab === 'speak' ? (isDark ? 'text-primary-400 border-b-2 border-primary-400' : 'text-primary border-b-2 border-primary') : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
            ].join(' ')}
          >
            Speak
          </button>
        </div>

        <div className="p-5 space-y-5">
          {sttError && (
            <div className={`p-3 text-sm rounded-lg border ${isDark ? 'bg-red-950/30 text-red-400 border-red-900/50' : 'bg-red-50 text-danger border-red-200'}`}>
              {sttError}
            </div>
          )}

          {activeTab === 'speak' && (
            <div className={`flex flex-col items-center justify-center py-6 rounded-xl border ${isDark ? 'bg-navy-950 border-navy-800' : 'bg-slate-50 border-slate-100'}`}>
              {isTranscribing ? (
                <div className="flex flex-col items-center gap-3">
                  <Spinner size="lg" />
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Transcribing audio...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={[
                      'w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg',
                      isRecording ? 'bg-danger animate-pulse scale-110 shadow-red-200' : 'bg-primary hover:bg-primary-700 shadow-primary-200'
                    ].join(' ')}
                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                  >
                    {isRecording ? (
                      <div className="w-6 h-6 bg-white rounded-sm" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-10 h-10">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                    )}
                  </button>
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {isRecording ? 'Listening... Tap to stop' : 'Tap to speak your complaint'}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="description" className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Description <span className="text-danger">*</span>
            </label>
            <textarea
              id="description"
              rows={4}
              className={`w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${isDark ? 'bg-navy-950 border-navy-800 text-white placeholder:text-navy-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
              placeholder="Describe the issue in detail..."
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
            {activeTab === 'speak' && data.description && !isTranscribing && (
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>You can edit the transcribed text if needed.</p>
            )}
          </div>
        </div>
      </Card>

      <Card className={isDark ? '!bg-navy-900 !border-navy-800' : ''}>
        <div className="space-y-2">
          <label htmlFor="category" className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Category <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <select
              id="category"
              className={`w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none ${isDark ? 'bg-navy-950 border-navy-800 text-white' : 'bg-white border-slate-200'}`}
              value={data.category}
              onChange={(e) => onChange({ category: e.target.value })}
            >
              <option value="" disabled>Select a category</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={isNextDisabled}>
          Next Step
        </Button>
      </div>
    </div>
  )
}
