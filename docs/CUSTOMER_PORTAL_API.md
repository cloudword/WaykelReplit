# Waykel Customer Portal - API Documentation

This document contains all the API endpoints and data structures needed for the Customer Portal (separate website) to connect to the Waykel backend.

## API Base URL

The Waykel backend API URL (after deployment):
```
https://[YOUR-WAYKEL-APP].replit.app/api
```

---

## Authentication Methods

The API supports **two authentication methods**:

### 1. JWT Token-Based (Recommended for Cross-Origin)
Best for when the Customer Portal is a separate website/domain.

### 2. Session-Based (Same-Origin)
Best for same-domain scenarios with cookies.

---

## JWT Token Authentication (Recommended)

### Login & Get Token

**Endpoint:** `POST /api/auth/token`

**Request:**
```json
{
  "phone": "9876543210",
  "password": "SecurePass123"
}
```

**Response (Success - 200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h",
  "tokenType": "Bearer",
  "user": {
    "id": "uuid-string",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "role": "customer"
  }
}
```

**Using the Token:**
Include in all subsequent requests:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refresh Token

**Endpoint:** `POST /api/auth/token/refresh`

**Headers:**
```
Authorization: Bearer <current-valid-token>
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h",
  "tokenType": "Bearer"
}
```

---

## Customer Registration

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePass123",
  "role": "customer"
}
```

**Response (Success - 200):**
```json
{
  "id": "uuid-string",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "role": "customer",
  "isOnline": false,
  "rating": "0",
  "totalTrips": 0,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `400` - Email already registered
- `400` - Phone number already registered
- `400` - Invalid data

---

## Session-Based Authentication (Alternative)

### Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "phone": "9876543210",
  "password": "SecurePass123"
}
```

**Response (Success - 200):**
```json
{
  "id": "uuid-string",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "role": "customer"
}
```

**Note:** Uses session cookies. Include `credentials: 'include'` in fetch requests.

### Logout

**Endpoint:** `POST /api/auth/logout`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Check Session

**Endpoint:** `GET /api/auth/session`

**Response (Authenticated):**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid-string",
    "role": "customer",
    "isSuperAdmin": false
  }
}
```

---

## Get Current User

**Endpoint:** `GET /api/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid-string",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "role": "customer",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

## Change Password

**Endpoint:** `POST /api/auth/change-password`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewSecurePass456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## Rides (Trip Requests)

### Create a New Trip Request

**Endpoint:** `POST /api/rides`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "pickupLocation": "123 Main Street, Mumbai, Maharashtra 400001",
  "dropLocation": "456 Park Avenue, Pune, Maharashtra 411001",
  "pickupTime": "10:00 AM",
  "date": "2024-01-20",
  "price": "5000.00",
  "distance": "150 km",
  "cargoType": "General Goods",
  "weight": "500 kg",
  "customerName": "John Doe",
  "customerPhone": "9876543210"
}
```

**Response (Success - 201):**
```json
{
  "id": "ride-uuid",
  "pickupLocation": "123 Main Street, Mumbai, Maharashtra 400001",
  "dropLocation": "456 Park Avenue, Pune, Maharashtra 411001",
  "status": "pending",
  "price": "5000.00",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### Get Customer's Trips

**Endpoint:** `GET /api/customer/rides`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "ride-uuid",
    "pickupLocation": "Mumbai",
    "dropLocation": "Pune",
    "status": "pending",
    "price": "5000.00",
    "date": "2024-01-20"
  }
]
```

---

### Get Single Ride

**Endpoint:** `GET /api/rides/:id`

**Headers:**
```
Authorization: Bearer <token>
```

---

### Cancel a Ride

**Endpoint:** `POST /api/rides/:id/cancel`

**Headers:**
```
Authorization: Bearer <token>
```

---

### Update Ride Status

**Endpoint:** `PATCH /api/rides/:id/status`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "cancelled"
}
```

---

## Bids

### Get Bids for a Ride

**Endpoint:** `GET /api/bids?rideId={rideId}`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "bid-uuid",
    "rideId": "ride-uuid",
    "amount": "4500.00",
    "status": "pending",
    "createdAt": "2024-01-15T11:00:00.000Z"
  }
]
```

### Accept a Bid

**Endpoint:** `POST /api/bids/:bidId/accept`

**Headers:**
```
Authorization: Bearer <token>
```

---

## Ride Status Flow

```
pending → bid_placed → scheduled → active → completed
                ↓
            cancelled
```

| Status | Description |
|--------|-------------|
| pending | New request, waiting for bids |
| bid_placed | At least one bid received |
| scheduled | Bid accepted, trip confirmed |
| active | Trip in progress |
| completed | Trip finished |
| cancelled | Trip cancelled |

---

## JavaScript Integration Example

```javascript
// Customer Portal API Client

const API_BASE = "https://your-waykel-backend.replit.app";

// Store token
let authToken = localStorage.getItem("waykel_token");

// Login and get token
async function login(phone, password) {
  const res = await fetch(`${API_BASE}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  
  if (res.ok) {
    const data = await res.json();
    authToken = data.token;
    localStorage.setItem("waykel_token", data.token);
    return data.user;
  }
  
  const error = await res.json();
  throw new Error(error.error || "Login failed");
}

// Register new customer
async function register(name, phone, email, password) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, email, password, role: "customer" }),
  });
  
  if (res.ok) {
    // After registration, login to get token
    return await login(phone, password);
  }
  
  const error = await res.json();
  throw new Error(error.error || "Registration failed");
}

// Authenticated API helper
async function api(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
      ...options.headers,
    },
  });
  
  if (res.status === 401) {
    localStorage.removeItem("waykel_token");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// API Methods
const waykelAPI = {
  // Get current user
  getMe: () => api("/api/me"),
  
  // Get customer's rides
  getMyRides: () => api("/api/customer/rides"),
  
  // Create new ride
  createRide: (rideData) => api("/api/rides", {
    method: "POST",
    body: JSON.stringify(rideData),
  }),
  
  // Get ride details
  getRide: (id) => api(`/api/rides/${id}`),
  
  // Get bids for ride
  getBids: (rideId) => api(`/api/bids?rideId=${rideId}`),
  
  // Accept a bid
  acceptBid: (bidId) => api(`/api/bids/${bidId}/accept`, { method: "POST" }),
  
  // Cancel ride
  cancelRide: (id) => api(`/api/rides/${id}/cancel`, { method: "POST" }),
  
  // Logout
  logout: () => {
    localStorage.removeItem("waykel_token");
    authToken = null;
  },
};

export { login, register, waykelAPI };
```

---

## CORS Configuration

The Waykel backend accepts requests from:
- Customer portal URLs (set via `CUSTOMER_PORTAL_URL` env variable)
- waykel.com domain
- localhost for development

**Current Allowed Origins:**
- https://ae9c1410-362d-4b0e-af75-e5fff997a3be-00-5koti0bqi7kz.spock.replit.dev
- https://workspace.mayankpratapsi6.replit.app

To add more origins, update the `CUSTOMER_PORTAL_URL` environment variable (comma-separated).

---

## Data Sync

The Customer Portal and Waykel Admin share the same PostgreSQL database:
- Customers registered on portal appear in admin panel instantly
- Rides created by customers are visible to admin and drivers
- Bid updates and status changes sync in real-time
- All data is authoritative - no local storage or mock data

---

## Error Handling

All errors return:
```json
{
  "error": "Error message"
}
```

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Forbidden |
| 404 | Not found |
| 500 | Server error |

---

## Health Check

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected"
}
```

Use this to verify the API is accessible from your portal.
