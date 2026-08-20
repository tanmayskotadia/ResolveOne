import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui'
import { useTheme } from '../../context/ThemeContext'
import toast from 'react-hot-toast'

export function AuthorityLoginPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))

    if (email === 'officer@municipality.gov.in' && password === 'admin') {
      localStorage.setItem('authority_logged_in', 'true')
      toast.success('Welcome, Officer!')
      navigate('/authority', { replace: true })
    } else {
      const msg = 'Invalid authority credentials'
      setError(msg)
      toast.error(msg)
    }

    setLoading(false)
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 ${
      isDark
        ? 'bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950'
        : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
    }`}>
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 border border-white/20 rounded-2xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 100 10.5 5.25 5.25 0 000-10.5zM9.75 6.75a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M3 18.4v-.24c0-1.32 1.06-2.4 2.38-2.4h13.24C19.94 15.76 21 16.84 21 18.16v.24c0 1.32-1.06 2.4-2.38 2.4H5.38C4.06 20.8 3 19.72 3 18.4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold font-display text-white">Authority Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Municipal Corporation — Secure Access</p>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-900/40 border border-red-500/40 text-red-300 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Official Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your official email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <Button type="submit" fullWidth loading={loading} size="lg" className="bg-primary hover:bg-primary-700">
              {loading ? 'Signing in...' : 'Sign In to Authority Portal'}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <Link to="/" className="text-sm text-slate-400 hover:text-white transition-colors">
              ← Back to CivicConnect Home
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}

