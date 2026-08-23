import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

// ── Smart City SVG Illustration ───────────────────────────────────────────────

function CityIllustration({ isDark }: { isDark: boolean }) {
  const primary = isDark ? '#4D8DCE' : '#1E5AA8'
  const primaryLight = isDark ? '#1E3A6E' : '#DDEAF7'
  const accent = '#16A34A'
  const bg = isDark ? '#0F2040' : '#EEF4FB'

  return (
    <div className="relative w-full max-w-md mx-auto select-none" aria-hidden="true">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-glow-blue rounded-full scale-75 opacity-60" />

      <svg viewBox="0 0 400 340" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto relative z-10 animate-float-slow">
        {/* Ground */}
        <rect x="20" y="280" width="360" height="12" rx="6" fill={primaryLight} />

        {/* Building 1 — tall center */}
        <rect x="155" y="100" width="90" height="180" rx="4" fill={primary} />
        <rect x="163" y="110" width="18" height="20" rx="2" fill={bg} opacity="0.8" />
        <rect x="189" y="110" width="18" height="20" rx="2" fill={bg} opacity="0.8" />
        <rect x="215" y="110" width="18" height="20" rx="2" fill={bg} opacity="0.8" />
        <rect x="163" y="142" width="18" height="20" rx="2" fill={bg} opacity="0.6" />
        <rect x="189" y="142" width="18" height="20" rx="2" fill={bg} opacity="0.9" />
        <rect x="215" y="142" width="18" height="20" rx="2" fill={bg} opacity="0.6" />
        <rect x="163" y="174" width="18" height="20" rx="2" fill={bg} opacity="0.8" />
        <rect x="189" y="174" width="18" height="20" rx="2" fill={bg} opacity="0.6" />
        <rect x="215" y="174" width="18" height="20" rx="2" fill={bg} opacity="0.7" />
        <rect x="163" y="206" width="18" height="20" rx="2" fill={bg} opacity="0.5" />
        <rect x="189" y="206" width="18" height="20" rx="2" fill="#D97706" opacity="0.9" />
        <rect x="215" y="206" width="18" height="20" rx="2" fill={bg} opacity="0.8" />
        {/* Flag on top */}
        <rect x="197" y="72" width="3" height="30" fill={primary} opacity="0.7" />
        <polygon points="200,72 220,80 200,88" fill="#D97706" />

        {/* Building 2 — left */}
        <rect x="60" y="150" width="75" height="130" rx="4" fill={isDark ? '#162B57' : '#BBD5EF'} />
        <rect x="70" y="162" width="14" height="16" rx="2" fill={bg} opacity="0.7" />
        <rect x="92" y="162" width="14" height="16" rx="2" fill={bg} opacity="0.9" />
        <rect x="114" y="162" width="12" height="16" rx="2" fill={bg} opacity="0.7" />
        <rect x="70" y="188" width="14" height="16" rx="2" fill={bg} opacity="0.5" />
        <rect x="92" y="188" width="14" height="16" rx="2" fill="#D97706" opacity="0.8" />
        <rect x="114" y="188" width="12" height="16" rx="2" fill={bg} opacity="0.6" />
        <rect x="70" y="214" width="14" height="16" rx="2" fill={bg} opacity="0.8" />
        <rect x="92" y="214" width="14" height="16" rx="2" fill={bg} opacity="0.6" />
        <rect x="114" y="214" width="12" height="16" rx="2" fill={bg} opacity="0.7" />

        {/* Building 3 — right */}
        <rect x="265" y="130" width="75" height="150" rx="4" fill={isDark ? '#162B57' : '#BBD5EF'} />
        <rect x="275" y="142" width="14" height="16" rx="2" fill={bg} opacity="0.9" />
        <rect x="297" y="142" width="14" height="16" rx="2" fill={bg} opacity="0.7" />
        <rect x="319" y="142" width="12" height="16" rx="2" fill={bg} opacity="0.8" />
        <rect x="275" y="168" width="14" height="16" rx="2" fill={bg} opacity="0.6" />
        <rect x="297" y="168" width="14" height="16" rx="2" fill={bg} opacity="0.9" />
        <rect x="319" y="168" width="12" height="16" rx="2" fill="#16A34A" opacity="0.8" />
        <rect x="275" y="194" width="14" height="16" rx="2" fill={bg} opacity="0.7" />
        <rect x="297" y="194" width="14" height="16" rx="2" fill={bg} opacity="0.5" />
        <rect x="319" y="194" width="12" height="16" rx="2" fill={bg} opacity="0.6" />
        <rect x="275" y="220" width="14" height="16" rx="2" fill={bg} opacity="0.8" />
        <rect x="297" y="220" width="14" height="16" rx="2" fill={bg} opacity="0.7" />
        <rect x="319" y="220" width="12" height="16" rx="2" fill={bg} opacity="0.9" />

        {/* Road */}
        <rect x="20" y="265" width="360" height="20" rx="2" fill={isDark ? '#0A1628' : '#94A3B8'} opacity="0.5" />
        <rect x="80" y="272" width="40" height="4" rx="2" fill="white" opacity="0.4" />
        <rect x="180" y="272" width="40" height="4" rx="2" fill="white" opacity="0.4" />
        <rect x="280" y="272" width="40" height="4" rx="2" fill="white" opacity="0.4" />

        {/* Street light pole */}
        <rect x="37" y="218" width="3" height="50" fill={isDark ? '#162B57' : '#94A3B8'} />
        <rect x="26" y="218" width="17" height="6" rx="3" fill={isDark ? '#162B57' : '#94A3B8'} />
        <ellipse cx="35" cy="218" rx="6" ry="4" fill="#FEF08A" opacity="0.9" />

        {/* Connectivity arcs — data signals */}
        <path d="M200 95 Q250 50 310 80" stroke={primary} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
        <path d="M200 95 Q150 40 90 70" stroke={primary} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
        <circle cx="310" cy="80" r="5" fill={primary} opacity="0.8" />
        <circle cx="90" cy="70" r="5" fill={primary} opacity="0.8" />

        {/* Citizen figure reporting */}
        <circle cx="340" cy="250" r="14" fill={primary} />
        <rect x="330" y="264" width="20" height="20" rx="4" fill={isDark ? '#162B57' : '#1A4E93'} />
        {/* Phone in hand */}
        <rect x="348" y="256" width="10" height="16" rx="2" fill={bg} />
        <circle cx="353" cy="259" r="1.5" fill={accent} />

        {/* Status badge floating */}
        <rect x="310" y="224" width="64" height="20" rx="10" fill={accent} />
        <text x="342" y="237" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">✓ Reported</text>

        {/* Alert pin on building */}
        <circle cx="199" cy="215" r="8" fill="#DC2626" />
        <text x="199" y="219" textAnchor="middle" fill="white" fontSize="10" fontWeight="700">!</text>

        {/* WiFi / signal rings */}
        <path d="M50 100 Q55 95 60 100" stroke={primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <path d="M45 95 Q55 85 65 95" stroke={primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <path d="M40 90 Q55 75 70 90" stroke={primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        <circle cx="55" cy="103" r="2.5" fill={primary} opacity="0.6" />
      </svg>

      {/* Floating stat cards */}
      <div className={`absolute top-4 left-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md animate-float ${isDark ? 'bg-navy-800 text-blue-300 border border-navy-700' : 'bg-white text-primary border border-primary-100'}`}
        style={{ animationDelay: '0.5s' }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.757.433l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" /></svg>
        Issue Pinned
      </div>
      <div className={`absolute bottom-12 right-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md animate-float ${isDark ? 'bg-navy-800 text-green-300 border border-navy-700' : 'bg-white text-success border border-emerald-100'}`}
        style={{ animationDelay: '1.5s' }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
        Active Resolution
      </div>
    </div>
  )
}

// ── Journey Step Card ─────────────────────────────────────────────────────────

function JourneyStep({
  step, icon, title, points, isDark, color
}: {
  step: number; icon: React.ReactNode; title: string; points: string[]
  isDark: boolean; color: string
}) {
  return (
    <div className={`relative flex flex-col gap-4 p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
      isDark ? 'bg-navy-800 border-navy-700 hover:border-navy-600' : 'bg-white border-slate-200 hover:border-primary-200'
    }`}>
      {/* Step number */}
      <div className="absolute -top-3 -left-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm`} style={{ background: color }}>
          {step}
        </div>
      </div>
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mt-1" style={{ background: `${color}18` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <h3 className={`text-base font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
        <ul className="space-y-1.5">
          {points.map(p => (
            <li key={p} className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── Feature Card ──────────────────────────────────────────────────────────────

function FeatureCard({
  icon, title, desc, isDark
}: {
  icon: React.ReactNode; title: string; desc: string; isDark: boolean
}) {
  return (
    <div className={`group flex flex-col gap-3 p-6 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
      isDark ? 'bg-navy-800 border-navy-700 hover:border-primary/40' : 'bg-white border-slate-200 hover:border-primary-300'
    }`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
        isDark ? 'bg-primary/20 text-primary-300 group-hover:bg-primary/30' : 'bg-primary-50 text-primary group-hover:bg-primary-100'
      }`}>
        {icon}
      </div>
      <div>
        <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
        <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
      </div>
    </div>
  )
}

// ── Trust Pillar ──────────────────────────────────────────────────────────────

function TrustPillar({ icon, title, desc, isDark }: { icon: React.ReactNode; title: string; desc: string; isDark: boolean }) {
  return (
    <div className="flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-primary/20 text-primary-300' : 'bg-primary-50 text-primary'}`}>
        {icon}
      </div>
      <div>
        <p className={`text-sm font-semibold mb-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</p>
        <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function LandingPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const sectionBg = isDark ? 'bg-navy-950' : 'bg-white'
  const altSectionBg = isDark ? 'bg-navy-900' : 'bg-slate-50'
  const headingClass = `font-display font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`
  const subClass = isDark ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className={isDark ? 'bg-navy-950' : 'bg-white'}>

      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className={`relative overflow-hidden ${sectionBg}`}>
        {/* Grid background */}
        <div className="absolute inset-0 bg-grid-pattern" />
        {/* Glow blob */}
        <div className={`absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none
          ${isDark ? 'bg-[radial-gradient(ellipse_at_center,rgba(30,90,168,0.12)_0%,transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(30,90,168,0.06)_0%,transparent_70%)]'}`} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: Text */}
            <div className="stagger-children">
              {/* Badge */}
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 border ${
                isDark ? 'bg-primary/15 text-primary-300 border-primary/30' : 'bg-primary-50 text-primary border-primary-100'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
                Smart Civic Platform
              </div>

              {/* Headline */}
              <h1 className={`text-4xl sm:text-5xl lg:text-6xl leading-[1.1] mb-6 ${headingClass}`}>
                Report Civic Issues.{' '}
                <span className="gradient-text">Track Progress.</span>
                {' '}Build a Better City.
              </h1>

              <p className={`text-lg leading-relaxed mb-8 max-w-xl ${subClass}`}>
                ResolveOne bridges the gap between citizens and municipal authorities. Submit complaints, monitor resolution progress, and hold authorities accountable, all in one platform.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/citizen/verify"
                  className="group inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-primary-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                  </svg>
                  Report an Issue
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </Link>
                <Link
                  to="/citizen/track"
                  className={`inline-flex items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-xl border transition-all duration-200 text-sm ${
                    isDark
                      ? 'bg-white/5 text-white border-white/15 hover:bg-white/10 hover:border-white/25'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-primary-300 hover:text-primary hover:bg-primary-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                  </svg>
                  Track Complaint
                </Link>
              </div>

              {/* Social proof */}
              <div className={`flex items-center gap-4 mt-8 pt-6 border-t ${isDark ? 'border-navy-800' : 'border-slate-100'}`}>
                <div className="flex -space-x-2">
                  {['#1E5AA8','#16A34A','#D97706','#DC2626'].map((c, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-navy-950 flex items-center justify-center text-white text-xs font-bold" style={{ background: c }}>
                      {['C','R','A','B'][i]}
                    </div>
                  ))}
                </div>
                <p className={`text-xs ${subClass}`}>
                  <strong className={isDark ? 'text-white' : 'text-slate-700'}>Connecting citizens</strong> and municipal authorities
                </p>
              </div>
            </div>

            {/* Right: Illustration */}
            <div className="flex items-center justify-center">
              <CityIllustration isDark={isDark} />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────── */}
      <div className={`${isDark ? 'bg-navy-900 border-y border-navy-800' : 'bg-primary border-y border-primary-600'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0 sm:divide-x divide-white/20">
            {[
              { label: 'Real-time Tracking', value: 'Live Updates' },
              { label: 'Identity Protection', value: 'Secure Verification' },
              { label: 'Resolution Proof', value: 'Photo Evidence' },
              { label: 'Platform Availability', value: '24/7 Access' },
            ].map(stat => (
              <div key={stat.label} className="text-center sm:px-6">
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/70 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section className={`py-20 ${altSectionBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-14">
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-primary-400' : 'text-primary'}`}>Your Voice Matters</p>
            <h2 className={`text-3xl sm:text-4xl ${headingClass} mb-4`}>Simple. Transparent. Accountable.</h2>
            <p className={`text-base max-w-xl mx-auto ${subClass}`}>
              From reporting an issue to seeing proof of resolution, every step of your citizen journey is trackable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
            <JourneyStep
              step={1}
              isDark={isDark}
              color="#1E5AA8"
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.003 3.5-4.697 3.5-8.122a8 8 0 10-16 0c0 3.425 1.556 6.119 3.5 8.122a19.58 19.58 0 002.682 2.282 16.958 16.958 0 001.144.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>}
              title="Report the Issue"
              points={['Select complaint category', 'Describe the problem clearly', 'Upload photo evidence', 'Pin exact location on map']}
            />
            <JourneyStep
              step={2}
              isDark={isDark}
              color="#D97706"
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>}
              title="Track Real-Time Progress"
              points={['Receive unique Complaint ID', 'Enter ID + Aadhaar to verify', 'View live status timeline', 'See authority notes & updates']}
            />
            <JourneyStep
              step={3}
              isDark={isDark}
              color="#16A34A"
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>}
              title="Resolution with Proof"
              points={['Authority uploads completion photo', 'Resolution date recorded', 'Official note from officer', 'Full transparent audit trail']}
            />
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── PROBLEM / SOLUTION ────────────────────────────────────── */}
      <section className={`py-20 ${sectionBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Problem */}
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-4 text-red-500`}>The Problem</p>
              <h2 className={`text-3xl font-extrabold font-display mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Civic complaints get lost in fragmented systems
              </h2>
              <div className="space-y-4">
                {[
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" /></svg>, text: 'Citizens call helplines and complaints are never recorded.' },
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>, text: 'Manual paperwork means issues take weeks to even reach the right officer.' },
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>, text: 'No visibility because citizens have no way to track if their complaint is being worked on.' },
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" /></svg>, text: 'No proof of resolution, as work gets marked done without verification.' },
                ].map(p => (
                  <div key={p.text} className={`flex items-start gap-3 p-4 rounded-xl ${isDark ? 'bg-red-950/30 border border-red-900/50' : 'bg-red-50 border border-red-100'}`}>
                    <span className="text-red-500 mt-0.5 shrink-0">{p.icon}</span>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{p.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Solution */}
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-4 text-emerald-500`}>The ResolveOne Solution</p>
              <h2 className={`text-3xl font-extrabold font-display mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                One platform. Full transparency. Real results.
              </h2>
              <div className="space-y-4">
                {[
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>, text: 'Digital complaint registration with photo and map location for a permanent record.' },
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" /></svg>, text: 'Authority portal for instant complaint routing and status updates.' },
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>, text: 'Citizens track every status change: Submitted → Under Review → In Progress → Resolved.' },
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" /></svg>, text: 'Resolution proof photo uploaded by officer, which is visible to the citizen publicly.' },
                ].map(p => (
                  <div key={p.text} className={`flex items-start gap-3 p-4 rounded-xl ${isDark ? 'bg-emerald-950/30 border border-emerald-900/50' : 'bg-emerald-50 border border-emerald-100'}`}>
                    <span className="text-emerald-500 mt-0.5 shrink-0">{p.icon}</span>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{p.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── FEATURES GRID ─────────────────────────────────────────── */}
      <section className={`py-20 ${altSectionBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-primary-400' : 'text-primary'}`}>Platform Capabilities</p>
            <h2 className={`text-3xl sm:text-4xl ${headingClass} mb-4`}>Built for Citizens. Designed for Authorities.</h2>
            <p className={`text-base max-w-xl mx-auto ${subClass}`}>
              Every feature has a purpose. Every data point drives accountability.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            <FeatureCard
              isDark={isDark}
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.903 32.903 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z" clipRule="evenodd" /></svg>}
              title="Citizen Complaint Registration"
              desc="File civic complaints in minutes without needing an account. Just Aadhaar-based identity verification for accountability."
            />
            <FeatureCard
              isDark={isDark}
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.757.433l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" /></svg>}
              title="Map-Based Location Intelligence"
              desc="Pin the exact location of a civic issue on an interactive map. Authorities can visualize complaint hotspots across the city."
            />
            <FeatureCard
              isDark={isDark}
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" /><path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" /></svg>}
              title="Real-Time Status Tracking"
              desc="Citizens enter their Complaint ID and Aadhaar to view a live timeline: Submitted → Under Review → In Progress → Resolved."
            />
            <FeatureCard
              isDark={isDark}
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0-6a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" /></svg>}
              title="Authority Management Dashboard"
              desc="Municipal officers get a full dashboard with list and map views, filter by status and category, and detailed complaint management."
            />
            <FeatureCard
              isDark={isDark}
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" /></svg>}
              title="Photo-Based Resolution Proof"
              desc="Authorities must upload a completion photo before marking a complaint as resolved. Citizens can see the proof directly."
            />
            <FeatureCard
              isDark={isDark}
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>}
              title="Aadhaar-Based Identity Verification"
              desc="Complaints are tied to a hashed Aadhaar identifier, so no data is stored in plain text. Citizens stay anonymous but accountable."
            />
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── TRUST SECTION ─────────────────────────────────────────── */}
      <section id="about" className={`py-20 ${sectionBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-primary-400' : 'text-primary'}`}>Why Citizens Trust ResolveOne</p>
              <h2 className={`text-3xl sm:text-4xl font-extrabold font-display mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Designed around transparency and accountability
              </h2>
              <p className={`text-base leading-relaxed mb-10 ${subClass}`}>
                ResolveOne was built for the digital India initiative, bringing government services online with citizen-first design, data privacy, and zero tolerance for unresolved complaints.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <TrustPillar
                  isDark={isDark}
                  icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>}
                  title="Privacy-First Identity"
                  desc="Aadhaar numbers are cryptographically hashed and never stored in plain text. Your identity stays yours."
                />
                <TrustPillar
                  isDark={isDark}
                  icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>}
                  title="Full Complaint Visibility"
                  desc="Every status change is recorded with timestamps. Citizens see everything in real time."
                />
                <TrustPillar
                  isDark={isDark}
                  icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" /></svg>}
                  title="Photo Proof of Resolution"
                  desc="No rubber-stamping. Authorities must upload a completion photo before a complaint can be marked resolved."
                />
                <TrustPillar
                  isDark={isDark}
                  icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v11.75A2.75 2.75 0 0016.75 18h-12A2.75 2.75 0 012 15.25V3.5zm3.75 7a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zm0 3a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zM5 5.75A.75.75 0 015.75 5h4.5a.75.75 0 01.75.75v2.5a.75.75 0 01-.75.75h-4.5A.75.75 0 015 8.25v-2.5z" clipRule="evenodd" /></svg>}
                  title="Direct Citizen–Authority Link"
                  desc="Complaints go directly into the municipal officer's dashboard. No middlemen. No lost paperwork."
                />
              </div>
            </div>

            {/* Right: CTA Cards */}
            <div className="grid grid-cols-1 gap-5">
              {/* Citizen CTA */}
              <Link
                to="/citizen/verify"
                className={`group flex items-center gap-5 p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                  isDark ? 'bg-navy-800 border-navy-700 hover:border-primary/40' : 'bg-primary-50 border-primary-100 hover:border-primary-300'
                }`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-primary/20' : 'bg-primary'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-7 h-7 ${isDark ? 'text-primary-300' : 'text-white'}`}>
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-primary-900'}`}>I'm a Citizen</h3>
                  <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-primary-700'}`}>Report a civic issue or track an existing complaint.</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${isDark ? 'text-primary-400' : 'text-primary'}`}>
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </Link>

              {/* Authority CTA */}
              <Link
                to="/authority/login"
                className={`group flex items-center gap-5 p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                  isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white">
                    <path fillRule="evenodd" d="M3 2.25a.75.75 0 000 1.5v16.5h-.75a.75.75 0 000 1.5H15v-18a.75.75 0 000-1.5H3zM6.75 19.5v-2.25a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v2.25a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75zM6 6.75A.75.75 0 016.75 6h.75a.75.75 0 010 1.5h-.75A.75.75 0 016 6.75zM6.75 9a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM6 12.75a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM10.5 6a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zm-.75 3.75A.75.75 0 0110.5 9h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM10.5 12a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM16.5 6.75v15h5.25a.75.75 0 000-1.5H21v-13.5h.75a.75.75 0 000-1.5H16.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white">I'm a Municipal Officer</h3>
                  <p className="text-sm mt-0.5 text-slate-400">Access the authority portal to manage and resolve complaints.</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </Link>

              {/* Track complaint quick link */}
              <Link
                to="/citizen/track"
                className={`group flex items-center justify-between gap-4 px-5 py-4 rounded-xl border text-sm font-medium transition-all ${
                  isDark ? 'border-navy-700 text-slate-400 hover:text-white hover:border-navy-600 bg-navy-900' : 'border-slate-200 text-slate-500 hover:text-primary hover:border-primary-200 bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                  </svg>
                  Already submitted a complaint? Track its status
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className={`border-t ${isDark ? 'bg-navy-950 border-navy-800' : 'bg-slate-900 border-slate-800'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                    <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
                  </svg>
                </div>
                <span className="text-base font-bold text-white font-display">ResolveOne</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                A digital civic engagement platform for smart cities. Connecting citizens with municipal authorities for faster, transparent complaint resolution.
              </p>
              <p className="text-xs text-slate-600 mt-4">Official Smart City Digital Services Initiative</p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">Citizens</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Report Issue', to: '/citizen/verify' },
                  { label: 'Track Complaint', to: '/citizen/track' },
                  { label: 'About ResolveOne', to: '#about' },
                ].map(link => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-slate-400 hover:text-white transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">Authority</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Authority Portal Login', to: '/authority/login' },
                ].map(link => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-slate-400 hover:text-white transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`border-t mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 ${isDark ? 'border-navy-800' : 'border-slate-800'}`}>
            <p className="text-xs text-slate-500">© 2026 ResolveOne · Smart City Digital Platform</p>
            <p className="text-xs text-slate-600">Built with transparency and accountability in mind.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
