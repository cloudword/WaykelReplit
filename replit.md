# Waykel - Commercial Vehicle Logistics Platform

### Overview
Waykel is a production-ready commercial vehicle logistics platform designed to connect commercial vehicle drivers/transporters with available loads across India. Similar to ride-sharing services, it enables users to find work, bid on transportation requests, and manage their logistics operations. The platform supports a multi-role hierarchy including Super Admins, Transporters (fleet owners), Drivers, and Customers, each with tailored interfaces and functionalities.

### Multi-Project Ecosystem
The Waykel platform consists of three interconnected projects:
| Project | Purpose | Environment |
|---------|---------|-------------|
| **waykel-dev** (this project) | Development & Testing | Development |
| **waykeldriver** | Production Backend & Apps | Production |
| **waykelconnect** | Customer Portal (dev.waykel.com) | Production |

All three projects share the same PostgreSQL database. See `docs/ARCHITECTURE.md` for complete system diagrams, ER diagrams, and deployment workflow.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture
The Waykel platform is built with a mobile-first, role-based approach, ensuring an optimized experience for all user types.

**Frontend:**
-   **Technology Stack**: React, Vite, Wouter (for lightweight routing), TailwindCSS, and shadcn/ui for accessible and customizable components.
-   **Design Patterns**: Single-page application (SPA) with role-based routing (`/driver/*`, `/transporter/*`, `/admin/*`, `/customer/*`) and a strong emphasis on mobile-first responsive design.
-   **Key Decisions**: Wouter was chosen for its minimal footprint, and shadcn/ui components are integrated directly into the codebase for full control.
-   **API Base URL**: All API calls MUST use `API_BASE` from `@/lib/api`. In production, frontend and backend are on different subdomains (admin.waykel.com vs api.waykel.com), so relative `/api/*` URLs will fail. Always use `fetch(\`${API_BASE}/...\`)` with `credentials: "include"`.

**Backend:**
-   **Technology Stack**: Node.js, Express.js, and TypeScript.
-   **Design Patterns**: RESTful API with robust role-based access control.
-   **Authentication**: Supports both session-based authentication (for browser clients, using `express-session` with PostgreSQL for persistence) and token-based authentication (JWT Bearer tokens via `/api/auth/token` for server-to-server or external integrations). Password hashing is done with bcrypt.
-   **Transporter Workflow**: New transporters undergo an approval process by a Super Admin, preventing access until their status is active.
-   **Data Storage Abstraction**: A `storage.ts` module provides an interface for database operations, allowing for flexible ORM/database swapping.
-   **Build Process**: `tsx` for development with hot reload, `esbuild` for production bundling to optimize cold start times.

**Data Architecture:**
-   **ORM**: Drizzle ORM is used for type-safe database interactions.
-   **Schema Design**: A single `users` table differentiates roles. Other core tables include `transporters`, `vehicles`, `rides` (for load requests), `bids`, and `documents`.
-   **Key Decisions**: UUIDs are used for primary keys, and a bid-based system manages ride assignments.

**Documents:**
-   **Trip-Scoped**: All documents are trip-scoped. Do NOT introduce customer-level document APIs.
-   **Canonical API**: Use `/api/trips/:tripId/documents` for all trip document operations.
-   **Global APIs**: The `/api/documents` routes are INTERNAL ONLY for driver/vehicle/transporter verification during onboarding.
-   **API Contract**: See `docs/API_CONTRACT_CANONICAL.md` for the canonical document API contract.

