-- =====================================================
-- WAYKEL PRODUCTION DATABASE MIGRATION
-- Run this script on DigitalOcean Managed Database
-- =====================================================
-- Purpose: Enforce data ownership, add performance indexes,
-- and fix any orphaned records from before security enforcement
-- =====================================================

-- PHASE 1: PERFORMANCE INDEXES
-- These indexes dramatically speed up scoped queries

-- Index for customer trip history (GET /api/rides for customers)
CREATE INDEX IF NOT EXISTS idx_rides_created_by_id ON rides(created_by_id);

-- Index for transporter vehicle list (GET /api/transporter/vehicles)
CREATE INDEX IF NOT EXISTS idx_vehicles_transporter_id ON vehicles(transporter_id);

-- Index for transporter bids (GET /api/bids for transporters)
CREATE INDEX IF NOT EXISTS idx_bids_transporter_id ON bids(transporter_id);

-- Index for ride status filtering (marketplace, dashboard)
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);

-- Index for bid lookup by ride (customer viewing bids on their trip)
CREATE INDEX IF NOT EXISTS idx_bids_ride_id ON bids(ride_id);

-- Index for document verification queries
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, status);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_transporter_id ON documents(transporter_id);
CREATE INDEX IF NOT EXISTS idx_documents_vehicle_id ON documents(vehicle_id);

-- Index for driver lookup by transporter
CREATE INDEX IF NOT EXISTS idx_users_transporter_id ON users(transporter_id);

-- Index for transporter status filtering (active transporters for notifications)
CREATE INDEX IF NOT EXISTS idx_transporters_status ON transporters(status);

-- Index for vehicle status filtering (active vehicles for bidding)
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);


-- PHASE 2: DATA CLEANUP
-- Fix any orphaned records from before security enforcement

-- 2a. Find vehicles without transporterId (should not exist after fix)
-- These are legacy vehicles that need manual review
SELECT id, plate_number, user_id, transporter_id, created_at
FROM vehicles 
WHERE transporter_id IS NULL
ORDER BY created_at DESC;

-- 2b. Find bids without transporterId (should not exist after fix)
SELECT id, ride_id, user_id, transporter_id, vehicle_id, created_at
FROM bids 
WHERE transporter_id IS NULL
ORDER BY created_at DESC;

-- 2c. Find drivers without transporterId (may be freelance, that's okay)
SELECT id, name, phone, role, transporter_id, created_at
FROM users 
WHERE role = 'driver' AND transporter_id IS NULL
ORDER BY created_at DESC;


-- PHASE 3: AUTO-FIX ORPHANED RECORDS (OPTIONAL)
-- Only run these if you want to auto-assign ownership

-- 3a. For vehicles: assign transporter based on user's transporter
-- (Only run if you reviewed the SELECT above and it makes sense)
/*
UPDATE vehicles v
SET transporter_id = u.transporter_id
FROM users u
WHERE v.user_id = u.id 
  AND v.transporter_id IS NULL 
  AND u.transporter_id IS NOT NULL;
*/

-- 3b. For bids: assign transporter based on user's transporter
/*
UPDATE bids b
SET transporter_id = u.transporter_id
FROM users u
WHERE b.user_id = u.id 
  AND b.transporter_id IS NULL 
  AND u.transporter_id IS NOT NULL;
*/


-- PHASE 4: VERIFICATION STATS
-- Use these queries to verify the state of your data

-- Count of trips by customer (should have created_by_id)
SELECT 
  COUNT(*) as total_trips,
  COUNT(created_by_id) as trips_with_customer,
  COUNT(*) - COUNT(created_by_id) as orphaned_trips
FROM rides;

-- Count of vehicles by ownership
SELECT 
  COUNT(*) as total_vehicles,
  COUNT(transporter_id) as vehicles_with_transporter,
  COUNT(*) - COUNT(transporter_id) as orphaned_vehicles
FROM vehicles;

-- Count of bids by ownership
SELECT 
  COUNT(*) as total_bids,
  COUNT(transporter_id) as bids_with_transporter,
  COUNT(*) - COUNT(transporter_id) as orphaned_bids
FROM bids;

-- Transporter verification status breakdown
SELECT 
  status,
  documents_complete,
  is_verified,
  COUNT(*) as count
FROM transporters
GROUP BY status, documents_complete, is_verified
ORDER BY status;

-- Vehicle status breakdown by transporter
SELECT 
  t.company_name,
  v.status,
  COUNT(*) as vehicle_count
FROM vehicles v
JOIN transporters t ON v.transporter_id = t.id
GROUP BY t.company_name, v.status
ORDER BY t.company_name, v.status;


-- PHASE 5: ACTIVE SESSIONS CLEANUP (OPTIONAL)
-- Clear old sessions if users are having login issues
/*
DELETE FROM user_sessions 
WHERE expire < NOW();
*/


-- =====================================================
-- VERIFICATION CHECKLIST
-- Run these after migration to confirm everything works
-- =====================================================

-- 1. Confirm indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 2. Confirm no orphaned vehicles (should return 0)
SELECT COUNT(*) as orphaned_vehicles FROM vehicles WHERE transporter_id IS NULL;

-- 3. Confirm no orphaned bids (should return 0)
SELECT COUNT(*) as orphaned_bids FROM bids WHERE transporter_id IS NULL;

-- 4. Sample transporter with their assets
SELECT 
  t.id as transporter_id,
  t.company_name,
  t.status,
  t.documents_complete,
  (SELECT COUNT(*) FROM vehicles v WHERE v.transporter_id = t.id) as vehicle_count,
  (SELECT COUNT(*) FROM users u WHERE u.transporter_id = t.id AND u.role = 'driver') as driver_count,
  (SELECT COUNT(*) FROM bids b WHERE b.transporter_id = t.id) as bid_count
FROM transporters t
LIMIT 10;
