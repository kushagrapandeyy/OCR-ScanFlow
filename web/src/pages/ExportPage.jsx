import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FileOutput,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  FileText,
  Webhook,
  UploadCloud,
  Check,
  CheckSquare,
  Square,
  Search,
  CheckCircle,
  Archive,
  CreditCard,
  Building2,
} from 'lucide-react'
import { useAppStore } from '../store'
import { useHaptics } from '../hooks/useHaptics'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

const FORMATS = [
  { id: 'json', label: 'JSON', desc: 'Webhook / API ready', icon: <FileJson size={24} />, color: 'var(--orange)', bg: 'var(--orange-dim)' },
  { id: 'csv', label: 'CSV', desc: 'Spreadsheet import', icon: <FileText size={24} />, color: 'var(--green)', bg: 'var(--green-dim)' },
  { id: 'xlsx', label: 'Excel', desc: 'Excel workbook', icon: <FileSpreadsheet size={24} />, color: 'var(--blue)', bg: 'var(--blue-dim)' },
  { id: 'sftp', label: 'EC2 Sync', desc: 'Push to EC2 server', icon: <Webhook size={24} />, color: 'var(--teal)', bg: 'var(--teal-glow)' },
]

function mapCardToCRM(c) {
  return {
    'Name': `${c.first_name || ''} ${c.last_name || ''}`.trim(),
    'Email': c.email || '',
    'Company': c.company || '',
    'Tags': (c.tags || []).join(', '),
    'Category': c.category || '',
    'Designation': c.title || c.designation || '',
    'Country': c.country || '',
    'Mobile Prefix': c.mobile_prefix || '',
    'Phone': c.phone || '',
    'Website': c.website || '',
    'LinkedIn': c.linkedin || '',
    'Address': c.address || '',
    'Notes': c.notes || '',
    'Interaction Level': c.interaction_level || '',
    'Event Name': c.event_name || '',
    'Scanned At': c.created_at || '',
    'Exported At': c.exported_at || '',
  }
}

function exportToJSON(cards) {
  const data = JSON.stringify(cards.map(mapCardToCRM), null, 2)
  downloadFile(data, 'cardscan-export.json', 'application/json')
}

function exportToCSV(cards) {
  const data = Papa.unparse(cards.map(mapCardToCRM))
  downloadFile(data, 'cardscan-export.csv', 'text/csv')
}

function exportToXLSX(cards) {
  const rows = cards.map(mapCardToCRM)
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'CRM Contacts')
  XLSX.writeFile(wb, 'cardscan-export.xlsx')
}

