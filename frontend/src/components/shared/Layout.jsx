import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import LanguageSwitcher from './LanguageSwitcher'
import Chatbot from './Chatbot'

const NAV_BY_ROLE = {
  patient: [
    { to: '/patient', labelKey: 'nav.newScreening', end: true },
    { to: '/patient/history', labelKey: 'nav.previousScans' },
    { to: '/lab/new', label: 'Lab Analysis' },
  ],
  doctor: [
    { to: '/doctor', labelKey: 'nav.patients', end: true },
    { to: '/doctor/new-patient', labelKey: 'nav.createProfile' },
    { to: '/lab/new', label: 'Lab Analysis' },
  ],
  ngo: [
    { to: '/ngo', labelKey: 'nav.patients', end: true },
    { to: '/ngo/new-patient', labelKey: 'nav.createProfile' },
    { to: '/lab/new', label: 'Lab Analysis' },
  ],
  admin: [
    { to: '/admin', labelKey: 'nav.userManagement', end: true },
    { to: '/lab/new', label: 'Lab Analysis' },
  ],
}

export default function Layout() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = NAV_BY_ROLE[user?.role] || []

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink">
      <header className="bg-white border-b border-primary/5 sticky top-0 z-30 shadow-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate(`/${user?.role || ''}`)} className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display font-bold text-lg text-primary">DiaCare</span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive ? 'bg-primary-light text-primary' : 'text-ink/75 hover:bg-slate-50'
                  }`
                }
              >
                {item.labelKey ? t(item.labelKey) : item.label}
              </NavLink>
            ))}
          </nav>


          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <NavLink to="/profile" className={({ isActive }) =>
              `w-9 h-9 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-primary text-white' : 'bg-primary-light text-primary hover:bg-primary/20'}`
            } aria-label="Profile">
              <UserIcon />
            </NavLink>
          </div>
        </div>
        <nav className="md:hidden flex overflow-x-auto gap-1 px-4 pb-2 border-t border-primary/5 pt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${isActive ? 'bg-primary-light text-primary' : 'text-ink/60'}`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      <footer className="text-center text-xs text-muted py-6 border-t border-primary/5 bg-white mt-12 flex flex-col sm:flex-row items-center justify-center gap-2">
        <span>DiaCare is a screening aid, not a diagnostic tool.</span>
        <span className="hidden sm:inline">&middot;</span>
        <NavLink to="/about-model" className="underline font-semibold hover:text-primary">{t('nav.aboutModel')}</NavLink>
      </footer>

      <Chatbot />
    </div>
  )
}

function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" fill="#EFF6FF" />
      <path d="M16 6c4 5 7 8.5 7 12.5A7 7 0 1 1 9 18.5C9 14.5 12 11 16 6Z" fill="#2563EB" />
    </svg>
  )
}
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
