# Waykel - System Architecture Documentation

## 🏗️ System Overview

Waykel is a commercial vehicle logistics platform built with a modern full-stack architecture. It consists of three distinct user roles (Driver, Transporter, Super Admin) with a centralized PostgreSQL database, Express.js backend, and React frontend.

```
┌─────────────────────────────────────────────────────────────────┐
│                        WAYKEL PLATFORM                          │
├──────────────────┬──────────────────┬──────────────────────────┤
│   DRIVER APP     │ TRANSPORTER PANEL│    SUPER ADMIN PANEL     │
│   (Mobile)       │   (Web)          │      (Web)               │
│   - React        │   - React        │      - React             │
│   - Wouter       │   - Wouter       │      - Wouter            │
│   - TailwindCSS  │   - TailwindCSS  │      - TailwindCSS       │
└──────────────────┴──────────────────┴──────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              REST API LAYER (Express.js)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐│
│  │ Auth Routes  │ │ Ride Routes  │ │ Transporter/Bid Routes  ││
│  │ - Login      │ │ - List       │ │ - Create                ││
│  │ - Register   │ │ - Create     │ │ - Approve/Reject        ││
│  │ - JWT/Bcrypt │ │ - Update     │ │ - Status Updates        ││
│  └──────────────┘ └──────────────┘ └──────────────────────────┘│
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐│
│  │ Bid Routes   │ │ Vehicle Rts  │ │ User Management Routes  ││
│  │ - Place Bid  │ │ - List       │ │ - Online Status         ││
│  │ - Approve    │ │ - Create     │ │ - Profile Updates       ││
│  │ - Status     │ │ - Update     │ └──────────────────────────┘│
│  └──────────────┘ └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│          DATABASE LAYER (Drizzle ORM + PostgreSQL)              │
│                     (Neon-backed)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema & Relationships

### Core Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS TABLE                              │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID)          | Primary Key                                │
│ name               | User full name                             │
│ email              | Unique email address                       │
│ phone              | Unique phone number (login credential)     │
│ password           | Bcrypt hashed                              │
│ role               | 'driver' | 'transporter' | 'admin'         │
│ transporterId (FK) | References transporters.id (nullable)      │
│ isOnline           | Boolean (driver status)                    │
│ rating             | Decimal (1-5 stars)                       │
│ totalTrips         | Integer (ride count)                       │
│ earningsToday      | Decimal (daily earnings)                   │
│ createdAt          | Timestamp                                  │
└─────────────────────────────────────────────────────────────────┘

         ▼                          ▼                    ▼
    ┌─────────────────┐    ┌─────────────────┐   ┌──────────────┐
    │ TRANSPORTERS    │    │   VEHICLES      │   │   DOCUMENTS  │
    │ (Companies)     │    │   (Trucks)      │   │  (Licenses)  │
    │                 │    │                 │   │              │
    │ id              │    │ id              │   │ id           │
    │ companyName     │    │ userId (FK)     │◄──│ userId (FK)  │
    │ ownerName       │    │ type            │   │ transporterId│
    │ contact         │    │ plateNumber     │   │ type         │
    │ email           │    │ model           │   │ status       │
    │ status          │    │ capacity        │   │ expiryDate   │
    │ fleetSize       │    │ status          │   │ url          │
    │ location        │    │                 │   │              │
    │ baseCity        │    │                 │   │              │
    │ preferredRoutes │    │                 │   │              │
    └─────────────────┘    └─────────────────┘   └──────────────┘
```

