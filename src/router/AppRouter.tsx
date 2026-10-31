import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '../context/AuthContext'
import { CitizenProvider } from '../context/CitizenContext'
import { ThemeProvider } from '../context/ThemeContext'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { LandingPage } from '../pages/LandingPage'
import { AuthorityLoginPage } from '../pages/authority/AuthorityLoginPage'
import { AadhaarVerifyPage } from '../pages/citizen/AadhaarVerifyPage'
import { PageLoader } from '../components/ui/Spinner'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AuthorityProtectedRoute } from './AuthorityProtectedRoute'
import { Navbar } from '../layouts/Navbar'

const ReportIssuePage = lazy(() => import('../pages/citizen/ReportIssuePage').then(module => ({ default: module.ReportIssuePage })))
const TrackComplaintPage = lazy(() => import('../pages/citizen/TrackComplaintPage').then(module => ({ default: module.TrackComplaintPage })))
const AuthorityPage = lazy(() => import('../pages/AuthorityPage').then(module => ({ default: module.AuthorityPage })))

export function AppRouter() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <CitizenProvider>
            <BrowserRouter>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">
                  <Suspense fallback={<PageLoader />}><Routes>
                    {/* Public Home */}
                    <Route path="/" element={<LandingPage />} />

                    {/* Citizen Routes (No Supabase Auth) */}
                    <Route path="/citizen" element={<Navigate to="/citizen/verify" replace />} />
                    <Route path="/citizen/verify" element={<AadhaarVerifyPage />} />
                    <Route path="/citizen/report" element={<ReportIssuePage />} />
                    <Route path="/citizen/track" element={<TrackComplaintPage />} />

                    {/* Authority Routes */}
                    <Route path="/authority/login" element={<AuthorityLoginPage />} />
                    <Route element={<AuthorityProtectedRoute />}>
                      <Route path="/authority" element={<AuthorityPage />} />
                      <Route path="/authority/*" element={<AuthorityPage />} />
                    </Route>

                    {/* Catch-all */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes></Suspense>
                </main>
              </div>
              <Toaster
                position="bottom-center"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#334155',
                    color: '#fff',
                    fontSize: '14px',
                    borderRadius: '8px',
                  },
                  success: {
                    iconTheme: { primary: '#10B981', secondary: '#fff' },
                  },
                  error: {
                    iconTheme: { primary: '#EF4444', secondary: '#fff' },
                  },
                }}
              />
            </BrowserRouter>
          </CitizenProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

