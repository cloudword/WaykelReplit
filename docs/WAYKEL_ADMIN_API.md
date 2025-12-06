# Waykel Admin API Documentation

## Base URLs

| Environment | URL |
|-------------|-----|
| **Production** | `https://admin.waykel.com` |
| **Development** | `https://dev.waykel.com` |
| **Local** | `http://localhost:5000` |

## CORS Configuration

The API allows cross-origin requests from:
- `https://www.waykel.com`
- `https://waykel.com`
- `http://www.waykel.com`
- `http://waykel.com`
- `http://localhost:3000`
- `http://localhost:5173`
- Custom domain via `CUSTOMER_PORTAL_URL` environment variable

---

## Authentication Endpoints

### Register User
```
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "9876543210",
  "password": "SecurePass123",
  "role": "customer"
}
```

**Response:** User object (without password)

---

### Login
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "phone": "9876543210",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "9876543210",
  "role": "customer",
  "isOnline": false,
  "rating": "0",
  "totalTrips": 0
}
```

---

### Logout
```
POST /api/auth/logout
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Check Session
```
GET /api/auth/session
```

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "role": "customer",
    "isSuperAdmin": false
  }
}
```

---

### Change Password
```
POST /api/auth/change-password
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass456"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one number

---

## Rides/Bookings Endpoints

### Create Booking (Customer Portal)
```
POST /api/rides
```

**Request Body (all strings):**
```json
{
  "pickupLocation": "Mumbai, Maharashtra",
  "dropLocation": "Pune, Maharashtra",
  "pickupTime": "09:00",
  "date": "2025-12-10",
  "price": "5000.00",
  "distance": "150 km",
  "cargoType": "Electronics",
  "weight": "2-5 Ton",
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "createdById": "customer-uuid"
}
```

**Required Fields:**
| Field | Type | Example |
|-------|------|---------|
| pickupLocation | string | "Mumbai, Maharashtra" |
| dropLocation | string | "Pune, Maharashtra" |
| pickupTime | string | "09:00" |
| date | string | "2025-12-10" |
| price | string | "5000.00" (NOT a number!) |
| distance | string | "150 km" |
| cargoType | string | "Electronics" |
| weight | string | "2-5 Ton" |

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| customerName | string | Customer's name |
| customerPhone | string | Customer's phone |
| createdById | string | UUID of logged-in customer |
| dropTime | string | Expected drop time |
| status | string | Default: "pending" |

**Response:**
```json
{
  "id": "ride-uuid",
  "pickupLocation": "Mumbai, Maharashtra",
  "dropLocation": "Pune, Maharashtra",
  "pickupTime": "09:00",
  "date": "2025-12-10",
  "status": "pending",
  "price": "5000.00",
  "distance": "150 km",
  "cargoType": "Electronics",
  "weight": "2-5 Ton",
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "createdAt": "2025-12-05T10:30:00.000Z"
}
```

---

### Get All Rides
```
GET /api/rides
```

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| status | Filter by status: pending, active, completed, cancelled, scheduled, bid_placed |
| driverId | Get rides assigned to a driver |
| transporterId | Get rides for a transporter |
| createdById | Get customer's ride history |

**Examples:**
```
GET /api/rides?status=pending
GET /api/rides?createdById=customer-uuid
GET /api/rides?status=active
```

---

### Get Single Ride
```
GET /api/rides/:id
```

---

### Update Ride Status
```
PATCH /api/rides/:id/status
```

**Request Body:**
```json
{
  "status": "cancelled"
}
```

**Valid Statuses:** pending, active, completed, cancelled, scheduled, bid_placed

---

### Assign Driver to Ride (Admin Only)
```
PATCH /api/rides/:id/assign
```

**Request Body:**
```json
{
  "driverId": "driver-uuid",
  "vehicleId": "vehicle-uuid"
}
```

---

## Bids Endpoints

### Get Bids
```
GET /api/bids
```

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| rideId | Get bids for a specific ride |
| userId | Get bids by a user |
| transporterId | Get bids by a transporter |

---

### Get Cheapest Bids for Ride
```
GET /api/rides/:rideId/cheapest-bids
```

**Response:** Returns top 3 cheapest bids with transporter and vehicle details

---

### Create Bid (Driver/Transporter)
```
POST /api/bids
```

