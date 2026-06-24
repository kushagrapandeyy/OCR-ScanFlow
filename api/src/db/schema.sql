-- CardScan Database Schema
-- PostgreSQL (Neon serverless or Render managed DB)

-- ── Users ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  company       VARCHAR(255),
  avatar_url    TEXT,
  google_id     VARCHAR(255) UNIQUE,
  auth_provider VARCHAR(20) DEFAULT 'email',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ── Refresh Tokens ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ── Scans (Replaces Cards) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scans (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id                 VARCHAR(255),
  batch_id                  VARCHAR(255),
  
  cloudinary_original_url   TEXT,
  cloudinary_processed_url  TEXT,
  
  status                    VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'extraction_pending', 'extraction_processing', 'extraction_completed', 'extraction_failed', 'manual_review_required')),
  ai_status                 VARCHAR(50) DEFAULT 'not_started' CHECK (ai_status IN ('not_started', 'pending', 'processing', 'completed', 'failed', 'queued_due_to_rate_limit', 'skipped_due_to_daily_limit')),
  review_status             VARCHAR(50) DEFAULT 'not_reviewed' CHECK (review_status IN ('not_reviewed', 'reviewed', 'approved', 'rejected', 'rescan_required')),
  export_status             VARCHAR(50) DEFAULT 'not_exported' CHECK (export_status IN ('not_exported', 'exported', 'export_failed')),
  
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at DESC);

-- ── Extracted Contacts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS extracted_contacts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id             UUID REFERENCES scans(id) ON DELETE CASCADE UNIQUE,
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id           VARCHAR(255),
  
  full_name           VARCHAR(255),
  company             VARCHAR(255),
  designation         VARCHAR(255),
  email               VARCHAR(255),
  phone               VARCHAR(100),
  alternate_phone     VARCHAR(100),
  website             TEXT,
  address             TEXT,
  city                VARCHAR(100),
  state               VARCHAR(100),
  country             VARCHAR(100),
  notes               TEXT,
  
  confidence_score    NUMERIC(3, 2) DEFAULT 0.0,
  needs_manual_review BOOLEAN DEFAULT FALSE,
  uncertain_fields    JSONB DEFAULT '[]',
  raw_ai_response     TEXT,
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_scan ON extracted_contacts(scan_id);

-- ── AI Jobs ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id           UUID REFERENCES scans(id) ON DELETE CASCADE UNIQUE,
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id         VARCHAR(255),
  
  status            VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'queued_due_to_rate_limit', 'manual_review_required')),
  priority          INTEGER DEFAULT 0,
  selected_model    VARCHAR(100) DEFAULT 'gemini-3.1-flash-lite',
  
  attempt_count     INTEGER DEFAULT 0,
  max_attempts      INTEGER DEFAULT 2,
  next_attempt_at   TIMESTAMPTZ DEFAULT NOW(),
  last_error        TEXT,
  
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_next_attempt ON ai_jobs(next_attempt_at);

-- ── AI Attempts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_attempts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id             UUID REFERENCES scans(id) ON DELETE CASCADE,
  job_id              UUID REFERENCES ai_jobs(id) ON DELETE CASCADE,
  
  model               VARCHAR(100),
  status              VARCHAR(50),
  error_code          VARCHAR(100),
  error_message       TEXT,
  latency_ms          INTEGER,
  
  request_started_at  TIMESTAMPTZ,
  request_finished_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_attempts_job ON ai_attempts(job_id);

-- ── Gemini Usage ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gemini_usage (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model                 VARCHAR(100),
  date                  DATE NOT NULL,
  minute_window         TIMESTAMPTZ NOT NULL,
  request_count         INTEGER DEFAULT 0,
  estimated_token_count INTEGER DEFAULT 0,
  
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model, minute_window)
);

CREATE INDEX IF NOT EXISTS idx_gemini_usage_date ON gemini_usage(date);
CREATE INDEX IF NOT EXISTS idx_gemini_usage_minute ON gemini_usage(minute_window);

-- ── Exports ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  format       VARCHAR(20) NOT NULL CHECK (format IN ('json','csv','xlsx','webhook')),
  scope        VARCHAR(20) DEFAULT 'all' CHECK (scope IN ('all','new','selected')),
  status       VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued','processing','success','failed')),
  scan_ids     UUID[],
  scan_count   INTEGER,
  file_path    TEXT,
  file_size    INTEGER,
  webhook_url  TEXT,
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exports_user   ON exports(user_id);
CREATE INDEX IF NOT EXISTS idx_exports_status ON exports(status);

-- ── Export Logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS export_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id     UUID REFERENCES exports(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  attempt       INTEGER NOT NULL DEFAULT 1,
  result        VARCHAR(20) CHECK (result IN ('success','failed')),
  file_path     TEXT,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_logs_export ON export_logs(export_id);

-- ── CRM Configs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_configs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  name         VARCHAR(255),
  webhook_url  TEXT,
  api_key_hash TEXT,
  sftp_enabled BOOLEAN DEFAULT FALSE,
  sftp_host    VARCHAR(255),
  sftp_port    INTEGER DEFAULT 22,
  sftp_user    VARCHAR(255),
  sftp_dir     VARCHAR(255) DEFAULT '/uploads',
  schema       JSONB DEFAULT '{
    "first_name": "first_name",
    "last_name": "last_name",
    "company": "company",
    "title": "designation",
    "email": "email",
    "phone": "phone"
  }',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Updated At Triggers ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at              BEFORE UPDATE ON users              FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER scans_updated_at              BEFORE UPDATE ON scans              FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER extracted_contacts_updated_at BEFORE UPDATE ON extracted_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ai_jobs_updated_at            BEFORE UPDATE ON ai_jobs            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER gemini_usage_updated_at       BEFORE UPDATE ON gemini_usage       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER crm_config_updated            BEFORE UPDATE ON crm_configs        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
