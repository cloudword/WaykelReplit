-- Transporter Onboarding System Migration
-- Run this script on the database to add the new columns

-- 1. Add transporter_type and onboarding_status to transporters table
ALTER TABLE transporters 
ADD COLUMN IF NOT EXISTS transporter_type VARCHAR(20) DEFAULT 'business',
ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(20) DEFAULT 'incomplete';

-- 2. Add document_status and is_active_for_bidding to vehicles table
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS document_status VARCHAR(30) DEFAULT 'document_missing',
ADD COLUMN IF NOT EXISTS is_active_for_bidding BOOLEAN DEFAULT FALSE;

-- 3. Add document_status and is_active_for_bidding to users table (for drivers)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS document_status VARCHAR(30) DEFAULT 'document_missing',
ADD COLUMN IF NOT EXISTS is_active_for_bidding BOOLEAN DEFAULT FALSE;

-- 4. Backfill existing data
-- Set existing active transporters with documents to completed onboarding
UPDATE transporters 
SET onboarding_status = 'completed' 
WHERE status = 'active' AND documents_complete = TRUE;

-- Set existing vehicles with approved RC to approved status
UPDATE vehicles v
SET document_status = 'approved', is_active_for_bidding = TRUE
WHERE EXISTS (
  SELECT 1 FROM documents d 
  WHERE d.vehicle_id = v.id 
  AND d.type = 'rc' 
  AND d.status = 'verified'
);

-- Set vehicles with pending RC to verification_pending
UPDATE vehicles v
SET document_status = 'verification_pending'
WHERE document_status = 'document_missing'
AND EXISTS (
  SELECT 1 FROM documents d 
  WHERE d.vehicle_id = v.id 
  AND d.type = 'rc' 
  AND d.status = 'pending'
);

-- Set existing drivers with approved DL to approved status
UPDATE users u
SET document_status = 'approved', is_active_for_bidding = TRUE
WHERE role = 'driver'
AND documents_complete = TRUE
AND EXISTS (
  SELECT 1 FROM documents d 
  WHERE d.user_id = u.id 
  AND d.entity_type = 'driver'
  AND d.type = 'license' 
  AND d.status = 'verified'
);

-- Set drivers with pending DL to verification_pending
UPDATE users u
SET document_status = 'verification_pending'
WHERE role = 'driver'
AND document_status = 'document_missing'
AND EXISTS (
  SELECT 1 FROM documents d 
  WHERE d.user_id = u.id 
  AND d.entity_type = 'driver'
  AND d.type = 'license' 
  AND d.status = 'pending'
);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transporters_onboarding ON transporters(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_transporters_type ON transporters(transporter_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_bidding ON vehicles(is_active_for_bidding);
CREATE INDEX IF NOT EXISTS idx_vehicles_doc_status ON vehicles(document_status);
CREATE INDEX IF NOT EXISTS idx_users_bidding ON users(is_active_for_bidding) WHERE role = 'driver';
CREATE INDEX IF NOT EXISTS idx_users_doc_status ON users(document_status) WHERE role = 'driver';

-- Verify changes
SELECT 
  'transporters' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE onboarding_status = 'completed') as completed_onboarding,
  COUNT(*) FILTER (WHERE transporter_type = 'business') as business_type
FROM transporters
UNION ALL
SELECT 
  'vehicles' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active_for_bidding = TRUE) as active_for_bidding,
  COUNT(*) FILTER (WHERE document_status = 'approved') as approved_docs
FROM vehicles
UNION ALL
SELECT 
  'drivers' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active_for_bidding = TRUE) as active_for_bidding,
  COUNT(*) FILTER (WHERE document_status = 'approved') as approved_docs
FROM users WHERE role = 'driver';
