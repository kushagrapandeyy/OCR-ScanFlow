import express from 'express';
import { db as pool } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All scan routes require authentication
router.use(requireAuth);

// 1. Create scan after Cloudinary upload
router.post('/', async (req, res, next) => {
  try {
    const { cloudinary_original_url, cloudinary_processed_url, batch_id, client_id } = req.body;
    
    if (!cloudinary_original_url && !cloudinary_processed_url) {
      return res.status(400).json({ error: 'Missing Cloudinary URLs' });
    }

    const result = await pool.query(`
      INSERT INTO scans (user_id, client_id, batch_id, cloudinary_original_url, cloudinary_processed_url, status)
      VALUES ($1, $2, $3, $4, $5, 'uploaded')
      RETURNING id, status, ai_status
    `, [req.user.id, client_id, batch_id, cloudinary_original_url, cloudinary_processed_url]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// 2. Queue AI extraction
router.post('/:scanId/extract', async (req, res, next) => {
  try {
    const { scanId } = req.params;

    // Check if scan exists and belongs to user
    const scanRes = await pool.query('SELECT * FROM scans WHERE id = $1 AND user_id = $2', [scanId, req.user.id]);
    if (scanRes.rows.length === 0) {
      return res.status(404).json({ error: 'Scan not found or unauthorized' });
    }
    const scan = scanRes.rows[0];

    // If already completed or manual review required
    if (['extraction_completed', 'manual_review_required'].includes(scan.status)) {
      return res.json({ scan_id: scanId, ai_status: scan.ai_status, message: 'Extraction already finished' });
    }

    // Check for active job
    const jobRes = await pool.query(`SELECT * FROM ai_jobs WHERE scan_id = $1 AND user_id = $2`, [scanId, req.user.id]);
    if (jobRes.rows.length > 0) {
      const job = jobRes.rows[0];
      if (['pending', 'processing', 'queued_due_to_rate_limit'].includes(job.status)) {
        return res.json({ scan_id: scanId, ai_status: job.status, message: 'Extraction already queued' });
      }
    }

    // Create new job
    await pool.query('BEGIN');
    await pool.query(`
      INSERT INTO ai_jobs (scan_id, user_id, client_id) 
      VALUES ($1, $2, $3)
      ON CONFLICT (scan_id) DO UPDATE SET 
        status = 'pending', attempt_count = 0, next_attempt_at = NOW(), updated_at = NOW()
    `, [scanId, req.user.id, scan.client_id]);

    await pool.query(`
      UPDATE scans SET status = 'extraction_pending', ai_status = 'pending', updated_at = NOW() 
      WHERE id = $1 AND user_id = $2
    `, [scanId, req.user.id]);
    await pool.query('COMMIT');

    res.json({ scan_id: scanId, ai_status: 'pending', message: 'Extraction queued' });
  } catch (err) {
    await pool.query('ROLLBACK');
    next(err);
  }
});

// 3. Poll extraction status safely
router.get('/:scanId/extraction-status', async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const scanRes = await pool.query('SELECT status, ai_status FROM scans WHERE id = $1 AND user_id = $2', [scanId, req.user.id]);
    if (scanRes.rows.length === 0) {
      return res.status(404).json({ error: 'Scan not found or unauthorized' });
    }
    
    res.json(scanRes.rows[0]);
  } catch (err) {
    next(err);
  }
});

// 4. Return extracted contact
router.get('/:scanId/contact', async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const contactRes = await pool.query('SELECT * FROM extracted_contacts WHERE scan_id = $1 AND user_id = $2', [scanId, req.user.id]);
    
    if (contactRes.rows.length === 0) {
      return res.status(404).json({ error: 'Extracted contact not found' });
    }
    
    res.json(contactRes.rows[0]);
  } catch (err) {
    next(err);
  }
});

// 5. Manual retry
router.post('/:scanId/retry-extraction', async (req, res, next) => {
  try {
    const { scanId } = req.params;
    
    const scanRes = await pool.query('SELECT * FROM scans WHERE id = $1 AND user_id = $2', [scanId, req.user.id]);
    if (scanRes.rows.length === 0) return res.status(404).json({ error: 'Scan not found or unauthorized' });

    // Force retry by inserting/updating job
    await pool.query('BEGIN');
    await pool.query(`
      INSERT INTO ai_jobs (scan_id, user_id, client_id) 
      VALUES ($1, $2, $3)
      ON CONFLICT (scan_id) DO UPDATE SET 
        status = 'pending', attempt_count = 0, next_attempt_at = NOW(), updated_at = NOW()
    `, [scanId, req.user.id, scanRes.rows[0].client_id]);

    await pool.query(`
      UPDATE scans SET status = 'extraction_pending', ai_status = 'pending', updated_at = NOW() 
      WHERE id = $1 AND user_id = $2
    `, [scanId, req.user.id]);
    await pool.query('COMMIT');

    res.json({ scan_id: scanId, message: 'Extraction retry queued' });
  } catch (err) {
    await pool.query('ROLLBACK');
    next(err);
  }
});

