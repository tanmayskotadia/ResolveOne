import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Button, Card, Input, Badge } from '../components/ui'
import { Spinner } from '../components/ui/Spinner'
import type { Role } from '../types/profile'
import toast from 'react-hot-toast'

// Map Supabase error messages to friendly copy
function friendlyError(msg: string): string {
  if (msg.includes('already registered'))
    return 'An account with this email already exists. Please sign in.'
  if (msg.includes('Password should be'))
    return 'Password must be at least 8 characters long.'
  return msg
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [role, setRole]           = useState<Role>('citizen')
  const [password, setPassword]   = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Whether we need email verification (set after a successful signUp)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1. Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
            role,
          },
        },
      })

      if (authError) {
        const msg = friendlyError(authError.message)
        setError(msg)
        toast.error(msg)
        return
      }

      if (!authData.user) {
        setError('Something went wrong. Please try again.')
        toast.error('Something went wrong.')
        return
      }

      // 2. If email confirmation is required, session will be null.
      //    Show a "check your email" screen — profile will be created after confirmation.
      if (!authData.session) {
        setNeedsConfirmation(true)
        return
      }

      // 3. Session is active (email confirmation disabled) — insert profile now
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: `${firstName} ${lastName}`.trim(),
          email,
          role,
        })

      if (profileError) {
        console.error('[Register] Profile insert error:', profileError)
        // Auth user was created — log them out to avoid a broken state
        await supabase.auth.signOut()
        const msg = `Account created but profile setup failed (${profileError.message}). Please ensure the "profiles" table exists in Supabase (see setup guide) and try again.`
        setError(msg)
        toast.error('Profile setup failed.')
        return
      }

      toast.success('Account created successfully!')

      // 4. Redirect to the correct portal
      navigate(role === 'authority' ? '/authority' : '/citizen', { replace: true })
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
      toast.error(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Email confirmation required screen
  if (needsConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 border-2 border-primary-200 rounded-full mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-primary" aria-hidden="true">
              <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
              <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Check your email</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-xs mx-auto">
            We've sent a confirmation link to <strong className="text-slate-700">{email}</strong>. 
            Click it to activate your account, then come back to sign in.
          </p>
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-3 text-sm mb-6">
            💡 <strong>Tip:</strong> To skip email confirmation during development, go to your{' '}
            <strong>Supabase Dashboard → Authentication → Settings</strong> and disable "Confirm email".
          </div>
          <Link to="/login">
            <Button fullWidth variant="secondary">Go to Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl shadow-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-8 h-8" aria-hidden="true">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Create your account</h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Join ResolveOne and make your city better
          </p>
        </div>

        <Card className="shadow-card-hover">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* Global error banner */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-danger animate-fade-in"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="register-firstname"
                label="First name"
                type="text"
                placeholder="John"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
              />
              <Input
                id="register-lastname"
                label="Last name"
                type="text"
                placeholder="Doe"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>

            <Input
              id="register-email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              leftAdornment={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                  <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                  <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                </svg>
              }
            />

            <Input
              id="register-phone"
              label="Phone number"
              type="tel"
              placeholder="+91 98765 43210"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              leftAdornment={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                  <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" />
                </svg>
              }
            />

            {/* Role selector */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Register as <span className="text-danger" aria-hidden="true">*</span>
              </span>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
                <label
                  htmlFor="role-citizen"
                  className={[
                    'relative flex items-center gap-3 p-3.5 border-2 rounded-lg cursor-pointer transition-all duration-200',
                    role === 'citizen' ? 'border-primary bg-primary-50' : 'border-slate-200 hover:border-primary-300'
                  ].join(' ')}
                >
                  <input
                    id="role-citizen"
                    type="radio"
                    name="role"
                    value="citizen"
                    checked={role === 'citizen'}
                    onChange={() => setRole('citizen')}
                    disabled={loading}
                    className="sr-only"
                  />
                  <div className={[
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    role === 'citizen' ? 'bg-primary' : 'bg-slate-100'
                  ].join(' ')}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={['w-4 h-4', role === 'citizen' ? 'text-white' : 'text-slate-500'].join(' ')} aria-hidden="true">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className={['text-sm font-semibold', role === 'citizen' ? 'text-primary' : 'text-slate-700'].join(' ')}>Citizen</p>
                    <p className="text-xs text-slate-500">Report issues</p>
                  </div>
                  {role === 'citizen' && (
                    <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center animate-fade-in">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </label>

                <label
                  htmlFor="role-authority"
                  className={[
                    'relative flex items-center gap-3 p-3.5 border-2 rounded-lg cursor-pointer transition-all duration-200',
                    role === 'authority' ? 'border-primary bg-primary-50' : 'border-slate-200 hover:border-primary-300'
                  ].join(' ')}
                >
                  <input
                    id="role-authority"
                    type="radio"
                    name="role"
                    value="authority"
                    checked={role === 'authority'}
                    onChange={() => setRole('authority')}
                    disabled={loading}
                    className="sr-only"
                  />
                  <div className={[
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    role === 'authority' ? 'bg-primary' : 'bg-slate-100'
                  ].join(' ')}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={['w-4 h-4', role === 'authority' ? 'text-white' : 'text-slate-500'].join(' ')} aria-hidden="true">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className={['text-sm font-semibold', role === 'authority' ? 'text-primary' : 'text-slate-700'].join(' ')}>Authority</p>
                    <p className="text-xs text-slate-500">Manage cases</p>
                  </div>
                  {role === 'authority' && (
                    <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center animate-fade-in">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </label>
              </div>
            </div>

            <Input
              id="register-password"
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              required
              autoComplete="new-password"
              helperText="Use at least 8 characters with a mix of letters and numbers"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              leftAdornment={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                </svg>
              }
            />

            <Button 
              type="submit" 
              fullWidth 
              size="lg"
              loading={loading}
              disabled={!firstName || !lastName || !email || !password}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
            
            {loading && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Spinner size="sm" />
                Setting up your profile…
              </div>
            )}

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 bg-white text-xs text-slate-400">Already have an account?</span>
              </div>
            </div>

            <Link to="/login">
              <Button variant="ghost" fullWidth disabled={loading}>
                Sign in instead
              </Button>
            </Link>
          </form>
        </Card>

        <div className="mt-4 flex justify-center gap-2">
          <Badge variant="resolved" dot={false}>Secure Registration</Badge>
          <Badge variant="default" dot={false}>Data Protected</Badge>
        </div>
      </div>
    </div>
  )
}
