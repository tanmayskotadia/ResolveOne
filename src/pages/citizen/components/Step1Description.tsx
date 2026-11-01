import { Card, Button } from '../../../components/ui'
import type { ComplaintData } from '../../../types/complaint'
import { useTheme } from '../../../context/ThemeContext'
import { CATEGORIES } from '../../../lib/categories'

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
        <div className="p-5 space-y-5">
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
              onChange={(e) => onChange({ description: e.target.value, source: 'text' })}
            />

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
