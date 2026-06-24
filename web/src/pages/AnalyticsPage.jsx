import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, BarChart3, ScanLine, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react'
import { useAppStore } from '../store'

export default function AnalyticsPage() {
  const fetchAnalytics = useAppStore((s) => s.fetchAnalytics)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      try {
        const result = await fetchAnalytics()
        if (mounted) {
          setData(result)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err.message)
          setLoading(false)
        }
      }
    }
    loadData()
    return () => { mounted = false }
  }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="loader" style={{ width: 40, height: 40, borderTopColor: 'var(--teal)' }}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <AlertCircle size={32} color="var(--red)" />
          <h3 style={{ marginTop: 16 }}>Failed to load analytics</h3>
          <p className="empty-subtitle">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Track your OCR usage and extraction quality</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 30 }}>
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
            <ScanLine size={18} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Total Scans</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text)' }}>
            {data.totalScans}
          </div>
        </motion.div>

        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
            <TrendingUp size={18} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Scans This Month</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--teal)' }}>
            {data.scansThisMonth}
          </div>
        </motion.div>

        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Successful Extractions</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text)' }}>
            {data.successfulExtractions}
          </div>
        </motion.div>

        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
            <Activity size={18} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Avg Confidence</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'Outfit', color: data.avgConfidence > 85 ? 'var(--teal)' : 'var(--text)' }}>
            {data.avgConfidence}%
          </div>
        </motion.div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontFamily: 'Outfit', marginBottom: 16 }}>Interaction Levels</h2>
      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {Object.keys(data.interactionBreakdown).length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data available yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.entries(data.interactionBreakdown).map(([level, count], idx) => {
              const total = data.totalScans || 1
              const percentage = Math.round((count / total) * 100)
              return (
                <div key={level}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.875rem' }}>
                    <span style={{ textTransform: 'capitalize' }}>{level.replace('_', ' ')}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count} ({percentage}%)</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.5 + (idx * 0.1), duration: 0.8, ease: "easeOut" }}
                      style={{ height: '100%', background: 'var(--teal)', borderRadius: 3 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
