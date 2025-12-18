# Backend API Contract

> Auto-generated: December 18, 2025  
> Source: `server/routes.ts`

This document lists all HTTP API endpoints exposed by the Waykel backend.

---

## Authentication Methods

| Method | Description |
|--------|-------------|
| `none` | Public endpoint, no authentication required |
| `session` | Express session-based authentication (browser cookies) |
| `JWT` | Bearer token authentication via `Authorization: Bearer <token>` header |
| `both` | Accepts either session or JWT authentication |

---

## API Endpoints

### Health & System

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| GET | `/api/health` | routes.ts:283 | Health check endpoint for monitoring database connectivity | none | public |

### Authentication

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| POST | `/api/auth/register` | routes.ts:304 | Register new user account (creates transporter if role=transporter) | none | public |
| POST | `/api/auth/login` | routes.ts:407 | Session-based login with username/phone and password | none | public |
| POST | `/api/auth/token` | routes.ts:463 | Generate JWT Bearer token for API authentication | none | public |
| POST | `/api/auth/token/refresh` | routes.ts:519 | Refresh existing JWT token with extended expiry | both | authenticated |
| POST | `/api/auth/logout` | routes.ts:555 | Destroy session and clear authentication cookies | session | authenticated |
| GET | `/api/auth/session` | routes.ts:565 | Check current authentication status and get user info | both | authenticated |
| POST | `/api/auth/change-password` | routes.ts:574 | Change user password with current password validation | both | authenticated |

### Customer Portal

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| POST | `/api/customer/register` | routes.ts:623 | Customer-specific registration endpoint returning JWT | none | public |
| POST | `/api/customer/login` | routes.ts:717 | Customer-specific login endpoint returning JWT | none | public |
| POST | `/api/customer/logout` | routes.ts:760 | Customer logout (client-side token removal) | JWT | customer |
| GET | `/api/customer/session` | routes.ts:766 | Check customer authentication status | both | customer |
| GET | `/api/customer/rides` | routes.ts:779 | Get customer's own rides | both | customer |
| POST | `/api/customer/rides` | routes.ts:795 | Create new ride as customer | both | customer |
| GET | `/api/customer/rides/:rideId/bids` | routes.ts:816 | Get bids for customer's ride | both | customer |
| PATCH | `/api/customer/bids/:bidId/accept` | routes.ts:843 | Accept a bid on customer's ride | both | customer |
| GET | `/api/customer/addresses` | routes.ts:888 | Get customer's saved addresses | both | customer |
| POST | `/api/customer/addresses` | routes.ts:903 | Create saved address for customer | both | customer |
| PATCH | `/api/customer/addresses/:id` | routes.ts:921 | Update customer's saved address | both | customer |
| DELETE | `/api/customer/addresses/:id` | routes.ts:946 | Delete customer's saved address | both | customer |

### Rides / Trips

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| GET | `/api/rides` | routes.ts:972 | List rides with role-based filtering | both | admin, transporter, driver, customer |
| GET | `/api/rides/:id` | routes.ts:1034 | Get single ride details with access control | both | admin, transporter, driver, customer, public |
| POST | `/api/rides` | routes.ts:1091 | Create new ride with automatic transporter matching | both | authenticated |
| PATCH | `/api/rides/:id/status` | routes.ts:1168 | Update ride status | both | admin |
| PATCH | `/api/rides/:id/assign` | routes.ts:1185 | Assign driver and vehicle to ride | both | admin |
| GET | `/api/rides/:rideId/matches` | routes.ts:2757 | Find matching transporters for ride | both | admin, customer |
| POST | `/api/rides/:rideId/notify-transporters` | routes.ts:2784 | Send notifications to matching transporters | both | admin, customer |
| GET | `/api/rides/:rideId/cheapest-bids` | routes.ts:1655 | Get cheapest bids for a ride | both | admin, customer, transporter |

