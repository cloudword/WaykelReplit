# Waykel Customer Portal - API Documentation

This document contains all the API endpoints and data structures needed to build the Waykel Customer Portal.

## Base URL

After publishing, the main Waykel platform API will be available at:
```
https://[YOUR-WAYKEL-APP].replit.app/api
```

## Authentication

### Register a New Customer

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
  "earningsToday": "0",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `400` - Email already registered
- `400` - Phone number already registered
- `400` - Invalid data

---

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
  "role": "customer",
  "isOnline": false,
  "rating": "0",
  "totalTrips": 0,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `401` - Invalid credentials

**Note:** Session-based authentication is used. Store the session cookie for subsequent requests.

---

### Logout

**Endpoint:** `POST /api/auth/logout`

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

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

**Response (Not Authenticated):**
```json
{
  "authenticated": false
}
```

---

### Change Password

**Endpoint:** `POST /api/auth/change-password`

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewSecurePass456"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one number

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## Rides (Trip Requests)

### Create a New Trip Request (Book a Ride)

**Endpoint:** `POST /api/rides`

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
  "customerPhone": "9876543210",
  "createdById": "customer-uuid"
}
```

**Field Descriptions:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| pickupLocation | string | Yes | Full address with pincode |
| dropLocation | string | Yes | Full address with pincode |
| pickupTime | string | Yes | Preferred pickup time |
| date | string | Yes | Trip date (YYYY-MM-DD or readable format) |
| price | string | Yes | Offered price in INR |
| distance | string | Yes | Estimated distance |
| cargoType | string | Yes | Type of cargo (General Goods, Fragile, Perishable, etc.) |
| weight | string | Yes | Weight of cargo |
| customerName | string | No | Customer's name |
| customerPhone | string | No | Customer's contact number |
| createdById | string | No | Customer's user ID |

**Response (Success - 201):**
```json
{
  "id": "ride-uuid",
  "pickupLocation": "123 Main Street, Mumbai, Maharashtra 400001",
  "dropLocation": "456 Park Avenue, Pune, Maharashtra 411001",
  "pickupTime": "10:00 AM",
  "dropTime": null,
  "date": "2024-01-20",
  "status": "pending",
  "price": "5000.00",
  "distance": "150 km",
  "cargoType": "General Goods",
  "weight": "500 kg",
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "createdById": "customer-uuid",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### Get Customer's Trips

To get a customer's trips, you'll need to filter by `createdById`. Since this isn't directly supported in the current API, use the general rides endpoint and filter client-side, or we can add a new endpoint.

**Recommended Approach:** Add a query parameter for customer filtering:

**Endpoint:** `GET /api/rides?createdById={customerId}`

**Current Available Endpoints:**

**Get All Rides:** `GET /api/rides`

**Get Ride by ID:** `GET /api/rides/:id`

**Filter by Status:**
- `GET /api/rides?status=pending` - New requests awaiting bids
- `GET /api/rides?status=scheduled` - Confirmed future trips
- `GET /api/rides?status=active` - Currently in progress
- `GET /api/rides?status=completed` - Finished trips
- `GET /api/rides?status=cancelled` - Cancelled trips
- `GET /api/rides?status=bid_placed` - Requests with bids waiting for acceptance

---

### Ride Status Flow

```
pending → bid_placed → scheduled → active → completed
                ↓
            cancelled
```

| Status | Description |
|--------|-------------|
| pending | New request, waiting for transporters to bid |
| bid_placed | At least one bid received |
| scheduled | Bid accepted, trip confirmed |
| active | Trip is in progress |
| completed | Trip finished |
| cancelled | Trip was cancelled |

---

### Update Ride Status

**Endpoint:** `PATCH /api/rides/:id/status`

**Request Body:**
```json
{
  "status": "cancelled"
}
```

**Note:** Customers can typically only cancel their own rides.

---

## Bids (View Bids on Your Trips)

### Get Bids for a Ride

**Endpoint:** `GET /api/bids?rideId={rideId}`

**Response:**
```json
[
  {
    "id": "bid-uuid",
    "rideId": "ride-uuid",
    "userId": "transporter-user-uuid",
    "transporterId": "transporter-uuid",
    "vehicleId": "vehicle-uuid",
    "amount": "4500.00",
    "status": "pending",
    "createdAt": "2024-01-15T11:00:00.000Z"
  }
]
```

**Bid Status Values:**
- `pending` - Waiting for customer/admin decision
- `accepted` - Bid accepted, trip will be assigned
- `rejected` - Bid was rejected

---

## Data Structures

### User Object
```typescript
interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone: string;
  role: "driver" | "transporter" | "admin" | "customer";
  isSuperAdmin?: boolean;
  transporterId?: string;
  isOnline?: boolean;
  rating?: string;
  totalTrips?: number;
  earningsToday?: string;
  createdAt?: string;
}
```

### Ride Object
```typescript
interface Ride {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  pickupTime: string;
  dropTime?: string;
  date: string;
  status: "pending" | "active" | "completed" | "cancelled" | "scheduled" | "bid_placed";
  price: string;
  distance: string;
  cargoType: string;
  weight: string;
  customerName?: string;
  customerPhone?: string;
  incentive?: string;
  transporterId?: string;
  assignedDriverId?: string;
  assignedVehicleId?: string;
  createdById?: string;
  createdAt?: string;
}
```

### Bid Object
```typescript
interface Bid {
  id: string;
  rideId: string;
  userId: string;
  transporterId?: string;
  vehicleId: string;
  amount: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: string;
}
```

---

## Vehicle Types

When customers are booking, they should be able to select from these vehicle types:

| Type | Description | Typical Capacity |
|------|-------------|------------------|
| Mini Truck | Small cargo vehicle | 1-2 tons |
| Pickup | Open pickup truck | 500 kg - 1 ton |
| Tata Ace | Popular small commercial | 750 kg |
| Eicher | Medium truck | 5-10 tons |
| Container | Large enclosed container | 10-20 tons |
| Trailer | Heavy goods trailer | 20+ tons |
| Refrigerated | Temperature controlled | Varies |
| Tanker | Liquid transport | Varies |

---

## Cargo Types

Suggested cargo type options for the booking form:

- General Goods
- Electronics
- Furniture
- Construction Materials
- Agricultural Products
- Perishable Goods
- Fragile Items
- Industrial Equipment
- Textiles
- Chemicals (Hazardous)
- Pharmaceuticals

---

## CORS Configuration

For the customer portal to communicate with the main Waykel API, CORS needs to be configured. The main platform should allow requests from the customer portal domain.

**Required Headers:**
```
Access-Control-Allow-Origin: https://[CUSTOMER-PORTAL-DOMAIN]
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type
```

---

## Suggested Customer Portal Endpoints to Add

To fully support the customer portal, consider adding these endpoints to the main API:

### 1. Get Customer's Rides
```
GET /api/rides?createdById={customerId}
```

### 2. Get Customer Profile
```
GET /api/users/:id
```

### 3. Update Customer Profile
```
PATCH /api/users/:id
```

### 4. Accept a Bid (Customer Action)
```
PATCH /api/bids/:id/status
Body: { "status": "accepted" }
```

---

## Health Check

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "database": "connected"
}
```

Use this endpoint to verify the API is accessible.

---

## Error Handling

All error responses follow this format:
```json
{
  "error": "Error message description"
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created successfully
- `400` - Bad request / Invalid data
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `500` - Server error

---

## Example API Integration (React/Next.js)

```typescript
// api.ts - Example API client for customer portal

const API_BASE = process.env.NEXT_PUBLIC_WAYKEL_API_URL;

export const api = {
  auth: {
    register: async (data: RegisterData) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, role: 'customer' })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    
    login: async (phone: string, password: string) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, password })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    
    logout: async () => {
      const res = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      return res.json();
    },
    
    getSession: async () => {
      const res = await fetch(`${API_BASE}/auth/session`, {
        credentials: 'include'
      });
      return res.json();
    }
  },
  
  rides: {
    create: async (rideData: CreateRideData) => {
      const res = await fetch(`${API_BASE}/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(rideData)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    
    getById: async (id: string) => {
      const res = await fetch(`${API_BASE}/rides/${id}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    
    list: async (params?: { status?: string; createdById?: string }) => {
      const query = new URLSearchParams(params as any).toString();
      const res = await fetch(`${API_BASE}/rides?${query}`, {
        credentials: 'include'
      });
      return res.json();
    },
    
    cancel: async (id: string) => {
      const res = await fetch(`${API_BASE}/rides/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' })
      });
      return res.json();
    }
  },
  
  bids: {
    getForRide: async (rideId: string) => {
      const res = await fetch(`${API_BASE}/bids?rideId=${rideId}`, {
        credentials: 'include'
      });
      return res.json();
    },
    
    accept: async (bidId: string) => {
      const res = await fetch(`${API_BASE}/bids/${bidId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'accepted' })
      });
      return res.json();
    }
  }
};
```

---

## Customer Portal Feature Checklist

When building the customer portal, implement these features:

### Landing Page
- [ ] Hero section with CTA
- [ ] About Waykel section
- [ ] Why Choose Us (benefits)
- [ ] Services overview
- [ ] How it works (steps)
- [ ] Testimonials
- [ ] Footer with contact info

### Authentication
- [ ] Sign up form (name, email, phone, password)
- [ ] Login form (phone + password)
- [ ] Password reset flow
- [ ] Remember me functionality

### Customer Dashboard
- [ ] Overview with active bookings
- [ ] Quick booking button
- [ ] Recent trips summary

### My Trips Page
- [ ] Tabs: Upcoming, Active, Completed, Cancelled
- [ ] Trip cards with details
- [ ] Trip status tracking
- [ ] Cancel trip option (for pending/scheduled)

### Book a Trip Page
- [ ] Pickup location with pincode
- [ ] Drop location with pincode
- [ ] Date picker (book now or schedule)
- [ ] Time picker
- [ ] Vehicle type selector
- [ ] Cargo type selector
- [ ] Weight input
- [ ] Price suggestion/input
- [ ] Special instructions field
- [ ] Review & confirm

### Trip Details Page
- [ ] Full trip information
- [ ] Status timeline
- [ ] Assigned driver/vehicle info (when assigned)
- [ ] Bids list (when applicable)
- [ ] Accept/reject bid buttons
- [ ] Contact support option

### Profile Page
- [ ] View/edit personal info
- [ ] Change password
- [ ] Trip history
- [ ] Logout

---

## Notes for Development

1. **Session Management:** The API uses session-based auth with cookies. Ensure `credentials: 'include'` is set in all fetch requests.

2. **CORS:** You'll need to configure CORS on the main Waykel API to accept requests from the customer portal domain.

3. **Real-time Updates:** Consider implementing WebSocket connection for live trip status updates.

4. **Maps Integration:** Use Google Maps or Mapbox for location autocomplete and pincode validation.

5. **Payment Integration:** Future enhancement - integrate Razorpay/Stripe for upfront payments.
