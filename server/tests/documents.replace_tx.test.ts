import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { storage } from '../storage';
import { clearTestData } from './test-utils';

let existingDoc: any;

beforeAll(async () => {
  await clearTestData();

  // Create a user and a vehicle for the document
  const user = await storage.createUser({ name: 'Doc Test', phone: `test-doc-${Date.now()}`, password: 'x', role: 'driver' });
  const vehicle = await storage.createVehicle({ userId: user.id, type: 'truck', plateNumber: `DOC-${Date.now()}`, model: 'X', capacity: '10' });

  // Create an existing document
  existingDoc = await storage.createDocument({
    type: 'photo',
    url: 'test://old',
    entityType: 'vehicle',
    vehicleId: vehicle.id,
    documentName: 'Photo',
    status: 'pending'
  } as any);
});

afterAll(async () => {
  await clearTestData();
});

describe('replaceDocumentAtomically', () => {
  it('does not mark old doc replaced if new insert fails', async () => {
    // Introduce invalid vehicleId to cause FK failure
    let threw = false;
    try {
      await storage.replaceDocumentAtomically(existingDoc.id, {
        type: 'photo',
        url: 'test://new',
        entityType: 'vehicle',
        vehicleId: 'non-existent-vehicle', // should cause FK violation
        documentName: 'Photo New',
        status: 'pending'
      } as any, null);
    } catch (e) {
      threw = true;
    }

    expect(threw).toBe(true);

    const stillOld = await storage.getDocumentById(existingDoc.id);
    expect(stillOld).toBeDefined();
    expect(stillOld?.status).not.toBe('replaced');
    expect(stillOld?.replacedById).toBeNull();
  });
});
