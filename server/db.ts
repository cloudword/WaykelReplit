import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Standard PostgreSQL connection - supports both Replit and DigitalOcean

// Detect Replit's Neon database (PGHOST contains neon.tech)
const isReplitNeonDb = process.env.PGHOST?.includes('neon.tech');

// In development, prefer Replit's Neon database if available
// In production (on DigitalOcean), use DATABASE_URL which points to DO managed DB
let connectionString: string;

if (process.env.NODE_ENV === 'development' && isReplitNeonDb && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
  // Construct connection string from Replit's PG variables
  const port = process.env.PGPORT || '5432';
  connectionString = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${port}/${process.env.PGDATABASE}?sslmode=require`;
  console.log('[db] Using Replit Neon database for development');
} else if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
} else {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect if using Replit's local or Neon database
const isReplitDb = connectionString.includes('neon.tech') ||
                   connectionString.includes('localhost') || 
                   connectionString.includes('@127.0.0.1');

// SSL configuration
// - Replit database: No SSL needed
// - DigitalOcean: Requires SSL with CA certificate
let sslConfig: { ca?: string; rejectUnauthorized: boolean } | boolean = false;

if (isReplitDb && connectionString.includes('neon.tech')) {
  // Neon requires SSL but handles it automatically with sslmode=require in connection string
  sslConfig = { rejectUnauthorized: true };
  console.log('[db] Using Replit Neon database with SSL');
} else if (isReplitDb) {
  sslConfig = false;
  console.log('[db] Using local database (no SSL)');
} else if (process.env.NODE_EXTRA_CA_CERTS) {
  // Node.js automatically loads the CA from NODE_EXTRA_CA_CERTS
  sslConfig = { rejectUnauthorized: true };
  console.log('[db] Using NODE_EXTRA_CA_CERTS for SSL verification');
} else {
  // Fallback: manually load CA certificate for DigitalOcean
  const DEFAULT_CA_PATH = './certs/digitalocean-ca.crt';
  const caPath = path.resolve(process.cwd(), process.env.DIGITALOCEAN_CA_PATH || DEFAULT_CA_PATH);
  
  if (fs.existsSync(caPath)) {
    try {
      const ca = fs.readFileSync(caPath, 'utf8');
      sslConfig = { ca, rejectUnauthorized: true };
      console.log('[db] Using DigitalOcean CA certificate for SSL');
    } catch (err) {
      console.warn('[db] Could not read CA file, using rejectUnauthorized: false');
      sslConfig = { rejectUnauthorized: false };
    }
  } else {
    console.warn('[db] CA certificate not found, using rejectUnauthorized: false');
    sslConfig = { rejectUnauthorized: false };
  }
}

// Database pool configuration with safety limits
export const pool = new Pool({ 
  connectionString,
  ssl: sslConfig,
  max: 5, // Reduced to prevent pool exhaustion
  min: 1, // Keep at least 1 connection alive
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: false,
});

// Pool error handler to prevent unhandled rejections
pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

// Test connection on startup
pool.connect()
  .then(client => {
    console.log('[db] Successfully connected to database');
    client.release();
  })
  .catch(err => {
    console.error('[db] Failed to connect to database:', err.message);
  });

// Safe wrapper for non-critical database operations (like logging)
// Prevents failures from crashing the application
export async function safeLog<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error('[db] safeLog operation failed:', err);
    return null;
  }
}

export const db = drizzle(pool, { schema });

async function ensureSchemaPatches(): Promise<void> {
  if (process.env.ALLOW_RUNTIME_SCHEMA_PATCHES !== "true") {
    console.warn("[db] Runtime schema patches are disabled. Apply SQL migrations instead.");
    return;
  }

  const statements = [
    // Documents table on prod is missing this column even though schema expects it
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified'",
    // Ensure customer linkage columns exist on rides for customer dashboards
    "ALTER TABLE rides ADD COLUMN IF NOT EXISTS customer_id varchar",
    "ALTER TABLE rides ADD COLUMN IF NOT EXISTS customer_entity_id text"
  ];

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (err) {
      console.error('[db] Failed to apply schema patch:', err);
    }
  }
}

void ensureSchemaPatches();
