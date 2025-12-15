import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Standard PostgreSQL connection for DigitalOcean Managed Database

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// SSL configuration for DigitalOcean Managed Database
// Priority: NODE_EXTRA_CA_CERTS > DIGITALOCEAN_CA_PATH > fallback
let sslConfig: { ca?: string; rejectUnauthorized: boolean } | boolean = false;

// In development, skip SSL for local databases
if (process.env.NODE_ENV === 'development' && process.env.DATABASE_URL.includes('localhost')) {
  sslConfig = false;
  console.log('[db] Using non-SSL connection for local development');
} else if (process.env.NODE_EXTRA_CA_CERTS) {
  // Node.js automatically loads the CA from NODE_EXTRA_CA_CERTS
  sslConfig = { rejectUnauthorized: true };
  console.log('[db] Using NODE_EXTRA_CA_CERTS for SSL verification');
} else {
  // Fallback: manually load CA certificate
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
  connectionString: process.env.DATABASE_URL,
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
