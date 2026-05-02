# API Contracts: Error Response & Idempotency

**Branch**: `007-api-idempotency-db-errors` | **Date**: 2026-05-02

## Error Response Contract

All error responses MUST follow the existing standardized envelope from `utilities/response.ts`.

### Current Error Shape (preserved)

```json
{
  "success": false,
  "status": 409,
  "message": "Resource already exists"
}
```

In development mode only, a `stack` field is appended.

### PG Error → HTTP Status Mapping

| PG Code | HTTP Status | Client Message |
|---------|-------------|----------------|
| 23505 | 409 | `"Resource already exists"` |
| 23503 | 400 | `"Referenced resource not found"` |
| 23514 | 422 | `"Data validation failed"` |
| 40001 | 503 | `"Service temporarily unavailable"` |
| 40P01 | 503 | `"Service temporarily unavailable"` |
| 08006 | 503 | `"Service temporarily unavailable"` |
| 57014 | 503 | `"Request timed out"` |
| 53300 | 503 | `"Service temporarily unavailable"` |
| (other) | 500 | `"An unexpected error occurred"` |

### AppError → HTTP Status Mapping

| Status | Use Case | Client Message (preserved) |
|--------|----------|---------------------------|
| 403 | Banned user login | `"Account is suspended"` |
| 404 | Comment not found | `"Comment not found or you don't have permission"` |
| 404 | Role not found | `"Role not found"` |
| 403 | System role deletion | `"Cannot delete system-defined role"` |
| 404 | Role assignment not found | `"Role assignment not found"` |

---

## Idempotency Header Contract

### Request Header

```
Idempotency-Key: <UUID v4>
```

- **Format**: UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- **Validation regex**: `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
- **Max length**: 128 characters
- **Applies to**: POST, PUT, PATCH requests only
- **Required**: No — requests without the header proceed normally
- **Ignored on**: GET, DELETE (silently, no error)

### Idempotency Error Responses

| Scenario | HTTP Status | Response Body |
|----------|-------------|---------------|
| Invalid format (not UUID v4) | 400 | `{ "success": false, "status": 400, "message": "Invalid Idempotency-Key format. Must be UUID v4." }` |
| Empty / whitespace | 400 | `{ "success": false, "status": 400, "message": "Invalid Idempotency-Key format. Must be UUID v4." }` |
| Exceeds 128 chars | 400 | `{ "success": false, "status": 400, "message": "Invalid Idempotency-Key format. Must be UUID v4." }` |
| Concurrent duplicate (in-flight) | 409 | `{ "success": false, "status": 409, "message": "A request with this idempotency key is already being processed" }` |
| Cache hit (completed) | (cached status) | (cached response body — exact replay) |

### Redis Key Schema

```
idem:{userId}:{httpMethod}:{routePath}:{idempotencyKey}
```

Example: `idem:abc123:POST:/api/posts:550e8400-e29b-41d4-a716-446655440000`

---

## CORS Header Update

### Before

```typescript
allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Fingerprint', 'csrf-token', 'CSRF-Token', 'Origin', 'Accept']
```

### After

```typescript
allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Fingerprint', 'csrf-token', 'CSRF-Token', 'Origin', 'Accept', 'Idempotency-Key']
```

`exposedHeaders` — NO CHANGE (Idempotency-Key is request-only).
