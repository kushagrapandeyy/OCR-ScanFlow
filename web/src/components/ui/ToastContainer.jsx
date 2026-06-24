import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../store'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ICONS = {
  success: <CheckCircle size={18} style={{ color: 'var(--green)' }} />,
  error: <XCircle size={18} style={{ color: 'var(--red)' }} />,
  warning: <AlertTriangle size={18} style={{ color: 'var(--orange)' }} />,
  info: <Info size={18} style={{ color: 'var(--teal)' }} />,
}

export default function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts)
  const removeToast = useAppStore((s) => s.removeToast)

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`toast toast-${toast.type || 'info'}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <span className="toast-icon">{ICONS[toast.type] || ICONS.info}</span>
            <div className="toast-content">
              {toast.title && <div className="toast-title">{toast.title}</div>}
              {toast.message && <div className="toast-msg">{toast.message}</div>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
