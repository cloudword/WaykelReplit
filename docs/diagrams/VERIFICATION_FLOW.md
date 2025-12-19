# Waykel Verification Flow Diagram

## Document Upload → Admin Review → Approve/Reject → System Effects

```mermaid
flowchart TB
    subgraph UPLOAD["1. DOCUMENT UPLOAD"]
        direction TB
        DRV_UP["Driver uploads via<br/>Driver App / Portal"]
        TRP_UP["Transporter uploads via<br/>Transporter Portal"]
        VEH_UP["Vehicle docs uploaded by<br/>Driver or Transporter"]
        
        DRV_UP --> |"POST /api/spaces/upload<br/>POST /api/documents"| DOC_CREATE
        TRP_UP --> |"POST /api/spaces/upload<br/>POST /api/documents"| DOC_CREATE
        VEH_UP --> |"POST /api/spaces/upload<br/>POST /api/documents"| DOC_CREATE
        
        DOC_CREATE[("Document created<br/>status='pending'<br/>entityType set")]
    end

    subgraph ADMIN_REVIEW["2. ADMIN REVIEW"]
        direction TB
        ADMIN_DASH["Admin Dashboard<br/>/admin/documents"]
        
        DOC_CREATE --> ADMIN_DASH
        
        ADMIN_DASH --> |"Views pending docs"| DOC_LIST["GET /api/documents<br/>?status=pending"]
        DOC_LIST --> PREVIEW["Admin views document<br/>GET /api/spaces/signed-url"]
        
        PREVIEW --> DECISION{Admin Decision}
        
        DECISION --> |"Approve"| APPROVE["PATCH /api/documents/:id/status<br/>{status: 'verified'}"]
        DECISION --> |"Reject"| REJECT["PATCH /api/documents/:id/status<br/>{status: 'rejected',<br/>rejectionReason: '...'}"]
    end

    subgraph EFFECTS["3. SYSTEM EFFECTS"]
        direction TB
        
        APPROVE --> CHECK_COMPLETE{"All required<br/>docs verified?"}
        
        CHECK_COMPLETE --> |"Yes - Driver"| DRV_COMPLETE["User.documentsComplete = true<br/>Driver can accept rides"]
        CHECK_COMPLETE --> |"Yes - Transporter"| TRP_COMPLETE["Transporter.documentsComplete = true<br/>Status → pending_approval"]
        CHECK_COMPLETE --> |"Yes - Vehicle"| VEH_COMPLETE["Vehicle status = active<br/>Can be assigned to trips"]
        CHECK_COMPLETE --> |"No"| WAIT["Waiting for<br/>remaining docs"]
        
        TRP_COMPLETE --> TRP_APPROVAL{"Admin final<br/>approval?"}
        TRP_APPROVAL --> |"POST /api/transporters/:id/approve"| TRP_ACTIVE["Transporter.status = active<br/>Transporter.isVerified = true<br/>Can bid on rides"]
        TRP_APPROVAL --> |"POST /api/transporters/:id/reject"| TRP_REJECT["Transporter.status = rejected<br/>Account blocked"]
        
        REJECT --> NOTIFY_REJECT["Notification sent<br/>to uploader"]
        NOTIFY_REJECT --> REUPLOAD["User can re-upload<br/>New doc replaces old"]
    end

    subgraph BLOCKING["4. WHAT BLOCKS/UNLOCKS"]
        direction LR
        
        BLOCKED_ACTIONS["BLOCKED until verified:"]
        BLOCKED_LIST["- Driver: Cannot go online<br/>- Driver: Cannot accept rides<br/>- Transporter: Cannot bid<br/>- Transporter: Cannot access marketplace<br/>- Vehicle: Cannot be assigned"]
        
        UNLOCKED_ACTIONS["UNLOCKED after verified:"]
        UNLOCKED_LIST["- Driver: Full app access<br/>- Transporter: Marketplace access<br/>- Transporter: Bid on rides<br/>- Vehicle: Trip assignment"]
        
        BLOCKED_ACTIONS --> BLOCKED_LIST
        UNLOCKED_ACTIONS --> UNLOCKED_LIST
    end
```

## Detailed Flow by Entity Type

### Driver Verification Flow

```mermaid
sequenceDiagram
    participant D as Driver (App)
    participant API as Backend API
    participant S as Storage (Spaces)
    participant DB as Database
    participant A as Admin (Portal)
    participant N as Notifications

    Note over D,N: UPLOAD PHASE
    D->>API: POST /api/spaces/upload {filename, contentType}
    API->>S: Generate presigned URL
    S-->>API: uploadUrl, key
    API-->>D: {uploadUrl, key}
    D->>S: PUT file to uploadUrl
    D->>API: POST /api/documents {type: 'DRIVING_LICENSE', url, entityType: 'driver'}
    API->>DB: INSERT document (status='pending')
    API-->>D: Document created
    API->>N: Notify admin (new doc pending)

    Note over D,N: REVIEW PHASE
    A->>API: GET /api/documents?status=pending&entityType=driver
    API-->>A: List of pending driver docs
    A->>API: GET /api/spaces/signed-url {key}
    API-->>A: Temporary view URL
    A->>A: Reviews document
    
    alt Document Approved
        A->>API: PATCH /api/documents/:id/status {status: 'verified'}
        API->>DB: UPDATE document status='verified', reviewedBy, reviewedAt
        API->>DB: Check if ALL required driver docs verified
        alt All docs complete
            API->>DB: UPDATE user SET documentsComplete=true
            API->>N: Notify driver "Documents approved"
            Note over D: Driver can now go online and accept rides
        else Missing docs
            API->>N: Notify driver "Document approved, X more required"
        end
    else Document Rejected
        A->>API: PATCH /api/documents/:id/status {status: 'rejected', rejectionReason: '...'}
        API->>DB: UPDATE document status='rejected'
        API->>N: Notify driver with rejection reason
        Note over D: Driver must re-upload
    end
```

