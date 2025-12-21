-- Vehicle Schema Migration for Standardized Categories and Dual Weight Units
-- Run this in the DigitalOcean database console

-- Add new columns to vehicles table
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS capacity_tons DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS vehicle_category TEXT,
ADD COLUMN IF NOT EXISTS vehicle_type_code TEXT,
ADD COLUMN IF NOT EXISTS body_type TEXT,
ADD COLUMN IF NOT EXISTS length_ft INTEGER,
ADD COLUMN IF NOT EXISTS axle_type TEXT,
ADD COLUMN IF NOT EXISTS fuel_type TEXT;

-- Add new columns to rides table
ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS weight_tons DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'kg';

-- Backfill capacity_tons from capacity_kg
UPDATE vehicles 
SET capacity_tons = ROUND(capacity_kg::decimal / 1000, 2)
WHERE capacity_kg IS NOT NULL AND capacity_tons IS NULL;

-- Backfill weight_tons from weight_kg
UPDATE rides 
SET weight_tons = ROUND(weight_kg::decimal / 1000, 2)
WHERE weight_kg IS NOT NULL AND weight_tons IS NULL;

-- Set weight_unit based on existing data
UPDATE rides 
SET weight_unit = CASE 
    WHEN weight ILIKE '%ton%' THEN 'tons'
    ELSE 'kg'
END
WHERE weight_unit IS NULL OR weight_unit = 'kg';
