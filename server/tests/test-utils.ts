import { pool } from '../db';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';

export async function createApp() {
  // Allow tests to override DATABASE_URL by setting TEST_DATABASE_URL in env
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }

  const app = express();
  const httpServer = createServer(app);
  // registerRoutes will attach all routes and middleware
  await registerRoutes(httpServer, app);
  return app;
}

export async function clearTestData() {
  // We assume tests run against an isolated test DB.
  // Remove any records created during tests. Keep destructive operations scoped.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Delete notifications, bids, documents, vehicles, rides, users created during tests
    // Test records will use phone or email starting with "test-" or document urls prefixed with "test://"
    await client.query("DELETE FROM notifications WHERE created_at > NOW() - INTERVAL '1 day'");
    await client.query("DELETE FROM bids WHERE created_at > NOW() - INTERVAL '1 day'");
    await client.query("DELETE FROM documents WHERE created_at > NOW() - INTERVAL '1 day'");
    await client.query("DELETE FROM rides WHERE created_at > NOW() - INTERVAL '1 day'");
    await client.query("DELETE FROM vehicles WHERE created_at > NOW() - INTERVAL '1 day'");
    await client.query("DELETE FROM transporters WHERE created_at > NOW() - INTERVAL '1 day'");
    await client.query("DELETE FROM users WHERE created_at > NOW() - INTERVAL '1 day'");
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
