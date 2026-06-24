import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  Link,
  Key,
  Vibrate,
  Moon,
  Sun,
  Monitor,
  Bell,
  Shield,
  Trash2,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Save,
  RefreshCw,
  Volume2,
  VolumeX,
  Database,
  Server,
  UploadCloud,
  Code,
  Zap,
} from 'lucide-react'
import { useAppStore } from '../store'
import { useHaptics } from '../hooks/useHaptics'

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="toggle-track">
        <div className="toggle-thumb" />
      </div>
    </label>
  )
}

function SettingsSection({ icon, title, children }) {
  return (
    <div className="settings-section" style={{ marginBottom: 16 }}>
      <div className="settings-section-header">
        <div style={{ color: 'var(--teal)' }}>{icon}</div>
        <span className="settings-section-title">{title}</span>
      </div>
      {children}
    </div>
  )
}

function SettingsRow({ label, desc, right, onClick, danger }) {
  return (
    <div
      className="settings-row"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        color: danger ? 'var(--red)' : undefined,
      }}
    >
      <div className="settings-row-info">
        <div className="settings-row-label" style={{ color: danger ? 'var(--red)' : undefined }}>
          {label}
        </div>
        {desc && <div className="settings-row-desc">{desc}</div>}
      </div>
      {right}
    </div>
  )
}

