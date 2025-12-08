# Waykel Platform Architecture

## Overview

The Waykel ecosystem consists of three interconnected projects sharing a single PostgreSQL database:

| Project | Purpose | Environment | URL |
|---------|---------|-------------|-----|
| **waykel-dev** (this project) | Development & Testing | Development | Replit Dev |
| **waykeldriver** | Production Backend & Admin/Transporter/Driver Apps | Production | Replit Main |
| **waykelconnect** | Customer Portal Website | Production | dev.waykel.com |

---

## System Architecture Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              WAYKEL PLATFORM ECOSYSTEM                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    DEVELOPMENT FLOW
┌─────────────────┐      git push      ┌─────────────────┐      merge       ┌─────────────────┐
│                 │ ─────────────────► │                 │ ───────────────► │                 │
│  waykel-dev     │                    │  GitHub (dev)   │                  │  GitHub (main)  │
│  (This Replit)  │                    │     Branch      │                  │     Branch      │
│                 │ ◄───────────────── │                 │                  │                 │
└─────────────────┘      git pull      └─────────────────┘                  └────────┬────────┘
        │                                                                             │
        │                                                                      git sync
        │                                                                             │
        │                                                                             ▼
        │                                                                   ┌─────────────────┐
        │                                                                   │                 │
        │                                                                   │  waykeldriver   │
        │                                                                   │  (Production)   │
        │                                                                   │                 │
        │                                                                   └────────┬────────┘
        │                                                                             │
        └─────────────────────────────────┬───────────────────────────────────────────┘
                                          │
                                          ▼
                              ┌───────────────────────┐
                              │                       │
                              │   SHARED POSTGRESQL   │
                              │      DATABASE         │
                              │   (Neon Serverless)   │
                              │                       │
                              └───────────┬───────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
          ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
          │  waykeldriver   │   │  waykelconnect  │   │   Mobile Apps   │
          │   Backend API   │   │ Customer Portal │   │  (Capacitor)    │
          │   Express.js    │   │   dev.waykel.com│   │ Customer/Driver │
          └─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## Client Applications Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT APPLICATIONS                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐          │
