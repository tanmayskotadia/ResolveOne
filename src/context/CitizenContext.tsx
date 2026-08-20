import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

/**
 * CitizenContext stores the hashed Aadhaar identifier for the current anonymous
 * citizen session. No Supabase Auth is involved for citizens.
 *
 * The hash is kept in React state (session-only). It is never written to
 * localStorage or cookies. Refreshing the page resets it.
 */

interface CitizenContextValue {
  /** SHA-256 hash of the citizen's Aadhaar (null if not yet verified) */
  citizenHash: string | null
  /** Set the hash after Aadhaar verification */
  setCitizenHash: (hash: string) => void
  /** Clear the citizen session (e.g. when returning to home) */
  clearCitizenHash: () => void
  /** True when citizen has verified their identity */
  isVerified: boolean
}

const CitizenContext = createContext<CitizenContextValue | null>(null)

export function CitizenProvider({ children }: { children: ReactNode }) {
  const [citizenHash, setCitizenHashState] = useState<string | null>(null)

  const setCitizenHash = useCallback((hash: string) => {
    setCitizenHashState(hash)
  }, [])

  const clearCitizenHash = useCallback(() => {
    setCitizenHashState(null)
  }, [])

  return (
    <CitizenContext.Provider
      value={{
        citizenHash,
        setCitizenHash,
        clearCitizenHash,
        isVerified: !!citizenHash,
      }}
    >
      {children}
    </CitizenContext.Provider>
  )
}

export function useCitizen(): CitizenContextValue {
  const ctx = useContext(CitizenContext)
  if (!ctx) {
    throw new Error('useCitizen must be used inside <CitizenProvider>.')
  }
  return ctx
}