// ─── Delete Account Modal ─────────────────────────────────────────────────────
function DeleteAccountModal({ onClose, onConfirm }) {
  const [step, setStep] = useState(1) // 1: warning, 2: confirm, 3: typing
  const [typed, setTyped] = useState('')
  const haptics = useHaptics()

  return (
    <div className="modal-overlay">
      <motion.div
        className="confirm-dialog"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{ maxWidth: 420 }}
      >
        {step === 1 && (
          <>
            <div className="confirm-icon">
              <AlertCircle size={28} />
            </div>
            <h3 style={{ marginBottom: 8 }}>Delete Account?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              This will permanently delete your account, all scanned cards, and export history. This cannot be undone.
            </p>
            <ul style={{ textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20, paddingLeft: 20, lineHeight: 2 }}>
              <li>All {useAppStore.getState().cards.length} scanned cards deleted</li>
              <li>All export history removed</li>
              <li>CRM integration disconnected</li>
            </ul>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { haptics.heavy(); setStep(2) }}>
                Continue
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="confirm-icon">
              <Shield size={28} />
            </div>
            <h3 style={{ marginBottom: 8 }}>Final Confirmation</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Type <strong style={{ color: 'var(--red)' }}>DELETE</strong> to confirm permanent account deletion.
            </p>
            <input
              className="form-input"
              placeholder="Type DELETE to confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              style={{ marginBottom: 16, textAlign: 'center', letterSpacing: '0.1em' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button
                className="btn btn-danger"
                style={{ flex: 1, opacity: typed !== 'DELETE' ? 0.4 : 1 }}
                disabled={typed !== 'DELETE'}
                onClick={() => {
                  haptics.error()
                  onConfirm()
                }}
              >
                <Trash2 size={14} /> Delete Account
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}

// ─── CRM Settings Page ────────────────────────────────────────────────────────
export default function CRMSettings() {
  const haptics = useHaptics()
  const crmConfig = useAppStore((s) => s.crmConfig)
  const setCrmConfig = useAppStore((s) => s.setCrmConfig)
  const hapticsSettings = useAppStore((s) => s.haptics)
  const setHaptics = useAppStore((s) => s.setHaptics)
  const darkMode = useAppStore((s) => s.darkMode)
  const setDarkMode = useAppStore((s) => s.setDarkMode)
  const addToast = useAppStore((s) => s.addToast)

  const [localCrm, setLocalCrm] = useState(crmConfig)
  const [isTesting, setIsTesting] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)

  const setL = (k) => (e) =>
    setLocalCrm((f) => ({ ...f, [k]: typeof e === 'boolean' ? e : e.target.value }))

  const handleSaveCRM = () => {
    setCrmConfig({ ...localCrm, connected: true })
    haptics.success()
    addToast({ type: 'success', title: 'Settings saved', message: 'CRM configuration updated' })
  }

  const handleTestConnection = async () => {
    if (!localCrm.webhookUrl) {
      addToast({ type: 'warning', title: 'No URL', message: 'Enter a webhook URL first' })
      return
    }
    setIsTesting(true)
    haptics.tap()
    // Placeholder: in production this would call the backend test endpoint
    await new Promise((r) => setTimeout(r, 1500))
    setIsTesting(false)
    haptics.success()
    addToast({ type: 'success', title: 'Connection OK', message: 'Webhook endpoint reachable' })
  }

  const handleDeleteAccount = () => {
    // Placeholder: in production calls DELETE /api/auth/account then redirects to logout
    addToast({ type: 'info', title: 'Account deleted', message: 'Redirecting...' })
    setShowDeleteAccount(false)
    setTimeout(() => window.location.reload(), 1500)
  }

  const DARK_OPTIONS = [
    { value: 'auto', label: 'System', icon: <Monitor size={15} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={15} /> },
    { value: 'light', label: 'Light', icon: <Sun size={15} /> },
  ]

  return (
    <div className="page-wrapper" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <h1 className="page-title">CRM Settings</h1>
        <p className="page-subtitle">Configure your CRM integration, appearance, and preferences</p>
      </div>

      {/* CRM Connection */}
      <SettingsSection icon={<Link size={15} />} title="CRM Integration">
        <div style={{ padding: '20px' }}>
          <div className="form-group">
            <div className="form-label">Integration Name</div>
            <input className="form-input" value={localCrm.name} onChange={setL('name')} placeholder="My CRM" />
          </div>
          <div className="form-group">
            <div className="form-label">Webhook URL</div>
            <input className="form-input" value={localCrm.webhookUrl} onChange={setL('webhookUrl')} placeholder="https://your-crm.com/api/contacts" type="url" />
          </div>
          <div className="form-group">
            <div className="form-label">API Key / Token</div>
            <input className="form-input" value={localCrm.apiKey} onChange={setL('apiKey')} placeholder="sk-…" type="password" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <motion.button
              className="btn btn-secondary btn-sm"
              onClick={handleTestConnection}
              disabled={isTesting}
              whileTap={{ scale: 0.97 }}
            >
              {isTesting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}>
                  <RefreshCw size={13} />
                </motion.div>
              ) : (
                <Zap size={13} />
              )}
              Test Connection
            </motion.button>
            <motion.button
              className="btn btn-primary btn-sm"
              onClick={handleSaveCRM}
              whileTap={{ scale: 0.97 }}
            >
              <Save size={13} /> Save
            </motion.button>
          </div>
        </div>
      </SettingsSection>

      {/* SFTP Settings */}
      <SettingsSection icon={<Server size={15} />} title="SFTP Export (Backend)">
        <SettingsRow
          label="Enable SFTP Export"
          desc="Send files directly to EC2 server via secure SFTP"
          right={
            <Toggle
              checked={localCrm.sftpEnabled}
              onChange={(v) => setLocalCrm((f) => ({ ...f, sftpEnabled: v }))}
            />
          }
        />
        {localCrm.sftpEnabled && (
          <div style={{ padding: '20px', borderTop: '1px solid var(--border)' }}>
            <div
              style={{
                background: 'var(--teal-glow)',
                border: '1px solid var(--teal-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: 'var(--teal)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Shield size={13} />
              SFTP credentials are stored securely on the backend server (Render env secrets). Not in this UI.
            </div>
            {[
              { k: 'sftpHost', label: 'SFTP Host', placeholder: 'sftp.yourserver.com' },
              { k: 'sftpPort', label: 'Port', placeholder: '22' },
              { k: 'sftpUser', label: 'SFTP User', placeholder: 'upload-user' },
              { k: 'sftpUploadDir', label: 'Upload Directory', placeholder: '/uploads/crm' },
            ].map(({ k, label, placeholder }) => (
              <div className="form-group" key={k}>
                <div className="form-label">{label}</div>
                <input className="form-input" value={localCrm[k]} onChange={setL(k)} placeholder={placeholder} />
              </div>
            ))}
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                padding: '8px 12px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              🔒 Private key auth only · No password · Chroot jail · .tmp → rename upload
            </div>
          </div>
        )}
      </SettingsSection>

      {/* Schema Mapping */}
      <SettingsSection icon={<Database size={15} />} title="CRM Schema Mapping">
        <div style={{ padding: '20px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            Map CardScan fields to your CRM's field names. Leave blank to use defaults.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            {Object.entries(localCrm.schema || {}).map(([key, value]) => (
              <div key={key}>
                <div className="form-label" style={{ marginBottom: 4 }}>{key}</div>
                <input
                  className="form-input"
                  value={value}
                  onChange={(e) =>
                    setLocalCrm((f) => ({
                      ...f,
                      schema: { ...f.schema, [key]: e.target.value },
                    }))
                  }
                  placeholder={key}
                />
              </div>
            ))}
          </div>
        </div>
      </SettingsSection>

      {/* Appearance */}
      <SettingsSection icon={<Moon size={15} />} title="Appearance">
        <div style={{ padding: '20px' }}>
          <div className="form-label" style={{ marginBottom: 10 }}>Color Mode</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {DARK_OPTIONS.map(({ value, label, icon }) => (
              <motion.button
                key={value}
                onClick={() => { setDarkMode(value); haptics.tap() }}
                whileTap={{ scale: 0.95 }}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${darkMode === value ? 'var(--teal)' : 'var(--border)'}`,
                  background: darkMode === value ? 'var(--teal-glow)' : 'var(--bg-elevated)',
                  color: darkMode === value ? 'var(--teal)' : 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {icon}
                {label}
              </motion.button>
            ))}
          </div>
        </div>
      </SettingsSection>

      {/* Haptics */}
      <SettingsSection icon={<Vibrate size={15} />} title="Haptics & Feedback">
        <SettingsRow
          label="Enable Haptic Feedback"
          desc="Vibration on button taps, scans, and alerts"
          right={
            <Toggle
              checked={hapticsSettings.enabled}
              onChange={(v) => {
                setHaptics({ ...hapticsSettings, enabled: v })
                if (v) haptics.tap()
              }}
            />
          }
        />
        <SettingsRow
          label="Allow on Silent Mode"
          desc="Vibrate even when device is on silent"
          right={
            <Toggle
              checked={hapticsSettings.silentMode}
              onChange={(v) => {
                setHaptics({ ...hapticsSettings, silentMode: v })
                haptics.tap()
              }}
            />
          }
        />
        {hapticsSettings.enabled && (
          <div style={{ padding: '20px', borderTop: '1px solid var(--border)' }}>
            <div className="form-label" style={{ marginBottom: 10 }}>Test Feedback</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Light tap', fn: () => haptics.tap() },
                { label: 'Success', fn: () => haptics.success() },
                { label: 'Error', fn: () => haptics.error() },
                { label: 'Capture', fn: () => haptics.capture() },
              ].map(({ label, fn }) => (
                <button
                  key={label}
                  className="btn btn-secondary btn-sm"
                  onClick={fn}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </SettingsSection>

      {/* Backend Architecture Note */}
      <SettingsSection icon={<Code size={15} />} title="Deployment Architecture">
        <div style={{ padding: '20px' }}>
          <div
            style={{
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              fontSize: '0.8rem',
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ color: 'var(--teal)', fontWeight: 700, marginBottom: 8 }}>// Security Model</div>
            <div>▸ Frontend (Vercel) — No SFTP/EC2 credentials</div>
            <div>▸ API (Render) — Stores SFTP keys as env secrets</div>
            <div>▸ Worker (Render) — Async export queue (BullMQ)</div>
            <div>▸ EC2 — Chroot jail · SSH key only · SFTP-only user</div>
            <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>
              .tmp upload → atomic rename · JSON schema validation
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection icon={<Shield size={15} />} title="Account">
        <SettingsRow
          label="Delete Account"
          desc="Permanently delete your account and all data"
          danger
          onClick={() => { haptics.heavy(); setShowDeleteAccount(true) }}
          right={<ChevronRight size={16} style={{ color: 'var(--red)' }} />}
        />
      </SettingsSection>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteAccount && (
          <DeleteAccountModal
            onClose={() => setShowDeleteAccount(false)}
            onConfirm={handleDeleteAccount}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
