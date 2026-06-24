import React, { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard,
  Flame,
  Bell,
  FileOutput,
  ScanLine,
  BarChart2,
  ArrowRight,
  Building2,
  Mail,
  Phone,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { useAppStore } from '../store'
import { useHaptics } from '../hooks/useHaptics'
import { usePullRefresh } from '../hooks/usePullRefresh'
import { formatDistanceToNow } from 'date-fns'
import CardDetailModal from '../components/CardDetailModal'

const LEVEL_COLORS = {
  casual: { badge: 'badge-casual', label: 'Casual Talk' },
  decided: { badge: 'badge-decided', label: 'Decided' },
  followup: { badge: 'badge-followup', label: 'Follow Up' },
  other: { badge: 'badge-other', label: 'Other' },
}

function StatCard({ label, value, icon, color, bgColor }) {
  return (
    <motion.div
      className="stat-card"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
      <div className="stat-icon" style={{ background: bgColor, color }}>
        {icon}
      </div>
    </motion.div>
  )
}

function ContactRow({ card, onClick }) {
  const level = LEVEL_COLORS[card.interaction_level] || LEVEL_COLORS.casual
  const timeAgo = formatDistanceToNow(new Date(card.created_at), { addSuffix: true })

  return (
    <motion.div
      className="contact-card"
      onClick={onClick}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Thumbnail */}
      <div className="contact-thumbnail" style={{ position: 'relative' }}>
        {card.image_front ? (
          <img src={card.image_front} alt={card.first_name} />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--bg-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '1.2rem',
              fontFamily: 'Outfit',
              fontWeight: 700,
            }}
          >
            {card.first_name?.[0]}{card.last_name?.[0]}
          </div>
        )}
        {card.exported_at && (
          <div className="exported-overlay">
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4.5 7.5L8.5 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="contact-info">
        <div className="contact-name">
          {card.first_name} {card.last_name}
        </div>
        <div className="contact-title">{card.title}</div>
        <div className="contact-meta">
          {card.company && (
            <span className="contact-meta-item">
              <Building2 size={11} /> {card.company}
            </span>
          )}
          {card.email && (
            <span className="contact-meta-item">
              <Mail size={11} /> {card.email}
            </span>
          )}
          {card.phone && (
            <span className="contact-meta-item">
              <Phone size={11} /> {card.phone}
            </span>
          )}
        </div>
        <div className="contact-badges">
          <span className={`badge ${level.badge}`}>{level.label}</span>
          {card.tags?.includes('enriched') && (
            <span className="badge badge-enriched">enriched</span>
          )}
          {card.exported_at && (
            <span className="badge badge-exported">exported</span>
          )}
        </div>
      </div>

      <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </motion.div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const haptics = useHaptics()
  const user = useAppStore((s) => s.user)
  const [selectedCardId, setSelectedCardId] = useState(null)
  const cards = useAppStore((s) => s.scans)
  const exports = useAppStore((s) => s.exports)
  const crmConfig = useAppStore((s) => s.crmConfig)

  const stats = useMemo(() => {
    const total = cards.length
    const hotLeads = cards.filter(
      (c) => c.interaction_level === 'followup' || c.tags?.includes('hot-lead')
    ).length
    const followUps = cards.filter((c) => c.interaction_level === 'followup').length
    const totalExports = exports.length
    return { total, hotLeads, followUps, totalExports }
  }, [cards, exports])

  const recentCards = useMemo(
    () =>
      [...cards]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5),
    [cards]
  )

  const handleStartScanning = () => {
    haptics.tap()
    navigate('/scan')
  }

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
  }

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Business card scanner & CRM bridge</p>
          </div>
          <motion.button
            className="btn btn-primary"
            onClick={handleStartScanning}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <ScanLine size={16} />
            Start Scanning
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <motion.div
        className="stats-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            label="Total Cards"
            value={stats.total}
            icon={<CreditCard size={20} />}
            color="var(--teal)"
            bgColor="var(--teal-glow)"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            label="Hot Leads"
            value={stats.hotLeads}
            icon={<Flame size={20} />}
            color="var(--red)"
            bgColor="var(--red-dim)"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            label="Follow Ups"
            value={stats.followUps}
            icon={<Bell size={20} />}
            color="var(--orange)"
            bgColor="var(--orange-dim)"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            label="Exports"
            value={stats.totalExports}
            icon={<FileOutput size={20} />}
            color="var(--blue)"
            bgColor="var(--blue-dim)"
          />
        </motion.div>
      </motion.div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Recent Scans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="section-header">
            <h3 className="section-title">Recent Scans</h3>
            <Link to="/cards" className="view-all-link">
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {recentCards.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <CreditCard size={32} />
              </div>
              <div className="empty-title">No cards yet</div>
              <p className="empty-subtitle">Start scanning to add your first contact</p>
              <motion.button
                className="btn btn-primary"
                onClick={handleStartScanning}
                whileTap={{ scale: 0.97 }}
                style={{ marginTop: 8 }}
              >
                <ScanLine size={15} />
                Start Scanning
              </motion.button>
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show">
              {recentCards.map((card) => (
                <motion.div key={card.id} variants={itemVariants}>
                  <ContactRow
                    card={card}
                    onClick={() => {
                      haptics.tap()
                      setSelectedCardId(card.id)
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Right Column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Quick Actions */}
          <div className="quick-actions">
            <div className="quick-actions-title">Quick Actions</div>
            <button
              className="quick-action-item"
              onClick={handleStartScanning}
            >
              <ScanLine size={16} className="qa-icon" />
              Scan Business Cards
            </button>
            <button
              className="quick-action-item"
              onClick={() => { haptics.tap(); navigate('/export') }}
            >
              <FileOutput size={16} className="qa-icon" />
              Export to CRM
            </button>
            <button
              className="quick-action-item"
              onClick={() => { haptics.tap(); navigate('/settings') }}
            >
              <BarChart2 size={16} className="qa-icon" />
              CRM Settings
            </button>
          </div>

          {/* CRM Status Card */}
          <div className="card">
            <div className="card-body">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: 'var(--teal-glow)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--teal)',
                  }}
                >
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                    CRM Integration
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {crmConfig.connected ? 'Connected' : 'Not configured'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                {crmConfig.connected
                  ? `Syncing to ${crmConfig.name}`
                  : 'Configure your CRM connection in settings to start exporting cards automatically.'}
              </div>
              <button
                className="btn btn-secondary btn-sm w-full"
                onClick={() => { haptics.tap(); navigate('/settings') }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {crmConfig.connected ? 'Configure' : 'Set Up CRM'}{' '}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Activity summary */}
          <div className="card">
            <div className="card-body">
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 12,
                }}
              >
                This Week
              </div>
              {[
                { label: 'Cards scanned', value: cards.length, color: 'var(--teal)' },
                { label: 'Follow ups set', value: stats.followUps, color: 'var(--orange)' },
                { label: 'Exported', value: cards.filter((c) => c.exported_at).length, color: 'var(--green)' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.875rem',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      <AnimatePresence>
        {selectedCardId && (
          <CardDetailModal 
            cardId={selectedCardId} 
            onClose={() => setSelectedCardId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}
