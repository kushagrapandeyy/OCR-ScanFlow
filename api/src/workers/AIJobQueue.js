import { db as pool } from '../db/index.js';
import GeminiExtractionService from '../services/GeminiExtractionService.js';
import ExtractionValidationService from '../services/ExtractionValidationService.js';

export default class AIJobQueue {
  static isRunning = false;
  static intervalId = null;

  static start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[AIJobQueue] Worker started');
    // Poll every 5 seconds
    this.intervalId = setInterval(() => this.processNextJob(), 5000);
  }

  static stop() {
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    console.log('[AIJobQueue] Worker stopped');
  }

  static async processNextJob() {
    // Basic concurrency control - only process one at a time per tick
    let client;
    try {
      client = await pool.connect();
      
      // 1. Pick pending job
      await client.query('BEGIN');
      const jobRes = await client.query(`
        SELECT * FROM ai_jobs 
        WHERE status = 'pending' AND next_attempt_at <= NOW()
        ORDER BY priority DESC, created_at ASC 
        FOR UPDATE SKIP LOCKED 
        LIMIT 1
      `);
      
      if (jobRes.rows.length === 0) {
        await client.query('COMMIT');
        return; // No jobs
      }

      const job = jobRes.rows[0];
      
      // Update to processing
      await client.query(`
        UPDATE ai_jobs 
        SET status = 'processing', updated_at = NOW() 
        WHERE id = $1
      `, [job.id]);
      
      await client.query(`
        UPDATE scans 
        SET ai_status = 'processing', status = 'extraction_processing', updated_at = NOW() 
        WHERE id = $1
      `, [job.scan_id]);
      
      await client.query('COMMIT');

      // 2. Process Job
      await this.executeJob(job);

    } catch (err) {
      console.error('[AIJobQueue] Worker loop error:', err);
      if (client) await client.query('ROLLBACK').catch(() => {});
    } finally {
      if (client) client.release();
    }
  }

  static async executeJob(job) {
    const startTime = Date.now();
    let attemptStatus = 'success';
    let errorMessage = null;
    let finalScanStatus = 'extraction_completed';
    let finalAiStatus = 'completed';
    let finalJobStatus = 'completed';

    try {
      // Get Scan
      const scanRes = await pool.query(`SELECT * FROM scans WHERE id = $1`, [job.scan_id]);
      if (scanRes.rows.length === 0) throw new Error("Scan not found");
      const scan = scanRes.rows[0];

      if (!scan.cloudinary_processed_url && !scan.cloudinary_original_url) {
        throw new Error("No valid Cloudinary image URL for scan");
      }

      const imageUrl = scan.cloudinary_processed_url || scan.cloudinary_original_url;

      // Extract
      const extraction = await GeminiExtractionService.extractFromImage(imageUrl, job.selected_model);
      
      // Validate
      const contactData = ExtractionValidationService.validate(extraction.raw);
      
      if (contactData.needs_manual_review) {
        finalScanStatus = 'manual_review_required';
        finalJobStatus = 'manual_review_required';
      }

      // Save to extracted_contacts
      await pool.query(`
        INSERT INTO extracted_contacts (
          scan_id, user_id, client_id, full_name, company, designation, 
          email, phone, alternate_phone, website, address, city, state, country, 
          notes, confidence_score, needs_manual_review, uncertain_fields, raw_ai_response
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (scan_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          company = EXCLUDED.company,
          designation = EXCLUDED.designation,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          confidence_score = EXCLUDED.confidence_score,
          needs_manual_review = EXCLUDED.needs_manual_review,
          raw_ai_response = EXCLUDED.raw_ai_response,
          updated_at = NOW()
      `, [
        scan.id, scan.user_id, scan.client_id,
        contactData.full_name, contactData.company, contactData.designation,
        contactData.email, contactData.phone, contactData.alternate_phone, contactData.website,
        contactData.address, contactData.city, contactData.state, contactData.country,
        contactData.notes, contactData.confidence_score, contactData.needs_manual_review,
        JSON.stringify(contactData.uncertain_fields), extraction.raw
      ]);

    } catch (err) {
      errorMessage = err.message;
      attemptStatus = 'failed';
      console.error(`[AIJobQueue] Job ${job.id} failed:`, err);

      if (errorMessage.includes('Rate limit exceeded')) {
        if (errorMessage.includes('daily_limit')) {
          finalScanStatus = 'manual_review_required';
          finalAiStatus = 'skipped_due_to_daily_limit';
          finalJobStatus = 'manual_review_required';
        } else {
          // Minute limit - queue for later
          finalScanStatus = 'extraction_pending';
          finalAiStatus = 'queued_due_to_rate_limit';
          finalJobStatus = 'pending'; // Stays pending
          // Delay next attempt by 10 seconds
          await pool.query(`UPDATE ai_jobs SET next_attempt_at = NOW() + INTERVAL '10 seconds' WHERE id = $1`, [job.id]);
        }
      } else {
        // Normal failure
        const nextAttemptCount = job.attempt_count + 1;
        if (nextAttemptCount >= job.max_attempts) {
          finalScanStatus = 'manual_review_required';
          finalAiStatus = 'failed';
          finalJobStatus = 'failed';
        } else {
          finalScanStatus = 'extraction_pending';
          finalAiStatus = 'pending';
          finalJobStatus = 'pending';
          await pool.query(`UPDATE ai_jobs SET attempt_count = $1, next_attempt_at = NOW() + INTERVAL '5 seconds' WHERE id = $2`, [nextAttemptCount, job.id]);
        }
      }
    }

    const latencyMs = Date.now() - startTime;

    // Record attempt
    await pool.query(`
      INSERT INTO ai_attempts (
        scan_id, job_id, model, status, error_message, latency_ms, request_started_at, request_finished_at
      ) VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0), to_timestamp($8 / 1000.0))
    `, [
      job.scan_id, job.id, job.selected_model, attemptStatus, errorMessage, latencyMs, startTime, Date.now()
    ]);

    // Finalize Job & Scan states if it is not just re-queued
    if (finalJobStatus !== 'pending') {
      await pool.query(`
        UPDATE ai_jobs 
        SET status = $1, last_error = $2, updated_at = NOW() 
        WHERE id = $3
      `, [finalJobStatus, errorMessage, job.id]);
    } else if (errorMessage && !errorMessage.includes('Rate limit')) {
       await pool.query(`UPDATE ai_jobs SET last_error = $1 WHERE id = $2`, [errorMessage, job.id]);
    }

    await pool.query(`
      UPDATE scans 
      SET ai_status = $1, status = $2, updated_at = NOW() 
      WHERE id = $3
    `, [finalAiStatus, finalScanStatus, job.scan_id]);
  }
}
