import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { LogOut, User, Building2, Save } from 'lucide-react'
import { useAppStore } from '../store'
import { useHaptics } from '../hooks/useHaptics'

export default function ProfilePage() {
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)
  const updateProfile = useAppStore((s) => s.updateProfile)
  const addToast = useAppStore((s) => s.addToast)
  const haptics = useHaptics()

  const [name, setName] = useState(user?.name || '')
  const [company, setCompany] = useState(user?.company || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    haptics.tap()
    try {
      await updateProfile(name, company)
      addToast({ type: 'success', title: 'Profile Updated', message: 'Your details have been saved.' })
      haptics.success()
    } catch (err) {
      addToast({ type: 'error', title: 'Update Failed', message: err.message })
      haptics.error()
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    haptics.heavy()
    logout()
  }

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile Settings</h1>
          <p className="page-subtitle">Manage your personal details and account settings</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24, maxWidth: 600 }}>
        {/* Profile Card */}
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 }}>
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name} 
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ 
                width: 80, height: 80, borderRadius: '50%', 
                background: 'var(--bg-hover)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', fontWeight: 700, color: 'var(--teal)', fontFamily: 'Outfit'
              }}>
                {initials}
              </div>
            )}
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 4, fontFamily: 'Outfit' }}>{user?.name}</h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user?.email}</div>
              {user?.auth_provider === 'google' && (
                <div style={{ marginTop: 8, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 12 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Signed in with Google
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'grid', gap: 20 }}>
            <div className="input-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="input-group">
              <label>Company (Optional)</label>
              <div className="input-wrapper">
                <Building2 size={16} className="input-icon" />
                <input 
                  type="text" 
                  value={company} 
                  onChange={e => setCompany(e.target.value)} 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ alignSelf: 'flex-start' }}
              disabled={saving}
            >
              {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
            </button>
          </form>
        </motion.div>

        {/* Account Actions */}
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ border: '1px solid rgba(255, 59, 48, 0.2)' }}
        >
          <h3 style={{ fontSize: '1.1rem', marginBottom: 8, color: 'var(--red)', fontFamily: 'Outfit' }}>Account Actions</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            Log out of your current session on this device.
          </p>
          <button 
            onClick={handleLogout} 
            className="btn" 
            style={{ 
              background: 'rgba(255, 59, 48, 0.1)', 
              color: 'var(--red)',
              borderColor: 'rgba(255, 59, 48, 0.2)'
            }}
          >
            <LogOut size={16} /> Log Out
          </button>
        </motion.div>
      </div>
    </div>
  )
}
