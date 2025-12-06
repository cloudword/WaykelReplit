# Waykel - Commercial Vehicle Logistics Platform

### Overview
Waykel is a production-ready commercial vehicle logistics platform designed to connect commercial vehicle drivers/transporters with available loads across India. Similar to ride-sharing services, it enables users to find work, bid on transportation requests, and manage their logistics operations. The platform supports a multi-role hierarchy including Super Admins, Transporters (fleet owners), Drivers, and Customers, each with tailored interfaces and functionalities.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture
The Waykel platform is built with a mobile-first, role-based approach, ensuring an optimized experience for all user types.

**Frontend:**
-   **Technology Stack**: React, Vite, Wouter (for lightweight routing), TailwindCSS, and shadcn/ui for accessible and customizable components.
-   **Design Patterns**: Single-page application (SPA) with role-based routing (`/driver/*`, `/transporter/*`, `/admin/*`, `/customer/*`) and a strong emphasis on mobile-first responsive design.
-   **Key Decisions**: Wouter was chosen for its minimal footprint, and shadcn/ui components are integrated directly into the codebase for full control.

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

**Real-time Features**:
-   The architecture includes provisions for WebSockets to support future real-time functionalities like driver location tracking, live ride status updates, and notifications.

**Mobile Applications**:
-   Two separate native mobile apps for Customer and Driver roles are built using Capacitor, enabling access to native device features like geolocation, camera, and push notifications.

### External Dependencies

**Database:**
-   **Neon PostgreSQL**: Utilized as the serverless PostgreSQL provider, accessed via `@neondatabase/serverless` and Drizzle ORM.

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

**Document Upload System:**
-   Direct file uploads are supported for driver and vehicle documents, storing them in cloud storage (e.g., Replit Object Storage, Google Cloud Storage, AWS S3) with private visibility and role-based access control.

**Replit-Specific Integrations:**
-   Includes development plugins like `@replit/vite-plugin-runtime-error-modal` and `@replit/vite-plugin-cartographer`, which are enabled only when running on Replit.
-   `vite-plugin-meta-images` for OpenGraph meta tag updates on Replit deployments.