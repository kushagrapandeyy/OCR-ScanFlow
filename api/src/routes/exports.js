import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { uploadToSFTP } from '../services/sftpService.js'

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

export default router
