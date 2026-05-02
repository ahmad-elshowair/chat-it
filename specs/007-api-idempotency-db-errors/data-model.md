# Data Model: API Idempotency & DB Error Handling

**Branch**: `007-api-idempotency-db-errors` | **Date**: 2026-05-02

> This spec creates NO new database entities. All new types are application-layer TypeScript constructs. This document maps the type shapes for implementation reference.

## Application-Layer Types (NEW)

### AppError (class)

| Field | Type | Description |
|-------|------|-------------|
| message | `string` | Human-readable error message (sanitized for client) |
| status | `number` | HTTP status code (e.g., 403, 404, 409, 500) |
| isOperational | `boolean` | `true` = expected business error, `false` = programmer bug |
| cause | `Error \| undefined` | Original error (preserved via `{ cause }` per AGENTS.md) |

**Location**: `server/src/utilities/appError.ts`

### PgClassifiedError (interface)

| Field | Type | Description |
|-------|------|-------------|
| httpStatus | `number` | Mapped HTTP status code |
| userMessage | `string` | Sanitized client-facing message |
| pgCode | `string` | Original PG SQLSTATE code (e.g., `'23505'`) |
| pgDetail | `PgErrorDetail` | Structured detail for server-side logging |
| retryable | `boolean` | Whether the error is retryable (40001, 40P01) |

**Location**: `server/src/types/pgError.ts`

### PgErrorDetail (interface)

| Field | Type | Description |
|-------|------|-------------|
| constraint | `string \| null` | Constraint name (e.g., `likes_user_id_post_id_key`) |
| table | `string \| null` | Table name (e.g., `likes`) |
| schema | `string \| null` | Schema name (e.g., `public`) |
| detail | `string \| null` | PG detail message |
| column | `string \| null` | Column name if applicable |

**Location**: `server/src/types/pgError.ts`

### IdempotencyRecord (interface)

| Field | Type | Description |
|-------|------|-------------|
| statusCode | `number` | Cached HTTP response status |
| body | `string` | Cached JSON response body (serialized) |
| contentType | `string` | Response content type (always `'application/json'`) |

**Location**: `server/src/types/idempotency.ts`

**Redis key schema**: `idem:{userId}:{httpMethod}:{routePath}:{idempotencyKey}`
**TTL**: 86400 seconds (24 hours)

## Existing Entities Modified

### IError (interface) — NO CHANGE

```typescript
// server/src/interfaces/IError.ts — remains unchanged
export interface IError extends Error {
  status?: number;
}
```

`IError` is NOT modified. The error middleware will check for `AppError` first (via `instanceof`), then for PG errors (via `.code` property), then fall back to `IError` behavior. This preserves backwards compatibility.

## Database Constraints (EXISTING — NO CHANGES)

The following UNIQUE constraints are confirmed present (added in Spec 003) and required for ON CONFLICT DO NOTHING:

| Table | Constraint | Columns |
|-------|-----------|---------|
| likes | `likes_user_id_post_id_key` | `(user_id, post_id)` |
| follows | `follows_user_id_following_user_id_followed_key` | `(user_id_following, user_id_followed)` |
| bookmarks | `bookmarks_user_id_post_id_key` | `(user_id, post_id)` |

## State Transitions

### Error Classification Flow

```
PG Error thrown → catch block → error has .code?
  ├── Yes → classifyPgError(error) → PgClassifiedError
  │   ├── retryable = true → withRetry handles it
  │   └── retryable = false → error middleware returns { httpStatus, userMessage }
  └── No → error instanceof AppError?
      ├── Yes → error middleware returns { error.status, error.message }
      └── No → error middleware returns { 500, "An unexpected error occurred" }
```

### Idempotency Key Flow

```
Request with Idempotency-Key header
  → Validate UUID v4 format (invalid → 400)
  → Build Redis key: idem:{userId}:{method}:{route}:{key}
  → Redis SET NX EX 86400
      ├── Key claimed (NX success) → execute handler → cache response → return
      ├── Key exists, has cached response → return cached response
      └── Key exists, no cached response yet → 409 "already being processed"
  → Redis unavailable → fail open, execute handler normally
```
