-- Waykel schema patches (20 Jan 2026)
-- Apply in production/staging to align DB with shared/schema.ts

BEGIN;

-- 1) Add verification_status column for transporters (schema expects text enum)
ALTER TABLE transporters
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';

-- Backfill from legacy boolean if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transporters' AND column_name = 'is_verified'
  ) THEN
    UPDATE transporters
      SET verification_status = CASE WHEN is_verified THEN 'approved' ELSE 'unverified' END
    WHERE verification_status IS NULL OR verification_status = '';
  END IF;
END $$;

-- 2) Add customer linkage columns to rides
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS customer_id varchar;

ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS customer_entity_id text;

-- Optional FK for customer_id (only if users table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'rides' AND constraint_name = 'rides_customer_id_fkey'
  ) THEN
    ALTER TABLE rides
      ADD CONSTRAINT rides_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES users(id);
  END IF;
END $$;

COMMIT;
