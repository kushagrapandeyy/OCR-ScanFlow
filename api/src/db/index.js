import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // required for Neon / Render external connections
  }
})

db.on('connect', () => {
  console.log('[DB] Connected to PostgreSQL successfully.')
})

db.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err)
  process.exit(-1)
})

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "ScanFlow OCR API",
    status: "running"
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});
