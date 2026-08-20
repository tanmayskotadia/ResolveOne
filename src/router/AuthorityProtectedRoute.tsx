import { Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { PageLoader } from '../components/ui/Spinner'

/**
 * Authority-only protected route.
 * Redirects unauthenticated users to /authority/login.
 */
export function AuthorityProtectedRoute() {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const isLogged = localStorage.getItem('authority_logged_in') === 'true'
    setIsAuthenticated(isLogged)
    setLoading(false)
  }, [])

  if (loading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/authority/login" replace />

  return <Outlet />
}
