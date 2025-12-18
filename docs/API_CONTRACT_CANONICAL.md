# Waykel Canonical API Contract

## Documents (Canonical)

All documents in the Waykel platform are **trip-scoped**.

### Rules
- Documents MUST belong to a specific trip (`tripId`)
- Customer-level document APIs are deprecated
- Global document APIs (`/api/documents`) are INTERNAL ONLY
- Frontend applications must use trip-scoped APIs

### Canonical Endpoints

```
GET    /api/trips/:tripId/documents  
POST   /api/trips/:tripId/documents/upload-url  
POST   /api/trips/:tripId/documents  
DELETE /api/trips/:tripId/documents/:documentId  
PATCH  /api/trips/:tripId/documents/:documentId/status  
```

### Access Control

| Role | Access |
|------|--------|
| Customer | Own trips only (where `createdById` matches) |
| Transporter | Assigned trips only (where `transporterId` matches) |
| Driver | Assigned trips only (where `assignedDriverId` matches) |
| Admin | All trips |

### Deprecated (Do Not Use)

- `/api/customer/files`
- `/api/customer/files/upload-url`
- `/api/customer/files/:id`

### Internal Only (Backend Use)

- `/api/documents` - For driver/vehicle/transporter document verification
- `/api/documents/upload` - For driver/vehicle/transporter onboarding

These global document APIs are for internal admin workflows only (document verification during onboarding). Do NOT use these for trip-related documents.
