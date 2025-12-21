-- Universal Entity ID System Migration
-- Run this in DigitalOcean database console if drizzle-kit push times out

-- Add entity_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS entity_id TEXT UNIQUE;

-- Add entity_id column to transporters table  
ALTER TABLE transporters ADD COLUMN IF NOT EXISTS entity_id TEXT UNIQUE;

-- Add entity_id column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS entity_id TEXT UNIQUE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_entity_id ON users(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transporters_entity_id ON transporters(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_entity_id ON vehicles(entity_id) WHERE entity_id IS NOT NULL;