### Transporter

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| GET | `/api/transporter/marketplace` | routes.ts:1203 | Get marketplace rides with match scores for transporter | both | transporter |
| GET | `/api/transporter/analytics` | routes.ts:1302 | Get transporter analytics dashboard data | both | transporter, admin |
| POST | `/api/transporter/trips` | routes.ts:3622 | Create trip with optional self-assignment | both | transporter, admin |
| GET | `/api/transporters` | routes.ts:1789 | List all transporters | both | admin |
| POST | `/api/transporters` | routes.ts:1806 | Create new transporter (public registration) | none | public |
| PATCH | `/api/transporters/:id/status` | routes.ts:1817 | Update transporter status | both | admin |
| POST | `/api/transporters/:id/verify` | routes.ts:1828 | Verify and approve transporter | both | admin |
| POST | `/api/transporters/:id/approve` | routes.ts:1860 | Approve transporter with confirmation workflow | both | admin |
| POST | `/api/transporters/:id/reject` | routes.ts:1920 | Reject transporter with reason | both | admin |

### Bids

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| GET | `/api/bids` | routes.ts:1512 | List bids with role-based filtering | both | admin, transporter, customer |
| POST | `/api/bids` | routes.ts:1555 | Create bid on ride (enforces transporter verification) | both | transporter, admin |
| PATCH | `/api/bids/:id/status` | routes.ts:1614 | Update bid status | both | admin |
| POST | `/api/bids/:bidId/accept` | routes.ts:2911 | Accept bid and assign trip (enforces verification) | both | admin, customer |

### Vehicles

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| GET | `/api/vehicles` | routes.ts:1737 | List vehicles with ownership filtering | both | authenticated |
| GET | `/api/vehicles/all` | routes.ts:1767 | Get all vehicles (admin view) | both | admin |
| POST | `/api/vehicles` | routes.ts:1777 | Create new vehicle | both | driver, transporter |
| GET | `/api/vehicle-types` | routes.ts:3473 | Get available vehicle types | none | public |

### Users

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| GET | `/api/users` | routes.ts:1982 | List users with role-based filtering | both | authenticated |
| PATCH | `/api/users/:id` | routes.ts:2130 | Update user details | both | admin |
| POST | `/api/users/:id/reset-password` | routes.ts:2160 | Admin reset user password | both | admin |
| PATCH | `/api/users/:id/online-status` | routes.ts:2188 | Update user online status | both | authenticated |
| GET | `/api/customers` | routes.ts:2013 | Get all customers with trip counts | both | admin |
| GET | `/api/drivers` | routes.ts:2035 | Get all drivers | both | admin |

### Documents

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| GET | `/api/documents` | routes.ts:2207 | List documents with ownership filtering | both | authenticated |
| POST | `/api/documents` | routes.ts:2243 | Create document record with automatic replacement | both | authenticated |
| POST | `/api/documents/upload` | routes.ts:2290 | Upload file and create document atomically | both | authenticated |
| PATCH | `/api/documents/:id/status` | routes.ts:2442 | Verify or reject document | both | admin |

### Replit Object Storage

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| POST | `/api/objects/upload` | routes.ts:2466 | Get Replit Object Storage upload URL | session | authenticated |
| GET | `/objects/:objectPath(*)` | routes.ts:2498 | Download file from Replit Object Storage with ACL | both | authenticated |
| POST | `/api/objects/confirm` | routes.ts:2543 | Confirm Replit object upload and set ACL | both | authenticated |

### DigitalOcean Spaces Storage

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| POST | `/api/spaces/upload` | routes.ts:2586 | Upload file to DigitalOcean Spaces storage | both | authenticated |
| GET | `/api/spaces/download/:key(*)` | routes.ts:2675 | Download file from Spaces with path-based ACL | both | authenticated |
| POST | `/api/spaces/signed-url` | routes.ts:2719 | Get temporary signed URL for Spaces file access | both | authenticated |

### Notifications

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| GET | `/api/notifications` | routes.ts:2857 | Get user notifications | both | authenticated |
| PATCH | `/api/notifications/:id/read` | routes.ts:2880 | Mark notification as read | both | authenticated |
| PATCH | `/api/notifications/mark-all-read` | routes.ts:2895 | Mark all notifications as read | both | authenticated |

### Roles & Permissions

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| GET | `/api/permissions` | routes.ts:3035 | Get all available permissions | both | admin |
| GET | `/api/roles` | routes.ts:3040 | Get all custom roles | both | admin |
| POST | `/api/roles` | routes.ts:3051 | Create new custom role | both | admin |
| PATCH | `/api/roles/:id` | routes.ts:3069 | Update custom role | both | admin |
| DELETE | `/api/roles/:id` | routes.ts:3088 | Delete custom role | both | admin |
| GET | `/api/users/:userId/roles` | routes.ts:3107 | Get user's assigned roles | both | authenticated |
| POST | `/api/users/:userId/roles` | routes.ts:3126 | Assign role to user | both | admin |
| DELETE | `/api/users/:userId/roles/:roleId` | routes.ts:3163 | Remove role from user | both | admin |

