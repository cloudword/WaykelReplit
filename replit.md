# Waykel - Commercial Vehicle Logistics Platform

## Overview

Waykel is a production-ready commercial vehicle logistics platform similar to ride-sharing services (Uber/Ola) but focused on commercial vehicle transportation. The system connects drivers/transporters with loads across India, enabling them to find work, bid on rides, and earn through the platform.

## User Role Hierarchy

The platform has a clear hierarchy of user roles:

1. **Super Admin (Waykel)** - Platform owner with full control
   - Username: waykelAdmin / Password: Waykel6@singh
   - Manages all transporters, drivers, vehicles, bids, and rides
   - Approves/suspends transporters
   - Approves/rejects bids
   - Web-based admin panel at `/admin/*`

2. **Transporters** - Fleet owners/companies (like sub-admins)
   - Have their own admin panel at `/transporter/*`
   - Manage their fleet of drivers and vehicles
   - Browse marketplace and place bids on available loads
   - Track their bids, earnings, and operations
   - Must be approved by Super Admin before they can access the platform
   - A transporter and driver CAN be the same user (owner-operator)

3. **Drivers** - Work under transporters
   - Mobile app only at `/driver/*` (no admin panel)
   - Accept rides, track earnings, manage their profile
   - Can be independent or linked to a transporter via `transporterId`
   - Simple mobile-first interface for field operations

4. **Customers** - Book transportation services
   - Have both dashboard and mobile app at `/customer/*`
   - Book rides, track deliveries, view history

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React + Vite + Wouter (routing) + TailwindCSS + shadcn/ui components

**Design Pattern**: Mobile-first progressive web application with role-based routing

The frontend is built as a single-page application that adapts its interface based on user roles. Each role has dedicated route namespaces:
- `/driver/*` - Driver mobile interface
- `/transporter/*` - Transporter web dashboard  
- `/admin/*` - Super admin control panel
- `/customer/*` - Customer/rider interface

**Key Architectural Decisions**:
- **Wouter instead of React Router**: Chosen for its lightweight footprint (~1.2kB) and simpler API, suitable for the relatively straightforward routing needs
- **shadcn/ui component library**: Provides accessible, customizable components that can be copied into the project rather than installed as dependencies, giving full control over styling
- **Mobile-first responsive design**: Primary users (drivers) access the platform via mobile devices, so the UI prioritizes mobile experience with progressive enhancement for desktop
- **Component-based architecture**: Shared components like RideCard, VehicleSelector, and CalendarView are reusable across different user roles

### Backend Architecture

**Technology Stack**: Node.js + Express.js + TypeScript

**Design Pattern**: RESTful API with role-based access control

The backend follows a traditional REST API architecture serving JSON responses. Key design choices:

**Route Organization**:
- `/api/auth/*` - Authentication endpoints (register, login)
- `/api/rides/*` - Ride management (CRUD operations, status updates, assignments)
- `/api/bids/*` - Bidding system endpoints
- `/api/vehicles/*` - Vehicle management
- `/api/users/*` - User profile and status management
- `/api/transporters/*` - Transporter company management

**Authentication Strategy**: 
- Session-based authentication using express-session with PostgreSQL session store (connect-pg-simple)
- Password-based authentication using bcrypt for hashing
- Session regeneration on login to prevent session fixation attacks
- Phone number as primary identifier for regular users; username for Super Admin
- Super Admin credentials: username "waykelAdmin" with password "Waykel6@singh"

**Transporter Approval Workflow**:
- New transporters register with "pending_approval" status
- Backend enforces status check during login - pending/suspended transporters cannot authenticate
- Admin approves transporters via the admin dashboard before they can access the platform
- Status options: pending_approval, active, suspended

**Storage Layer Abstraction**:
The `storage.ts` module provides an interface-based abstraction over database operations, making it easy to swap ORM implementations or databases. All database interactions go through this storage interface rather than direct ORM calls in routes.

**Build Process**:
- Development: tsx for TypeScript execution with hot reload
- Production: esbuild bundles server code with selective dependency bundling (whitelist approach) to reduce cold start times
- Client assets built separately with Vite and served from `dist/public`

### Data Architecture

**ORM**: Drizzle ORM - chosen for type safety and zero-cost abstractions

**Schema Design**:

**Core Tables**:
- `users` - All platform users (drivers, transporters, admins, customers) with role-based differentiation
- `transporters` - Company/fleet owner details with approval workflow
- `vehicles` - Vehicle registry linked to users/transporters with status tracking
- `rides` - Load/trip requests with full lifecycle management
- `bids` - Bidding mechanism for ride assignments
- `documents` - User/vehicle document storage and verification

**Key Design Decisions**:
- **Single users table with role field**: Simpler than separate tables per role, leveraging TypeScript unions for type safety
- **Approval workflow pattern**: Transporters start in "pending_approval" status, requiring admin verification before becoming active
- **Bid-based assignment**: Rides support competitive bidding rather than automatic assignment, giving platform control over matching
- **UUID primary keys**: Using PostgreSQL's `gen_random_uuid()` for distributed-friendly identifiers

**Relationships**:
- Users can have multiple vehicles
- Transporters can have fleets of vehicles
- Rides can receive multiple bids
- Bids reference specific vehicles for the assignment

### Real-time Features

