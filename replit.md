# Waykel - Commercial Vehicle Logistics Platform

### Overview
Waykel is a production-ready commercial vehicle logistics platform connecting commercial vehicle drivers/transporters with available loads across India. It functions similarly to ride-sharing services, enabling users to find work, bid on transportation requests, and manage logistics. The platform supports a multi-role hierarchy including Super Admins, Transporters, Drivers, and Customers, each with tailored interfaces. It comprises three interconnected projects: `waykel-dev` (development), `waykeldriver` (production backend & apps), and `waykelconnect` (customer portal), all sharing a single PostgreSQL database.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture
The Waykel platform adopts a mobile-first, role-based approach, ensuring an optimized experience for all user types.

**Frontend:**
-   **Technology Stack**: React, Vite, Wouter, TailwindCSS, and shadcn/ui.
-   **Design Patterns**: Single-page application (SPA) with role-based routing (`/driver/*`, `/transporter/*`, `/admin/*`, `/customer/*`) and mobile-first responsive design.
-   **Key Decisions**: Wouter for lightweight routing, shadcn/ui for customizable components. All API calls must use `API_BASE` from `@/lib/api` with `fetch(\`${API_BASE}/...\`)` and `credentials: "include"`.

**Backend:**
-   **Technology Stack**: Node.js, Express.js, and TypeScript.
-   **Design Patterns**: RESTful API with robust role-based access control.
-   **Authentication**: Session-based (browser clients, `express-session` with PostgreSQL) and token-based (JWT via `/api/auth/token`). Passwords hashed with bcrypt.
-   **Transporter Workflow**: New transporters require Super Admin approval.
-   **Data Storage Abstraction**: `storage.ts` provides a flexible interface for database operations.
-   **Build Process**: `tsx` for development, `esbuild` for production bundling.

**Data Architecture:**
-   **ORM**: Drizzle ORM for type-safe database interactions.
-   **Schema Design**: Single `users` table differentiates roles. Core tables include `transporters`, `vehicles`, `rides`, `bids`, and `documents`.
-   **Key Decisions**: UUIDs for primary keys; bid-based system for ride assignments.

**Universal Entity ID System:**
-   **Purpose**: Human-readable identifiers (e.g., T-A2B3C4) for quick reference.
-   **Format**: Prefix + 6 alphanumeric characters (T, V, D, C prefixes for Transporter, Vehicle, Driver, Customer respectively).
-   **Generation**: `generateEntityId(prefix)` function in `server/utils/entityId.ts`, automatically generated in `storage.ts`.
-   **Database**: `entity_id` TEXT UNIQUE column on relevant tables.

**Documents:**
-   **Trip-Scoped**: All documents are tied to trips.
-   **Canonical API**: `/api/trips/:tripId/documents` for all trip document operations.
-   **Internal APIs**: `/api/documents` routes are for internal onboarding verification only.

**Notifications:**
-   **Backend Triggers**: For events like trip creation, bid placement/acceptance, approvals.
-   **Frontend**: `NotificationBell` component with polling (30s).
-   **API Endpoints**: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/mark-all-read`.
-   **Deep Linking**: Notifications navigate to relevant pages.
-   **Retention**: 90 days.

**SMS & OTP Authentication:**
-   **Provider Abstraction**: `server/sms/smsService.ts` with pluggable providers (MSG91 implemented).
-   **Shadow Mode**: OTPs logged to console for testing when `smsMode='shadow'`.
-   **OTP Storage**: `otp_codes` table with bcrypt, 3-attempt limit, 10-min expiration.
-   **API Endpoints**: `POST /api/auth/request-otp`, `POST /api/auth/verify-otp`, `POST /api/auth/reset-password-with-token`.
-   **Platform Settings**: `smsEnabled`, `smsMode`, `smsProvider`, `smsTemplates`.
-   **Transactional SMS Events**: OTP, TRIP_ASSIGNED, BID_ACCEPTED, DELIVERY_COMPLETED, TRANSPORTER_APPROVED, TRANSPORTER_REJECTED.

**Mobile Applications**:
-   Two native mobile apps (Customer and Driver) built with Capacitor for native features (geolocation, camera, push notifications).

**API Logging System:**
-   All API requests logged to `api_logs` table for monitoring and debugging (method, path, status, response time, user, origin, sanitized body).
-   Admin panel includes API Logs page with filtering, search, and real-time stats.

**Admin Storage Management:**
-   Super Admin page (`/admin/storage`) for browsing and managing DigitalOcean Spaces files (directory navigation, file preview, signed URL, deletion).

**Admin Verification Center:**
-   Consolidated page (`/admin/verification`) for hierarchical verification of transporters, vehicles, and drivers.
-   Documents grouped by type with required/optional indicators and visual status (Not Uploaded, Pending Review, Verified).
-   Features: Document preview, approve/reject actions for documents and transporters.

**Document Upload System:**
-   Direct file uploads to cloud storage (Google Cloud Storage for Replit, DigitalOcean Spaces for self-hosted) with private visibility and role-based access.

**Session Storage:**
-   **Development**: MemoryStore.
-   **Production**: PostgreSQL-backed sessions via `connect-pg-simple`.

**DigitalOcean Deployment:**
-   Recommended architecture: Separate frontend (static site) and backend (web service) deployments.
-   Frontend env: `VITE_API_BASE_URL`.
-   Backend env: `DATABASE_URL`, `SESSION_SECRET`, `JWT_SECRET`, `NODE_ENV`, DigitalOcean Spaces variables.

**Replit-Specific Integrations:**
-   Development plugins like `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, and `vite-plugin-meta-images` for OpenGraph tags, active only on Replit.

### External Dependencies

**Database:**
-   **PostgreSQL**: Neon (development via Replit) and DigitalOcean Managed Database (production).
-   **Schema Migrations**: `drizzle-kit push:pg` (local), direct SQL for production.

**Cloud Storage:**
-   Google Cloud Storage (development, Replit).
-   DigitalOcean Spaces (production).

**UI/UX Components:**
-   Radix UI (primitives), Recharts (data visualization), Lucide React (icons), date-fns (date manipulation), Framer Motion (animations).

**Development Tools:**
-   Vite, esbuild, TypeScript, TailwindCSS.

**SMS Provider:**
-   MSG91 (configurable).

**Mobile Application Framework:**
-   Capacitor.