### Rides & Bidding Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                      RIDES TABLE                                │
│  (Represents a load/delivery to be fulfilled)                   │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID)              | Primary Key                            │
│ pickupLocation         | Start location (address text)          │
│ dropLocation           | End location (address text)            │
│ pickupTime             | Scheduled pickup time                  │
│ dropTime               | Scheduled drop time                    │
│ date                   | Ride date                              │
│ status                 | 'pending' | 'bid_placed' | 'active'    │
│                        | 'completed' | 'cancelled' | 'scheduled'│
│ price                  | Base fare amount (Decimal)             │
│ distance               | Route distance text                    │
│ cargoType              | Type of cargo (Electronics, etc)       │
│ weight                 | Weight specification                   │
│ customerName           | Customer/shipper name                  │
│ customerPhone          | Contact number                         │
│ incentive              | 5% partner incentive (nullable)        │
│ transporterId (FK)     | Assigned transporter                   │
│ assignedDriverId (FK)  | Assigned driver (after bid approval)   │
│ assignedVehicleId (FK) | Assigned vehicle (after bid approval)  │
│ createdById (FK)       | Admin who created the ride             │
│ createdAt              | Timestamp                              │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │                                    │
         └────────────┬───────────────────────┘
                      ▼
        ┌──────────────────────────────┐
        │      BIDS TABLE              │
        │  (Driver/Transporter Bids)   │
        ├──────────────────────────────┤
        │ id (UUID)                    │
        │ rideId (FK) ──┐              │
        │ userId (FK)   │ References   │
        │ vehicleId(FK) │ USERS        │
        │ amount        │              │
        │ status        │ 'pending'    │
        │               │ 'accepted'   │
        │               │ 'rejected'   │
        │ createdAt     │              │
        └──────────────────────────────┘
```

### Complete Data Flow Diagram

```
         DRIVER LOGS IN
              │
              ▼
    ┌─────────────────────┐
    │  Fetch Rides        │
    │  (status=pending)   │
    └─────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │  Display Available  │
    │  Rides (No Bids)    │
    └─────────────────────┘
              │
         DRIVER ACCEPTS RIDE & SELECTS VEHICLE
              │
              ▼
    ┌─────────────────────────────────┐
    │  Create BID                     │
    │  ├─ rideId                      │
    │  ├─ userId (driver)             │
    │  ├─ vehicleId (selected)        │
    │  ├─ amount (bid price)          │
    │  └─ status = 'pending'          │
    └─────────────────────────────────┘
              │
              ▼
    ┌─────────────────────────────────┐
    │ Update Ride Status              │
    │ status = 'bid_placed'           │
    └─────────────────────────────────┘
              │
              ▼
    ┌─────────────────────────────────┐
    │  Admin Views Bids               │
    │  (Bids for rides with status    │
    │   = 'bid_placed')               │
    └─────────────────────────────────┘
              │
         ADMIN APPROVES/REJECTS
              │
              ├─── APPROVE ───┐
              │                │
              ▼                │
    ┌──────────────────────┐   │
    │ Update Bid Status    │   │
    │ status='accepted'    │   │
    └──────────────────────┘   │
              │                │
              ▼                │
    ┌──────────────────────┐   │
    │ Assign Driver        │   │
    │ - assignedDriverId   │   │
    │ - assignedVehicleId  │   │
    │ - status='active'    │   │
    └──────────────────────┘   │
              │                │
              ▼                │
    ┌──────────────────────┐   │
    │ Driver Sees Active   │   │
    │ Ride in Dashboard    │   │
    └──────────────────────┘   │
                               │
                      REJECT ──┴─────┐
                                     │
                                     ▼
                        ┌──────────────────────┐
                        │ Update Bid Status    │
                        │ status='rejected'    │
                        └──────────────────────┘
                                     │
                                     ▼
                        ┌──────────────────────┐
                        │ Ride stays pending,  │
                        │ awaits new bids      │
                        └──────────────────────┘
```

---

## 🔌 API Endpoints Reference

### Authentication Endpoints
```
POST /api/auth/register
  ├─ Body: { name, email, phone, password, role }
  └─ Returns: User (without password)

POST /api/auth/login
  ├─ Body: { phone, password }
  └─ Returns: User object (if credentials valid)
```

### Ride Endpoints
```
GET /api/rides?status=pending&driverId=xxx
  └─ Returns: Array of Ride objects

GET /api/rides/:id
  └─ Returns: Single Ride object

POST /api/rides
  ├─ Body: InsertRide (all ride details)
  └─ Returns: Created Ride

