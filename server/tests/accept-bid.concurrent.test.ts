import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, clearTestData } from './test-utils';
import { storage } from '../storage';

let app: any;
let agentCustomer: any;
let agentA: any;
let agentB: any;
let ride: any;
let bidA: any;
let bidB: any;

beforeAll(async () => {
  app = await createApp();
  await clearTestData();

  agentCustomer = request.agent(app);
  agentA = request.agent(app);
  agentB = request.agent(app);

  // Register customer
  const custRes = await agentCustomer.post('/api/auth/register').send({
    name: 'Test Customer',
    phone: 'test-customer-1',
    password: 'password123',
    role: 'customer'
  });
  expect(custRes.status).toBe(200);

  // Create ride as customer
  const rideRes = await agentCustomer.post('/api/rides').send({
    pickupLocation: 'A',
    dropLocation: 'B',
    pickupTime: '09:00',
    dropTime: '18:00',
    date: '2025-12-23',
    price: '1000.00',
    distance: '100km',
    cargoType: 'general',
    weight: '100kg'
  });
  expect(rideRes.status).toBe(200);
  ride = rideRes.body;

  // Register transporter A
  const tA = await agentA.post('/api/auth/register').send({
    name: 'Transporter A',
    phone: 'test-transporter-a',
    password: 'password123',
    role: 'transporter',
    transporterType: 'business',
    companyName: 'T A'
  });
  expect(tA.status).toBe(200);

  // Create vehicle for A
  const vA = await agentA.post('/api/vehicles').send({
    type: 'truck',
    plateNumber: `TESTA-${Date.now()}`,
    model: 'TX',
    capacity: '10'
  });
  expect(vA.status).toBe(201);

  // Place bid A
  const bidResA = await agentA.post('/api/bids').send({
    rideId: ride.id,
    userId: tA.body.id,
    vehicleId: vA.body.id,
    amount: '900.00'
  });
  expect(bidResA.status).toBe(201);
  bidA = bidResA.body;

  // Register transporter B
  const tB = await agentB.post('/api/auth/register').send({
    name: 'Transporter B',
    phone: 'test-transporter-b',
    password: 'password123',
    role: 'transporter',
    transporterType: 'business',
    companyName: 'T B'
  });
  expect(tB.status).toBe(200);

  // Create vehicle for B
  const vB = await agentB.post('/api/vehicles').send({
    type: 'truck',
    plateNumber: `TESTB-${Date.now()}`,
    model: 'TX',
    capacity: '10'
  });
  expect(vB.status).toBe(201);

  // Place bid B
  const bidResB = await agentB.post('/api/bids').send({
    rideId: ride.id,
    userId: tB.body.id,
    vehicleId: vB.body.id,
    amount: '850.00'
  });
  expect(bidResB.status).toBe(201);
  bidB = bidResB.body;
});

afterAll(async () => {
  await clearTestData();
});

describe('Concurrent bid accept', () => {
  it('allows only one accept to succeed under parallel requests', async () => {
    // Fire two accepts in parallel
    const [r1, r2] = await Promise.all([
      agentCustomer.post(`/api/bids/${bidA.id}/accept`).send(),
      agentCustomer.post(`/api/bids/${bidB.id}/accept`).send()
    ]);

    // One should be 200, the other 409
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]);

    // Ensure ride has accepted bid set and biddingStatus closed
    const updatedRide = await storage.getRide(ride.id);
    expect(updatedRide?.biddingStatus).toBe('closed');
    expect(updatedRide?.acceptedBidId).toBeTruthy();
  });
});
