import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useDarkMode } from './hooks/useDarkMode'
import { useAppStore } from './store'
import AppLayout from './components/layout/AppLayout'
import ToastContainer from './components/ui/ToastContainer'

// Lazy-loaded pages
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignUpPage = lazy(() => import('./pages/SignUpPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ScanCards = lazy(() => import('./pages/ScanCards'))
const AllCards = lazy(() => import('./pages/AllCards'))
const ExportPage = lazy(() => import('./pages/ExportPage'))
const CRMSettings = lazy(() => import('./pages/CRMSettings'))

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div className="ocr-spinner" />
      <p className="text-muted text-sm">Loading…</p>
    </div>
  )
}

// Auth loading screen (shown while checking token validity)
function AuthLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-base)',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div className="ocr-spinner" />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Checking session…</p>
    </div>
  )
}

// Protected route wrapper — redirects to /login if not authenticated
function ProtectedRoute({ children }) {
  const isAuthenticated = useAppStore(s => s.isAuthenticated)
  const authLoading = useAppStore(s => s.authLoading)
  const location = useLocation()

  if (authLoading) return <AuthLoader />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// Public-only route — redirects to /dashboard if already authenticated
function PublicRoute({ children }) {
  const isAuthenticated = useAppStore(s => s.isAuthenticated)
  const authLoading = useAppStore(s => s.authLoading)

  if (authLoading) return <AuthLoader />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  useDarkMode()
  const initAuth = useAppStore(s => s.initAuth)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scan" element={<ScanCards />} />
            <Route path="/cards" element={<AllCards />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/settings" element={<CRMSettings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ToastContainer />
    </>
  )
}
