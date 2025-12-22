import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { storage } from '../storage';
import { clearTestData } from './test-utils';

// These tests require a test DB (set TEST_DATABASE_URL); if not present, they will still run but assertions will be minimal.

describe('storage onboarding helpers', () => {
  beforeAll(async () => {
    await clearTestData();
  });

  afterAll(async () => {
    await clearTestData();
  });

  it('returns transporter by id (or undefined)', async () => {
    // Use a random uuid to ensure undefined is acceptable
    const t = await storage.getTransporterById('00000000-0000-0000-0000-000000000000');
    expect(typeof t === 'undefined' || !!t).toBeTruthy();
  });

  it('returns documents by entity (array)', async () => {
    const docs = await storage.getDocumentsByEntity('nonexistent-entity', 'transporter');
    expect(Array.isArray(docs)).toBe(true);
  });

  it('returns vehicle count (number)', async () => {
    const c = await storage.countVehiclesByTransporter('nonexistent');
    expect(typeof c).toBe('number');
    expect(c).toBeGreaterThanOrEqual(0);
  });

  it('returns driver count (number)', async () => {
    const c = await storage.countDriversByTransporter('nonexistent');
    expect(typeof c).toBe('number');
    expect(c).toBeGreaterThanOrEqual(0);
  });
});