async function exportToEC2(cards) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const response = await fetch(`${apiUrl}/api/exports/sftp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    body: JSON.stringify({ cards: cards.map(mapCardToCRM), format: 'json' }),
  })
  if (!response.ok) throw new Error(`EC2 Sync failed: ${response.status}`)
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const haptics = useHaptics()
  
  const cards = useAppStore(s => s.scans)
  const markExported = useAppStore(s => s.markExported)
  const addToast = useAppStore(s => s.addToast)

  const [formatType, setFormatType] = useState('json')
  const [isExporting, setIsExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('new') // 'all', 'selected', 'new', 'exported', 'archived'
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Load preselected IDs from router state
  useEffect(() => {
    if (location.state?.preSelectedIds) {
      setSelectedIds(new Set(location.state.preSelectedIds))
      setActiveTab('selected')
    }
  }, [location.state])

  // Filter logic
  const filteredCards = useMemo(() => {
    let result = [...cards].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    
    if (activeTab === 'new') result = result.filter(c => !c.exported_at && !c.archived)
    else if (activeTab === 'selected') result = result.filter(c => selectedIds.has(c.id))
    else if (activeTab === 'exported') result = result.filter(c => c.exported_at)
    else if (activeTab === 'archived') result = result.filter(c => c.archived)
    
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q))
    }
    
    return result
  }, [cards, activeTab, search, selectedIds])

  const toggleSelect = (id) => {
    haptics.tap()
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    haptics.tap()
    if (selectedIds.size === filteredCards.length && filteredCards.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredCards.map(c => c.id)))
    }
  }

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      addToast({ type: 'warning', title: 'No cards selected', message: 'Please select cards from the table below.' })
      return
    }

    setIsExporting(true)
    haptics.heavy()
    
    const cardsToExport = cards.filter(c => selectedIds.has(c.id))

    try {
      if (formatType === 'json') exportToJSON(cardsToExport)
      else if (formatType === 'csv') exportToCSV(cardsToExport)
      else if (formatType === 'xlsx') exportToXLSX(cardsToExport)
      else if (formatType === 'sftp') await exportToEC2(cardsToExport)

      markExported(Array.from(selectedIds))
      haptics.success()
      addToast({ type: 'success', title: 'Export Complete!', message: `${cardsToExport.length} contacts exported.` })
      
      // Clear selection after successful export
      setSelectedIds(new Set())
      setActiveTab('exported')
    } catch (err) {
      haptics.error()
      addToast({ type: 'error', title: 'Export Failed', message: err.message })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>
      {/* Header Area (Sticky) */}
      <div style={{ padding: '24px 24px 16px', background: 'var(--bg-default)', zIndex: 10, borderBottom: '1px solid var(--border)' }}>
        <div className="page-header-row" style={{ marginBottom: 20 }}>
          <div>
            <h1 className="page-title">Export Contacts</h1>
            <p className="page-subtitle">Select format and choose cards from the table to export.</p>
          </div>
          <motion.button
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: '1rem' }}
            onClick={handleExport}
            disabled={isExporting || selectedIds.size === 0}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {isExporting ? <RefreshCw size={18} className="spin" /> : <UploadCloud size={18} />}
            Export {selectedIds.size} Selected
          </motion.button>
        </div>

        {/* Format Cards Row */}
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
          {FORMATS.map((f) => (
            <motion.div
              key={f.id}
              className={`export-format-card ${formatType === f.id ? 'selected' : ''}`}
              style={{ minWidth: 200, flex: 1, padding: 16 }}
              onClick={() => { setFormatType(f.id); haptics.tap() }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: f.bg, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {f.icon}
                </div>
                <div className="export-format-name" style={{ fontSize: '1.05rem' }}>{f.label}</div>
              </div>
              <div className="export-format-desc">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Interactive Table Area (Scrollable) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'var(--bg-elevated)' }}>
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          
          {/* Table Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'all', label: 'All Cards', icon: <CreditCard size={14}/> },
                { id: 'new', label: 'New / Pending', icon: <UploadCloud size={14}/> },
                { id: 'selected', label: `Selected (${selectedIds.size})`, icon: <CheckSquare size={14}/> },
                { id: 'exported', label: 'Exported', icon: <CheckCircle size={14}/> },
                { id: 'archived', label: 'Archived', icon: <Archive size={14}/> },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`btn btn-sm ${activeTab === tab.id ? 'btn-secondary active' : 'btn-ghost'}`}
                  onClick={() => { setActiveTab(tab.id); haptics.tap() }}
                  style={activeTab === tab.id ? { borderColor: 'var(--border-strong)', background: 'var(--bg-hover)' } : {}}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
            <div className="search-bar" style={{ width: 240 }}>
              <Search size={14} className="search-icon" />
              <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Table Body */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 5, boxShadow: '0 1px 0 var(--border)' }}>
                <tr>
                  <th style={{ padding: '12px 20px', width: 40 }}>
                    <div onClick={toggleSelectAll} style={{ cursor: 'pointer', color: selectedIds.size > 0 ? 'var(--teal)' : 'var(--text-muted)' }}>
                      {selectedIds.size === filteredCards.length && filteredCards.length > 0 ? <CheckSquare size={18}/> : <Square size={18}/>}
                    </div>
                  </th>
                  <th style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Company</th>
                  <th style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Contact Info</th>
                  <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No cards found in this view.
                    </td>
                  </tr>
                ) : (
                  filteredCards.map(card => {
                    const isSelected = selectedIds.has(card.id)
                    return (
                      <tr key={card.id} style={{ borderBottom: '1px solid var(--border)', background: isSelected ? 'var(--bg-hover)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <div onClick={() => toggleSelect(card.id)} style={{ cursor: 'pointer', color: isSelected ? 'var(--teal)' : 'var(--border-strong)' }}>
                            {isSelected ? <CheckSquare size={18} fill="var(--teal)" color="#000" /> : <Square size={18} />}
                          </div>
                        </td>
                        <td style={{ padding: '12px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--bg-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                              {card.first_name?.[0]}{card.last_name?.[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{card.first_name} {card.last_name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{card.title}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 0', fontSize: '0.875rem' }}>
                          {card.company && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Building2 size={12} color="var(--text-muted)"/> {card.company}</div>}
                        </td>
                        <td style={{ padding: '12px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {card.email && <div>{card.email}</div>}
                          {card.phone && <div>{card.phone}</div>}
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          {card.exported_at ? (
                            <span className="badge badge-exported" style={{ fontSize: '0.7rem' }}>Exported {format(new Date(card.exported_at), 'MMM d')}</span>
                          ) : card.archived ? (
                            <span className="badge badge-archived" style={{ fontSize: '0.7rem' }}>Archived</span>
                          ) : (
                            <span className="badge badge-casual" style={{ fontSize: '0.7rem', opacity: 0.6 }}>Pending</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
