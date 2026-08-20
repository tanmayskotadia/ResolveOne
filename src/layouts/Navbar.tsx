import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCitizen } from '../context/CitizenContext'

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { clearCitizenHash } = useCitizen()

  const isAuthority = localStorage.getItem('authority_logged_in') === 'true'
  const isCitizenSection = location.pathname.startsWith('/citizen')
  const isAuthoritySection = location.pathname.startsWith('/authority') && location.pathname !== '/authority/login'
  const isLanding = location.pathname === '/'

  async function handleAuthorityLogout() {
    localStorage.removeItem('authority_logged_in')
    navigate('/', { replace: true })
  }

  function handleCitizenHome() {
    clearCitizenHash()
    navigate('/')
  }

  return (
    <header className={`sticky top-0 z-50 w-full border-b shadow-nav ${isAuthoritySection ? 'bg-slate-900/95 border-slate-700/50 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-sm border-slate-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className={`w-7 h-7 ${isAuthoritySection ? 'bg-primary' : 'bg-primary'} rounded-lg flex items-center justify-center shadow-sm`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
              </svg>
            </div>
            <span className={`text-sm font-bold ${isAuthoritySection ? 'text-white' : 'text-slate-800'}`}>
              CivicConnect
            </span>
          </Link>

          {/* Citizen nav */}
          {isCitizenSection && (
            <nav className="hidden sm:flex items-center gap-0.5">
              <NavLink to="/citizen/report" label="Report Issue" dark={false} />
              <NavLink to="/citizen/track" label="Track Complaint" dark={false} />
            </nav>
          )}

          {/* Authority nav */}
          {isAuthoritySection && isAuthority && (
            <nav className="hidden sm:flex items-center gap-0.5">
              <NavLink to="/authority" label="Dashboard" dark={true} />
            </nav>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {isLanding && (
              <Link to="/authority/login" className="hidden sm:inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                Authority Login
              </Link>
            )}

            {isCitizenSection && (
              <button onClick={handleCitizenHome} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                ← Exit
              </button>
            )}

            {isAuthoritySection && isAuthority && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 text-slate-300 text-xs">
                  <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-primary font-bold text-[10px]">
                    O
                  </div>
                  Officer
                </div>
                <button
                  onClick={handleAuthorityLogout}
                  className="text-xs text-slate-400 hover:text-danger transition-colors flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z" clipRule="evenodd" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}

            {location.pathname === '/authority/login' && (
              <Link to="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                ← Home
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function NavLink({ to, label, dark }: { to: string; label: string; dark: boolean }) {
  const location = useLocation()
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to + '/'))
  return (
    <Link
      to={to}
      className={[
        'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
        dark
          ? isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
          : isActive ? 'bg-primary-50 text-primary' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}
