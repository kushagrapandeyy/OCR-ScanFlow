import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { db } from './index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runMigrations() {
  console.log('🔄 Running database migrations...')
  try {
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    await db.query(schema)
    console.log('✅ Database schema created/updated successfully.')
  } catch (err) {
    console.error('❌ Migration failed:', err)
  } finally {
    await db.end()
  }
}

runMigrations()
