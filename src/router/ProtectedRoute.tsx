import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from '../components/ui/Spinner'
import type { Role } from '../types/profile'

interface ProtectedRouteProps {
  /** Expected role for this route */
  requiredRole: Role
}

/**
 * Shell for protected routes.
 * Uses Supabase Auth to ensure a user is signed in and has the correct role.
 */
export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()

  // Wait for the initial session to resolve
  if (loading) {
    return <PageLoader />
  }

  // Not signed in
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Signed in but we don't have their profile yet, or it's loading.
  // Profile should ideally be fetched right after login.
  if (!profile) {
    // We could show a specific error or just a loader.
    // If they have no profile, they shouldn't be able to access role-protected routes.
    return <PageLoader />
  }

  if (profile.role !== requiredRole) {
    // Redirect to correct portal if wrong role
    return <Navigate to={profile.role === 'authority' ? '/authority' : '/citizen'} replace />
  }

  return <Outlet />
}
