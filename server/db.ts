import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Note for self-hosting: 
// If migrating to standard PostgreSQL (not Neon), replace this file with:
// import { Pool } from 'pg';
// import { drizzle } from 'drizzle-orm/node-postgres';
// And remove the neonConfig.webSocketConstructor line

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Database pool configuration with safety limits
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout for new connections after 10s
  statement_timeout: 30000, // Cancel queries that run longer than 30s
});

// Pool error handler to prevent unhandled rejections
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

export const db = drizzle({ client: pool, schema });
