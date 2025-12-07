# Customer App Feature Parity - Mobile App vs Portal

This document ensures the Customer Mobile App (Capacitor) and Customer Portal (separate Replit project) have identical features and proper bidirectional sync.

## How Sync Works

Both apps connect to the **same Waykel backend API** and **same PostgreSQL database**:

```
┌─────────────────────┐     ┌─────────────────────┐
│   Customer Portal   │     │  Customer Mobile    │
│  (Separate Replit)  │     │    (Capacitor)      │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           └───────────┬───────────────┘
                       ▼
            ┌─────────────────────┐
            │   Waykel Backend    │
            │  /api/* endpoints   │
            └──────────┬──────────┘
                       ▼
            ┌─────────────────────┐
            │  PostgreSQL (Neon)  │
            │  Single database    │
            └─────────────────────┘
```

**Result**: Same customer can use either platform and see the same data in real-time.

---

## Feature Parity Matrix

| Feature | Mobile App | Portal | API Endpoint | Status |
|---------|------------|--------|--------------|--------|
| **Authentication** |
| Register | ✅ | ✅ | `POST /api/auth/register` | Synced |
| Login | ✅ | ✅ | `POST /api/auth/login` | Synced |
| Logout | ✅ | ✅ | `POST /api/auth/logout` | Synced |
| Session Check | ✅ | ✅ | `GET /api/auth/session` | Synced |
| Change Password | ⚠️ UI only | ✅ | `POST /api/auth/change-password` | Needs UI |
| **Booking** |
| Create Booking | ✅ | ✅ | `POST /api/rides` | Synced |
| Pickup/Drop Location | ✅ | ✅ | ride.pickupLocation/dropLocation | Synced |
| Pickup/Drop Pincode | ✅ | ✅ | ride.pickupPincode/dropPincode | Synced |
| Cargo Type | ✅ | ✅ | ride.cargoType | Synced |
| Weight (kg) | ✅ | ✅ | ride.weight/weightKg | Synced |
| Vehicle Type | ✅ | ✅ | ride.requiredVehicleType | Synced |
| Date & Time | ✅ | ✅ | ride.date/pickupTime | Synced |
| Budget Price | ✅ | ✅ | ride.price | Synced |
| Auto-notify Transporters | ✅ | ✅ | `POST /api/rides/:id/notify-transporters` | Synced |
| **Ride Management** |
| View All Rides | ✅ | ✅ | `GET /api/rides?createdById=X` | Synced |
| Filter by Status | ✅ | ✅ | Client-side filtering | Synced |
| View Ride Details | ✅ | ✅ | Card expansion | Synced |
| View Bids on Ride | ✅ | ✅ | `GET /api/rides/:id/cheapest-bids` | Synced |
| Cancel Ride | ⚠️ Missing | ⚠️ Missing | Needs implementation | Todo |
| **Profile** |
| View Profile | ✅ | ✅ | localStorage + session | Synced |
| Edit Profile | ⚠️ UI only | ⚠️ UI only | Needs `PATCH /api/users/:id` | Todo |
| Wallet Balance | ✅ Placeholder | ✅ Placeholder | Not implemented | Future |
| Saved Addresses | ⚠️ UI only | ⚠️ UI only | Not implemented | Future |
| **Notifications** |
| View Notifications | ✅ | ✅ | Shared component | Synced |
| Push Notifications | ✅ Native | ❌ Web only | FCM/APNs needed | Mobile-only |
| **Native Features** |
| GPS Location | ✅ | ❌ | Capacitor Geolocation | Mobile-only |
| Camera | ✅ | ❌ | Capacitor Camera | Mobile-only |

---

## Authentication Flow

Both apps use the same authentication:

```typescript
// Login (both apps)
const response = await fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include', // CRITICAL: sends session cookie
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone, password })
});

// Session is stored server-side, cookie sent with all requests
```

**Important**: Both apps MUST use `credentials: 'include'` on all fetch calls.

---

## Data Synchronization

### Real-Time Sync

Currently, sync happens on page load/refresh. For near-real-time sync:

1. **Polling** (simple): Refetch data every 30 seconds
2. **React Query** (better): Already using `useQuery` with automatic refetching
3. **WebSockets** (future): Push updates from server to clients

### Current Implementation

```typescript
// Mobile App - customer/rides.tsx
useEffect(() => {
  const fetchRides = async () => {
    const allRides = await api.rides.list();
    const myRides = allRides.filter(r => 
      r.createdById === user?.id || r.customerPhone === user?.phone
    );
    setRides(myRides);
  };
  fetchRides();
}, []);
```

**This same logic runs on both platforms**, fetching from the same database.

---

## Shared API Client

Both apps should use this shared API structure:

```typescript
// lib/api.ts - Used by both Mobile App and Portal

export const api = {
  auth: {
    login: async (phone: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      return res.json();
    },
    register: async (data: RegisterData) => { /* ... */ },
    logout: async () => { /* ... */ },
    session: async () => { /* ... */ },
  },
  rides: {
    list: async () => { /* GET /api/rides */ },
    create: async (data: RideData) => { /* POST /api/rides */ },
    getCheapestBids: async (rideId: string, limit: number) => { /* ... */ },
  },
  // ... more endpoints
};
```

---

## Portal Integration Checklist

When building/updating the Customer Portal, ensure:

- [ ] Uses same API base URL as mobile app
- [ ] Includes `credentials: 'include'` on all fetch calls
- [ ] Stores user in localStorage after login (same key: `currentUser`)
- [ ] Filters rides by `createdById` matching logged-in user
- [ ] Uses same phone number format for registration
- [ ] Handles same error codes from API

---

## Environment Configuration

### Mobile App (Capacitor)

The mobile app's API URL is relative (served from same origin):

```typescript
// Works when app is loaded from Waykel server
fetch('/api/rides', { credentials: 'include' });
```

### Customer Portal (Separate Project)

The portal needs the full API URL:

```typescript
const API_BASE = process.env.WAYKEL_API_URL || 'https://waykel-app.replit.app';

fetch(`${API_BASE}/api/rides`, { credentials: 'include' });
```

**CORS is already configured** to allow the portal origin.

---

## Testing Sync

To verify bidirectional sync:

1. **Login** on both mobile app and portal with same phone/password
2. **Create booking** on mobile app
3. **Check rides list** on portal - booking should appear
4. **View bids** on portal for the new booking
5. **Create another booking** on portal
6. **Check rides list** on mobile app - should show both bookings

---

## Future Enhancements

1. **Real-time Updates**: Add WebSocket connection for instant sync
2. **Offline Support**: Cache rides locally on mobile, sync when online
3. **Edit Profile**: Add API endpoint and UI for profile updates
4. **Cancel Ride**: Add cancel functionality with confirmation
5. **Saved Addresses**: Store frequently used locations
6. **Wallet System**: Payment integration for prepaid bookings
