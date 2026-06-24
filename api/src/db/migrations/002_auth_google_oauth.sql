-- Auth migration: add Google OAuth support
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email';

-- Add missing columns to scans if not present
ALTER TABLE scans ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS exported_at TIMESTAMPTZ;

-- Add missing columns to extracted_contacts if not present
ALTER TABLE extracted_contacts ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE extracted_contacts ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
ALTER TABLE extracted_contacts ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE extracted_contacts ADD COLUMN IF NOT EXISTS interaction_level VARCHAR(50);
ALTER TABLE extracted_contacts ADD COLUMN IF NOT EXISTS event_name VARCHAR(255);
ALTER TABLE extracted_contacts ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE extracted_contacts ADD COLUMN IF NOT EXISTS mobile_prefix VARCHAR(10);