### Transporter Verification Flow

```mermaid
sequenceDiagram
    participant T as Transporter (Portal)
    participant API as Backend API
    participant DB as Database
    participant A as Admin (Portal)
    participant N as Notifications

    Note over T,N: REGISTRATION
    T->>API: POST /api/auth/register {role: 'transporter', ...}
    API->>DB: INSERT user (role='transporter')
    API->>DB: INSERT transporter (status='pending_verification')
    API-->>T: Account created

    Note over T,N: DOCUMENT UPLOAD
    T->>API: Upload GST, PAN, Trade License docs
    API->>DB: INSERT documents (status='pending', entityType='transporter')
    API->>N: Notify admin (new transporter docs)

    Note over T,N: DOCUMENT VERIFICATION
    A->>API: Review each transporter document
    loop Each Document
        A->>API: PATCH /api/documents/:id/status {status: 'verified'}
    end
    API->>DB: Check if ALL required transporter docs verified
    API->>DB: UPDATE transporter SET documentsComplete=true
    API->>DB: UPDATE transporter SET status='pending_approval'

    Note over T,N: FINAL APPROVAL
    A->>API: POST /api/transporters/:id/verify
    API->>DB: UPDATE transporter SET isVerified=true, verifiedBy, verifiedAt

    alt Approve Transporter
        A->>API: POST /api/transporters/:id/approve
        API->>DB: UPDATE transporter SET status='active'
        API->>N: SMS + Notification "Account approved"
        Note over T: Transporter can access marketplace, bid on rides
    else Reject Transporter
        A->>API: POST /api/transporters/:id/reject {reason: '...'}
        API->>DB: UPDATE transporter SET status='rejected', rejectionReason
        API->>N: SMS + Notification "Account rejected"
        Note over T: Account blocked, cannot access platform
    end
```

### Vehicle Verification Flow

```mermaid
sequenceDiagram
    participant U as Driver/Transporter
    participant API as Backend API
    participant DB as Database
    participant A as Admin (Portal)
    participant N as Notifications

    Note over U,N: VEHICLE REGISTRATION
    U->>API: POST /api/vehicles {type, plateNumber, model, ...}
    API->>DB: INSERT vehicle (status='active')
    API-->>U: Vehicle created

    Note over U,N: DOCUMENT UPLOAD
    U->>API: Upload RC, Insurance, Permit, Fitness docs
    API->>DB: INSERT documents (status='pending', entityType='vehicle', vehicleId)

    Note over U,N: DOCUMENT VERIFICATION
    A->>API: GET /api/documents?entityType=vehicle&status=pending
    loop Each Vehicle Document
        A->>API: PATCH /api/documents/:id/status {status: 'verified'}
    end

    Note over U,N: EFFECT ON VEHICLE
    API->>DB: All vehicle docs verified
    Note over U: Vehicle can now be assigned to trips
    
    alt Missing/Expired Documents
        Note over U: Vehicle cannot be assigned until docs complete
        U->>API: Re-upload expired/missing documents
    end
```

## API Endpoints That Enforce Verification

| Endpoint | Check | Blocks If |
|----------|-------|-----------|
| `POST /api/bids` | `transporter.status === 'active'` | Transporter not approved |
| `GET /api/transporter/marketplace` | `transporter.status === 'active'` | Transporter not approved |
| `PATCH /api/rides/:id/accept` | `user.documentsComplete === true` | Driver docs incomplete |
| `PATCH /api/rides/:id/assign` | Vehicle docs complete | Vehicle docs missing |
| `POST /api/rides` (assign) | Both driver + vehicle verified | Either incomplete |

## Verification Status Summary

```
TRANSPORTER STATUS FLOW:
  pending_verification → (upload docs) → pending_approval → (admin review) → active
                                                        ↘ rejected

DOCUMENT STATUS FLOW:
  pending → (admin review) → verified
                          ↘ rejected → (re-upload) → pending (new doc)
                                                   ↘ replaced (old doc)

DRIVER COMPLETION:
  documentsComplete = false → (all docs verified) → documentsComplete = true

VEHICLE ASSIGNMENT ELIGIBILITY:
  All vehicle docs verified = Can be assigned to trips
  Any doc pending/rejected = Cannot be assigned
```

## Who Uploads, Who Reviews, What Unlocks

| Entity | Who Uploads | Where Admin Reviews | What Unlocks After Approval |
|--------|-------------|---------------------|----------------------------|
| **Driver** | Driver via App | Admin Portal → Documents | Go online, Accept rides |
| **Transporter** | Transporter via Portal | Admin Portal → Documents → Transporters | Marketplace access, Bidding |
| **Vehicle** | Driver or Transporter | Admin Portal → Documents | Trip assignment eligibility |
| **Trip** | Driver during trip | Admin Portal → Trips → Documents | Trip completion, Payment release |
