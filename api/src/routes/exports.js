import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { uploadToSFTP } from '../services/sftpService.js'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const router = express.Router()

/**
 * POST /api/exports/sftp
 * Securely pushes the provided cards to the EC2 CRM via SFTP.
 * 
 * Body: { cards: object[], format: 'json' }
 */
router.post('/sftp', requireAuth, async (req, res, next) => {
  try {
    const { cards, format = 'json' } = req.body

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'No cards provided for export' })
    }

    if (format !== 'json') {
      return res.status(400).json({ error: 'Currently only JSON export is supported for EC2 sync' })
    }

    // Format the file
    const fileContent = JSON.stringify({
      source: 'cardscan',
      exported_at: new Date().toISOString(),
      user_id: req.user.id,
      contacts: cards
    }, null, 2)

    const filename = `crm-sync-${Date.now()}`

    // Upload to EC2 SFTP
    const { remotePath, size } = await uploadToSFTP(fileContent, filename, 'json')

    res.status(200).json({
      success: true,
      message: 'Successfully synced with EC2 CRM portal',
      remotePath,
      size,
      count: cards.length
    })
  } catch (err) {
    console.error('[Export] SFTP Sync Error:', err.message)
    res.status(500).json({ error: 'Failed to sync with EC2 CRM', details: err.message })
  }
})

})

/**
 * POST /api/exports/generate
 * Formats cards into JSON, CSV, or XLSX and returns the file buffer.
 * 
 * Body: { cards: object[], format: 'json' | 'csv' | 'xlsx' }
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { cards, format = 'json' } = req.body

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'No cards provided' })
    }

    if (format === 'json') {
      const data = JSON.stringify(cards, null, 2)
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', 'attachment; filename=cardscan-export.json')
      return res.send(data)
    }

    if (format === 'csv') {
      const data = Papa.unparse(cards)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=cardscan-export.csv')
      return res.send(data)
    }

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(cards)
      ws['!cols'] = Object.keys(cards[0] || {}).map(() => ({ wch: 20 }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'CRM Contacts')
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename=cardscan-export.xlsx')
      return res.send(buffer)
    }

    return res.status(400).json({ error: 'Unsupported format' })
  } catch (err) {
    console.error('[Export] Generation Error:', err.message)
    res.status(500).json({ error: 'Failed to generate export file', details: err.message })
  }
})

export default router
