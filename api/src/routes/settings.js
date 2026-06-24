import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { db } from '../db/index.js'

const router = express.Router()

/**
 * GET /api/settings/crm
 * Fetch user's CRM settings and SFTP keys
 */
router.get('/crm', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM crm_configs WHERE user_id = $1', [req.user.id])
    if (!result.rows[0]) {
      // Create if doesn't exist
      const insert = await db.query('INSERT INTO crm_configs (user_id) VALUES ($1) RETURNING *', [req.user.id])
      return res.json(insert.rows[0])
    }
    res.json(result.rows[0])
  } catch (err) { next(err) }
})

/**
 * PATCH /api/settings/crm
 * Update user's CRM config
 */
router.patch('/crm', requireAuth, async (req, res, next) => {
  try {
    const updates = []
    const values = []
    let i = 1
    for (const [key, value] of Object.entries(req.body)) {
      if (key === 'id' || key === 'user_id' || key === 'created_at' || key === 'updated_at') continue
      updates.push(`${key} = $${i++}`)
      values.push(value)
    }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })
    
    values.push(req.user.id)
    
    const result = await db.query(
      `UPDATE crm_configs SET ${updates.join(', ')} WHERE user_id = $${i++} RETURNING *`,
      values
    )
    res.json(result.rows[0])
  } catch (err) { next(err) }
})

export default router
