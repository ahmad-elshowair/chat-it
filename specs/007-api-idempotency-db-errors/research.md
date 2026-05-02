# Research: API Idempotency & DB Error Handling

**Branch**: `007-api-idempotency-db-errors` | **Date**: 2026-05-02

## R1: PostgreSQL Error Code Classification — Best Practices

**Decision**: Map PG error codes to HTTP status codes via a stateless classifier function, not a database lookup.

**Rationale**: PostgreSQL exposes error codes on the `DatabaseError.code` property (5-character SQLSTATE string). The `pg` driver preserves these on thrown errors. A pure function mapping is the simplest, most testable approach — zero external dependencies, zero latency, deterministic.

**Alternatives considered**:
- Middleware-level string matching on `error.message` — rejected because constraint names change across environments and are fragile.
- Error class hierarchy (one class per PG code) — rejected as over-engineering; a single classifier with a lookup table is simpler and easier to extend.

**Key findings**:
- `pg` errors have `.code`, `.constraint`, `.table`, `.schema`, `.detail`, `.column` properties (from `DatabaseError` in `pg-protocol`).
- The `code` property uses the standard PostgreSQL SQLSTATE format (e.g., `'23505'`).
- TypeScript type: `import { DatabaseError } from 'pg-protocol'` provides the typed error shape.

---

## R2: Retry Strategy for Transient PG Errors

**Decision**: Exponential backoff at the model layer, 3 attempts, no jitter.

**Rationale**: Retries must re-acquire the entire transaction (BEGIN → queries → COMMIT), which only the model controls. Express middleware cannot replay a transaction. Exponential backoff (100ms, 200ms, 400ms) provides adequate spacing without excessive delay. No jitter is added to keep behavior deterministic and testable.

**Alternatives considered**:
- Express middleware retry — rejected because the middleware has no access to the transaction lifecycle. It would need to re-invoke the entire handler, which breaks the Express contract.
- Fixed delay — rejected because exponential backoff reduces contention pressure on the exact resource causing the deadlock.
- Jittered backoff — rejected for testability. Deterministic delays are easier to assert in unit tests. Production contention is low enough that jitter's benefit is negligible.

**Key findings**:
- Only 40001 (serialization_failure) and 40P01 (deadlock_detected) are retryable. Connection errors (08006) indicate infrastructure failure and should not be retried.
- The wrapper signature is `withRetry<T>(fn: () => Promise<T>, opts?: { maxAttempts?: number }): Promise<T>`.
- The function passed to `withRetry` must be a closure that creates a new PoolClient and transaction on each invocation.

---

## R3: Idempotency-Key Middleware — Redis Pattern

**Decision**: Use Redis `SET key value NX EX 86400` for atomic claim + TTL. Cache the response body after handler execution via `res.json` interception.

**Rationale**: `SET NX` provides atomic claim semantics — no race condition between check and set. The `EX` flag sets the TTL atomically. This eliminates a separate `GET` + `SET` round-trip and prevents the thundering herd problem on concurrent duplicates.

**Alternatives considered**:
- PostgreSQL table for idempotency keys — rejected per Article VII (no new tables) and because Redis already handles TTL natively.
- Lua script for atomic GET+SET — rejected as unnecessary; `SET NX EX` is sufficient for claim semantics.
- `res.write` interception — rejected because the app exclusively uses `res.json()`, making JSON interception simpler and more predictable.

**Key findings**:
- Redis key format: `idem:{userId}:{method}:{route}:{key}` — scoped to prevent cross-user, cross-endpoint, and cross-method replay.
- `res.json` must be monkey-patched before handler execution to capture the response. The original `res.json` is stored and restored after caching.
- Fail-open on Redis errors — consistent with existing rate limiter behavior (`passOnStoreError`).
- The `isRedisConnected` flag from `database/redis.ts` can be used for fast fail-open checks.

---

## R4: AppError Class Design

**Decision**: Single `AppError` class extending `Error` with `status` and `isOperational` fields.

**Rationale**: A class (not an interface) is needed because the error middleware uses `instanceof` to distinguish intentional HTTP errors from unexpected PG errors. The `isOperational` field distinguishes expected business errors (403 banned, 404 not found) from programmer bugs.

**Alternatives considered**:
- Extending `IError` interface — rejected because `instanceof` checks require a class, not an interface.
- Discriminated union type — rejected because error middleware receives `unknown` errors and needs runtime type checking.
- Separate error classes per status code (NotFoundError, ConflictError) — rejected as over-engineering for this codebase's size. A single class with a `status` parameter is sufficient.

**Key findings**:
- `AppError` lives in `utilities/appError.ts` (not `types/`) because it contains implementation (constructor logic), not just type definitions.
- Constructor: `new AppError(message, status, isOperational = true)`.
- Error middleware priority: (1) `AppError` → use `error.status`, (2) PG error (has `.code`) → classify, (3) `IError` with `.status` → use it, (4) fallback 500.

---

## R5: ON CONFLICT DO NOTHING — Constraint Dependencies

**Decision**: Rely on existing UNIQUE constraints added in Spec 003.

**Rationale**: `ON CONFLICT (column_list) DO NOTHING` requires a unique constraint or unique index on the specified columns. These were already added in Spec 003 database constraints migration.

**Key findings**:
- `likes(user_id, post_id)` — UNIQUE constraint confirmed present.
- `follows(user_id_following, user_id_followed)` — UNIQUE constraint confirmed present.
- `bookmarks(user_id, post_id)` — UNIQUE constraint confirmed present.
- The like model currently does a full SELECT+JOIN to check post existence AND like status in one query. The refactored version will keep the post existence check (it validates the post_id FK) but replace the like-status check with ON CONFLICT.

---

## R6: handleAuthError Refactoring Strategy

**Decision**: Convert `handleAuthError` to throw `AppError` instead of calling `sendResponse.error()` directly. Callers must wrap with try/catch/next(error).

**Rationale**: The current `handleAuthError` in `utilities/auth-helpers.ts` directly calls `res.status(500).json(...)`, bypassing the error middleware entirely. To unify error handling, it must throw instead of respond. The callers (`refreshToken`, `checkAuthStatus`) already have try/catch blocks that call `handleAuthError(res, error)` — these will be changed to `throw new AppError(...)` or simply `throw error` to let the error middleware handle it.

**Key findings**:
- `handleAuthError` is called in 2 places: `refreshToken` and `checkAuthStatus` catch blocks.
- It currently exposes `error.message` directly to the client — a security leak.
- After refactoring, these catch blocks will simply call `next(error)` and the centralized error middleware will sanitize the message.
- `handleInvalidToken` also bypasses the error middleware but returns auth-specific 401/403 responses that are intentional — these are NOT database errors and should stay as direct responses (they are validation checks, not catch blocks).

---

## R7: Graceful Shutdown — Server Handle

**Decision**: Store the return value of `app.listen()` and use it in shutdown handlers.

**Rationale**: `app.listen()` returns a `http.Server` instance. `server.close()` stops accepting new connections while allowing in-flight requests to complete. The current code does not store this return value.

**Key findings**:
- Change `app.listen(port, ...)` to `const server = app.listen(port, ...)`.
- Export `server` so shutdown handlers can call `server.close()`.
- Shutdown sequence: `server.close()` → wait up to 10s → `pool.end()` → `redisClient.quit()` → `process.exit(0)`.
- Force-exit with code 1 if grace period expires.