PATCH /api/rides/:id/status
  ├─ Body: { status: string }
  └─ Triggers: Ride status update

PATCH /api/rides/:id/assign
  ├─ Body: { driverId, vehicleId }
  └─ Assigns driver & sets status='active'
```

### Bid Endpoints
```
GET /api/bids?rideId=xxx&userId=yyy
  └─ Returns: Array of Bid objects

POST /api/bids
  ├─ Body: { rideId, userId, vehicleId, amount }
  └─ Also updates: Ride status → 'bid_placed'

PATCH /api/bids/:id/status
  ├─ Body: { status: 'accepted'|'rejected' }
  └─ If accepted: Also calls /api/rides/:id/assign
```

### Vehicle Endpoints
```
GET /api/vehicles?userId=xxx&transporterId=yyy
  └─ Returns: Array of Vehicle objects

POST /api/vehicles
  ├─ Body: { userId/transporterId, type, plateNumber, model, capacity }
  └─ Returns: Created Vehicle
```

### Transporter Endpoints
```
GET /api/transporters?status=pending_approval
  └─ Returns: Array of Transporter objects

POST /api/transporters
  ├─ Body: InsertTransporter details
  └─ Returns: Created Transporter

PATCH /api/transporters/:id/status
  ├─ Body: { status: 'active'|'suspended'|'pending_approval' }
  └─ Updates transporter status
```

### User Endpoints
```
PATCH /api/users/:id/online-status
  ├─ Body: { isOnline: boolean }
  └─ Updates driver online/offline status
```

---

## 🖥️ Frontend Architecture

### File Structure
```
client/src/
├── pages/
│   ├── auth.tsx                    # Login/Register (All roles)
│   ├── splash.tsx                  # Splash screen
│   ├── driver-dashboard.tsx        # Driver home (Lists pending rides)
│   ├── driver-earnings.tsx         # Driver earnings view
│   ├── driver-profile.tsx          # Driver profile
│   ├── driver-rides.tsx            # Driver ride history
│   ├── active-ride.tsx             # Ongoing ride tracking
│   ├── book-ride.tsx               # Manual ride booking
│   ├── notifications.tsx           # Notification center
│   ├── transporter/
│   │   ├── dashboard.tsx           # Transporter home
│   │   └── bids.tsx                # Transporter bid management
│   └── admin/
│       ├── dashboard.tsx           # Admin home (KPIs)
│       ├── rides.tsx               # Admin bid approval UI
│       ├── drivers.tsx             # Driver management
│       ├── transporters.tsx        # Transporter approvals
│       ├── vehicles.tsx            # Vehicle registry
│       └── calendar.tsx            # Trip calendar
│
├── lib/
│   ├── api.ts                      # API client (all routes)
│   ├── mockData.ts                 # Legacy mock data (deprecated)
│   └── constants.ts                # App constants
│
├── components/
│   ├── layout/
│   │   ├── mobile-nav.tsx          # Mobile bottom nav
│   │   └── admin-sidebar.tsx       # Admin left sidebar
│   ├── ride-card.tsx               # Ride display component
│   ├── vehicle-selector.tsx        # Vehicle selection dialog
│   ├── ui/                         # Radix UI components
│   └── ...
│
├── App.tsx                         # Main router setup
└── index.css                       # Global styles
```

### Component Data Flow

```
┌─────────────────────────────────────────┐
│  App.tsx (Router Setup)                 │
│  - Wouter routing config                │
│  - Role-based page routing              │
└──────────────────────────────────────────┘
           │
    ┌──────┴───────┬────────────┬──────────┐
    │              │            │          │
    ▼              ▼            ▼          ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐
