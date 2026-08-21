import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button, Card } from '../../components/ui'
import { hashAadhaar, validateAadhaar } from '../../lib/aadhaarHash'
import { useCitizen } from '../../context/CitizenContext'
import { useTheme } from '../../context/ThemeContext'

export function AadhaarVerifyPage() {
  const navigate = useNavigate()
  const { setCitizenHash } = useCitizen()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [aadhaar, setAadhaar] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInput = (val: string) => {
    // Only allow digits, spaces (for readability), max 14 chars (12 digits + 2 spaces)
    const digits = val.replace(/\D/g, '').slice(0, 12)
    // Auto-format as XXXX XXXX XXXX
    const formatted = digits.replace(/(.{4})(.{4})(.{1,4})/, '$1 $2 $3').trim()
    setAadhaar(formatted)
    setError(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const raw = aadhaar.replace(/\s/g, '')
    const { valid, error: validErr } = validateAadhaar(raw)
    if (!valid) {
      setError(validErr)
      return
    }
    if (!consent) {
      setError('Please confirm your consent to proceed.')
      return
    }

    setLoading(true)
    try {
      const hash = await hashAadhaar(raw)
      setCitizenHash(hash)
      // Clear raw value from state immediately
      setAadhaar('')
      navigate('/citizen/report')
    } catch {
      setError('Identity verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 ${isDark ? 'bg-navy-950' : 'bg-gradient-to-br from-primary-50 via-white to-slate-50'
      }`}>
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg mb-4 ${isDark ? 'bg-primary/20 text-primary-300 border border-primary/30' : 'bg-primary text-white'
            }`}>
            {/* ShieldCheck — identity/security verification icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <h1 className={`text-2xl font-bold font-display ${isDark ? 'text-white' : 'text-slate-800'}`}>Verify Citizen Identity</h1>
          <p className={`text-sm mt-2 max-w-xs mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Your Aadhaar number is used only as an anti-spam identifier. It is{' '}
            <strong>never stored</strong> — only a secure hash is kept.
          </p>
        </div>

        <Card className={`shadow-card ${isDark ? '!bg-navy-900 !border-navy-800' : 'bg-white border-slate-100'}`}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className={`p-3 text-sm rounded-lg ${isDark ? 'bg-red-950/30 border border-red-900/50 text-red-400' : 'bg-red-50 border border-red-200 text-danger'}`}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="aadhaar" className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Aadhaar Number
              </label>
              <input
                id="aadhaar"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="XXXX XXXX XXXX"
                value={aadhaar}
                onChange={e => handleInput(e.target.value)}
                className={`w-full rounded-xl border px-4 py-3 text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${isDark ? 'bg-navy-950 border-navy-700 text-white placeholder:text-navy-600' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-300'
                  }`}
                maxLength={14}
              />
              <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {aadhaar.replace(/\s/g, '').length}/12 digits
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary"
              />
              <span className={`text-xs leading-relaxed transition-colors ${isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-700'
                }`}>
                I consent to using my Aadhaar number as an anti-spam identity for this complaint.
                I understand this is a prototype and not official UIDAI authentication.
              </span>
            </label>

            <Button type="submit" fullWidth loading={loading} size="lg">
              Verify & Continue
            </Button>

            <Link to="/" className="block text-center">
              <button type="button" className={`text-sm transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                ← Back to Home
              </button>
            </Link>
          </form>
        </Card>

      </div>
    </div>
  )
}

