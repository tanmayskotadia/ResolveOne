import { useState } from 'react'
import { Card, Button } from '../../../components/ui'
import type { ComplaintData } from '../../../types/complaint'
import { useTheme } from '../../../context/ThemeContext'
import { CATEGORIES } from '../../../lib/categories'
import { useVoiceTyping } from '../../../lib/useVoiceTyping'

interface Step1Props {
  data: ComplaintData
  onChange: (updates: Partial<ComplaintData>) => void
  onNext: () => void
}

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
  const voice = useVoiceTyping(
    LANGUAGES.find(language => language.name === data.language)?.code ?? 'en-IN',
    data.description,
    description => onChange({ description, source: 'voice' }),
  )
  const isNextDisabled = !data.description.trim() || !CATEGORIES.some(category => category === data.category) || !data.language

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
              onChange={(e) => { voice.cancel(); onChange({ language: e.target.value }) }}
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
        <div className={`flex border-b ${isDark ? 'border-navy-800' : 'border-slate-100'}`}>
          {(['type', 'speak'] as const).map(tab => (
            <button key={tab} type="button" aria-pressed={activeTab === tab}
              onClick={() => { voice.cancel(); setActiveTab(tab) }}
              className={[
                'flex-1 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                activeTab === tab ? (isDark ? 'text-primary-400 border-b-2 border-primary-400' : 'text-primary border-b-2 border-primary') : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'),
              ].join(' ')}>
              {tab === 'type' ? 'Type' : 'Speak'}
            </button>
          ))}
        </div>
        <div className="p-5 space-y-5">
          {activeTab === 'speak' && (
            <div className={`flex flex-col items-center justify-center gap-4 py-6 px-4 rounded-xl border ${isDark ? 'bg-navy-950 border-navy-800' : 'bg-slate-50 border-slate-100'}`}>
              <button type="button"
                aria-label={voice.state === 'idle' ? 'Start voice typing' : voice.state === 'stopping' ? 'Finishing transcription' : 'Stop voice typing'}
                disabled={!voice.supported || voice.state === 'stopping' || data.description.length >= 4000}
                onClick={voice.state === 'idle' ? voice.start : voice.stop}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${voice.state === 'listening' ? 'bg-danger animate-pulse scale-110 shadow-red-200' : 'bg-primary hover:bg-primary-700 shadow-primary-200'}`}>
                {voice.state === 'listening' ? <span className="w-6 h-6 bg-white rounded-sm" /> : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="white" className="w-10 h-10">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                )}
              </button>
              <p className="text-sm font-medium text-slate-400 text-center" role="status">
                {voice.state === 'listening' ? `Listening in ${data.language}… Tap to stop` : voice.state === 'stopping' ? 'Finishing transcription…' : `Tap to speak your complaint in ${data.language}`}
              </p>
              {voice.interim && <p className="text-sm text-slate-400" aria-live="polite">{voice.interim}</p>}
              {voice.error && <p className="text-sm text-danger" role="alert">{voice.error}</p>}
              <p className="text-xs text-slate-400 text-center">
                {voice.supported ? 'Your browser may send audio to its speech service. No audio is stored by ResolveOne.' : 'Voice typing is unavailable in this browser. Try a supported browser over HTTPS, or type your complaint.'}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="description" className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Description <span className="text-danger">*</span>
            </label>
            <textarea
              id="description"
              maxLength={4000}
              rows={4}
              className={`w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${isDark ? 'bg-navy-950 border-navy-800 text-white placeholder:text-navy-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
              placeholder="Describe the issue in detail..."
              value={data.description}
              onChange={(e) => { voice.cancel(); onChange({ description: e.target.value, source: 'text' }) }}
            />
            {activeTab === 'speak' && data.description && <p className="text-xs text-slate-400">You can edit the transcribed text if needed.</p>}
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
        <Button onClick={() => { voice.cancel(); onNext() }} disabled={isNextDisabled}>
          Next Step
        </Button>
      </div>
    </div>
  )
}
