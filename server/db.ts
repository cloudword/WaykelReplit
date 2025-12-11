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

// Load DigitalOcean CA certificate for proper SSL verification
const DEFAULT_CA_PATH = './certs/digitalocean-ca.crt';
const caPath = path.resolve(process.cwd(), process.env.DIGITALOCEAN_CA_PATH || DEFAULT_CA_PATH);

let sslConfig: { ca?: string; rejectUnauthorized: boolean } = { rejectUnauthorized: false };

if (fs.existsSync(caPath)) {
  try {
    const ca = fs.readFileSync(caPath, 'utf8');
    sslConfig = { ca, rejectUnauthorized: true };
    console.log('[db] Using DigitalOcean CA certificate for SSL');
  } catch (err) {
    console.warn('[db] Could not read CA file, using rejectUnauthorized: false');
  }
} else {
  console.log('[db] CA certificate not found at', caPath, '- using rejectUnauthorized: false');
}

// Database pool configuration with safety limits
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Pool error handler to prevent unhandled rejections
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

export const db = drizzle(pool, { schema });
