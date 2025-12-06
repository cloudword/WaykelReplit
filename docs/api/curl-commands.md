# Waykel API - cURL Commands

## Base URLs:
- **Production**: `https://admin.waykel.com`
- **Development**: `https://dev.waykel.com`
- **Local**: `http://localhost:5000`

## Authentication

### Register User
```bash
curl -X POST https://admin.waykel.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "password123",
    "role": "customer"
  }'
```

### Login
```bash
curl -X POST https://admin.waykel.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9111111111",
    "password": "driver123"
  }'
```

---

## Rides

### Get All Rides
```bash
curl -X GET https://admin.waykel.com/api/rides
```

### Get Pending Rides (Awaiting Bids)
```bash
curl -X GET "https://admin.waykel.com/api/rides?status=pending"
```

### Get Active Rides (In Transit)
```bash
curl -X GET "https://admin.waykel.com/api/rides?status=active"
```

### Get Scheduled Rides
```bash
curl -X GET "https://admin.waykel.com/api/rides?status=scheduled"
```

### Get Completed Rides
```bash
curl -X GET "https://admin.waykel.com/api/rides?status=completed"
```

### Get Driver's Rides
```bash
curl -X GET "https://admin.waykel.com/api/rides?driverId=DRIVER_UUID"
```

### Get Ride by ID
```bash
curl -X GET https://admin.waykel.com/api/rides/RIDE_UUID
```

### Create Ride (Customer Booking)
```bash
curl -X POST https://admin.waykel.com/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": "Mumbai, Maharashtra",
    "dropLocation": "Pune, Maharashtra",
    "pickupTime": "09:00",
    "dropTime": null,
    "date": "2025-12-10",
    "status": "pending",
    "price": "5000.00",
    "distance": "150 km",
    "cargoType": "Electronics",
    "weight": "2-5 Ton",
    "customerName": "John Doe",
    "customerPhone": "9876543210",
    "createdById": "USER_UUID"
  }'
```

### Update Ride Status
```bash
curl -X PATCH https://admin.waykel.com/api/rides/RIDE_UUID/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active"
  }'
```

### Assign Driver to Ride (Admin)
```bash
curl -X PATCH https://admin.waykel.com/api/rides/RIDE_UUID/assign \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "DRIVER_UUID",
    "vehicleId": "VEHICLE_UUID"
  }'
```

---

## Bids

### Get All Bids (Admin)
```bash
curl -X GET https://admin.waykel.com/api/bids
```

### Get Bids for a Ride
```bash
curl -X GET "https://admin.waykel.com/api/bids?rideId=RIDE_UUID"
```

### Get User's Bids
```bash
curl -X GET "https://admin.waykel.com/api/bids?userId=USER_UUID"
```

### Place a Bid (Driver/Transporter)
```bash
curl -X POST https://admin.waykel.com/api/bids \
  -H "Content-Type: application/json" \
  -d '{
    "rideId": "RIDE_UUID",
    "userId": "USER_UUID",
    "transporterId": "TRANSPORTER_UUID",
    "vehicleId": "VEHICLE_UUID",
    "amount": "4500.00"
  }'
```

### Approve/Reject Bid (Admin)
```bash
# Approve
curl -X PATCH https://admin.waykel.com/api/bids/BID_UUID/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "accepted"
  }'

# Reject
curl -X PATCH https://admin.waykel.com/api/bids/BID_UUID/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected"
  }'
```

---

## Vehicles

### Get User's Vehicles
```bash
curl -X GET "https://admin.waykel.com/api/vehicles?userId=USER_UUID"
```

### Get Transporter's Fleet
```bash
curl -X GET "https://admin.waykel.com/api/vehicles?transporterId=TRANSPORTER_UUID"
```

### Register Vehicle
```bash
curl -X POST https://admin.waykel.com/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_UUID",
    "transporterId": "TRANSPORTER_UUID",
    "type": "Truck",
    "plateNumber": "MH01XY9999",
    "model": "Tata 407",
    "capacity": "3 Ton",
    "status": "active"
  }'
```

---

## Transporters

### Get All Transporters
```bash
curl -X GET https://admin.waykel.com/api/transporters
```

### Get Pending Transporters
```bash
curl -X GET "https://admin.waykel.com/api/transporters?status=pending_approval"
```

### Register Transporter Company
```bash
curl -X POST https://admin.waykel.com/api/transporters \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Quick Logistics",
    "ownerName": "Rajesh Kumar",
    "contact": "9876543210",
    "email": "quick@logistics.com",
    "status": "pending_approval",
    "fleetSize": 5,
    "location": "Delhi",
    "baseCity": "Delhi",
    "preferredRoutes": ["Delhi-Jaipur", "Delhi-Chandigarh"]
  }'
```

### Approve/Suspend Transporter (Admin)
```bash
# Approve
curl -X PATCH https://admin.waykel.com/api/transporters/TRANSPORTER_UUID/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active"
  }'

# Suspend
curl -X PATCH https://admin.waykel.com/api/transporters/TRANSPORTER_UUID/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "suspended"
  }'
```

---

## Users

### Toggle Driver Online Status
```bash
curl -X PATCH https://admin.waykel.com/api/users/USER_UUID/online-status \
  -H "Content-Type: application/json" \
  -d '{
    "isOnline": true
  }'
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
