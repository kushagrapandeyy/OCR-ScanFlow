/**
 * CardScan API — Express Entry Point
 * Deploy as: Render Web Service (ocr-api)
 *
 * Security model:
 *   - JWT auth on all protected routes
 *   - Rate limiting per user
 *   - CORS restricted to Vercel frontend origin
 *   - SFTP credentials NEVER exposed to frontend
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.js'
import scanRoutes from './routes/scans.js'
import exportRoutes from './routes/exports.js'
import settingsRoutes from './routes/settings.js'
import analyticsRoutes from './routes/analytics.js'
import { errorHandler } from './middleware/errorHandler.js'
import AIJobQueue from './workers/AIJobQueue.js'

const app = express()
app.set('trust proxy', 1)
const PORT = process.env.PORT || 3001

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URL?.replace(/\/$/, ''), // without trailing slash
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175'
    ]
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(null, false)
    }
  },
  credentials: true,
}))

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})
app.use('/api/', apiLimiter)

// ─── Request Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' })) // Allow card images as base64
app.use(express.urlencoded({ extended: true }))
app.use(morgan('combined'))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/scans', scanRoutes)
app.use('/api/exports', exportRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/analytics', analyticsRoutes)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'ocr-api' })
})

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler)

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 CardScan API running on port ${PORT}`)
  console.log(`   Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
  console.log(`   Database: ${process.env.DATABASE_URL ? 'Connected' : '⚠️  Not configured'}`)
  console.log(`   Redis:    ${process.env.REDIS_URL ? 'Connected' : '⚠️  Not configured'}`)
  
  // Start background worker
  AIJobQueue.start()
})

export default app
