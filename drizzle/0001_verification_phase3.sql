-- Add verification_logs table
CREATE TABLE IF NOT EXISTS verification_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'transporter' | 'vehicle' | 'driver' | 'document'
    entity_id VARCHAR NOT NULL,
    action TEXT NOT NULL, -- 'approved' | 'rejected' | 'flagged' | 'unflagged'
    reason TEXT,
    performed_by VARCHAR NOT NULL, -- admin user id
    performed_at TIMESTAMP DEFAULT NOW(),
    meta JSON
);

-- Add verification_status to transporters
ALTER TABLE transporters ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
UPDATE transporters SET verification_status = CASE WHEN is_verified THEN 'approved' ELSE 'unverified' END;
ALTER TABLE transporters DROP COLUMN IF EXISTS is_verified;

-- Add verification_status to vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';

-- Add verification_status to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