**Request Body:**
```json
{
  "rideId": "ride-uuid",
  "userId": "user-uuid",
  "transporterId": "transporter-uuid",
  "vehicleId": "vehicle-uuid",
  "amount": "4500.00"
}
```

---

### Update Bid Status (Admin)
```
PATCH /api/bids/:id/status
```

**Request Body:**
```json
{
  "status": "accepted"
}
```

**Valid Statuses:** pending, accepted, rejected

---

## Customers Endpoints

### Get All Customers
```
GET /api/customers
```

**Response:**
```json
[
  {
    "id": "customer-uuid",
    "name": "Customer Name",
    "email": "customer@example.com",
    "phone": "9876543210",
    "role": "customer",
    "tripCount": 5,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

## Users Endpoints

### Get Users
```
GET /api/users
```

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| transporterId | Filter by transporter |
| role | Filter by role: driver, transporter, admin, customer |

---

### Get All Drivers
```
GET /api/drivers
```

---

### Update User (Admin Only)
```
PATCH /api/users/:id
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@email.com",
  "phone": "9876543211",
  "isOnline": true
}
```

---

### Update Online Status
```
PATCH /api/users/:id/online-status
```

**Request Body:**
```json
{
  "isOnline": true
}
```

---

### Reset User Password (Admin Only)
```
POST /api/users/:id/reset-password
```

**Request Body:**
```json
{
  "newPassword": "NewSecurePass123"
}
```

---

## Transporters Endpoints

### Get All Transporters
```
GET /api/transporters
```

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| status | Filter by: active, pending_approval, suspended |

---

### Create Transporter
```
POST /api/transporters
```

**Request Body:**
```json
{
  "companyName": "Quick Logistics",
  "ownerName": "Rajesh Kumar",
  "contact": "9876543210",
  "email": "quick@logistics.com",
  "location": "Delhi",
  "baseCity": "Delhi",
  "fleetSize": 5,
  "preferredRoutes": ["Delhi-Jaipur", "Delhi-Chandigarh"]
}
```

---

### Update Transporter Status (Admin)
```
PATCH /api/transporters/:id/status
```

**Request Body:**
```json
{
  "status": "active"
}
```

**Valid Statuses:** pending_approval, active, suspended

---

## Vehicles Endpoints

### Get Vehicles
```
GET /api/vehicles
```

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| userId | Filter by user |
| transporterId | Filter by transporter |

---

### Get All Vehicles
```
GET /api/vehicles/all
```

---

## Documents Endpoints

### Get Documents
```
GET /api/documents
```

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| userId | Filter by user |
| vehicleId | Filter by vehicle |
| transporterId | Filter by transporter |

---

### Create Document
```
POST /api/documents
```

---

### Update Document Status
```
PATCH /api/documents/:id/status
```

---

## Health Check

### Check API Health
```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-05T10:30:00.000Z",
  "uptime": 12345.67,
  "database": "connected"
}
```

---

## Test Credentials

| Role | Phone | Password |
|------|-------|----------|
| Super Admin | 9999999999 | admin123 |
| Customer | 9000000001 | customer123 |
| Driver 1 | 9111111111 | driver123 |
| Driver 2 | 9222222222 | driver123 |
| Driver 3 | 9333333333 | driver123 |

---

## JavaScript API Client

Copy this to your customer portal:

```typescript
const API_BASE = 'https://admin.waykel.com'; // or 'https://dev.waykel.com' for dev

export const waykelAPI = {
  // Create a booking
  createBooking: async (data) => {
    const res = await fetch(`${API_BASE}/api/rides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Get customer's bookings
  getMyBookings: async (customerId) => {
    const res = await fetch(`${API_BASE}/api/rides?createdById=${customerId}`, {
      credentials: 'include'
    });
    return res.json();
  },

  // Get bids for a ride
  getBidsForRide: async (rideId) => {
    const res = await fetch(`${API_BASE}/api/bids?rideId=${rideId}`, {
      credentials: 'include'
    });
    return res.json();
  },

  // Cancel a booking
  cancelBooking: async (rideId) => {
    const res = await fetch(`${API_BASE}/api/rides/${rideId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: 'cancelled' })
    });
    return res.json();
  },

  // Login
  login: async (phone, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone, password })
    });
    return res.json();
  },

  // Register customer
  register: async (data) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...data, role: 'customer' })
    });
    return res.json();
  }
};
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "details": [...],  // Optional validation details
  "hint": "..."      // Optional help text
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error