│  │              │   │              │   │              │   │              │          │
│  │  SUPER ADMIN │   │ TRANSPORTER  │   │    DRIVER    │   │   CUSTOMER   │          │
│  │    PANEL     │   │   DASHBOARD  │   │     APP      │   │     APP      │          │
│  │              │   │              │   │              │   │              │          │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘          │
│         │                  │                  │                  │                   │
│         │                  │                  │                  │                   │
│  ┌──────▼───────┐   ┌──────▼───────┐   ┌──────▼───────┐   ┌──────▼───────┐          │
│  │   Web App    │   │   Web App    │   │ Mobile App   │   │ Mobile App   │          │
│  │   /admin/*   │   │/transporter/*│   │  Capacitor   │   │  Capacitor   │          │
│  │              │   │              │   │   Android    │   │   Android    │          │
│  │              │   │              │   │     iOS      │   │     iOS      │          │
│  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘          │
│                                                                   │                  │
│                                                          ┌───────▼────────┐         │
│                                                          │                │         │
│                                                          │ waykelconnect  │         │
│                                                          │ Customer Portal│         │
│                                                          │ dev.waykel.com │         │
│                                                          │                │         │
│                                                          └────────────────┘         │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ HTTPS API Calls
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            waykeldriver BACKEND API                                  │
│                                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Session   │  │    JWT      │  │    CORS     │  │  API Log    │                 │
│  │    Auth     │  │   Tokens    │  │   Config    │  │ Middleware  │                 │
│  │  (Browser)  │  │  (Portal)   │  │ (External)  │  │             │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                           EXPRESS.js REST API                                │    │
│  │   /api/auth/*  /api/users  /api/rides  /api/bids  /api/transporters  ...    │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ Drizzle ORM
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          SHARED POSTGRESQL DATABASE                                  │
│                              (Neon Serverless)                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              AUTHENTICATION FLOWS                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘

SESSION-BASED AUTH (Web Apps - Admin, Transporter, Driver)
┌──────────────┐     POST /api/auth/login     ┌──────────────┐
│   Browser    │ ───────────────────────────► │   Backend    │
│   Client     │                              │   Express    │
│              │ ◄─────────────────────────── │              │
└──────────────┘     Set-Cookie: session      └──────────────┘
       │
       │ All subsequent requests include session cookie
       ▼
┌──────────────┐     Cookie: session_id       ┌──────────────┐
│   Browser    │ ───────────────────────────► │   Backend    │
│   Request    │                              │ Validates    │
│              │ ◄─────────────────────────── │   Session    │
└──────────────┘     200 OK + Data            └──────────────┘


JWT TOKEN-BASED AUTH (Customer Portal - waykelconnect)
┌──────────────┐   POST /api/auth/token       ┌──────────────┐
│  Customer    │ ───────────────────────────► │   Backend    │
│   Portal     │   { phone, password }        │   Express    │
│              │ ◄─────────────────────────── │              │
└──────────────┘   { token: "jwt..." }        └──────────────┘
       │
       │ All subsequent requests include Bearer token
       ▼
┌──────────────┐   Authorization: Bearer jwt  ┌──────────────┐
│   Portal     │ ───────────────────────────► │   Backend    │
│   Request    │                              │ Validates    │
│              │ ◄─────────────────────────── │    JWT       │
└──────────────┘     200 OK + Data            └──────────────┘
```

---

## Smart Matching & Bidding Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          SMART MATCHING & BIDDING FLOW                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

CUSTOMER CREATES RIDE REQUEST
┌──────────────┐   POST /api/rides            ┌──────────────┐
│   Customer   │ ───────────────────────────► │   Backend    │
│  App/Portal  │   { pickup, drop,            │              │
│              │     vehicleType, weight }    │              │
└──────────────┘                              └──────┬───────┘
                                                     │
                                                     ▼
                                      ┌──────────────────────────┐
                                      │   AUTOMATIC MATCHING     │
                                      │   findMatchingTransporters│
                                      │                          │
                                      │  Scoring Algorithm:      │
                                      │  • Vehicle Type: 30 pts  │
                                      │  • Capacity: 25 pts      │
                                      │  • Proximity: 20 pts     │
                                      │  • Service Area: 15 pts  │
                                      │  • Base Location: 10 pts │
                                      │  • Route Pref: 20 pts    │
                                      │  ────────────────────    │
                                      │  Max Score: 100 pts      │
                                      └──────────┬───────────────┘
                                                 │
                                                 ▼
                              ┌───────────────────────────────────┐
                              │   CREATE NOTIFICATIONS            │
                              │   For each matching transporter   │
                              │   with matchScore & matchReason   │
                              └───────────────────────────────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    │                            │                            │
                    ▼                            ▼                            ▼
          ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
          │  Transporter 1  │          │  Transporter 2  │          │  Transporter N  │
          │  Score: 85/100  │          │  Score: 60/100  │          │  Score: 45/100  │
          │  Notification   │          │  Notification   │          │  Notification   │
          └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
                   │                            │                            │
                   ▼                            ▼                            ▼
          ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
          │   MARKETPLACE   │          │   MARKETPLACE   │          │   MARKETPLACE   │
          │   "For You"     │          │   "For You"     │          │   "For You"     │
          │   Tab shows     │          │   Tab shows     │          │   Tab shows     │
          │   matched rides │          │   matched rides │          │   matched rides │
          └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
                   │                            │                            │
                   └────────────────────────────┼────────────────────────────┘
                                                │
                                                ▼
                              ┌───────────────────────────────────┐
                              │   TRANSPORTERS PLACE BIDS        │
                              │   POST /api/bids                  │
                              │   { rideId, amount, vehicleId }   │
                              └───────────────────────────────────┘
                                                │
                                                ▼
                              ┌───────────────────────────────────┐
                              │   ADMIN REVIEWS & ACCEPTS BID    │
                              │   POST /api/bids/:id/accept      │
                              │   Ride assigned to transporter   │
                              └───────────────────────────────────┘
```

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          ENTITY RELATIONSHIP DIAGRAM                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                      USERS                                           │
│─────────────────────────────────────────────────────────────────────────────────────│
│ PK  id: varchar (UUID)                                                              │
│     name: text                                                                       │
│     username: text (unique)                                                          │
│     email: text (unique)                                                             │
│     phone: text (unique)                                                             │
│     password: text (hashed)                                                          │
│     role: enum (driver | transporter | admin | customer)                            │
│     isSuperAdmin: boolean                                                            │
│ FK  transporterId: varchar → transporters.id                                        │
│     isOnline: boolean                                                                │
│     rating: decimal(3,2)                                                             │
│     totalTrips: integer                                                              │
│     earningsToday: decimal(10,2)                                                     │
│     createdAt: timestamp                                                             │
└─────────────────────────────────────────────────────────────────────────────────────┘
                │                               │
                │ 1:N                           │ 1:1
                ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────────────────────────────┐
│         VEHICLES            │   │                    TRANSPORTERS                      │
│─────────────────────────────│   │─────────────────────────────────────────────────────│
│ PK  id: varchar (UUID)      │   │ PK  id: varchar (UUID)                              │
│ FK  userId: varchar → users │   │     companyName: text                               │
│ FK  transporterId → transp. │   │     ownerName: text                                 │
│     type: text              │   │     contact: text                                   │
│     plateNumber: text (uniq)│   │     email: text (unique)                            │
│     model: text             │   │     status: enum (active | pending | suspended)     │
│     capacity: text          │   │     fleetSize: integer                              │
│     capacityKg: integer     │   │     location: text                                  │
│     status: enum            │   │     basePincode: text                               │
│     currentLocation: text   │   │     baseCity: text                                  │
│     currentPincode: text    │   │     servicePincodes: text[]                         │
│     createdAt: timestamp    │   │     preferredRoutes: json                           │
└─────────────────────────────┘   │     isOwnerOperator: boolean                        │
          │                       │ FK  ownerDriverUserId: varchar → users.id           │
          │                       │     createdAt: timestamp                             │
          │                       └─────────────────────────────────────────────────────┘
          │                                        │
          │                                        │ 1:N
          │                                        ▼
          │                       ┌─────────────────────────────────────────────────────┐
          │                       │                      RIDES                           │
          │                       │─────────────────────────────────────────────────────│
          │                       │ PK  id: varchar (UUID)                              │
          │                       │     pickupLocation: text                            │
          │                       │     dropLocation: text                              │
          │                       │     pickupPincode: text                             │
          │                       │     dropPincode: text                               │
          │                       │     pickupTime: text                                │
          │                       │     dropTime: text                                  │
          │                       │     date: text                                      │
          │                       │     status: enum (pending|active|completed|...)     │
          │                       │     price: decimal(10,2)                            │
          │                       │     distance: text                                  │
          │                       │     cargoType: text                                 │
          │                       │     weight: text                                    │
          │                       │     weightKg: integer                               │
          │                       │     requiredVehicleType: text                       │
          │                       │     customerName: text                              │
          │                       │     customerPhone: text                             │
          │                       │     incentive: decimal(10,2)                        │
          │                       │ FK  transporterId → transporters.id                 │
          │                       │ FK  assignedDriverId → users.id                     │
          │                       │ FK  assignedVehicleId → vehicles.id                 │
          │                       │     acceptedBidId: varchar                          │
          │                       │ FK  createdById → users.id                          │
          │                       │     createdAt: timestamp                             │
          └───────────────────────┤─────────────────────────────────────────────────────┘
                                  │
                                  │ 1:N
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                      BIDS                                            │
│─────────────────────────────────────────────────────────────────────────────────────│
│ PK  id: varchar (UUID)                                                              │
│ FK  rideId: varchar → rides.id                                                      │
│ FK  userId: varchar → users.id                                                      │
│ FK  transporterId: varchar → transporters.id                                        │
│ FK  vehicleId: varchar → vehicles.id                                                │
│     amount: decimal(10,2)                                                            │
│     status: enum (pending | accepted | rejected)                                    │
│     createdAt: timestamp                                                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   DOCUMENTS                                          │
│─────────────────────────────────────────────────────────────────────────────────────│
│ PK  id: varchar (UUID)                                                              │
│ FK  userId: varchar → users.id (optional)                                           │
│ FK  transporterId: varchar → transporters.id (optional)                             │
│ FK  vehicleId: varchar → vehicles.id (optional)                                     │
│     entityType: enum (driver | vehicle | transporter)                               │
│     type: enum (license | aadhar | pan | insurance | fitness | rc | permit | ...)   │
│     documentName: text                                                               │
│     url: text                                                                        │
│     expiryDate: text                                                                 │
│     status: enum (verified | pending | expired | rejected)                          │
│     createdAt: timestamp                                                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                 NOTIFICATIONS                                        │
│─────────────────────────────────────────────────────────────────────────────────────│
│ PK  id: varchar (UUID)                                                              │
│ FK  recipientId: varchar → users.id                                                 │
│ FK  recipientTransporterId: varchar → transporters.id (optional)                    │
│     type: enum (new_booking | bid_placed | bid_accepted | bid_rejected | ...)       │
│     title: text                                                                      │
│     message: text                                                                    │
│ FK  rideId: varchar → rides.id (optional)                                           │
│ FK  bidId: varchar → bids.id (optional)                                             │
│     isRead: boolean                                                                  │
│     matchScore: integer (0-100)                                                      │
│     matchReason: text                                                                │
│     createdAt: timestamp                                                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   API_LOGS                                           │
│─────────────────────────────────────────────────────────────────────────────────────│
│ PK  id: varchar (UUID)                                                              │
│     method: text (GET | POST | PUT | PATCH | DELETE)                                │
│     path: text                                                                       │
│     statusCode: integer                                                              │
│     userId: varchar (no FK for performance)                                         │
│     userRole: text                                                                   │
│     origin: text                                                                     │
│     userAgent: text                                                                  │
│     ipAddress: text                                                                  │
│     requestBody: json (sanitized - no passwords/tokens)                             │
│     responseTime: integer (ms)                                                       │
│     errorMessage: text                                                               │
│     isExternal: boolean (true for waykelconnect requests)                           │
│     createdAt: timestamp                                                             │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Relationship Summary

| Parent Table | Child Table | Relationship | Foreign Key |
|-------------|-------------|--------------|-------------|
| users | vehicles | 1:N | vehicles.userId |
| users | rides (assigned) | 1:N | rides.assignedDriverId |
| users | rides (created) | 1:N | rides.createdById |
| users | bids | 1:N | bids.userId |
| users | documents | 1:N | documents.userId |
| users | notifications | 1:N | notifications.recipientId |
| transporters | users | 1:N | users.transporterId |
| transporters | vehicles | 1:N | vehicles.transporterId |
| transporters | rides | 1:N | rides.transporterId |
| transporters | bids | 1:N | bids.transporterId |
| transporters | documents | 1:N | documents.transporterId |
| transporters | notifications | 1:N | notifications.recipientTransporterId |
| vehicles | rides | 1:N | rides.assignedVehicleId |
| vehicles | bids | 1:N | bids.vehicleId |
| vehicles | documents | 1:N | documents.vehicleId |
| rides | bids | 1:N | bids.rideId |
| rides | notifications | 1:N | notifications.rideId |
| bids | notifications | 1:N | notifications.bidId |

---

## Deployment Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            DEPLOYMENT PROMOTION WORKFLOW                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

Step 1: Development (waykel-dev)
├── Make code changes
├── Test locally
└── Push to GitHub dev branch

Step 2: GitHub
├── Review changes in dev branch
├── Create Pull Request to main
├── Merge PR after review
└── Main branch updated

Step 3: Production Sync (waykeldriver)
├── Pull latest from main branch
├── Verify schema compatibility
├── Run npm run db:push if schema changed
└── Restart application

Step 4: Customer Portal (waykelconnect)
├── Already connected to same database
├── Update frontend code if needed
├── JWT authentication already configured
└── Verify API compatibility

IMPORTANT CHECKLIST:
□ Schema changes applied to shared database ONCE
□ All three projects using same DATABASE_URL
□ JWT_SECRET same across waykeldriver and waykelconnect
□ CORS configured for waykelconnect origin
□ API endpoints backward compatible
□ Test critical flows after deployment
```

---

## Environment Variables

| Variable | waykel-dev | waykeldriver | waykelconnect |
|----------|-----------|--------------|---------------|
| DATABASE_URL | ✓ (shared) | ✓ (shared) | ✗ (uses API) |
| JWT_SECRET | ✓ | ✓ | ✓ |
| SESSION_SECRET | ✓ | ✓ | ✗ |
| CORS_ORIGINS | dev only | production | N/A |
| NODE_ENV | development | production | production |

---

## API Endpoints Summary

### Authentication
- `POST /api/auth/login` - Session-based login (browser)
- `POST /api/auth/token` - JWT token login (portal)
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - Logout

### Users & Roles
- `GET /api/user` - Current user
- `GET /api/users` - All users (admin)
- `PATCH /api/users/:id` - Update user

### Transporters
- `GET /api/transporters` - All transporters
- `POST /api/transporters` - Create transporter
- `PATCH /api/transporters/:id/status` - Update status

### Vehicles
- `GET /api/vehicles` - All vehicles
- `POST /api/vehicles` - Add vehicle
- `PATCH /api/vehicles/:id` - Update vehicle

### Rides
- `GET /api/rides` - All rides
- `POST /api/rides` - Create ride (triggers matching)
- `PATCH /api/rides/:id/status` - Update status
- `GET /api/transporter/marketplace` - Marketplace with scores

### Bids
- `GET /api/bids` - Bids for ride
- `POST /api/bids` - Place bid
- `POST /api/bids/:id/accept` - Accept bid

### Notifications
- `GET /api/notifications` - User notifications
- `PATCH /api/notifications/:id/read` - Mark read

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/api-logs` - API request logs
