# Waykel Entity Relationship Diagram

## Data Model: Transporter, Vehicle, Driver, Documents & Verification

```mermaid
erDiagram
    USERS {
        varchar id PK "UUID"
        text name
        text username UK
        text email UK
        text phone UK
        text password
        text role "driver|transporter|admin|customer"
        boolean isSuperAdmin
        varchar transporterId FK "Links driver to transporter"
        boolean isOnline
        decimal rating
        integer totalTrips
        boolean documentsComplete "Derived: all required docs verified"
        boolean profileComplete
        boolean isSelfDriver "Owner-operator flag"
        timestamp createdAt
    }

    TRANSPORTERS {
        varchar id PK "UUID"
        text companyName
        text ownerName
        text contact
        text email UK
        text status "pending_verification|pending_approval|active|rejected|suspended"
        text rejectionReason
        integer fleetSize
        text location
        text basePincode
        text baseCity
        text[] servicePincodes
        json preferredRoutes
        boolean isOwnerOperator
        varchar ownerDriverUserId FK "Self-driver user"
        boolean documentsComplete "Derived: all required docs verified"
        boolean isVerified "Admin verification flag"
        timestamp verifiedAt
        varchar verifiedBy FK "Admin who verified"
        varchar ownerOperatorVehicleId FK
        text executionPolicy "SELF_ONLY|ASSIGNED_DRIVER_ONLY|ANY_DRIVER"
        timestamp createdAt
    }

    VEHICLES {
        varchar id PK "UUID"
        varchar userId FK "Driver who owns/operates"
        varchar transporterId FK "Fleet owner"
        text type "truck|tempo|pickup|container"
        text plateNumber UK
        text model
        text capacity
        integer capacityKg
        text status "active|inactive|maintenance"
        text currentLocation
        text currentPincode
        timestamp createdAt
    }

    DOCUMENTS {
        varchar id PK "UUID"
        varchar userId FK "Driver docs"
        varchar transporterId FK "Transporter docs"
        varchar vehicleId FK "Vehicle docs"
        varchar customerId FK "Customer docs"
        varchar rideId FK "Trip docs"
        text entityType "driver|vehicle|transporter|customer|trip"
        text type "See DocumentType enum"
        text documentName
        text url
        text storagePath
        text expiryDate
        text status "pending|verified|rejected|expired|replaced|deleted"
        text rejectionReason
        varchar reviewedBy FK "Admin who reviewed"
        timestamp reviewedAt
        varchar replacedById FK "Replacement doc"
        timestamp createdAt
    }

    DRIVER_APPLICATIONS {
        varchar id PK "UUID"
        varchar driverId FK "Applicant user"
        text profileSummary
        text experience
        json preferredVehicleTypes
        json preferredRoutes
        text status "pending|accepted|rejected|withdrawn"
        varchar acceptedByTransporterId FK
        timestamp acceptedAt
        timestamp createdAt
        timestamp updatedAt
    }

    %% Relationships
    USERS ||--o{ DOCUMENTS : "has driver docs"
    USERS ||--o| TRANSPORTERS : "owns (if transporter role)"
    USERS }o--|| TRANSPORTERS : "works for (if driver)"
    USERS ||--o{ VEHICLES : "operates"
    USERS ||--o{ DRIVER_APPLICATIONS : "applies"
    
    TRANSPORTERS ||--o{ VEHICLES : "owns fleet"
    TRANSPORTERS ||--o{ DOCUMENTS : "has company docs"
    TRANSPORTERS ||--o| USERS : "owner-driver link"
    TRANSPORTERS ||--o| USERS : "verified by admin"
    TRANSPORTERS ||--o{ DRIVER_APPLICATIONS : "receives applications"
    
    VEHICLES ||--o{ DOCUMENTS : "has vehicle docs"
    
    DOCUMENTS }o--o| USERS : "reviewed by admin"
```

## Key Data Relationships

### Ownership Hierarchy
1. **Transporter** owns **Vehicles** (fleet)
2. **Transporter** employs **Drivers** (Users with role=driver, transporterId set)
3. **Self-Driver (Owner-Operator)**: User is both driver AND transporter owner
   - `transporters.ownerDriverUserId` → `users.id`
   - `users.isSelfDriver = true`

### Document Scoping
Documents are polymorphic, linked to ONE of:
- `userId` → Driver documents (DL, Aadhar, PAN)
- `transporterId` → Company documents (GST, Trade License)
- `vehicleId` → Vehicle documents (RC, Insurance, Permit)
- `rideId` → Trip documents (POD, Invoice, E-way Bill)

### Approval Status Derivation

| Entity | Status Field | Derived From |
|--------|--------------|--------------|
| **Transporter** | `status` | Admin workflow: `pending_verification` → `pending_approval` → `active` |
| **Transporter** | `documentsComplete` | All required docs have `status='verified'` |
| **Transporter** | `isVerified` | Admin explicitly verified (sets `verifiedBy`, `verifiedAt`) |
| **Driver (User)** | `documentsComplete` | All required docs have `status='verified'` |
| **Vehicle** | `status` | `active`/`inactive`/`maintenance` (operational status, not verification) |
| **Document** | `status` | Admin review: `pending` → `verified`/`rejected` |

### No Orphan States
- A Vehicle MUST belong to a Transporter (`transporterId` required)
- A Driver (role=driver) with `transporterId` is employed; without is freelance
- Documents are always scoped to exactly one entity via `entityType`

### No Duplication
- Each document row represents ONE document for ONE entity
- `replacedById` handles document re-uploads (old doc marked `replaced`)
- Phone numbers are unique across all users
- Plate numbers are unique across all vehicles

## Document Types by Entity

```
DRIVER DOCUMENTS:
  - DRIVING_LICENSE
  - AADHAR_CARD
  - PAN_CARD
  - DRIVER_PHOTO

TRANSPORTER DOCUMENTS:
  - GST_CERTIFICATE
  - COMPANY_PAN
  - TRADE_LICENSE
  - COMPANY_REGISTRATION

VEHICLE DOCUMENTS:
  - RC_BOOK (Registration Certificate)
  - INSURANCE
  - PERMIT
  - FITNESS_CERTIFICATE
  - PUC_CERTIFICATE

TRIP DOCUMENTS:
  - POD (Proof of Delivery)
  - INVOICE
  - EWAY_BILL
  - WEIGHT_SLIP
  - LOADING_PHOTO
  - UNLOADING_PHOTO
```
