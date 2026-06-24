import { db as pool } from '../db/index.js';

export default class RateLimitManager {
  static getRpmLimit() {
    return parseInt(process.env.GEMINI_RPM_LIMIT || '12', 10);
  }

  static getDailyLimit() {
    return parseInt(process.env.GEMINI_DAILY_LIMIT || '450', 10);
  }

  static async checkLimit(model = 'gemini-3.1-flash-lite') {
    const dailyLimit = this.getDailyLimit();
    const rpmLimit = this.getRpmLimit();

    // 1. Get daily count
    const todayResult = await pool.query(`
      SELECT SUM(request_count) as total_today 
      FROM gemini_usage 
      WHERE model = $1 AND date = CURRENT_DATE
    `, [model]);
    const totalToday = parseInt(todayResult.rows[0]?.total_today || '0', 10);

    if (totalToday >= dailyLimit) {
      return { allowed: false, reason: 'daily_limit' };
    }

    // 2. Get minute count
    // Using Postgres date_trunc('minute', NOW())
    const minuteResult = await pool.query(`
      SELECT request_count 
      FROM gemini_usage 
      WHERE model = $1 AND minute_window = date_trunc('minute', NOW())
    `, [model]);
    const totalMinute = parseInt(minuteResult.rows[0]?.request_count || '0', 10);

    if (totalMinute >= rpmLimit) {
      return { allowed: false, reason: 'minute_limit' };
    }

    return { allowed: true };
  }

  static async recordUsage(model = 'gemini-3.1-flash-lite', estimatedTokens = 0) {
    const query = `
      INSERT INTO gemini_usage (model, date, minute_window, request_count, estimated_token_count)
      VALUES ($1, CURRENT_DATE, date_trunc('minute', NOW()), 1, $2)
      ON CONFLICT (model, minute_window) 
      DO UPDATE SET 
        request_count = gemini_usage.request_count + 1,
        estimated_token_count = gemini_usage.estimated_token_count + $2,
        updated_at = NOW();
    `;
    await pool.query(query, [model, estimatedTokens]);
  }
}
