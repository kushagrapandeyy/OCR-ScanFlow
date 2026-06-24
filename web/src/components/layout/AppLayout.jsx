import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ScanLine,
  CreditCard,
  FileOutput,
  Settings,
  ArrowLeft,
  ChevronRight,
  Zap,
  LogOut,
  BarChart2,
  User,
  Menu,
  PanelLeftClose,
} from 'lucide-react'
import { useAppStore } from '../../store'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/scan', label: 'Scan Cards', icon: ScanLine },
  { path: '/cards', label: 'All Cards', icon: CreditCard },
  { path: '/export', label: 'Export', icon: FileOutput },
  { path: '/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/settings', label: 'CRM Settings', icon: Settings },
  { path: '/profile', label: 'Profile', icon: User },
]

const BOTTOM_TABS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/cards', label: 'Cards', icon: CreditCard },
  { path: '/scan', label: 'Scan', icon: ScanLine, isScan: true },
  { path: '/export', label: 'Export', icon: FileOutput },
  { path: '/settings', label: 'Settings', icon: Settings },
]

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

const pageTransition = {
  type: 'tween',
  ease: [0.4, 0, 0.2, 1],
  duration: 0.22,
}

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const crmConfig = useAppStore((s) => s.crmConfig)
  const syncScans = useAppStore((s) => s.syncScans)
  const syncCrmConfig = useAppStore((s) => s.syncCrmConfig)
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    syncScans()
    syncCrmConfig()
  }, [syncScans, syncCrmConfig])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  // Determine if we're on a sub-route (show back button)
  const isSubRoute =
    location.pathname.startsWith('/cards/') ||
    location.pathname.startsWith('/scan/review')

  const pageTitle = {
    '/dashboard': 'Dashboard',
    '/scan': 'Scan Cards',
    '/cards': 'All Cards',
    '/export': 'Export',
    '/analytics': 'Analytics',
    '/settings': 'CRM Settings',
    '/profile': 'Profile',
  }[location.pathname] || 'ScanFlow'

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Zap size={20} />
          </div>
          <div className="logo-text">
            <h2>ScanFlow</h2>
            <span>OCR · CRM Bridge</span>
          </div>
          <button 
            className="btn btn-ghost btn-icon" 
            onClick={() => setSidebarCollapsed(true)} 
            style={{ marginLeft: 'auto', padding: '4px' }}
            title="Collapse Sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className="nav-icon" />
                  {label}
                  {isActive && <ChevronRight size={12} className="nav-item-arrow" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* User info */}
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} />
                ) : (
                  <span>{user.name?.[0]?.toUpperCase() || '?'}</span>
                )}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-email">{user.email}</div>
              </div>
              <button
                className="sidebar-logout-btn"
                onClick={handleLogout}
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
          <div className="crm-status">
            <div className="crm-status-label">CRM Status</div>
            <div className="crm-status-value">
              <div className={`crm-dot ${crmConfig.connected ? '' : 'disconnected'}`} />
              {crmConfig.name || 'Not Connected'}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        {/* Mobile Header */}
        <header className="mobile-header">
          {sidebarCollapsed && !isSubRoute && (
            <button
              className="btn btn-ghost btn-icon desktop-menu-btn"
              onClick={() => setSidebarCollapsed(false)}
              style={{ padding: '6px' }}
            >
              <Menu size={20} />
            </button>
          )}
          {isSubRoute ? (
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => navigate(-1)}
              style={{ padding: '6px' }}
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="logo-icon" style={{ width: 32, height: 32 }}>
                <Zap size={16} />
              </div>
              <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem' }}>
                ScanFlow
              </span>
            </div>
          )}
          <span
            style={{
              flex: 1,
              textAlign: 'center',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            {pageTitle}
          </span>
          {/* Mobile logout button */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={handleLogout}
            style={{ padding: '6px' }}
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Animated page content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            style={{ flex: 1 }}
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
                <div className="tab-item-scan">
                  <Icon size={22} />
                </div>
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