│ Auth    │  │ Driver   │  │Transport │  │Admin       │
│ Page    │  │Dashboard │  │Dashboard │  │Dashboard   │
│         │  │          │  │          │  │            │
│- Login  │  │- Fetch   │  │- Display │  │- Stats KPI │
│- Register  │  │  rides  │  │transport│  │- Bid mgmt  │
└─────────┘  │- Display │  │ops      │  │- Driver    │
             │  rides   │  │         │  │ approval   │
             │- Accept  │  └─────────┘  │- Reports   │
             │  ride    │               └────────────┘
             └──────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  lib/api.ts        │
         │  (API Client)      │
         │                    │
         │ - api.rides.list() │
         │ - api.bids.create()│
         │ - api.auth.login() │
         │ - ...              │
         └────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  Express Server    │
         │  (Port 5000)       │
         └────────────────────┘
```

---

## 🔐 Authentication & Authorization Flow

```
USER INTERACTION:
  1. User enters phone + password
  2. Clicks "Login"
           │
           ▼
CLIENT (browser):
  1. Call: api.auth.login(phone, password)
  2. POST /api/auth/login with credentials
           │
           ▼
SERVER (Express):
  1. Receive { phone, password }
  2. Query: users where phone = input.phone
  3. If user exists:
     - bcrypt.compare(input.password, user.password)
     - If match: Return user (WITHOUT password)
     - If no match: Return { error: "Invalid credentials" }
  4. If user not exists: Return { error: "Invalid credentials" }
           │
           ▼
CLIENT (browser):
  1. Receive response
  2. If error: Show toast notification
  3. If success:
     - Save user to localStorage
     - Route to appropriate dashboard:
       * role='driver' → /driver
       * role='transporter' → /transporter
       * role='admin' → /admin
           │
           ▼
SUBSEQUENT REQUESTS:
  1. Load user from localStorage
  2. Include userId in API requests
  3. Query filters by this userId
     (Example: GET /api/bids?userId=xxx)
```

**Note:** Current implementation uses localStorage (stateless auth). For production:
- Implement JWT tokens in Authorization headers
- Use HTTP-only cookies for refresh tokens
- Add session middleware to Express

---

## 🎯 Complete User Workflows

### Workflow 1: Driver Accepting a Load

```
Step 1: DRIVER LOGIN
├─ POST /api/auth/login { phone, password }
├─ Response: User { id, name, role='driver', ... }
└─ localStorage.setItem('currentUser', JSON.stringify(user))

Step 2: DRIVER DASHBOARD LOADS
├─ GET /api/rides?status=pending
├─ Displays rides that no one has bid on
└─ Driver sees: pickup, drop, cargo, price

Step 3: DRIVER SELECTS RIDE & VEHICLE
├─ Click "Accept Ride"
├─ Dialog opens: "Select Vehicle"
├─ Driver picks: "MH01AB1234 - Ashok Leyland 16T"
└─ Driver enters: Bid amount (≥ base price)

Step 4: CREATE BID
├─ POST /api/bids
├─ Body: {
│   rideId: "ride-123",
│   userId: "driver-456",
│   vehicleId: "vehicle-789",
│   amount: 2500
│ }
├─ ALSO: PATCH /api/rides/ride-123/status { status: 'bid_placed' }
└─ Response: Bid { id, status='pending', ... }

Step 5: BID WAITS FOR ADMIN APPROVAL
├─ Driver sees: Ride → "Awaiting Admin Approval"
└─ Notification: "Bid placed, waiting for approval"

Step 6: ADMIN REVIEW (Separate user)
├─ Admin logs in: POST /api/auth/login { phone, password }
├─ GET /api/rides?status=bid_placed
├─ Admin sees: Ride with all bids listed
├─ Admin clicks: "Approve" on selected bid
└─ PATCH /api/bids/bid-id/status { status='accepted' }

Step 7: SYSTEM ASSIGNS DRIVER
├─ Server receives approve request
├─ PATCH /api/rides/ride-123/assign
├─ Body: { driverId: "driver-456", vehicleId: "vehicle-789" }
├─ Updates: Ride.status = 'active'
└─ Updates: Ride.assignedDriverId, Ride.assignedVehicleId

