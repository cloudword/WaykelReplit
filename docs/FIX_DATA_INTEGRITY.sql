-- DATA INTEGRITY FIX SQL SCRIPT
-- Run these queries directly in your DigitalOcean database console
-- DO NOT run drizzle-kit push for this - it times out on remote databases

-- =====================================================
-- STEP 1: Fix existing orphan vehicles (no transporterId)
-- =====================================================

-- First, identify orphan vehicles
SELECT id, plate_number, model, type, status, created_at
FROM vehicles 
WHERE transporter_id IS NULL;

-- Option A: Delete orphan vehicles (if they are test data)
-- DELETE FROM vehicles WHERE transporter_id IS NULL;

-- Option B: Assign orphan vehicles to a specific transporter
-- UPDATE vehicles SET transporter_id = 'your-transporter-id' WHERE transporter_id IS NULL;

-- =====================================================
-- STEP 2: Add NOT NULL constraint to transporterId (only after fixing orphans)
-- =====================================================
-- CAUTION: This will fail if any vehicles still have NULL transporterId
-- Run Step 1 first to clean up orphan vehicles

-- ALTER TABLE vehicles
-- ALTER COLUMN transporter_id SET NOT NULL;

-- =====================================================
-- STEP 3: Set vehicle default status to pending_verification
-- =====================================================
ALTER TABLE vehicles
ALTER COLUMN status SET DEFAULT 'pending_verification';

-- =====================================================
-- STEP 4: Add index for vehicle lookup by transporter
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_transporter
ON vehicles(transporter_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_status
ON vehicles(status);

CREATE INDEX IF NOT EXISTS idx_vehicles_transporter_status
ON vehicles(transporter_id, status);

-- =====================================================
-- STEP 5: Add index for notifications (for transporter-scoped queries)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_transporter
ON notifications(recipient_transporter_id) WHERE recipient_transporter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
ON notifications(recipient_id, is_read) WHERE is_read = false;

-- =====================================================
-- STEP 6: Add index for drivers lookup by transporter
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_transporter_role
ON users(transporter_id, role);

-- =====================================================
-- STEP 7: Verify data integrity after fixes
-- =====================================================

-- Check for vehicles without transporterId
SELECT COUNT(*) as orphan_vehicles FROM vehicles WHERE transporter_id IS NULL;

-- Check for vehicles with wrong status (should mostly be pending_verification for new ones)
SELECT status, COUNT(*) as count FROM vehicles GROUP BY status;

-- Check notification counts by recipient type
SELECT 
  CASE 
    WHEN recipient_id IS NOT NULL AND recipient_transporter_id IS NOT NULL THEN 'both'
    WHEN recipient_id IS NOT NULL THEN 'user_only'
    WHEN recipient_transporter_id IS NOT NULL THEN 'transporter_only'
    ELSE 'none'
  END as recipient_type,
  COUNT(*) as count
FROM notifications
GROUP BY 1;
