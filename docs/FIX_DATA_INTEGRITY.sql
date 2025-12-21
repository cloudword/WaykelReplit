-- =============================================
-- WAYKEL DATA INTEGRITY FIX SQL SCRIPT
-- Run these queries in your DigitalOcean database console
-- DO NOT run drizzle-kit push for this - it times out on remote databases
-- Last Updated: December 2024
-- =============================================

-- =============================================
-- PHASE 1: DIAGNOSE CURRENT STATE
-- Run these first to understand the scope
-- =============================================

-- Check orphaned vehicles (no transporter)
SELECT 'Orphaned Vehicles' as issue, COUNT(*) as count FROM vehicles WHERE transporter_id IS NULL
UNION ALL
SELECT 'Orphaned Bids', COUNT(*) FROM bids WHERE transporter_id IS NULL
UNION ALL
SELECT 'Orphaned Drivers', COUNT(*) FROM users WHERE role = 'driver' AND transporter_id IS NULL
UNION ALL
SELECT 'Rides without Customer', COUNT(*) FROM rides WHERE customer_id IS NULL;

-- List orphaned vehicles to review
SELECT v.id, v.plate_number, v.type, v.user_id, u.name as user_name, u.transporter_id as user_transporter
FROM vehicles v
LEFT JOIN users u ON v.user_id = u.id
WHERE v.transporter_id IS NULL;

-- =============================================
-- PHASE 2: FIX ORPHANED VEHICLES
-- Choose either DELETE or ASSIGN based on your needs
-- =============================================

-- Option A: DELETE orphaned vehicles (if they are test data)
-- DELETE FROM vehicles WHERE transporter_id IS NULL;

-- Option B: Fix orphaned vehicles by assigning from user's transporter
UPDATE vehicles v
SET transporter_id = u.transporter_id
FROM users u
WHERE v.user_id = u.id
AND v.transporter_id IS NULL
AND u.transporter_id IS NOT NULL;

-- =============================================
-- PHASE 3: FIX ORPHANED BIDS
-- =============================================

-- Fix bids without transporter by getting from user's transporter
UPDATE bids b
SET transporter_id = u.transporter_id
FROM users u
WHERE b.user_id = u.id
AND b.transporter_id IS NULL
AND u.transporter_id IS NOT NULL;

-- =============================================
-- PHASE 4: ADD DATABASE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_vehicles_transporter_id ON vehicles(transporter_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_transporter_status ON vehicles(transporter_id, status);
CREATE INDEX IF NOT EXISTS idx_bids_transporter_id ON bids(transporter_id);
CREATE INDEX IF NOT EXISTS idx_bids_ride_id ON bids(ride_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_rides_customer_id ON rides(customer_id);
CREATE INDEX IF NOT EXISTS idx_rides_transporter_id ON rides(transporter_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_users_transporter_role ON users(transporter_id, role);
CREATE INDEX IF NOT EXISTS idx_documents_transporter_id ON documents(transporter_id);
CREATE INDEX IF NOT EXISTS idx_documents_vehicle_id ON documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_transporter ON notifications(recipient_transporter_id) WHERE recipient_transporter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id, is_read) WHERE is_read = false;

-- =============================================
-- PHASE 5: ADD TRANSPORTER ONBOARDING COLUMNS
-- =============================================

ALTER TABLE transporters 
ADD COLUMN IF NOT EXISTS transporter_type VARCHAR(20) DEFAULT 'individual';

ALTER TABLE transporters 
ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(20) DEFAULT 'incomplete';

-- =============================================
-- PHASE 6: ADD VEHICLE/DRIVER DOCUMENT STATUS COLUMNS
-- =============================================

ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS document_status VARCHAR(30) DEFAULT 'document_missing';

ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS is_active_for_bidding BOOLEAN DEFAULT FALSE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS document_status VARCHAR(30) DEFAULT 'document_missing';

-- Set default vehicle status to pending_verification for new vehicles
ALTER TABLE vehicles
ALTER COLUMN status SET DEFAULT 'active';

-- =============================================
-- PHASE 7: UPDATE VEHICLE STATUS BASED ON RC VERIFICATION
-- =============================================

-- Set vehicles to approved if they have verified RC document
UPDATE vehicles v
SET document_status = 'approved',
    is_active_for_bidding = TRUE
WHERE EXISTS (
    SELECT 1 FROM documents d 
    WHERE d.vehicle_id = v.id 
    AND d.entity_type = 'vehicle'
    AND LOWER(d.document_type) IN ('rc', 'registration_certificate', 'vehicle_rc')
    AND d.status = 'verified'
);

-- Set drivers to approved if they have verified license
UPDATE users u
SET document_status = 'approved'
WHERE u.role = 'driver'
AND EXISTS (
    SELECT 1 FROM documents d 
    WHERE d.user_id = u.id 
    AND d.entity_type = 'driver'
    AND LOWER(d.document_type) IN ('driving_license', 'license', 'dl')
    AND d.status = 'verified'
);

-- =============================================
-- PHASE 8: ADD NOT NULL CONSTRAINTS (OPTIONAL - after fixing all orphans)
-- Uncomment and run only after confirming no orphaned data exists
-- =============================================

-- ALTER TABLE vehicles ALTER COLUMN transporter_id SET NOT NULL;
-- ALTER TABLE bids ALTER COLUMN transporter_id SET NOT NULL;

-- =============================================
-- PHASE 9: VERIFICATION SUMMARY
-- Run after all fixes to confirm
-- =============================================

SELECT 'Vehicles without transporter' as issue, COUNT(*) as count FROM vehicles WHERE transporter_id IS NULL
UNION ALL
SELECT 'Bids without transporter', COUNT(*) FROM bids WHERE transporter_id IS NULL
UNION ALL
SELECT 'Drivers without transporter', COUNT(*) FROM users WHERE role = 'driver' AND transporter_id IS NULL
UNION ALL
SELECT 'Vehicles pending verification', COUNT(*) FROM vehicles WHERE document_status = 'document_missing' OR document_status = 'verification_pending'
UNION ALL
SELECT 'Vehicles approved', COUNT(*) FROM vehicles WHERE document_status = 'approved'
UNION ALL
SELECT 'Drivers approved', COUNT(*) FROM users WHERE role = 'driver' AND document_status = 'approved';

-- Check vehicle distribution by status
SELECT status, COUNT(*) as count FROM vehicles GROUP BY status ORDER BY count DESC;

-- Check transporter distribution by type
SELECT transporter_type, COUNT(*) as count FROM transporters GROUP BY transporter_type;

-- Check transporter distribution by onboarding status
SELECT onboarding_status, COUNT(*) as count FROM transporters GROUP BY onboarding_status;