Step 8: DRIVER SEES ACTIVE RIDE
├─ Driver dashboard refreshes
├─ Sees: "Ride Approved! Load Assigned"
├─ Navigates to: /driver/active-ride/ride-123
└─ Can now see: pickup address, drop address, start navigation
```

### Workflow 2: Admin Bid Approval Process

```
ADMIN LOGIN:
  POST /api/auth/login 
  └─ { phone: "admin-phone", password: "admin-pass" }

ADMIN VIEWS BID MANAGEMENT PAGE:
  GET /api/rides?status=bid_placed
  └─ Returns all rides with pending bids

ADMIN SEES:
  ┌─────────────────────────────────┐
  │ Load #ride-123                  │
  ├─────────────────────────────────┤
  │ Pickup: Mumbai → Drop: Pune     │
  │ Cargo: Electronics | 5 Ton      │
  │ Base Price: ₹2500               │
  ├─────────────────────────────────┤
  │ BIDS RECEIVED:                  │
  │ ┌─────────────────────────────┐ │
  │ │ Amit Singh (Driver)         │ │
  │ │ Truck: MH01AB1234           │ │
  │ │ Bid Amount: ₹2500           │ │
  │ │ [REJECT] [APPROVE] ←─────┐  │ │
  │ └─────────────────────────────┘ │ │
  │ ┌─────────────────────────────┐ │ │
  │ │ Vikram Patel (Driver)       │ │ │
  │ │ Truck: MH01CD5678           │ │ │
  │ │ Bid Amount: ₹2300           │ │ │
  │ │ [REJECT] [APPROVE] ←─────┐  │ │
  │ └─────────────────────────────┘ │ │
  └─────────────────────────────────┘ │
                                       │
                     Admin clicks      │
                     "APPROVE" ────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │ PATCH /api/bids/:id/status
              │ { status: 'accepted' }
              │
              │ SERVER LOGIC:
              │ ├─ Update bid.status
              │ ├─ Find bid details
              │ ├─ Call /api/rides/:rideId/assign
              │ │  └─ assignedDriverId = bid.userId
              │ │  └─ assignedVehicleId = bid.vehicleId
              │ │  └─ rides.status = 'active'
              │ └─ Return success
              └──────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │ NOTIFY DRIVER:
              │ "Your bid was approved!"
              │ "Load: Mumbai → Pune"
              │ "Start pickup at pickup"
              │ "location address"
              └──────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │ DRIVER SEES ACTIVE RIDE
              │ In dashboard:
              │ "1 Active Ride"
              │ Can navigate to pickup
              │ location & track
              └──────────────────────────┘
```

---

## 🗄️ Database Relationships (Entity Diagram)

```
                    ┌─────────────────┐
                    │     USERS       │
                    │                 │
                    │ id (PK)         │
                    │ phone (UNIQUE)  │
                    │ email (UNIQUE)  │
                    │ role            │
                    │ transporterId   │◄───┐
                    └─────────────────┘    │
                        │  │               │
            ┌───────────┘  └──┐            │
            │                 │            │
      ┌─────┴─────┐   ┌──────┴──────┐     │
      │ VEHICLES  │   │ DOCUMENTS   │     │
      │           │   │             │     │
      │ userId(FK)────►id          │     │
      │ type      │   │ userId(FK)─────► │
      │ status    │   │ status      │     │
      └───────────┘   │             │     │
            │         └─────────────┘     │
            │                             │
            │                     ┌───────┴─────────┐
            │                     │ TRANSPORTERS    │
            │                     │                 │
            │                     │ id (PK)         │
            │                     │ companyName     │
            │                     │ status          │
            │                     └─────────────────┘
            │
    ┌───────┘
    │
    ├─────────────────┐
    │                 │
    ▼                 ▼
┌─────────┐      ┌──────────────┐
│  BIDS   │      │    RIDES     │
│         │      │              │
│ userId──┼─────►│ id           │
│ rideId──┼─────►│ createdById  │
│ vehicleId       │ assignedDriver
│ amount  │      │ assignedVehicleId
│ status  │      │ transporterId
└─────────┘      │ status       │
                 └──────────────┘
                        ▲
                        │
                        │
              (1 Ride can have many Bids)
