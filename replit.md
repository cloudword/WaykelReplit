# Waykel - Commercial Vehicle Logistics Platform

## Overview

Waykel is a production-ready commercial vehicle logistics platform similar to ride-sharing services (Uber/Ola) but focused on commercial vehicle transportation. The system connects drivers/transporters with loads across India, enabling them to find work, bid on rides, and earn through the platform.

The application serves three distinct user roles:
- **Drivers**: Mobile-first interface for accepting rides, tracking earnings, and managing their fleet
- **Transporters**: Web dashboard for managing company fleets and placing bids on available loads
- **Super Admin**: Comprehensive web panel for overseeing the entire platform, approving bids, managing users, and monitoring operations

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
- Password-based authentication using bcrypt for hashing
- JWT tokens for session management (not yet fully implemented in routes)
- Phone number as primary identifier instead of email (common in Indian logistics)

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

### Planned Integrations (Referenced but not implemented)
- **Payment Processing**: Stripe and Razorpay mentioned in documentation
- **Maps/Geolocation**: Google Maps integration for route tracking
- **Real-time Communication**: Socket.IO for driver tracking and notifications

### Replit-Specific Plugins
- `@replit/vite-plugin-runtime-error-modal` - Development error overlay
- `@replit/vite-plugin-cartographer` - Development tooling
- `vite-plugin-meta-images` - Custom plugin for updating OpenGraph meta tags with Replit deployment URLs