**Notifications:**
-   **Backend Triggers**: Notifications are created on: trip created (admin + matching transporters), bid placed (customer), bid accepted (transporter), transporter approved/rejected, document approved/rejected.
-   **Frontend Component**: `NotificationBell` component (`client/src/components/notifications/NotificationBell.tsx`) with polling (30s interval).
-   **API Endpoints**: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/mark-all-read`.
-   **Deep Linking**: Click on notification navigates to relevant page based on type and role.
-   **Retention Policy**: Keep notifications for 90 days. Older notifications to be auto-archived via backend cron (future implementation).
-   **Future Enhancement**: WebSockets for real-time push (current polling is sufficient for MVP).

**Real-time Features**:
-   The architecture includes provisions for WebSockets to support future real-time functionalities like driver location tracking, live ride status updates, and notifications.

**SMS & OTP Authentication:**
-   **Provider Abstraction**: SMS sent via `server/sms/smsService.ts` with pluggable providers (MSG91 implemented).
-   **Shadow Mode**: When `smsMode='shadow'`, OTPs are logged to console instead of sent (for testing).
-   **OTP Storage**: Stored in `otp_codes` table with bcrypt hashing, 3-attempt limit, 10-minute expiration.
-   **API Endpoints**: `POST /api/auth/request-otp`, `POST /api/auth/verify-otp`, `POST /api/auth/reset-password-with-token`.
-   **Platform Settings**: `smsEnabled` (boolean), `smsMode` ('shadow'|'live'), `smsProvider` ('msg91'|null), `smsTemplates` (JSON).
-   **Defaults**: SMS is OFF, shadow mode enabled, no provider configured.
-   **Required Secrets** (for MSG91): `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`.
-   **Transactional SMS Events**: SmsEvent enum with OTP, TRIP_ASSIGNED, BID_ACCEPTED, DELIVERY_COMPLETED, TRANSPORTER_APPROVED, TRANSPORTER_REJECTED.
-   **DLT Template Keys**: `WAYKEL_OTP`, `WAYKEL_TRIP_ASSIGN`, `WAYKEL_BID_ACCEPTED`, `WAYKEL_DELIVERY_DONE`, `WAYKEL_TRANSPORTER_APPROVED`, `WAYKEL_TRANSPORTER_REJECTED`.
-   **Template ID Mapping**: Configured via Admin Panel → Platform Settings → SMS Settings. Map each DLT template key to MSG91 template ID.
-   **Event Triggers**: SMS sent on bid accepted, trip assigned to driver, delivery completed (all with graceful error handling).

**Mobile Applications**:
-   Two separate native mobile apps for Customer and Driver roles are built using Capacitor, enabling access to native device features like geolocation, camera, and push notifications.

### External Dependencies

**Database:**
-   **Dual Database Configuration**: Development uses Replit's built-in Neon PostgreSQL (auto-detected via PGHOST containing `neon.tech`), production uses DigitalOcean Managed Database (via DATABASE_URL).
-   **Schema Migrations**: Use `drizzle-kit push:pg` for local development. For production migrations, run SQL directly in DigitalOcean database console (drizzle-kit times out connecting to remote databases).
-   **Connection Logic** (in `server/db.ts`): In development, constructs connection string from PGHOST/PGUSER/PGPASSWORD/PGDATABASE environment variables when Neon is detected. In production, uses DATABASE_URL directly.

**UI/UX Components:**
-   **Radix UI primitives**: For accessible, unstyled UI components.
-   **Recharts**: For data visualization and analytics.
-   **Lucide React**: Icon library.
-   **date-fns**: For date manipulation.
-   **Framer Motion**: For animations and transitions.

**Development Tools:**
-   **Vite**: Frontend build tool.
-   **esbuild**: Backend bundling.
-   **TypeScript**: For type safety.
-   **TailwindCSS**: For utility-first styling.

**Customer Portal API:**
-   CORS is configured to support a separate customer portal application, with specific API endpoints for customer-related actions (e.g., booking rides, viewing history).
-   **Bidirectional Sync**: The Customer Mobile App (Capacitor) and Customer Portal connect to the same backend/database, enabling seamless sync. A customer can book on the portal and see it on the mobile app instantly.
-   **Feature Parity**: See `docs/CUSTOMER_FEATURE_PARITY.md` for complete feature matrix.
-   **API Documentation**: See `docs/CUSTOMER_PORTAL_API.md` for complete JWT authentication guide and endpoint documentation.

**API Logging System:**
-   All API requests are logged to the `api_logs` table for monitoring and debugging.
-   Logs include: method, path, status code, response time, user info, origin, and sanitized request bodies (passwords/tokens removed).
-   External requests (from customer portal) are flagged with `is_external=true` based on origin header.
-   Admin panel includes API Logs page (`/admin/api-logs`) with filtering, search, and real-time stats.
-   Stats endpoint provides aggregate metrics: total requests, external requests, error count, avg response time.

**Mobile Apps (Capacitor):**
-   **Customer App** (`com.waykel.customer`): Config at `capacitor.customer.config.ts`, Theme: Blue (#2563eb)
-   **Driver App** (`com.waykel.driver`): Config at `capacitor.driver.config.ts`, Theme: Emerald (#059669)
-   **Build Scripts**:
    -   `./scripts/build-mobile-customer.sh` - Build Customer app (daily use)
    -   `./scripts/build-mobile-driver.sh` - Build Driver app (daily use)
    -   `./scripts/init-mobile-platforms.sh` - Initialize both apps (ONE TIME only)
-   **Build Guide**: See `docs/mobile/BUILD_GUIDE.md` for local build instructions
-   **CI/CD**: GitHub Actions workflows for automated builds - see `docs/mobile/CI_CD_SETUP.md`
    -   `.github/workflows/build-android.yml` - Android APK builds
    -   `.github/workflows/build-ios.yml` - iOS simulator builds
-   **Native Features**: Geolocation, Camera, Push Notifications via `client/src/lib/native.ts`
-   **Mobile Bottom Nav**: `client/src/components/layout/mobile-bottom-nav.tsx` - Shared navigation component for mobile apps

**Admin Storage Management:**
-   **Storage Page**: `/admin/storage` - Super Admin only page to browse and manage DigitalOcean Spaces files
-   **API Endpoints**: `GET /api/admin/storage`, `GET /api/admin/storage/file`, `DELETE /api/admin/storage/file`, `GET /api/admin/storage/directories`
-   **Features**: Directory navigation, file preview, signed URL generation, file deletion

**Admin Verification Center:**
-   **Main Page**: `/admin/verification` - Consolidated hierarchical verification page
-   **Legacy Pages** (still available): `/admin/verification/transporters`, `/admin/verification/drivers`, `/admin/verification/vehicles`
-   **API Endpoints**: 
    - `GET /api/admin/verification/overview` - Hierarchical data with transporters → vehicles → drivers tree
    - `GET /api/admin/verification/transporters`, `GET /api/admin/verification/drivers`, `GET /api/admin/verification/vehicles` (legacy)
-   **Tree Structure**: Transporter card → Business Documents + Vehicles branch + Drivers branch (all collapsible)
-   **Document Type Grouping**: Documents grouped by type with required/optional indicators
    - **Vehicles**: RC (Required - red border), Insurance/Permit/Fitness/Pollution (Optional - blue border)
    - **Drivers**: Driving License (Required - red border), Aadhar/PAN/Photo (Optional - blue border)
    - **Transporters**: GST Certificate/Business Registration (Required), Trade License/Bank Details (Optional)
-   **Visual Indicators**: 
    - Missing required docs show "Not Uploaded" badge
    - Pending docs show yellow "Pending Review" badge
    - Verified docs show green "Verified" badge
-   **Features**: Document preview, approve/reject buttons for pending documents, transporter approval/rejection
-   **Sorting**: Transporters with most pending documents appear first
-   **Actions**: Uses existing document approval (`PATCH /api/documents/:id/status`) and transporter approval (`POST /api/transporters/:id/approve|reject`) APIs

**Document Upload System:**
-   Direct file uploads are supported for driver and vehicle documents, storing them in cloud storage with private visibility and role-based access control.
-   **Multi-Provider Support**: Supports both Google Cloud Storage (for Replit) and DigitalOcean Spaces (for self-hosted deployments).
-   **Spaces Storage**: `server/spacesStorage.ts` provides S3-compatible storage for DigitalOcean Spaces.

**Session Storage:**
-   **Development**: MemoryStore (sessions lost on server restart)
-   **Production**: PostgreSQL-backed sessions via `connect-pg-simple` (persistent across deployments)
-   Auto-creates `user_sessions` table when using PostgreSQL session store

**DigitalOcean Deployment:**
-   Full deployment guide: `docs/DIGITALOCEAN_DEPLOYMENT.md`
-   **Recommended Architecture**: Separate frontend and backend services to avoid SPA routing conflicts
    -   Frontend: `admin.waykel.com` → Static site serving React app
    -   Backend: `api.waykel.com` → Web service running Express
-   **Frontend Environment Variable**: `VITE_API_BASE_URL=https://api.waykel.com/api` (set during build)
-   **Required Backend Variables**: `DATABASE_URL`, `SESSION_SECRET`, `JWT_SECRET`, `NODE_ENV`
-   **Spaces Variables**: `DO_SPACES_ENDPOINT`, `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_BUCKET`
-   **Frontend Build Command**: `npm install && npm run build` (in client directory)
-   **Backend Build Command**: `npm install && npm run build`
-   **Backend Run Command**: `npm start`

**Replit-Specific Integrations:**
-   Includes development plugins like `@replit/vite-plugin-runtime-error-modal` and `@replit/vite-plugin-cartographer`, which are enabled only when running on Replit.
-   `vite-plugin-meta-images` for OpenGraph meta tag updates on Replit deployments.