```

---

## 🚀 Deployment & Execution Flow

### Local Development
```
1. npm install
   ├─ Installs all dependencies
   └─ Includes Drizzle ORM, bcrypt, Express, React

2. npm run db:push
   ├─ Connects to DATABASE_URL (Neon PostgreSQL)
   ├─ Runs migrations from schema.ts
   └─ Creates all tables in DB

3. npx tsx server/seed.ts
   ├─ Populates with test data
   ├─ Creates: 1 admin, 2 transporters, 3 drivers
   ├─ Creates: 4 sample rides, 3 sample bids
   └─ Ready for testing

4. npm run dev
   ├─ Starts Express server on PORT 5000 (0.0.0.0:5000)
   ├─ Starts Vite dev server for React frontend
   ├─ Hot reload enabled for both
   └─ Accessible at http://localhost:5000
```

### Production Deployment (Replit)
```
1. Build
   └─ npm run build (creates optimized bundles)

2. DATABASE_URL environment variable set
   └─ Automatically by Replit

3. npm start
   └─ Runs production server
```

---

## 💾 Data Persistence Flow

### Create New Ride (Admin Action)
```
Admin Form Input:
├─ pickupLocation: "Fort, Mumbai"
├─ dropLocation: "Pune City"
├─ cargoType: "Electronics"
├─ weight: "5 Ton"
├─ price: 2500
└─ date: "2024-12-05"
           │
           ▼
POST /api/rides
├─ insertRideSchema.parse(data)  ← Zod validation
├─ Generates: id = gen_random_uuid()
├─ Generates: createdAt = NOW()
└─ Saves to PostgreSQL
           │
           ▼
INSERT INTO rides (id, pickupLocation, dropLocation, ...)
VALUES (...)
RETURNING *;
           │
           ▼
Response: { id, pickupLocation, ..., status='pending' }
           │
           ▼
Frontend Updates UI:
└─ Displays: "Ride created successfully"
```

### Create Bid (Driver Action)
```
Driver Action:
├─ Selects: Vehicle "MH01AB1234"
├─ Enters: Bid Amount "2400"
└─ Clicks: "Place Bid"
           │
           ▼
POST /api/bids
├─ insertBidSchema.parse(data)   ← Zod validation
├─ body contains:
│  ├─ rideId: "ride-123"
│  ├─ userId: "driver-456"
│  ├─ vehicleId: "vehicle-789"
│  └─ amount: 2400
├─ Generates: id = gen_random_uuid()
├─ Generates: createdAt = NOW()
└─ Saves to PostgreSQL
           │
           ▼
INSERT INTO bids (id, rideId, userId, vehicleId, amount, status)
VALUES (...)
RETURNING *;
           │
           ▼
ALSO UPDATE:
UPDATE rides SET status='bid_placed' WHERE id=:rideId;
           │
           ▼
Response: { id, status='pending', createdAt }
           │
           ▼
Frontend:
└─ Navigates: → /driver/active-ride/ride-123
└─ Shows: "Bid placed, waiting for admin approval"
```

---

## 🔄 Real-Time Sync (Future Enhancement)

Current system uses **polling** (manual page refresh). For production, implement:

```
Socket.IO Events:
├─ 'ride:created' → Notify drivers of new loads
├─ 'bid:placed' → Notify admin of new bids
├─ 'bid:approved' → Notify driver of acceptance
├─ 'driver:online' → Update availability status
└─ 'location:updated' → Real-time tracking

Flow:
Driver connects to WebSocket
   └─ socket.on('ride:created', (ride) => {
        updateDashboard(ride)
      })

Admin socket connection
   └─ socket.on('bid:placed', (bid) => {
        notifyAdmin(bid)
      })

After bid approval
   └─ io.to(driverId).emit('bid:approved', {
        rideId, assignedVehicleId
      })
```

---

## 📱 Testing the System

### Test User Credentials (Post-Seed)

```
ADMIN:
├─ Email: admin@waykel.com
├─ Password: admin123
└─ Access: /admin (Dashboard, Bid Management)

