# Waykel API CURL Collection

## Environments

| Environment | Base URL |
|-------------|----------|
| Development | https://dev.waykel.com |
| Production | https://admin.waykel.com |

Replace `{BASE_URL}` in the commands below with the appropriate URL.

---

## Authentication

### Register a New User
```bash
curl -X POST "{BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "password": "SecurePass123",
    "role": "customer"
  }'
```

### Login
```bash
curl -X POST "{BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "phone": "9876543210",
    "password": "SecurePass123"
  }'
```

### Logout
```bash
curl -X POST "{BASE_URL}/api/auth/logout" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Check Session
```bash
curl -X GET "{BASE_URL}/api/auth/session" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Change Password
```bash
curl -X POST "{BASE_URL}/api/auth/change-password" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "currentPassword": "OldPassword123",
    "newPassword": "NewPassword456"
  }'
```

---

## Rides / Trip Requests

### List All Rides
```bash
curl -X GET "{BASE_URL}/api/rides" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### List Rides by Status
```bash
# Status options: pending, active, completed, cancelled, scheduled, bid_placed
curl -X GET "{BASE_URL}/api/rides?status=pending" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Get Customer's Rides
```bash
curl -X GET "{BASE_URL}/api/rides?createdById={CUSTOMER_ID}" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Get Driver's Rides
```bash
curl -X GET "{BASE_URL}/api/rides?driverId={DRIVER_ID}" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Get Transporter's Rides
```bash
curl -X GET "{BASE_URL}/api/rides?transporterId={TRANSPORTER_ID}" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Get Ride by ID
```bash
curl -X GET "{BASE_URL}/api/rides/{RIDE_ID}" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Create a New Ride
```bash
curl -X POST "{BASE_URL}/api/rides" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
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
    "createdById": "{CUSTOMER_ID}"
  }'
```

### Update Ride Status
```bash
# Status options: pending, active, completed, cancelled, scheduled, bid_placed
curl -X PATCH "{BASE_URL}/api/rides/{RIDE_ID}/status" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "status": "active"
  }'
```

### Assign Driver to Ride
```bash
curl -X PATCH "{BASE_URL}/api/rides/{RIDE_ID}/assign" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "driverId": "{DRIVER_ID}",
    "vehicleId": "{VEHICLE_ID}"
  }'
```

---

## Bids

### List All Bids
```bash
curl -X GET "{BASE_URL}/api/bids" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Get Bids for a Ride
```bash
curl -X GET "{BASE_URL}/api/bids?rideId={RIDE_ID}" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Get User's Bids
```bash
curl -X GET "{BASE_URL}/api/bids?userId={USER_ID}" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Get Transporter's Bids
```bash
curl -X GET "{BASE_URL}/api/bids?transporterId={TRANSPORTER_ID}" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Create a Bid
```bash
curl -X POST "{BASE_URL}/api/bids" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "rideId": "{RIDE_ID}",
    "userId": "{USER_ID}",
    "vehicleId": "{VEHICLE_ID}",
    "amount": "4500.00",
    "transporterId": "{TRANSPORTER_ID}"
  }'
```

### Accept/Reject Bid
```bash
# Status options: pending, accepted, rejected
curl -X PATCH "{BASE_URL}/api/bids/{BID_ID}/status" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "status": "accepted"
  }'
```

---

## Vehicles

### List User's Vehicles
```bash
curl -X GET "{BASE_URL}/api/vehicles?userId={USER_ID}" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### List Transporter's Vehicles
```bash
curl -X GET "{BASE_URL}/api/vehicles?transporterId={TRANSPORTER_ID}" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Get All Vehicles
```bash
curl -X GET "{BASE_URL}/api/vehicles/all" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Add a Vehicle
```bash
curl -X POST "{BASE_URL}/api/vehicles" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "userId": "{USER_ID}",
    "transporterId": "{TRANSPORTER_ID}",
    "type": "Mini Truck",
    "plateNumber": "MH12AB1234",
    "model": "Tata Ace",
    "capacity": "1 ton"
  }'
```

---

## Transporters

### List All Transporters
```bash
curl -X GET "{BASE_URL}/api/transporters" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### List Pending Transporters
```bash
curl -X GET "{BASE_URL}/api/transporters?status=pending_approval" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Register a Transporter
```bash
curl -X POST "{BASE_URL}/api/transporters" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "companyName": "ABC Logistics",
    "ownerName": "John Doe",
    "contact": "9876543210",
    "email": "john@abclogistics.com",
    "location": "Mumbai, Maharashtra",
    "baseCity": "Mumbai"
  }'
```

### Update Transporter Status
```bash
# Status options: active, pending_approval, suspended
curl -X PATCH "{BASE_URL}/api/transporters/{TRANSPORTER_ID}/status" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "status": "active"
  }'
```

---

## Users

### List All Users
```bash
curl -X GET "{BASE_URL}/api/users" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### List Users by Transporter
```bash
curl -X GET "{BASE_URL}/api/users?transporterId={TRANSPORTER_ID}" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### List Users by Role
```bash
curl -X GET "{BASE_URL}/api/users?transporterId={TRANSPORTER_ID}&role=driver" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### List All Customers
```bash
curl -X GET "{BASE_URL}/api/customers" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### List All Drivers
```bash
curl -X GET "{BASE_URL}/api/drivers" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Update User Online Status
```bash
curl -X PATCH "{BASE_URL}/api/users/{USER_ID}/online-status" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "isOnline": true
  }'
```

---

## Documents

### List Documents
```bash
# Filter by userId, vehicleId, or transporterId
curl -X GET "{BASE_URL}/api/documents?userId={USER_ID}" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Upload a Document
```bash
curl -X POST "{BASE_URL}/api/documents" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "userId": "{USER_ID}",
    "vehicleId": "{VEHICLE_ID}",
    "transporterId": "{TRANSPORTER_ID}",
    "entityType": "driver",
    "type": "license",
    "documentName": "Driving License",
    "url": "https://example.com/docs/license.pdf",
    "expiryDate": "2025-12-31"
  }'
```

### Update Document Status
```bash
# Status options: verified, pending, expired, rejected
curl -X PATCH "{BASE_URL}/api/documents/{DOCUMENT_ID}/status" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "status": "verified"
  }'
```

---

## System

### Health Check
```bash
curl -X GET "{BASE_URL}/api/health" \
  -H "Content-Type: application/json"
```

---

## Quick Reference

### Environment Variables
```bash
# Development
export BASE_URL="https://dev.waykel.com"

# Production
export BASE_URL="https://admin.waykel.com"
```

### Common Headers
```
Content-Type: application/json
Cookie: connect.sid=YOUR_SESSION_ID
```

### Role Types
- `customer` - End users who book trips
- `driver` - Drivers who complete trips
- `transporter` - Fleet owners/companies
- `admin` - Platform administrators

### Ride Status Flow
```
pending → bid_placed → scheduled → active → completed
            ↓
        cancelled
```

### Bid Status Flow
```
pending → accepted → (ride assigned)
    ↓
rejected
```

### Transporter Status Flow
```
pending_approval → active
       ↓
   suspended
```