The architecture includes provisions for real-time features:
- WebSocket setup in `server/index.ts` via HTTP server creation
- Planned features: driver location tracking, live ride status updates, real-time notifications

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL provider accessed via `@neondatabase/serverless`
- Connection pooling with `ws` WebSocket library for serverless compatibility
- Drizzle ORM for type-safe database operations

### UI Components
- **Radix UI primitives**: Accessible, unstyled component primitives for dialogs, dropdowns, tabs, etc.
- **Recharts**: Chart library for earnings visualizations and analytics dashboards
- **Lucide React**: Icon library
- **date-fns**: Date manipulation and formatting
- **Framer Motion**: Animation library for splash screens and transitions

### Development Tools
- **Vite**: Frontend build tool and dev server
- **esbuild**: Production server bundling
- **TypeScript**: Type safety across frontend and backend
- **TailwindCSS**: Utility-first styling framework

### Customer Portal API

The platform includes CORS support for a separate customer portal application:

**Configuration:**
- Set `CUSTOMER_PORTAL_URL` environment variable to allow cross-origin requests from the customer portal domain
- CORS is pre-configured for localhost development (ports 3000 and 5173)

**Customer-Specific Endpoints:**
- `GET /api/rides?createdById={customerId}` - Fetch customer's trip history
- `POST /api/rides` - Create new trip request (booking)
- `GET /api/bids?rideId={rideId}` - View bids on a customer's trip

**API Documentation:**
- Full API documentation available at `docs/CUSTOMER_PORTAL_API.md`
- Includes all endpoints, data structures, and example integration code

### Planned Integrations (Referenced but not implemented)
- **Payment Processing**: Stripe and Razorpay mentioned in documentation
- **Maps/Geolocation**: Google Maps integration for route tracking
- **Real-time Communication**: Socket.IO for driver tracking and notifications

### Document Upload System

The platform supports direct file uploads for driver and vehicle documents without requiring external services like Google Drive.

**Features:**
- Direct file upload to cloud storage (Replit Object Storage)
- Multi-file upload support
- Progress tracking for each file
- Automatic ACL (Access Control List) assignment

**Security Model:**
- Files are stored with "private" visibility
- Only the owner (transporter/user) and super admins can access files
- Authentication required for all upload and download operations
- Owner ID derived from session, not client-supplied data

**Environment Variables:**
- `PRIVATE_OBJECT_DIR` - Base directory for uploaded documents (e.g., `/waykel-documents`)

**API Endpoints:**
- `POST /api/objects/upload` - Get signed upload URL (requires auth)
- `POST /api/objects/confirm` - Confirm upload and set ACL (requires auth)
- `GET /objects/:objectPath(*)` - Download file (requires auth + ACL check)

### Replit-Specific Plugins
- `@replit/vite-plugin-runtime-error-modal` - Development error overlay (disabled outside Replit)
- `@replit/vite-plugin-cartographer` - Development tooling (disabled outside Replit)
- `vite-plugin-meta-images` - Custom plugin for updating OpenGraph meta tags with Replit deployment URLs

## Portability & Self-Hosting Guide

This codebase is designed to run both on Replit and on self-hosted servers (GitHub + any VPS/cloud).

### Environment Variables

**Required for all deployments:**
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Random string for session encryption | `generate-random-64-char-string` |
| `PORT` | Server port (default: 5000) | `5000` |

**For Customer Portal (optional):**
| Variable | Description | Example |
|----------|-------------|---------|
| `CUSTOMER_PORTAL_URL` | CORS origin for customer app | `https://customer.waykel.com` |

**For Object Storage (choose one):**

Option A - Replit Object Storage (Replit only):
- Set up via Replit's Object Storage tab in the Tools panel
- `PRIVATE_OBJECT_DIR` - Base directory (e.g., `/waykel-documents`)

Option B - Google Cloud Storage (self-hosted):
| Variable | Description |
|----------|-------------|
| `GCS_BUCKET` | GCS bucket name |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON file |

Option C - AWS S3 (self-hosted):
| Variable | Description |
|----------|-------------|
| `S3_BUCKET` | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region (e.g., `us-east-1`) |

### Database Compatibility

The codebase automatically detects database type:
- **Neon/Serverless PostgreSQL**: Uses `@neondatabase/serverless` driver
- **Standard PostgreSQL**: Uses `pg` driver when `DATABASE_URL` doesn't contain `neon.tech`

For local development:
```bash
# Install PostgreSQL locally
docker run -d --name waykel-db -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:15

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:secret@localhost:5432/waykel"
```

### Session Store

- **Development**: Uses MemoryStore (auto-detected via `NODE_ENV`)
- **Production**: Uses PostgreSQL-backed sessions via `connect-pg-simple`

### Build & Deploy (Self-Hosted)

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Build for production
npm run build

# Start production server
npm start
```

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Replit-Specific Setup

When running on Replit:
1. Go to Tools → Object Storage and create a bucket
2. Note the bucket name and set `PRIVATE_OBJECT_DIR` 
3. The Replit sidecar (port 1106) handles signed URLs automatically

### Known Portability Notes

1. **Vite plugins**: `@replit/vite-plugin-*` are guarded by `REPL_ID` check and won't load outside Replit
2. **Object Storage**: Requires manual setup of GCS/S3 for self-hosting (not Replit sidecar)
3. **Production deployments**: Use environment-specific database credentials and session secrets