import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from '../components/ui/Spinner'

/**
 * Authority-only protected route.
 * Redirects unauthenticated users to /authority/login.
 */
export function AuthorityProtectedRoute() {
  const { loading, user, profile } = useAuth()

  if (loading) return <PageLoader />
  if (!user || profile?.role !== 'authority') return <Navigate to="/authority/login" replace />

  return <Outlet />
}
