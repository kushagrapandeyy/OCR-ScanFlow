import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ScanLine,
  CreditCard,
  FileOutput,
  Settings,
  ArrowLeft,
  PanelLeftClose,
  PanelLeft,
  Zap,
  LogOut,
  BarChart2,
  User,
} from 'lucide-react'
import { useAppStore } from '../../store'

const NAV_ITEMS = [
  { path: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/scan',       label: 'Scan Cards',   icon: ScanLine },
  { path: '/cards',      label: 'All Cards',    icon: CreditCard },
  { path: '/export',     label: 'Export',       icon: FileOutput },
  { path: '/analytics',  label: 'Analytics',    icon: BarChart2 },
  { path: '/settings',   label: 'CRM Settings', icon: Settings },
  { path: '/profile',    label: 'Profile',      icon: User },
]

const BOTTOM_TABS = [
  { path: '/dashboard', label: 'Home',    icon: LayoutDashboard },
  { path: '/cards',     label: 'Cards',   icon: CreditCard },
  { path: '/scan',      label: 'Scan',    icon: ScanLine, isScan: true },
  { path: '/export',    label: 'Export',  icon: FileOutput },
  { path: '/profile',   label: 'Profile', icon: User },
]

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
}

const pageTransition = { type: 'tween', ease: [0.4, 0, 0.2, 1], duration: 0.18 }

export default function AppLayout() {
  const location      = useLocation()
  const navigate      = useNavigate()
  const crmConfig     = useAppStore((s) => s.crmConfig)
  const syncScans     = useAppStore((s) => s.syncScans)
  const syncCrmConfig = useAppStore((s) => s.syncCrmConfig)
  const user          = useAppStore((s) => s.user)
  const logout        = useAppStore((s) => s.logout)
  const [isRail, setIsRail] = useState(false)

  useEffect(() => {
    syncScans()
    syncCrmConfig()
  }, [syncScans, syncCrmConfig])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const isSubRoute =
    location.pathname.startsWith('/cards/') ||
    location.pathname.startsWith('/scan/review')

  const pageTitle = {
    '/dashboard': 'Dashboard',
    '/scan':      'Scan Cards',
    '/cards':     'All Cards',
    '/export':    'Export',
    '/analytics': 'Analytics',
    '/settings':  'CRM Settings',
    '/profile':   'Profile',
  }[location.pathname] || 'ScanFlow'

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '?'

  return (
    <div className="app-shell">

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${isRail ? 'sidebar-rail' : ''}`}>

        {/* Logo — links to landing page */}
        <div className="sidebar-logo">
          <Link to="/" className="sidebar-logo-link" title="Back to home">
            <div className="logo-icon"><Zap size={17} /></div>
            <div className="sidebar-logo-text">
              <div className="logo-text">
                <h2>ScanFlow</h2>
                <span>OCR · CRM Bridge</span>
              </div>
            </div>
          </Link>
          <button
            className="sidebar-toggle-btn"
            onClick={() => setIsRail(!isRail)}
            title={isRail ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isRail ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {/* Section label */}
          {!isRail && (
            <div className="sidebar-section-label">Navigation</div>
          )}
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              data-label={label}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className="nav-icon" />
                  <span className="nav-item-label">{label}</span>
                  {isActive && !isRail && (
                    <span className="nav-item-arrow">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {/* User info — full */}
          {user && !isRail && (
            <NavLink to="/profile" className="sidebar-user-btn">
              <div className="sidebar-user-avatar">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.name} />
                  : <span>{userInitials}</span>
                }
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-email">{user.email}</div>
              </div>
              <button
                className="sidebar-logout-btn"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLogout() }}
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </NavLink>
          )}

          {/* Rail: avatar icon → profile + logout */}
          {user && isRail && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <NavLink to="/profile" title="Profile" className="sidebar-rail-avatar">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.name} />
                  : <span>{userInitials}</span>
                }
              </NavLink>
              <button
                className="sidebar-toggle-btn"
                onClick={handleLogout}
                title="Sign out"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                <LogOut size={14} />
              </button>
            </div>
          )}

          {/* CRM status */}
          {!isRail && (
            <div className="crm-status">
              <div className="crm-status-label">CRM Status</div>
              <div className="crm-status-value">
                <div className={`crm-dot ${crmConfig?.connected ? '' : 'disconnected'}`} />
                {crmConfig?.name || 'Not Connected'}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className={`main-content ${isRail ? 'rail-mode' : ''}`}>

        {/* Mobile Header */}
        <header className="mobile-header">
          {isSubRoute ? (
            <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)} style={{ padding: '6px' }}>
              <ArrowLeft size={20} />
            </button>
          ) : (
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
              <div className="logo-icon" style={{ width: 30, height: 30 }}>
                <Zap size={15} />
              </div>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>
                ScanFlow
              </span>
            </Link>
          )}
          <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>
            {pageTitle}
          </span>
          {user && (
            <NavLink to="/profile" style={{ display: 'flex', alignItems: 'center' }}>
              <div className="mobile-user-avatar">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)' }}>{userInitials}</span>
                }
              </div>
            </NavLink>
          )}
        </header>

        {/* Page Content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            style={{ flex: 1, width: '100%' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="bottom-tab-bar">
        {BOTTOM_TABS.map(({ path, label, icon: Icon, isScan }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              isScan
                ? `tab-scan-wrapper ${isActive ? 'active' : ''}`
                : `tab-item ${isActive ? 'active' : ''}`
            }
          >
            {isScan ? (
              <>
                <div className="tab-item-scan"><Icon size={20} /></div>
                <span>{label}</span>
              </>
            ) : (
              <>
                <Icon size={20} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

    </div>
  )
}
