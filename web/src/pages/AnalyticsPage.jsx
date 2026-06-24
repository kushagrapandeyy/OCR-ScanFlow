import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, ScanLine, CheckCircle2, TrendingUp, TrendingDown,
  AlertCircle, Zap, Target, Calendar,
} from 'lucide-react'
import { useAppStore } from '../store'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
}

const LEVEL_CONFIG = {
  casual:   { color: 'var(--casual)',   bg: 'var(--blue-dim)',   label: 'Casual' },
  decided:  { color: 'var(--decided)',  bg: 'var(--green-dim)',  label: 'Decided' },
  followup: { color: 'var(--followup)', bg: 'var(--orange-dim)', label: 'Follow Up' },
  other:    { color: 'var(--other)',    bg: 'var(--purple-dim)', label: 'Other' },
}

function KpiCard({ label, value, icon: Icon, iconColor, iconBg, trend, delay }) {
  return (
    <motion.div
      className="analytics-kpi-card"
      variants={fadeUp}
      custom={delay}
      initial="hidden"
      animate="show"
      whileHover={{ y: -2 }}
    >
      <div className="analytics-kpi-top">
        <div className="analytics-kpi-icon" style={{ background: iconBg, color: iconColor }}>
          <Icon size={18} />
        </div>
        {trend !== undefined && (
          <div className={`analytics-kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="analytics-kpi-value">{value}</div>
      <div className="analytics-kpi-label">{label}</div>
    </motion.div>
  )
}

export default function AnalyticsPage() {
  const fetchAnalytics = useAppStore((s) => s.fetchAnalytics)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const result = await fetchAnalytics()
        if (mounted) { setData(result); setLoading(false) }
      } catch (err) {
        if (mounted) { setError(err.message); setLoading(false) }
      }
    }
    load()
    return () => { mounted = false }
  }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="analytics-loading">
          <div className="analytics-skeleton-header" />
          <div className="analytics-skeleton-kpis">
            {[0,1,2,3].map(i => <div key={i} className="skeleton analytics-skeleton-card" />)}
          </div>
          <div className="skeleton analytics-skeleton-chart" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <div className="empty-icon"><AlertCircle size={28} /></div>
          <div className="empty-title">Failed to load analytics</div>
          <div className="empty-subtitle">{error}</div>
        </div>
      </div>
    )
  }

  const totalInteractions = Object.values(data.interactionBreakdown || {}).reduce((a, b) => a + b, 0) || 1
  const successRate = data.totalScans > 0
    ? Math.round((data.successfulExtractions / data.totalScans) * 100)
    : 0

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">Usage overview and extraction quality metrics</p>
          </div>
          <div className="analytics-period-badge">
            <Calendar size={13} />
            All time
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="analytics-kpi-grid">
        <KpiCard
          label="Total Scans"
          value={data.totalScans ?? 0}
          icon={ScanLine}
          iconColor="var(--accent)"
          iconBg="var(--accent-glow)"
          delay={0}
        />
        <KpiCard
          label="This Month"
          value={data.scansThisMonth ?? 0}
          icon={TrendingUp}
          iconColor="var(--blue)"
          iconBg="var(--blue-dim)"
          delay={1}
        />
        <KpiCard
          label="Successful Extractions"
          value={data.successfulExtractions ?? 0}
          icon={CheckCircle2}
          iconColor="var(--green)"
          iconBg="var(--green-dim)"
          delay={2}
        />
        <KpiCard
          label="Avg Confidence"
          value={`${data.avgConfidence ?? 0}%`}
          icon={Target}
          iconColor={data.avgConfidence >= 85 ? 'var(--green)' : 'var(--orange)'}
          iconBg={data.avgConfidence >= 85 ? 'var(--green-dim)' : 'var(--orange-dim)'}
          delay={3}
        />
      </div>

      {/* Two-column bottom section */}
      <div className="analytics-bottom-grid">

        {/* Interaction Breakdown */}
        <motion.div
          className="analytics-panel"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={4}
        >
          <div className="analytics-panel-header">
            <div className="analytics-panel-title">
              <Activity size={16} style={{ color: 'var(--accent)' }} />
              Interaction Levels
            </div>
            <span className="analytics-panel-subtitle">{data.totalScans} total</span>
          </div>

          {Object.keys(data.interactionBreakdown || {}).length === 0 ? (
            <div className="analytics-empty-panel">
              <Zap size={20} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No interaction data yet.<br/>Start scanning cards!</p>
            </div>
          ) : (
            <div className="analytics-breakdown-list">
              {Object.entries(data.interactionBreakdown).map(([level, count], idx) => {
                const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.other
                const pct = Math.round((count / totalInteractions) * 100)
                return (
                  <div key={level} className="analytics-breakdown-row">
                    <div className="analytics-breakdown-meta">
                      <span className="analytics-breakdown-dot" style={{ background: cfg.color }} />
                      <span className="analytics-breakdown-label">{cfg.label}</span>
                      <span className="analytics-breakdown-count">{count}</span>
                      <span className="analytics-breakdown-pct">{pct}%</span>
                    </div>
                    <div className="analytics-bar-track">
                      <motion.div
                        className="analytics-bar-fill"
                        style={{ background: cfg.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.5 + idx * 0.08, duration: 0.7, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Success Rate panel */}
        <motion.div
          className="analytics-panel"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={5}
        >
          <div className="analytics-panel-header">
            <div className="analytics-panel-title">
              <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
              Extraction Quality
            </div>
          </div>

          <div className="analytics-quality-ring-wrap">
            <svg viewBox="0 0 120 120" className="analytics-ring-svg">
              <circle cx="60" cy="60" r="48" fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
              <motion.circle
                cx="60" cy="60" r="48"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 48}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 48 * (1 - successRate / 100) }}
                transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="analytics-ring-label">
              <span className="analytics-ring-value">{successRate}%</span>
              <span className="analytics-ring-sub">success rate</span>
            </div>
          </div>

          <div className="analytics-quality-stats">
            <div className="analytics-quality-stat">
              <span className="analytics-quality-stat-value" style={{ color: 'var(--green)' }}>
                {data.successfulExtractions}
              </span>
              <span className="analytics-quality-stat-label">Successful</span>
            </div>
            <div className="analytics-quality-divider" />
            <div className="analytics-quality-stat">
              <span className="analytics-quality-stat-value" style={{ color: 'var(--red)' }}>
                {(data.totalScans ?? 0) - (data.successfulExtractions ?? 0)}
              </span>
              <span className="analytics-quality-stat-label">Failed / Pending</span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
