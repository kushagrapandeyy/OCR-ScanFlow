import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Eye, EyeOff, Building2, Zap, ArrowRight, AlertCircle, Check } from 'lucide-react'
import { useAppStore } from '../store'

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains a number', test: (p) => /\d/.test(p) },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
]

export default function SignUpPage() {
  const navigate = useNavigate()
  const signup = useAppStore(s => s.signup)
  const googleLogin = useAppStore(s => s.googleLogin)
  const addToast = useAppStore(s => s.addToast)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [company, setCompany] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordStrength = PASSWORD_RULES.filter(r => r.test(password)).length
  const passwordValid = passwordStrength === PASSWORD_RULES.length

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name || !email || !password) {
      setError('Name, email, and password are required')
      return
    }
    if (!passwordValid) {
      setError('Password does not meet requirements')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await signup(name, email, password, company || undefined)
      addToast({ type: 'success', title: 'Account created!', message: 'Welcome to ScanFlow' })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError('Google Sign-In is not configured yet')
      return
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          setLoading(true)
          setError('')
          try {
            await googleLogin(response.credential)
            addToast({ type: 'success', title: 'Welcome!', message: 'Account created with Google' })
            navigate('/dashboard', { replace: true })
          } catch (err) {
            setError(err.message || 'Google sign-up failed')
          } finally {
            setLoading(false)
          }
        },
      })
      window.google.accounts.id.prompt()
    } else {
      setError('Google Sign-In SDK not loaded')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="landing-bg-orb landing-bg-orb-1" />
        <div className="landing-bg-orb landing-bg-orb-2" />
      </div>

      <motion.div
        className="auth-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link to="/" className="auth-logo">
          <div className="landing-logo-icon"><Zap size={22} /></div>
          <span className="landing-logo-text">ScanFlow</span>
        </Link>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start scanning business cards in seconds</p>

        {/* Google Sign Up */}
        <button
          className="auth-google-btn"
          onClick={handleGoogleSignUp}
          disabled={loading}
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or sign up with email</span>
        </div>

        {error && (
          <motion.div
            className="auth-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Full Name</label>
            <div className="auth-input-wrap">
              <User size={16} className="auth-input-icon" />
              <input
                type="text"
                className="auth-input"
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                autoFocus
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" className="auth-toggle-pw" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="auth-pw-rules">
                {PASSWORD_RULES.map(rule => (
                  <div key={rule.label} className={`auth-pw-rule ${rule.test(password) ? 'valid' : ''}`}>
                    <Check size={12} /> {rule.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label">Confirm Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Company <span className="auth-optional">(optional)</span></label>
            <div className="auth-input-wrap">
              <Building2 size={16} className="auth-input-icon" />
              <input
                type="text"
                className="auth-input"
                placeholder="Acme Inc."
                value={company}
                onChange={e => setCompany(e.target.value)}
                autoComplete="organization"
              />
            </div>
          </div>

          <motion.button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <div className="ocr-spinner" style={{ width: 20, height: 20 }} />
            ) : (
              <>Create Account <ArrowRight size={16} /></>
            )}
          </motion.button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
