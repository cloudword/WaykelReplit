import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Check if using Neon serverless or standard PostgreSQL
const isNeonServerless = process.env.DATABASE_URL?.includes('neon.tech') || 
                         process.env.USE_NEON_SERVERLESS === 'true';

let pool: any;
let db: any;

if (isNeonServerless) {
  // Use Neon serverless driver with WebSocket support
  const { Pool, neonConfig } = require('@neondatabase/serverless');
  const { drizzle } = require('drizzle-orm/neon-serverless');
  const ws = require('ws');
  
  neonConfig.webSocketConstructor = ws;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  // Use standard PostgreSQL driver (node-postgres)
  const { Pool: PgPool } = require('pg');
  const { drizzle: drizzlePg } = require('drizzle-orm/node-postgres');
  
  pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePg({ client: pool, schema });
}

export { pool, db };
