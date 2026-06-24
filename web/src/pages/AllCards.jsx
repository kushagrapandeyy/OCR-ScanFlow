import React, { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ScanLine,
  Trash2,
  FileOutput,
  Archive,
  Check,
  X,
  Building2,
  Mail,
  Phone,
  ChevronRight,
  Filter,
  RefreshCw,
  CheckSquare,
  Square,
} from 'lucide-react'
import { useAppStore } from '../store'
import { useHaptics } from '../hooks/useHaptics'
import { formatDistanceToNow } from 'date-fns'
import { usePullRefresh } from '../hooks/usePullRefresh'
import CardDetailModal from '../components/CardDetailModal'

const LEVEL_BADGES = {
  casual: { badge: 'badge-casual', label: 'Casual Talk' },
  decided: { badge: 'badge-decided', label: 'Decided' },
  followup: { badge: 'badge-followup', label: 'Follow Up' },
  other: { badge: 'badge-other', label: 'Other' },
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'casual', label: 'Casual' },
  { key: 'decided', label: 'Decided' },
  { key: 'followup', label: 'Follow Up' },
  { key: 'exported', label: 'Exported' },
  { key: 'archived', label: 'Archived' },
]

// Delete confirmation dialog
function DeleteConfirm({ count, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <motion.div
        className="confirm-dialog"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="confirm-icon">
          <Trash2 size={28} />
        </div>
        <h3 style={{ marginBottom: 8 }}>Delete {count} Card{count !== 1 ? 's' : ''}?</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          This action cannot be undone. The selected cards will be permanently removed.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AllCards() {
  const navigate = useNavigate()
  const haptics = useHaptics()

  const cards = useAppStore((s) => s.scans)
  const deleteScans = useAppStore((s) => s.deleteScans)
  const archiveScans = useAppStore((s) => s.archiveScans)
  const markExported = useAppStore((s) => s.markExported)
  const addToast = useAppStore((s) => s.addToast)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState([])
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [multiSelect, setMultiSelect] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    haptics.tap()
    setTimeout(() => {
      setIsRefreshing(false)
      addToast({ type: 'success', title: 'Refreshed', message: 'Cards list updated' })
    }, 1200)
  }

  const { pulling, onTouchStart, onTouchMove, onTouchEnd } = usePullRefresh(handleRefresh)

  const filtered = useMemo(() => {
    let result = [...cards].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )

    if (filter !== 'all') {
      if (filter === 'exported') result = result.filter((c) => c.exported_at)
      else if (filter === 'archived') result = result.filter((c) => c.archived)
      else result = result.filter((c) => c.interaction_level === filter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q)
      )
    }

    return result
  }, [cards, filter, search])

  const toggleSelect = (id) => {
    haptics.tap()
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleDeleteSelected = () => {
    deleteScans(selected)
    setSelected([])
    setMultiSelect(false)
    setShowDeleteConfirm(false)
    haptics.success()
    addToast({ type: 'success', title: 'Deleted', message: `${selected.length} card(s) removed` })
  }

  const handleArchiveSelected = () => {
    archiveScans(selected)
    setSelected([])
    setMultiSelect(false)
    haptics.success()
    addToast({ type: 'info', title: 'Archived', message: `${selected.length} card(s) archived` })
  }

  const handleExportSelected = () => {
    const selectedIds = [...selected]
    setSelected([])
    setMultiSelect(false)
    haptics.success()
    navigate('/export', { state: { preSelectedIds: selectedIds } })
  }

  const selectAll = () => {
    if (selected.length === filtered.length) {
      setSelected([])
    } else {
      setSelected(filtered.map((c) => c.id))
    }
    haptics.tap()
  }

  return (
    <div
      className="page-wrapper"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {(pulling || isRefreshing) && (
          <motion.div
            className="ptr-indicator"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : {}}
              transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
            >
              <RefreshCw size={16} style={{ color: 'var(--teal)' }} />
            </motion.div>
            {isRefreshing ? 'Refreshing…' : 'Release to refresh'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">All Cards</h1>
            <p className="page-subtitle">{cards.length} contacts in your library</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button
              className={`btn btn-secondary btn-sm ${multiSelect ? 'active' : ''}`}
              onClick={() => {
                haptics.tap()
                setMultiSelect((v) => !v)
                setSelected([])
              }}
              whileTap={{ scale: 0.97 }}
              style={multiSelect ? { borderColor: 'var(--teal)', color: 'var(--teal)' } : {}}
            >
              <CheckSquare size={14} />
              {multiSelect ? 'Cancel' : 'Select'}
            </motion.button>
            <motion.button
              className="btn btn-primary btn-sm"
              onClick={() => { haptics.tap(); navigate('/scan') }}
              whileTap={{ scale: 0.97 }}
            >
              <ScanLine size={14} />
              Scan
            </motion.button>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ marginBottom: 16 }}>
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <Search size={15} className="search-icon" />
          <input
            placeholder="Search by name, company, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filters-row">
          {multiSelect && (
            <button
              className="filter-chip"
              onClick={selectAll}
              style={{ borderColor: 'var(--teal)', color: 'var(--teal)' }}
            >
              {selected.length === filtered.length ? (
                <><CheckSquare size={12} style={{ marginRight: 4 }} /> Deselect All</>
              ) : (
                <><Square size={12} style={{ marginRight: 4 }} /> Select All</>
              )}
            </button>
          )}
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              className={`filter-chip ${filter === key ? 'active' : ''}`}
              onClick={() => { setFilter(key); haptics.tap() }}
            >
              {label}
              {key !== 'all' && (
                <span style={{ marginLeft: 4, opacity: 0.7 }}>
                  ({key === 'exported'
                    ? cards.filter((c) => c.exported_at).length
                    : key === 'archived'
                    ? cards.filter((c) => c.archived).length
                    : cards.filter((c) => c.interaction_level === key).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Search size={28} />
          </div>
          <div className="empty-title">No cards found</div>
          <p className="empty-subtitle">
            {search ? `No results for "${search}"` : 'No cards in this filter'}
          </p>
        </div>
      ) : (
        <motion.div layout>
          <AnimatePresence>
            {filtered.map((card) => {
              const level = LEVEL_BADGES[card.interaction_level] || LEVEL_BADGES.casual
              const isSelected = selected.includes(card.id)

              return (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <div
                    className={`contact-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (multiSelect) {
                        toggleSelect(card.id)
                      } else {
                        haptics.tap()
                        setSelectedCardId(card.id)
                      }
                    }}
                  >
                    {/* Select checkbox */}
                    {multiSelect && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: `2px solid ${isSelected ? 'var(--teal)' : 'var(--border-strong)'}`,
                          background: isSelected ? 'var(--teal)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && <Check size={13} color="#000" />}
                      </motion.div>
                    )}

                    {/* Thumbnail */}
                    <div className="contact-thumbnail" style={{ position: 'relative' }}>
                      {card.image_front ? (
                        <img src={card.image_front} alt="" style={{ transform: 'scaleX(-1)' }} />
                      ) : (
                        <div
                          style={{
                            width: '100%', height: '100%',
                            background: 'var(--bg-hover)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'Outfit', fontSize: '1.1rem',
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
                          <span className="badge badge-exported">
                            exported {formatDistanceToNow(new Date(card.exported_at), { addSuffix: true })}
                          </span>
                        )}
                        {card.archived && <span className="badge badge-archived">archived</span>}
                      </div>
                    </div>

                    {!multiSelect && (
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Multi-select action bar */}
      <AnimatePresence>
        {multiSelect && selected.length > 0 && (
          <motion.div
            className="multi-select-bar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <span className="multi-select-count">{selected.length} selected</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleExportSelected}
              style={{ color: 'var(--teal)' }}
            >
              <FileOutput size={14} /> Export
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleArchiveSelected}
              style={{ color: 'var(--text-secondary)' }}
            >
              <Archive size={14} /> Archive
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowDeleteConfirm(true)}
              style={{ color: 'var(--red)' }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="modal-overlay">
            <DeleteConfirm
              count={selected.length}
              onConfirm={handleDeleteSelected}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          </div>
        )}
      </AnimatePresence>

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
