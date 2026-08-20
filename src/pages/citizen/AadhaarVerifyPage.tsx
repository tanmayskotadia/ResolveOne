import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button, Card } from '../../components/ui'
import { hashAadhaar, validateAadhaar, DEMO_AADHAAR_NUMBERS } from '../../lib/aadhaarHash'
import { useCitizen } from '../../context/CitizenContext'

export function AadhaarVerifyPage() {
  const navigate = useNavigate()
  const { setCitizenHash } = useCitizen()

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

  const handleDemo = async (demoNumber: string) => {
    setLoading(true)
    try {
      const hash = await hashAadhaar(demoNumber)
      setCitizenHash(hash)
      navigate('/citizen/report')
    } catch {
      setError('Demo verification failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl shadow-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 100 10.5 5.25 5.25 0 000-10.5zM9.75 6.75a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0zM9.75 16.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5H9.75z" clipRule="evenodd" />
              <path d="M2.25 18.75a60.07 60.07 0 0115.797-7.5 60.07 60.07 0 0115.797 7.5M2.25 13.5a60.07 60.07 0 0115.797-7.5 60.07 60.07 0 0115.797 7.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Verify Citizen Identity</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
            Your Aadhaar number is used only as an anti-spam identifier. It is{' '}
            <strong>never stored</strong> — only a secure hash is kept.
          </p>
        </div>

        <Card className="shadow-card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-danger text-sm rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="aadhaar" className="block text-sm font-medium text-slate-700 mb-1.5">
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
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-slate-300"
                maxLength={14}
              />
              <p className="text-xs text-slate-400 mt-1.5">
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
              <span className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-700 transition-colors">
                I consent to using my Aadhaar number as an anti-spam identity for this complaint. 
                I understand this is a prototype and not official UIDAI authentication.
              </span>
            </label>

            <Button type="submit" fullWidth loading={loading} size="lg">
              Verify & Continue
            </Button>

            <Link to="/" className="block text-center">
              <button type="button" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                ← Back to Home
              </button>
            </Link>
          </form>
        </Card>

      </div>
    </div>
  )
}
