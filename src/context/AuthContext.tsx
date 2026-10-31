import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Profile } from '../types/profile'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  /** The raw Supabase auth user (null if not signed in) */
  user: User | null
  /** The resolved profile row from the `profiles` table */
  profile: Profile | null
  /** The active Supabase session */
  session: Session | null
  /** True while the initial auth state is being resolved */
  loading: boolean
  /** Sign out the current user */
  signOut: () => Promise<void>
  /** Refresh the profile from the database (call after profile updates) */
  refreshProfile: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  /** Fetch the profile row for a given user id */
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Row not found — user has no profile row yet (e.g. email not confirmed)
        console.warn('[AuthContext] No profile row found for user:', userId)
      } else {
        // Real error — table missing, RLS blocking, network issue, etc.
        console.error('[AuthContext] fetchProfile error:', error.code, error.message)
      }
      return null
    }
    return data as Profile
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const p = await fetchProfile(user.id)
    setProfile(p)
  }, [user, fetchProfile])

  // On mount — get the current session and subscribe to auth changes
  useEffect(() => {
    let active = true
    let generation = 0
    // The initial session is emitted by the subscription. Fetch outside the
    // auth callback so a database request cannot wait on the auth client's lock.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = ++generation
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        setLoading(true)
        setTimeout(() => {
          if (!active || current !== generation) return
          fetchProfile(session.user.id).then(p => {
            if (active && current === generation) setProfile(p)
          }).catch(() => {
            if (active && current === generation) setProfile(null)
          }).finally(() => {
            if (active && current === generation) setLoading(false)
          })
        }, 0)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => { active = false; subscription.unsubscribe() }
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the current auth state and actions from any component.
 *
 * @example
 * const { user, profile, loading, signOut } = useAuth()
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>. Did you forget to wrap your app?')
  }
  return ctx
}