DRIVER 1:
├─ Phone: 9111111111
├─ Password: driver123
├─ Vehicles: 1 (Ashok Leyland 16T)
└─ Access: /driver (Dashboard, Active Rides)

DRIVER 2:
├─ Phone: 9222222222
├─ Password: driver123
├─ Vehicles: 1 (Tata 407 - 6T)
└─ Access: /driver

DRIVER 3:
├─ Phone: 9333333333
├─ Password: driver123
├─ Vehicles: 1 (Tata 1613 - 16T)
└─ Access: /driver

TEST SCENARIO:
1. Login as Driver 1
2. View pending rides (3 available)
3. Accept a ride → select vehicle → bid price
4. Logout
5. Login as Admin
6. Go to /admin/rides
7. See bid in "Bid Management"
8. Click "Approve"
9. Bid status changes to accepted
10. Ride status changes to active
11. Driver sees ride in active rides
```

---

## 🛠️ Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | UI rendering |
| | Wouter | Client-side routing |
| | TailwindCSS | Styling |
| | Radix UI | Component library |
| | React Hook Form | Form management |
| **Backend** | Node.js + Express | HTTP API server |
| | Drizzle ORM | Database queries |
| | Zod | Schema validation |
| | Bcrypt | Password hashing |
| **Database** | PostgreSQL (Neon) | Data persistence |
| **Runtime** | Replit | Hosting platform |

---

## 📝 Key Design Decisions

1. **Stateless Auth via localStorage**
   - Simple for MVP
   - Production: Use JWT + HTTP-only cookies

2. **Bcrypt Password Hashing**
   - 10 salt rounds
   - Secure credential storage
   - Industry standard

3. **Zod Schema Validation**
   - Runtime type checking
   - API request validation
   - Prevents invalid data

4. **Drizzle ORM**
   - Type-safe queries
   - Easy schema versioning
   - PostgreSQL optimized

5. **Bidding Workflow**
   - Drivers place bids (optional bid amount)
   - Admin must approve all bids
   - Prevents unauthorized ride assignments
   - Ensures quality control

---

## 📊 System Capacity & Performance

```
Current Setup:
├─ Database: Neon PostgreSQL (scalable)
├─ Connections: Pool of 10 (default)
├─ Concurrent Users: 100+ (light)
├─ API Latency: <200ms average
└─ Storage: ∞ (cloud-based)

Bottlenecks & Solutions:
├─ N+1 queries → Use batched queries
├─ Unindexed searches → Add DB indexes
├─ Memory issues → Implement pagination
└─ Concurrent updates → Add transactions
```

---

## 🎓 Quick Reference Guide

### To Add a New Feature:

1. **Update Schema** (`shared/schema.ts`)
   ```typescript
   // Add table
   export const newTable = pgTable("new_table", { ... })
   // Add insert schema
   export const insertNewSchema = createInsertSchema(newTable).omit({ id: true, createdAt: true })
   ```

2. **Update Storage** (`server/storage.ts`)
   ```typescript
   // Add interface method
   async getNewData(id: string): Promise<NewType | undefined>
   // Implement it
   async getNewData(id: string) { return await db.select().from(newTable).where(...) }
   ```

3. **Update Routes** (`server/routes.ts`)
   ```typescript
   // Add endpoint
   app.get("/api/new-data", async (req, res) => {
     const data = await storage.getNewData(req.query.id)
     res.json(data)
   })
   ```

4. **Update API Client** (`client/src/lib/api.ts`)
   ```typescript
   newData: {
     get: async (id: string) => {
       const res = await fetch(`${API_BASE}/new-data?id=${id}`)
       return res.json()
     }
   }
   ```

5. **Update Frontend** (`client/src/pages/...`)
   ```typescript
   const data = await api.newData.get(id)
   // Use data in component
   ```

6. **Push to Database**
   ```bash
   npm run db:push
   ```

---

This architecture provides a solid foundation for the Waykel logistics platform with clear separation of concerns, type safety, and scalability.
