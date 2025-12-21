-- Vehicle Schema Migration for Standardized Categories and Dual Weight Units
-- Run this in the DigitalOcean database console
-- Last Updated: 2025-01-21

-- =====================================================
-- STEP 1: Add new columns to vehicles table
-- =====================================================
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS capacity_kg INTEGER,
ADD COLUMN IF NOT EXISTS capacity_tons DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS vehicle_category TEXT,
ADD COLUMN IF NOT EXISTS vehicle_type_code TEXT,
ADD COLUMN IF NOT EXISTS body_type TEXT,
ADD COLUMN IF NOT EXISTS length_ft INTEGER,
ADD COLUMN IF NOT EXISTS axle_type TEXT,
ADD COLUMN IF NOT EXISTS fuel_type TEXT;

-- =====================================================
-- STEP 2: Add new columns to rides table
-- =====================================================
ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS weight_kg INTEGER,
ADD COLUMN IF NOT EXISTS weight_tons DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS required_vehicle_category TEXT;

-- =====================================================
-- STEP 3: Backfill vehicle capacity_tons from existing capacity field
-- Parse "5000 Kg" or "5 Tons" format
-- =====================================================
UPDATE vehicles 
SET capacity_kg = 
  CASE 
    WHEN capacity ILIKE '%kg%' THEN 
      NULLIF(REGEXP_REPLACE(capacity, '[^0-9.]', '', 'g'), '')::INTEGER
    WHEN capacity ILIKE '%ton%' THEN 
      (NULLIF(REGEXP_REPLACE(capacity, '[^0-9.]', '', 'g'), '')::DECIMAL * 1000)::INTEGER
    ELSE NULL
  END
WHERE capacity IS NOT NULL AND capacity_kg IS NULL;

UPDATE vehicles 
SET capacity_tons = ROUND(capacity_kg::decimal / 1000, 2)
WHERE capacity_kg IS NOT NULL AND capacity_tons IS NULL;

-- =====================================================
-- STEP 4: Backfill ride weight_kg and weight_tons from existing weight field
-- =====================================================
UPDATE rides 
SET weight_kg = 
  CASE 
    WHEN weight ILIKE '%kg%' THEN 
      NULLIF(REGEXP_REPLACE(weight, '[^0-9.]', '', 'g'), '')::INTEGER
    WHEN weight ILIKE '%ton%' THEN 
      (NULLIF(REGEXP_REPLACE(weight, '[^0-9.]', '', 'g'), '')::DECIMAL * 1000)::INTEGER
    ELSE NULL
  END
WHERE weight IS NOT NULL AND weight_kg IS NULL;

UPDATE rides 
SET weight_tons = ROUND(weight_kg::decimal / 1000, 2)
WHERE weight_kg IS NOT NULL AND weight_tons IS NULL;

-- Set weight_unit based on existing data
UPDATE rides 
SET weight_unit = CASE 
    WHEN weight ILIKE '%ton%' THEN 'tons'
    ELSE 'kg'
END
WHERE weight_unit IS NULL;

-- =====================================================
-- STEP 5: Map existing vehicle types to new category codes
-- =====================================================
UPDATE vehicles
SET vehicle_category = CASE
    WHEN type ILIKE '%tata ace%' OR type ILIKE '%bolero%' OR type ILIKE '%pickup%' THEN 'LCV'
    WHEN type ILIKE '%14ft%' OR type ILIKE '%17ft%' THEN 'MCV'
    WHEN type ILIKE '%20ft%' OR type ILIKE '%22ft%' OR type ILIKE '%32ft%' OR type ILIKE '%trailer%' THEN 'HCV'
    WHEN type ILIKE '%auto%' OR type ILIKE '%three%wheel%' THEN '3W'
    WHEN type ILIKE '%bike%' OR type ILIKE '%two%wheel%' THEN '2W'
    ELSE NULL
END
WHERE vehicle_category IS NULL AND type IS NOT NULL;

-- =====================================================
-- VERIFICATION QUERIES (run these to check results)
-- =====================================================
-- Check vehicle capacity conversion:
-- SELECT id, capacity, capacity_kg, capacity_tons FROM vehicles WHERE capacity IS NOT NULL LIMIT 10;

-- Check ride weight conversion:
-- SELECT id, weight, weight_kg, weight_tons, weight_unit FROM rides WHERE weight IS NOT NULL LIMIT 10;

-- Check vehicle category assignment:
-- SELECT type, vehicle_category, COUNT(*) FROM vehicles GROUP BY type, vehicle_category ORDER BY type;
