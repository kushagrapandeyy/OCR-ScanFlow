import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LogOut, User, Building2, Save, Mail, Shield,
  Camera, Check, AlertTriangle,
} from 'lucide-react'
import { useAppStore } from '../store'
import { useHaptics } from '../hooks/useHaptics'
import { useNavigate } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const user         = useAppStore((s) => s.user)
  const logout       = useAppStore((s) => s.logout)
  const updateProfile = useAppStore((s) => s.updateProfile)
  const addToast     = useAppStore((s) => s.addToast)
  const haptics      = useHaptics()

  const [name, setName]       = useState(user?.name || '')
  const [company, setCompany] = useState(user?.company || '')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U'

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    haptics.tap()
    try {
      await updateProfile(name, company)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      addToast({ type: 'success', title: 'Profile updated', message: 'Your changes have been saved.' })
      haptics.success()
    } catch (err) {
      addToast({ type: 'error', title: 'Update failed', message: err.message })
      haptics.error()
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    haptics.heavy()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your identity and account preferences</p>
      </div>

      <div className="profile-layout">

        {/* Left Column — Identity */}
        <div className="profile-left">
          <motion.div
            className="profile-avatar-card"
            variants={fadeUp} custom={0} initial="hidden" animate="show"
          >
            {/* Avatar */}
            <div className="profile-avatar-wrap">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-initials">
                  <span>{initials}</span>
                </div>
              )}
              <div className="profile-avatar-badge">
                <Camera size={12} />
              </div>
            </div>

            <div className="profile-identity">
              <h2 className="profile-name">{user?.name}</h2>
              <p className="profile-email">
                <Mail size={13} />
                {user?.email}
              </p>
              {user?.auth_provider === 'google' && (
                <div className="profile-auth-badge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Signed in with Google
                </div>
              )}
            </div>

            <div className="profile-security-row">
              <Shield size={13} style={{ color: 'var(--accent)' }} />
              <span>Your data is end-to-end isolated per account</span>
            </div>
          </motion.div>
        </div>

        {/* Right Column — Settings */}
        <div className="profile-right">

          {/* Edit form */}
          <motion.div className="profile-panel" variants={fadeUp} custom={1} initial="hidden" animate="show">
            <div className="profile-panel-header">
              <h3 className="profile-panel-title">Account Details</h3>
              <p className="profile-panel-sub">Update your display name and company</p>
            </div>

            <form onSubmit={handleSave} className="profile-form">
              <div className="profile-field">
                <label className="profile-label">Full Name</label>
                <div className="profile-input-wrap">
                  <User size={15} className="profile-input-icon" />
                  <input
                    type="text"
                    className="profile-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
              </div>

              <div className="profile-field">
                <label className="profile-label">
                  Company
                  <span className="profile-label-optional">optional</span>
                </label>
                <div className="profile-input-wrap">
                  <Building2 size={15} className="profile-input-icon" />
                  <input
                    type="text"
                    className="profile-input"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                  />
                </div>
              </div>

              <div className="profile-field">
                <label className="profile-label">Email Address</label>
                <div className="profile-input-wrap">
                  <Mail size={15} className="profile-input-icon" />
                  <input
                    type="email"
                    className="profile-input profile-input-readonly"
                    value={user?.email || ''}
                    readOnly
                    tabIndex={-1}
                  />
                  <span className="profile-input-lock">Managed by provider</span>
                </div>
              </div>

              <motion.button
                type="submit"
                className={`btn btn-primary profile-save-btn ${saved ? 'saved' : ''}`}
                disabled={saving || !name.trim()}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {saved ? (
                  <><Check size={15} /> Saved</>
                ) : saving ? (
                  <><div className="ocr-spinner" style={{ width: 15, height: 15 }} /> Saving…</>
                ) : (
                  <><Save size={15} /> Save Changes</>
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* Danger zone */}
          <motion.div
            className="profile-panel profile-danger-panel"
            variants={fadeUp} custom={2} initial="hidden" animate="show"
          >
            <div className="profile-panel-header">
              <h3 className="profile-panel-title profile-danger-title">
                <AlertTriangle size={15} style={{ color: 'var(--red)' }} />
                Sign Out
              </h3>
              <p className="profile-panel-sub">
                You will be redirected to the login page. All your data remains safely stored.
              </p>
            </div>

            {!showLogoutConfirm ? (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="btn profile-logout-btn"
              >
                <LogOut size={15} /> Sign out of ScanFlow
              </button>
            ) : (
              <div className="profile-confirm-row">
                <span className="profile-confirm-label">Are you sure?</span>
                <button onClick={handleLogout} className="btn profile-logout-confirm-btn">
                  <LogOut size={14} /> Yes, sign out
                </button>
                <button onClick={() => setShowLogoutConfirm(false)} className="btn btn-ghost btn-sm">
                  Cancel
                </button>
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  )
}
