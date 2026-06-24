import express from 'express'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.use(requireAuth)

/**
 * GET /api/analytics
 * Get usage statistics for the logged-in user
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id

    // Get total scans
    const totalScansRes = await db.query('SELECT COUNT(*) FROM scans WHERE user_id = $1', [userId])
    const totalScans = parseInt(totalScansRes.rows[0].count, 10)

    // Get scans this month
    const thisMonthRes = await db.query(`
      SELECT COUNT(*) FROM scans 
      WHERE user_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)
    `, [userId])
    const scansThisMonth = parseInt(thisMonthRes.rows[0].count, 10)

    // Get successful extractions count
    const successRes = await db.query(`
      SELECT COUNT(*) FROM scans 
      WHERE user_id = $1 AND status IN ('extraction_completed', 'manual_review_required')
    `, [userId])
    const successfulExtractions = parseInt(successRes.rows[0].count, 10)

    // Get average confidence score
    const confRes = await db.query(`
      SELECT AVG(confidence_score) as avg_conf FROM extracted_contacts 
      WHERE user_id = $1
    `, [userId])
    const avgConfidence = parseFloat(confRes.rows[0].avg_conf) || 0

    // Get interaction levels breakdown
    const interactionsRes = await db.query(`
      SELECT interaction_level, COUNT(*) 
      FROM extracted_contacts 
      WHERE user_id = $1
      GROUP BY interaction_level
    `, [userId])
    const interactionBreakdown = interactionsRes.rows.reduce((acc, row) => {
      acc[row.interaction_level || 'casual'] = parseInt(row.count, 10)
      return acc
    }, {})

    res.json({
      totalScans,
      scansThisMonth,
      successfulExtractions,
      avgConfidence: Math.round(avgConfidence * 100),
      interactionBreakdown
    })
  } catch (err) {
    next(err)
  }
})

export default router
