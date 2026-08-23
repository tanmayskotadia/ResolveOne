import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCitizen } from '../context/CitizenContext'
import { useTheme } from '../context/ThemeContext'

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { clearCitizenHash } = useCitizen()
  const { theme, toggleTheme } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAuthority = localStorage.getItem('authority_logged_in') === 'true'
  const isAuthoritySection = location.pathname.startsWith('/authority') && location.pathname !== '/authority/login'
  const isCitizenSection = location.pathname.startsWith('/citizen')
  const isLanding = location.pathname === '/'

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 20) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  async function handleAuthorityLogout() {
    localStorage.removeItem('authority_logged_in')
    navigate('/', { replace: true })
  }

  function handleCitizenHome() {
    clearCitizenHash()
    navigate('/')
  }

  // Authority portal gets its own dark nav
  const isDark = theme === 'dark'

  if (isAuthoritySection) {
    return (
      <header className={`sticky top-0 z-50 w-full backdrop-blur-sm shadow-nav ${isDark ? 'bg-navy-950/95 border-b border-navy-800' : 'bg-slate-900/95 border-b border-slate-700/50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="text-sm font-bold text-white">ResolveOne</span>
              <span className="hidden sm:inline text-xs text-slate-500 font-medium border border-slate-700 rounded px-1.5 py-0.5 ml-1">Authority</span>
            </Link>

            {isAuthority && (
              <div className="flex items-center gap-3">
                {/* Dark/light toggle */}
                <button
                  onClick={toggleTheme}
                  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors text-slate-400 hover:text-white hover:bg-white/10"
                >
                  {isDark ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5">
                      <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.061 1.06l1.06 1.06z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5">
                      <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                <div className="hidden sm:flex items-center gap-2 text-slate-300 text-xs">
                  <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-primary font-bold text-[10px]">O</div>
                  Officer
                </div>
                <button
                  onClick={handleAuthorityLogout}
                  className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z" clipRule="evenodd" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    )
  }

  // Public / Citizen nav
  const navBg = scrolled
    ? isDark
      ? 'bg-navy-950/95 backdrop-blur-sm border-b border-navy-800 shadow-nav'
      : 'bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-nav'
    : isDark
      ? 'bg-transparent border-b border-transparent'
      : 'bg-white/80 backdrop-blur-sm border-b border-slate-100'

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-1 flex justify-start">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <span className={`text-base font-bold font-display tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
                ResolveOne
              </span>
            </Link>
          </div>

          {/* Center nav — public links */}
          {(isLanding || isCitizenSection) && (
            <div className="hidden md:flex items-center justify-center">
              <nav className="flex items-center gap-1">
                <NavLink to="/" label="Home" dark={isDark} exact />
                <NavLink to="/citizen/verify" label="Report Issue" dark={isDark} activePaths={['/citizen/verify', '/citizen/report']} />
                <NavLink to="/citizen/track" label="Track Complaint" dark={isDark} />
              </nav>
            </div>
          )}

          {/* Right actions */}
          <div className="flex-1 flex items-center justify-end gap-2 shrink-0">
            {/* Dark/light toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5">
                  <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.061 1.06l1.06 1.06z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5">
                  <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* Authority login — always visible on public pages */}
            {isLanding && (
              <Link
                to="/authority/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 hover:shadow-sm"
                style={{
                  background: isDark ? 'rgba(30,90,168,0.15)' : 'transparent',
                  borderColor: isDark ? 'rgba(30,90,168,0.4)' : '#CBD5E1',
                  color: isDark ? '#88B5E0' : '#475569',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M8 1a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM3 11.5A2.5 2.5 0 0 1 5.5 9h5A2.5 2.5 0 0 1 13 11.5v.5a.5.5 0 0 1-.5.5H3.5A.5.5 0 0 1 3 12v-.5Z" clipRule="evenodd" />
                </svg>
                Authority Login
              </Link>
            )}

            {/* Citizen: exit button */}
            {isCitizenSection && (
              <button
                onClick={handleCitizenHome}
                className={`text-xs font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                ← Exit
              </button>
            )}

            {/* Mobile menu toggle */}
            {(isLanding || isCitizenSection) && (
              <button
                onClick={() => setMobileOpen(v => !v)}
                aria-label="Toggle menu"
                className={`md:hidden w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {mobileOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (isLanding || isCitizenSection) && (
        <div className={`md:hidden border-t animate-fade-in ${isDark ? 'bg-navy-950 border-navy-800' : 'bg-white border-slate-100'}`}>
          <div className="px-4 py-3 space-y-1">
            <MobileNavLink to="/" label="Home" dark={isDark} exact />
            <MobileNavLink to="/citizen/verify" label="Report Issue" dark={isDark} activePaths={['/citizen/verify', '/citizen/report']} />
            <MobileNavLink to="/citizen/track" label="Track Complaint" dark={isDark} />
            {isLanding && (
              <MobileNavLink to="/authority/login" label="Authority Login" dark={isDark} />
            )}
          </div>
        </div>
      )}
    </header>
  )
}

// ── Sub-components ──────────────────────────────────────────

function CivicIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
    </svg>
  )
}

function NavLink({ to, label, dark, exact, activePaths }: { to: string; label: string; dark: boolean; exact?: boolean; activePaths?: string[] }) {
  const location = useLocation()
  let isActive = exact ? location.pathname === to : (location.pathname === to || (to !== '/' && location.pathname.startsWith(to + '/')))
  if (activePaths) {
    isActive = activePaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))
  }
  return (
    <Link
      to={to}
      className={[
        'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
        dark
          ? isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
          : isActive ? 'bg-primary-50 text-primary' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}

function MobileNavLink({ to, label, dark, exact, activePaths }: { to: string; label: string; dark: boolean; exact?: boolean; activePaths?: string[] }) {
  const location = useLocation()
  let isActive = exact ? location.pathname === to : (location.pathname === to || (to !== '/' && location.pathname.startsWith(to + '/')))
  if (activePaths) {
    isActive = activePaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))
  }
  return (
    <Link
      to={to}
      className={[
        'block px-3 py-2 text-sm font-medium rounded-lg transition-colors',
        dark
          ? isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
          : isActive ? 'bg-primary-50 text-primary' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}
