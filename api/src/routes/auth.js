/**
 * Authentication Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/logout
 * POST /api/auth/refresh
 * DELETE /api/auth/account — Real account deletion
 */

import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

import { db } from '../db/index.js'
import { OAuth2Client } from 'google-auth-library'

/**
 * POST /api/auth/register
 * Creates a new user account
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, company } = req.body

    // PLACEHOLDER: Validate with Zod schema
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'name, email, and password are required' })
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' })

    const hashedPassword = await bcrypt.hash(password, 12)
    const userId = uuidv4()

    await db.query(
      'INSERT INTO users (id, name, email, password_hash, company) VALUES ($1, $2, $3, $4, $5)',
      [userId, name, email, hashedPassword, company]
    )
    
    // Create default CRM config for the new user
    await db.query('INSERT INTO crm_configs (user_id) VALUES ($1)', [userId])

    const accessToken = generateAccessToken(userId)
    const refreshToken = generateRefreshToken(userId)

    await db.query('INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)', [userId, refreshToken])

    res.status(201).json({
      user: { id: userId, name, email, company },
      accessToken,
      refreshToken,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email])
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)
    
    await db.query('INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)', [user.id, refreshToken])

    res.json({ user: { id: user.id, name: user.name, email: user.email, company: user.company }, accessToken, refreshToken })


  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' })

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret')

    const result = await db.query('SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2', [payload.userId, refreshToken])
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid refresh token' })

    const newAccessToken = generateAccessToken(payload.userId)
    res.json({ accessToken: newAccessToken })
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' })
    next(err)
  }
})

/**
 * POST /api/auth/logout
 */
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id])

    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/auth/account
 * Real account deletion — cascades all user data
 */
router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    const { confirmation } = req.body
    if (confirmation !== 'DELETE') {
      return res.status(400).json({ error: 'Type DELETE to confirm account deletion' })
    }

    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM export_logs WHERE user_id = $1', [req.user.id])
      await client.query('DELETE FROM exports WHERE user_id = $1', [req.user.id])
      await client.query('DELETE FROM crm_configs WHERE user_id = $1', [req.user.id])
      await client.query('DELETE FROM cards WHERE user_id = $1', [req.user.id])
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id])
      await client.query('DELETE FROM users WHERE id = $1', [req.user.id])
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }

    res.json({ message: 'Account and all associated data permanently deleted.' })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/auth/google
 * Google OAuth sign-in / sign-up
 */
router.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body
    if (!credential) return res.status(400).json({ error: 'Missing Google credential token' })

    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) return res.status(500).json({ error: 'Google OAuth not configured on server' })

    const client = new OAuth2Client(clientId)
    let ticket
    try {
      ticket = await client.verifyIdToken({ idToken: credential, audience: clientId })
    } catch (err) {
      return res.status(401).json({ error: 'Invalid Google token' })
    }

    const payload = ticket.getPayload()
    const { sub: googleId, email, name, picture } = payload

    // Check if user exists by google_id or email
    let userResult = await db.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [googleId, email])
    let user = userResult.rows[0]

    if (user) {
      // Link google_id if not already linked
      if (!user.google_id) {
        await db.query('UPDATE users SET google_id = $1, auth_provider = $2, avatar_url = COALESCE(avatar_url, $3) WHERE id = $4', [googleId, 'google', picture, user.id])
      }
    } else {
      // Create new user (no password needed)
      const userId = uuidv4()
      await db.query(
        'INSERT INTO users (id, name, email, google_id, auth_provider, avatar_url) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, name, email, googleId, 'google', picture]
      )
      await db.query('INSERT INTO crm_configs (user_id) VALUES ($1)', [userId])
      user = { id: userId, name, email, company: null, avatar_url: picture }
    }

    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)
    await db.query('INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)', [user.id, refreshToken])

    res.json({
      user: { id: user.id, name: user.name, email: user.email, company: user.company, avatar_url: user.avatar_url || picture },
      accessToken,
      refreshToken,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/auth/me
 * Validate token and return current user
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, name, email, company, avatar_url, auth_provider FROM users WHERE id = $1', [req.user.id])
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' })
    res.json({ user: result.rows[0] })
  } catch (err) {
    next(err)
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'access-secret', { expiresIn: '15m' })
}

function generateRefreshToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || 'refresh-secret', { expiresIn: '7d' })
}

export default router