### Saved Addresses (Transporter)

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| GET | `/api/saved-addresses` | routes.ts:3177 | Get transporter's saved addresses | both | authenticated |
| POST | `/api/saved-addresses` | routes.ts:3194 | Create saved address for transporter | both | authenticated |
| PATCH | `/api/saved-addresses/:id` | routes.ts:3221 | Update saved address | both | authenticated |
| DELETE | `/api/saved-addresses/:id` | routes.ts:3244 | Delete saved address | both | authenticated |

### Driver Applications

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| GET | `/api/driver-applications` | routes.ts:3269 | Get driver job applications | both | admin, transporter |
| GET | `/api/driver-applications/:id` | routes.ts:3290 | Get driver application with full details | both | authenticated |
| GET | `/api/my-driver-application` | routes.ts:3318 | Get current driver's application | both | driver |
| POST | `/api/driver-applications` | routes.ts:3335 | Create driver job application | both | driver |
| PATCH | `/api/driver-applications/:id` | routes.ts:3375 | Update driver application | both | authenticated |
| POST | `/api/driver-applications/:id/withdraw` | routes.ts:3399 | Withdraw driver application | both | driver |
| POST | `/api/driver-applications/:id/hire` | routes.ts:3422 | Hire driver from application | both | transporter, admin |

### Admin Tools

| HTTP Method | Route Path | File:Line | Purpose | Auth | Allowed Roles |
|-------------|------------|-----------|---------|------|---------------|
| GET | `/api/admin/logs` | routes.ts:2046 | Get API request logs | both | admin |
| GET | `/api/admin/logs/stats` | routes.ts:2064 | Get API log statistics | both | admin |
| GET | `/api/admin/stats` | routes.ts:2074 | Get admin dashboard statistics | both | admin |
| GET | `/api/admin/storage` | routes.ts:3480 | List all files in Spaces storage | both | super_admin |
| GET | `/api/admin/storage/file` | routes.ts:3520 | Get file details and signed URL from Spaces | both | super_admin |
| DELETE | `/api/admin/storage/file` | routes.ts:3559 | Delete file from Spaces storage | both | super_admin |
| GET | `/api/admin/storage/directories` | routes.ts:3586 | List storage directory structure | both | super_admin |

---

## Summary

| Category | Endpoint Count |
|----------|----------------|
| Health & System | 1 |
| Authentication | 7 |
| Customer Portal | 12 |
| Rides / Trips | 8 |
| Transporter | 9 |
| Bids | 4 |
| Vehicles | 4 |
| Users | 6 |
| Documents | 4 |
| Replit Object Storage | 3 |
| DigitalOcean Spaces Storage | 3 |
| Notifications | 3 |
| Roles & Permissions | 8 |
| Saved Addresses | 4 |
| Driver Applications | 7 |
| Admin Tools | 7 |
| **Total** | **90** |

---

## Notes

1. **Rate Limiting**: Several endpoints have rate limiting applied:
   - `authLimiter`: Authentication endpoints (login, register, token)
   - `sensitiveAuthLimiter`: Password change endpoints
   - `protectedLimiter`: Analytics and document verification
   - `bidLimiter`: Bid creation
   - `marketplaceLimiter`: Marketplace queries
   - `uploadLimiter`: File uploads

2. **Dual Authentication**: Most endpoints support both session and JWT authentication. The `getCurrentUser()` helper checks session first, then falls back to JWT token.

3. **Role Hierarchy**:
   - `super_admin` (isSuperAdmin flag) - Full system access
   - `admin` - Administrative access
   - `transporter` - Fleet owner access
   - `driver` - Driver access
   - `customer` - Customer access

4. **Object Storage**: The platform supports two storage backends:
   - **Replit Object Storage**: Used when running on Replit (`/objects/*` routes)
   - **DigitalOcean Spaces**: Used for production deployments (`/api/spaces/*` routes)