// 6. Get all scans with their extracted contacts (For logged-in user only)
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id, s.status, s.ai_status, s.cloudinary_original_url, s.created_at,
        c.full_name, c.first_name, c.last_name, c.designation as title, c.company,
        c.email, c.phone, c.website, c.linkedin, c.address, c.notes,
        c.confidence_score, s.archived, s.exported_at, c.interaction_level, c.event_name,
        c.category, c.country, c.mobile_prefix
      FROM scans s
      LEFT JOIN extracted_contacts c ON s.id = c.scan_id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
    `, [req.user.id]);
    
    // Map backend rows to match frontend 'card' object structure for seamless transition
    const cards = result.rows.map(row => ({
      ...row,
      image_front: row.cloudinary_original_url,
      confidence: Math.round((row.confidence_score || 0) * 100),
    }));

    res.json({ cards });
  } catch (err) {
    next(err);
  }
});

// 7. Update an extracted contact (e.g. from Review Form or Edit Modal)
router.put('/:scanId/contact', async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const body = req.body;

    // Verify ownership
    const scanRes = await pool.query('SELECT id FROM scans WHERE id = $1 AND user_id = $2', [scanId, req.user.id]);
    if (scanRes.rows.length === 0) return res.status(404).json({ error: 'Scan not found or unauthorized' });
    
    const updateResult = await pool.query(`
      UPDATE extracted_contacts 
      SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        designation = COALESCE($3, designation),
        company = COALESCE($4, company),
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        website = COALESCE($7, website),
        linkedin = COALESCE($8, linkedin),
        address = COALESCE($9, address),
        notes = COALESCE($10, notes),
        interaction_level = COALESCE($11, interaction_level),
        event_name = COALESCE($12, event_name),
        category = COALESCE($13, category),
        country = COALESCE($14, country),
        mobile_prefix = COALESCE($15, mobile_prefix),
        updated_at = NOW()
      WHERE scan_id = $16 AND user_id = $17
      RETURNING *
    `, [
      body.first_name, body.last_name, body.title, body.company,
      body.email, body.phone, body.website, body.linkedin,
      body.address, body.notes, body.interaction_level, body.event_name,
      body.category, body.country, body.mobile_prefix, scanId, req.user.id
    ]);

    if (updateResult.rowCount === 0) {
      // If contact doesn't exist, create it (in case it was manual review)
      await pool.query(`
        INSERT INTO extracted_contacts (
          scan_id, user_id, first_name, last_name, designation, company, email, phone, website, linkedin, address, notes, interaction_level, event_name, category, country, mobile_prefix
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
        scanId, req.user.id, body.first_name, body.last_name, body.title, body.company, body.email, body.phone, body.website, body.linkedin, body.address, body.notes, body.interaction_level, body.event_name, body.category, body.country, body.mobile_prefix
      ]);
    }
    
    // Mark scan status as completed (if it was manual review)
    await pool.query("UPDATE scans SET status = 'extraction_completed', review_status = 'approved' WHERE id = $1 AND user_id = $2", [scanId, req.user.id]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// 8. Delete scan
router.delete('/:scanId', async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const delRes = await pool.query('DELETE FROM scans WHERE id = $1 AND user_id = $2', [scanId, req.user.id]);
    if (delRes.rowCount === 0) return res.status(404).json({ error: 'Scan not found or unauthorized' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// 9. Batch export/archive
router.post('/export', async (req, res, next) => {
  try {
    const { scanIds } = req.body;
    if (!scanIds || !scanIds.length) return res.status(400).json({ error: 'No scan IDs provided' });
    
    await pool.query(`
      UPDATE scans 
      SET exported_at = NOW() 
      WHERE id = ANY($1::uuid[]) AND user_id = $2
    `, [scanIds, req.user.id]);
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/archive', async (req, res, next) => {
  try {
    const { scanIds } = req.body;
    if (!scanIds || !scanIds.length) return res.status(400).json({ error: 'No scan IDs provided' });
    
    await pool.query(`
      UPDATE scans 
      SET archived = true 
      WHERE id = ANY($1::uuid[]) AND user_id = $2
    `, [scanIds, req.user.id]);
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// 10. Delete batch
router.post('/delete-batch', async (req, res, next) => {
  try {
    const { scanIds } = req.body;
    if (!scanIds || !scanIds.length) return res.status(400).json({ error: 'No scan IDs provided' });
    
    await pool.query(`
      DELETE FROM scans 
      WHERE id = ANY($1::uuid[]) AND user_id = $2
    `, [scanIds, req.user.id]);
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
