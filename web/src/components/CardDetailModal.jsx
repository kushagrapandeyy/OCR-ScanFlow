import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Phone,
  Globe,
  Link,
  MapPin,
  Building2,
  Briefcase,
  ScanLine,
  FileOutput,
  Trash2,
  Edit3,
  Save,
  X,
  Calendar,
  Tag,
  CheckCircle,
  Clock,
  MessageSquare,
  Zap,
} from 'lucide-react'
import { useAppStore } from '../store'
import { useHaptics } from '../hooks/useHaptics'
import { format } from 'date-fns'

const INTERACTION_LEVELS = [
  { value: 'casual', label: '💬 Casual Talk', cls: 'selected-casual', badge: 'badge-casual' },
  { value: 'decided', label: '✅ Something Decided', cls: 'selected-decided', badge: 'badge-decided' },
  { value: 'followup', label: '🔔 Follow Up', cls: 'selected-followup', badge: 'badge-followup' },
  { value: 'other', label: '⭐ Other', cls: 'selected-other', badge: 'badge-other' },
]

export default function CardDetailModal({ cardId, onClose }) {
  const haptics = useHaptics()
  const cards = useAppStore((s) => s.scans)
  const updateScan = useAppStore((s) => s.updateScan)
  const deleteScan = useAppStore((s) => s.deleteScan)
  const markExported = useAppStore((s) => s.markExported)
  const addToast = useAppStore((s) => s.addToast)

  const card = cards.find((c) => c.id === cardId)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState(card || {})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeImage, setActiveImage] = useState('front')

  if (!card) return null

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = () => {
    updateScan(cardId, form)
    setIsEditing(false)
    haptics.success()
    addToast({ type: 'success', title: 'Saved!', message: 'Card updated successfully' })
    onClose()
  }

  const handleDelete = () => {
    deleteScan(cardId)
    haptics.error()
    addToast({ type: 'info', title: 'Deleted', message: `${card.first_name || ''} ${card.last_name || ''} removed` })
    onClose()
  }

  const handleExport = () => {
    markExported([cardId])
    haptics.success()
    addToast({ type: 'success', title: 'Exported', message: 'Card queued for CRM export' })
    onClose()
  }

  const currentLevel = INTERACTION_LEVELS.find((l) => l.value === card.interaction_level) || INTERACTION_LEVELS[0]

  const InfoRow = ({ icon, label, value, href }) => (
    value ? (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '10px 0',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
              {value}
            </a>
          ) : (
            <div style={{ color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>{value}</div>
          )}
        </div>
      </div>
    ) : null
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        style={{ 
          position: 'relative', 
          width: '100%', 
          maxWidth: 500, 
          maxHeight: '85vh', 
          backgroundColor: 'var(--surface-color)', 
          borderRadius: 24, 
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-color)' }}>
          <div style={{ fontWeight: 600, fontSize: 18 }}>{isEditing ? 'Edit Card' : 'Card Details'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ overflowY: 'auto', padding: '20px', flex: 1, backgroundColor: 'var(--bg-color)' }}>
          
          {/* Main Card View */}
          {!isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Image & Main Info */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {card.image_front ? (
                  <div style={{ width: 80, height: 80, borderRadius: 16, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)', backgroundColor: 'var(--surface-color)' }}>
                    <img src={card.image_front} alt="Card" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ScanLine size={32} color="var(--text-tertiary)" />
                  </div>
                )}
                
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: 24, color: 'var(--text-primary)' }}>
                    {card.first_name} {card.last_name}
                  </h2>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Briefcase size={14} /> {card.title || 'No Title'}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={14} /> {card.company || 'No Company'}
                  </div>
                </div>
              </div>

              {/* CRM Context Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px', backgroundColor: 'var(--surface-color)', borderRadius: 12, border: '1px solid var(--border)' }}>
                {card.interaction_level && (
                  <span className={`badge ${currentLevel.badge}`} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {currentLevel.label}
                  </span>
                )}
                {card.event_name && (
                  <span className="badge" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} /> {card.event_name}
                  </span>
                )}
                {card.category && (
                  <span className="badge" style={{ backgroundColor: 'var(--border)', color: 'var(--text-secondary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Tag size={12} /> {card.category}
                  </span>
                )}
              </div>

              {/* Contact Info */}
              <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: 16, padding: '0 16px', border: '1px solid var(--border)' }}>
                <InfoRow icon={<Mail size={16} />} label="Email" value={card.email} href={`mailto:${card.email}`} />
                <InfoRow icon={<Phone size={16} />} label="Phone" value={card.phone} href={`tel:${card.phone}`} />
                <InfoRow icon={<Globe size={16} />} label="Website" value={card.website} href={card.website?.startsWith('http') ? card.website : `https://${card.website}`} />
                <InfoRow icon={<Link size={16} />} label="LinkedIn" value={card.linkedin} href={card.linkedin} />
                <InfoRow icon={<MapPin size={16} />} label="Address" value={card.address} />
              </div>

              {/* Notes */}
              {card.notes && (
                <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: 16, padding: 16, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MessageSquare size={14} /> Additional Notes
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {card.notes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Editing View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <div className="form-label">First Name</div>
                  <input className="form-input" value={form.first_name || ''} onChange={set('first_name')} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <div className="form-label">Last Name</div>
                  <input className="form-input" value={form.last_name || ''} onChange={set('last_name')} />
                </div>
              </div>
              <div className="form-group">
                <div className="form-label">Title / Designation</div>
                <input className="form-input" value={form.title || ''} onChange={set('title')} />
              </div>
              <div className="form-group">
                <div className="form-label">Company</div>
                <input className="form-input" value={form.company || ''} onChange={set('company')} />
              </div>
              <div className="form-group">
                <div className="form-label">Email</div>
                <input className="form-input" type="email" value={form.email || ''} onChange={set('email')} />
              </div>
              <div className="form-group">
                <div className="form-label">Phone</div>
                <input className="form-input" type="tel" value={form.phone || ''} onChange={set('phone')} />
              </div>
              <div className="form-group">
                <div className="form-label">LinkedIn URL</div>
                <input className="form-input" type="url" value={form.linkedin || ''} onChange={set('linkedin')} />
              </div>
              <div className="form-group">
                <div className="form-label">Website</div>
                <input className="form-input" type="url" value={form.website || ''} onChange={set('website')} />
              </div>
              <div className="form-group">
                <div className="form-label">Address</div>
                <input className="form-input" value={form.address || ''} onChange={set('address')} />
              </div>

              {/* CRM Info Edit */}
              <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>CRM Context</div>
                <div className="form-group">
                  <div className="form-label">Interaction Level</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {INTERACTION_LEVELS.map(level => (
                      <div
                        key={level.value}
                        className={`interaction-card ${form.interaction_level === level.value ? level.cls : ''}`}
                        onClick={() => setForm(f => ({ ...f, interaction_level: level.value }))}
                        style={{ padding: '8px 12px', fontSize: 13 }}
                      >
                        {level.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <div className="form-label">Event/Source</div>
                    <input className="form-input" value={form.event_name || ''} onChange={set('event_name')} placeholder="e.g. CES 2024" />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <div className="form-label">Category</div>
                    <select className="form-input" value={form.category || ''} onChange={set('category')} style={{ padding: '10px 8px' }}>
                      <option value="">Select...</option>
                      {['Technology','Sales','Marketing','Finance','Real Estate','Education','Healthcare','Legal','Creative','Consulting','Other'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <div className="form-label">Notes</div>
                <textarea className="form-input" value={form.notes || ''} onChange={set('notes')} rows={3} />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface-color)', display: 'flex', gap: 10 }}>
          {isEditing ? (
            <>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
                <Save size={16} /> Save Changes
              </button>
            </>
          ) : (
            <>
              {showDeleteConfirm ? (
                <>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                  <button className="btn btn-danger" style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff' }} onClick={handleDelete}>
                    Confirm Delete
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                    <Edit3 size={16} /> Edit
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleExport} disabled={card.exported_at}>
                    <FileOutput size={16} /> {card.exported_at ? 'Exported' : 'Export to CRM'}
                  </button>
                  <button className="btn btn-secondary" style={{ color: '#ef4444', borderColor: 'transparent', background: 'rgba(239, 68, 68, 0.1)' }} onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
