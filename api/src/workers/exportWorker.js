/**
 * Export Worker (Render Background Worker: ocr-export-worker)
 *
 * Responsibilities:
 *   - Process export jobs from BullMQ queue
 *   - Generate JSON/CSV/Excel files
 *   - Upload via SFTP (atomic .tmp → rename)
 *   - Retry on failure (exponential backoff, 3 attempts)
 *   - Dead letter queue after max retries
 *   - Log all export attempts to DB
 *   - Push webhook notifications
 *
 * This runs as a SEPARATE Render service from the API.
 * It never blocks user-facing API requests.
 */

import 'dotenv/config'
import { Worker, Queue } from 'bullmq'
import Redis from 'ioredis'
import { uploadToSFTP } from '../services/sftpService.js'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// ─── Redis Connection ──────────────────────────────────────────────────────────
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

// ─── Queues ───────────────────────────────────────────────────────────────────
export const exportQueue = new Queue('exports', { connection: redis })
export const deadLetterQueue = new Queue('exports-dlq', { connection: redis })

// ─── Worker ───────────────────────────────────────────────────────────────────
const worker = new Worker(
  'exports',
  async (job) => {
    const { exportId, userId, cardIds, format, webhookUrl } = job.data

    console.log(`[Worker] Processing export ${exportId} | format=${format} | cards=${cardIds?.length}`)

    // ── PLACEHOLDER: Fetch cards from DB ────────────────────────────────────
    // const result = await db.query(
    //   'SELECT * FROM cards WHERE id = ANY($1) AND user_id = $2',
    //   [cardIds, userId]
    // )
    // const cards = result.rows
    const cards = [] // Replace with real DB query

    // ── Update status to processing ──────────────────────────────────────────
    // await db.query("UPDATE exports SET status = 'processing', started_at = NOW() WHERE id = $1", [exportId])

    let fileContent, filename, extension, mimeType

    // ── Generate file ────────────────────────────────────────────────────────
    switch (format) {
      case 'json':
        fileContent = JSON.stringify(cards, null, 2)
        filename = `contacts-${exportId}`
        extension = 'json'
        mimeType = 'application/json'
        break

      case 'csv':
        fileContent = Papa.unparse(cards.map(flattenCard))
        filename = `contacts-${exportId}`
        extension = 'csv'
        mimeType = 'text/csv'
        break

      case 'xlsx': {
        const rows = cards.map(flattenCard)
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Contacts')
        fileContent = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
        filename = `contacts-${exportId}`
        extension = 'xlsx'
        break
      }

      case 'webhook':
        if (!webhookUrl) throw new Error('No webhook URL configured')
        await pushWebhook(webhookUrl, cards)
        // Update export as success
        // await db.query("UPDATE exports SET status = 'success', completed_at = NOW() WHERE id = $1", [exportId])
        return { success: true, method: 'webhook', count: cards.length }

      default:
        throw new Error(`Unknown export format: ${format}`)
    }

    // ── Upload to SFTP ────────────────────────────────────────────────────────
    const { remotePath, size } = await uploadToSFTP(fileContent, filename, extension)

    // ── Log success to DB ─────────────────────────────────────────────────────
    // await db.query(
    //   `UPDATE exports SET status = 'success', completed_at = NOW(), file_path = $1, file_size = $2 WHERE id = $3`,
    //   [remotePath, size, exportId]
    // )
    // await db.query(
    //   'INSERT INTO export_logs (export_id, attempt, result, file_path, created_at) VALUES ($1, $2, $3, $4, NOW())',
    //   [exportId, job.attemptsMade + 1, 'success', remotePath]
    // )

    // ── Mark cards as exported ────────────────────────────────────────────────
    // await db.query(
    //   'UPDATE cards SET exported_at = NOW() WHERE id = ANY($1)',
    //   [cardIds]
    // )

    console.log(`[Worker] ✅ Export ${exportId} complete → ${remotePath} (${size} bytes)`)
    return { success: true, remotePath, size, count: cards.length }
  },
  {
    connection: redis,
    concurrency: 3,          // Process up to 3 exports simultaneously
    attempts: 3,             // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,          // 2s → 4s → 8s
    },
  }
)

// ─── Event Listeners ──────────────────────────────────────────────────────────
worker.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} completed:`, result)
})

worker.on('failed', async (job, err) => {
  console.error(`[Worker] Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}):`, err.message)

  // Log failure to DB
  // await db.query(
  //   'INSERT INTO export_logs (export_id, attempt, result, error_message, created_at) VALUES ($1, $2, $3, $4, NOW())',
  //   [job.data.exportId, job.attemptsMade, 'failed', err.message]
  // )

  // Move to DLQ after max retries
  if (job.attemptsMade >= job.opts.attempts) {
    await deadLetterQueue.add('failed-export', {
      ...job.data,
      failedAt: new Date().toISOString(),
      error: err.message,
    })

    // Update export status to failed
    // await db.query("UPDATE exports SET status = 'failed', error = $1 WHERE id = $2", [err.message, job.data.exportId])
    console.error(`[Worker] ❌ Export ${job.data.exportId} moved to DLQ after ${job.attemptsMade} attempts`)
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function flattenCard(card) {
  return {
    'First Name': card.first_name,
    'Last Name': card.last_name,
    'Title': card.title,
    'Company': card.company,
    'Email': card.email,
    'Phone': card.phone,
    'Website': card.website,
    'LinkedIn': card.linkedin,
    'Address': card.address,
    'Notes': card.notes,
    'Interaction Level': card.interaction_level,
    'Event Name': card.event_name,
    'Tags': (card.tags || []).join(', '),
    'Scanned At': card.created_at,
    'Exported At': card.exported_at || '',
  }
}

async function pushWebhook(url, cards) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'cardscan',
      exported_at: new Date().toISOString(),
      contacts: cards,
    }),
    signal: AbortSignal.timeout(30000), // 30s timeout
  })
  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}: ${await response.text()}`)
  }
}

console.log('🔄 CardScan Export Worker started')
console.log(`   Queue: exports | Concurrency: 3 | Max attempts: 3`)
console.log(`   Dead Letter Queue: exports-dlq`)
