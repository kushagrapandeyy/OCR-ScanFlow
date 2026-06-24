import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'

export default function AuthCallback() {
  const navigate = useNavigate()
  const googleLogin = useAppStore(s => s.googleLogin)
  const addToast = useAppStore(s => s.addToast)
  const processedRef = useRef(false)

  useEffect(() => {
    // Only process once to prevent strict-mode double firing
    if (processedRef.current) return
    processedRef.current = true

    const handleCallback = async () => {
      try {
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const idToken = params.get('id_token')
        const error = params.get('error')

        if (error) {
          throw new Error(`Google Auth Error: ${error}`)
        }

        if (!idToken) {
          throw new Error('No authentication token found in URL')
        }

        // Send token to our backend
        await googleLogin(idToken)
        addToast({ type: 'success', title: 'Welcome!', message: 'Signed in with Google' })
        
        // Clean URL and redirect
        window.history.replaceState(null, '', window.location.pathname)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        addToast({ type: 'error', title: 'Authentication Failed', message: err.message })
        navigate('/login', { replace: true })
      }
    }

    handleCallback()
  }, [googleLogin, addToast, navigate])

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
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Authenticating with Google…</p>
    </div>
  )
}
