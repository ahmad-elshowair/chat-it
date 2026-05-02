# Feature Specification: API Idempotency & DB Error Handling

**Feature Branch**: `007-api-idempotency-db-errors`  
**Created**: 2026-05-01  
**Status**: Draft  
**Input**: User description: "Harden the post-it API against duplicate mutations, race conditions, and unclassified database errors. This is a cross-cutting infrastructure spec — no new tables for features, but foundational utilities and middleware that all current and future endpoints inherit."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sanitized, Classified Error Responses (Priority: P1)

A user or client application encounters a database error (duplicate follow, missing resource, connection failure). Instead of receiving a raw internal error message like "duplicate key value violates unique constraint likes_user_id_post_id_key" with HTTP 500, they receive a clear, safe message like "Resource already exists" with the correct HTTP status code (409). Meanwhile, operations engineers see the full structured error detail in server logs for debugging.

**Why this priority**: This is the foundation — every endpoint benefits from proper error classification and message sanitization. Without it, all other improvements are built on a broken error reporting layer. Security risk: raw database internals currently leak to clients on every error.

**Independent Test**: Can be tested by triggering any database constraint violation (e.g., creating a duplicate role) and verifying the response contains a sanitized message with the correct HTTP status, while server logs contain the full error detail.

**Acceptance Scenarios**:

1. **Given** a user tries to follow someone they already follow, **When** the follow request is submitted, **Then** the response is HTTP 409 with message "Resource already exists" (no constraint names or SQL fragments exposed)
2. **Given** a database connection failure occurs, **When** any request is processed, **Then** the response is HTTP 503 with message "Service temporarily unavailable"
3. **Given** a database foreign key violation occurs, **When** the request references a non-existent related record, **Then** the response is HTTP 400 with message "Referenced resource not found"
4. **Given** any database error occurs, **When** server logs are reviewed, **Then** the full structured log includes the error code, constraint name, table name, and detail
5. **Given** a non-database error (e.g., validation failure), **When** the error reaches the error handler, **Then** the existing error handling behavior is preserved

---

### User Story 2 - Race Condition Protection for Like/Follow/Bookmark (Priority: P1)

A user on a flaky connection double-taps the "like" button, or two browser tabs submit a follow request simultaneously. The system handles the race condition gracefully — no duplicate rows are created, no corrupted counters, no 500 error. The second request returns the same correct result as the first.

**Why this priority**: These are the most frequently triggered race conditions in the application. Like, follow, and bookmark toggles are high-frequency user actions where double-clicks and network retries are common. The follow model has a particularly severe bug where the existence check uses a separate database connection from the write.

**Independent Test**: Can be tested by sending two concurrent like/follow/bookmark requests for the same user-post/user-user pair and verifying no duplicate rows exist and counters remain accurate.

**Acceptance Scenarios**:

1. **Given** a user has not liked a post, **When** two concurrent like requests arrive, **Then** exactly one like row is created, the post's like count increments by 1, and both requests return success
2. **Given** a user already follows another user, **When** a duplicate follow request arrives, **Then** no new follow row is created, no counter changes, and the response indicates "already following"
3. **Given** a user bookmarks a post on two devices simultaneously, **When** both requests arrive, **Then** exactly one bookmark row exists and the response is consistent
4. **Given** a user un-follows someone they don't follow, **When** the unfollow request is processed, **Then** no error occurs and counters remain unchanged

---

### User Story 3 - Idempotency Key for Create Operations (Priority: P2)

A developer integrating with the API sends a "create post" request that times out due to network issues. The developer retries with the same Idempotency-Key header. The system recognizes the key, returns the originally created post, and does not create a duplicate.

**Why this priority**: Prevents duplicate resource creation from network retries — critical for data integrity. This is P2 because it requires client-side adoption (sending the header) whereas P1 stories fix existing bugs without client changes.

**Independent Test**: Can be tested by sending a POST request with an Idempotency-Key header, then sending the same request again with the same key, and verifying the second response is the cached original without re-executing the handler.

**Acceptance Scenarios**:

1. **Given** a client sends a POST request with an Idempotency-Key header, **When** the request succeeds, **Then** the response is cached and subsequent requests with the same key return the cached response without re-executing
2. **Given** a client sends a POST request with an Idempotency-Key that was used 25 hours ago, **When** the request arrives, **Then** the expired key is treated as a new request and the handler executes normally
3. **Given** two different users send requests with the same Idempotency-Key, **When** both requests arrive, **Then** they are treated as separate requests because the key is scoped to each user
4. **Given** a client sends a POST request without an Idempotency-Key header, **When** the request arrives, **Then** the request proceeds normally (idempotency is optional)
5. **Given** a client sends a PUT or PATCH request with an Idempotency-Key header, **When** the request is processed, **Then** the idempotency middleware applies the same caching behavior as POST

---

### User Story 4 - Automatic Retry for Transient Database Errors (Priority: P2)

A database deadlock or serialization failure occurs during a write operation. Instead of immediately returning a 500 error to the user, the system automatically retries the operation with exponential backoff before giving up.

**Why this priority**: Transient errors are rare but catastrophic when they surface as 500s — users see failures for operations that would have succeeded on retry. P2 because deadlocks are infrequent compared to the race conditions addressed in P1.

**Independent Test**: Can be tested by simulating a deadlock error and verifying the operation is retried up to 3 times before surfacing a 503 to the user.

**Acceptance Scenarios**:

1. **Given** a deadlock is detected during a write operation, **When** the first attempt fails, **Then** the system retries automatically (up to 3 attempts) with increasing delays
2. **Given** a serialization failure occurs, **When** all 3 retry attempts fail, **Then** the user receives a 503 response with message "Service temporarily unavailable"
3. **Given** a serialization failure occurs, **When** the second retry succeeds, **Then** the user receives the successful response as if nothing happened

---

### User Story 5 - Hardened Connection Pool & Graceful Shutdown (Priority: P2)

The application experiences a spike in traffic that exhausts database connections. Instead of hanging indefinitely or crashing, connections time out within 5 seconds and return a clear error. When the server receives a shutdown signal, it drains active connections and closes cleanly.

**Why this priority**: Production reliability — prevents connection leaks and unclean shutdowns. P2 because it's an operational concern rather than a user-facing bug, but critical for deployment reliability.

**Independent Test**: Can be tested by sending a SIGTERM to the running server and verifying it drains connections and exits cleanly, rather than leaving orphaned connections.

**Acceptance Scenarios**:

1. **Given** the server receives a SIGTERM signal, **When** there are active database connections, **Then** the server waits up to 10 seconds for requests to complete, then closes all connections and exits
2. **Given** a database connection cannot be established within 5 seconds, **When** a request needs a connection, **Then** the request fails with a clear timeout error instead of hanging indefinitely
3. **Given** an idle client encounters an unexpected error, **When** the error occurs, **Then** it is logged with full detail and the process continues (no crash)

---

### User Story 6 - Unified Error Handling Across All Controllers (Priority: P1)

A database error occurs in any controller — auth (register, login, logout, refreshToken, checkAuthStatus), comments (all 5 methods), roles (create, update, delete, assign, revoke) — and is processed through the same error classification pipeline. No controller bypasses the centralized error handler with inline error responses that leak raw database messages. This includes shared utility functions like `handleAuthError` in `utilities/auth-helpers.ts` that also use inline `sendResponse.error()`.

**Why this priority**: Without this, the error classifier from User Story 1 only protects some endpoints. Auth and comments controllers currently bypass the error middleware entirely, continuing to leak raw error messages. Roles controller uses fragile string matching instead of error code classification. This is P1 because it's a security gap.

**Independent Test**: Can be tested by triggering a database error in auth registration (e.g., duplicate email) and comments creation, then verifying both go through the error middleware with sanitized responses.

**Acceptance Scenarios**:

1. **Given** a user registers with an email that already exists, **When** the registration fails, **Then** the response comes from the centralized error handler with a sanitized 409 message (not the raw unique constraint text)
2. **Given** a user creates a comment and a database error occurs, **When** the error is caught, **Then** it flows through the error middleware (not an inline response) and returns a sanitized message
3. **Given** an admin creates a role with a duplicate name, **When** the unique constraint fires, **Then** the response is 409 from the error middleware (no ad-hoc string matching in the controller)
4. **Given** a banned user tries to log in, **When** authentication succeeds but ban is detected, **Then** the response is still 403 with "Account is suspended" (intentional status code is preserved)
5. **Given** the `refreshToken` or `checkAuthStatus` endpoint encounters a database error, **When** the error is caught by `handleAuthError`, **Then** it flows through the centralized error middleware (not inline `sendResponse.error()`)

---

### User Story 7 - Post Existence Check Bug Fix (Priority: P1)

An admin or user attempts to update or delete a post that has been removed. The system should reject the operation with a "not found" error, but currently the existence check never executes because of a code bug, allowing the operation to proceed against a non-existent record.

**Why this priority**: This is a correctness bug — the existence check in update and delete never runs, meaning these operations silently succeed or fail in unpredictable ways on missing posts. P1 because it's a data integrity issue.

**Independent Test**: Can be tested by calling update or delete on a non-existent post ID and verifying a clear "not found" error is returned.

**Acceptance Scenarios**:

1. **Given** a post with a specific ID does not exist, **When** a user attempts to update it, **Then** the system returns a 404 "not found" response
2. **Given** a post with a specific ID does not exist, **When** a user attempts to delete it, **Then** the system returns a 404 "not found" response

---

### Edge Cases

- **Concurrent Idempotency-Key**: Two requests with the same key at the same millisecond — first claims via Redis `SET NX`, second gets HTTP 409 "already being processed" (FR-024)
- **Redis down**: Idempotency middleware fails open — proceeds without caching, logs warning (FR-021). Consistent with rate limiter behavior.
- **Retry mid-transaction**: A retryable error (deadlock) inside a partially completed transaction — retry re-acquires the entire transaction from BEGIN (FR-008)
- **Post deleted between check and write**: TOCTOU accepted — `rowCount === 0` triggers 404 AppError (FR-014)
- **Pool exhaustion**: Max connections reached — queued requests wait up to `connectionTimeoutMillis` (5s default), then receive 503 (standard pg behavior + FR-009)
- **Shutdown mid-retry**: SIGTERM/SIGINT during backoff — abort retry, return 503 "Service shutting down" (FR-022)
- **Follow ON CONFLICT existing row**: Return success with "already following" message, no counter change. `rowCount === 0` means already existed.
- **Like toggle rowCount === 0 (already liked/unliked)**: Idempotent success — return `{ message: "Post liked successfully", action: "liked" }` (INSERT path) or `{ message: "Post unliked successfully", action: "unliked" }` (DELETE path). No counter change when `rowCount === 0`.
- **Bookmark toggle rowCount === 0 (already bookmarked/unbookmarked)**: Idempotent success — return `{ message: "Post bookmarked successfully", action: "bookmarked" }` (INSERT path) or `{ message: "Post unbookmarked successfully", action: "unbookmarked" }` (DELETE path). No counter change when `rowCount === 0`.
- **Concurrent like toggles**: One INSERTs, one DELETEs — net neutral state, counters remain correct because each path runs in its own transaction with rowCount-driven counter updates
- **Failed response caching**: 4xx responses ARE cached (client made the same bad request). 5xx responses are NOT cached (server error may be transient). FR-023 governs this.
- **Idempotency-Key on GET/DELETE**: Silently ignored — no error, no caching (FR-020)
- **Empty/invalid Idempotency-Key**: Returns HTTP 400 (FR-019)
- **Oversized cached response**: Responses > 1MB skip caching, log warning, proceed normally (FR-028)

## Requirements *(mandatory)*

### Functional Requirements

#### Error Classification & Sanitization

- **FR-001**: System MUST classify database errors by PostgreSQL error code and return the mapped HTTP status:

  | PG Code | Class | HTTP Status | Sanitized Message |
  |---------|-------|-------------|-------------------|
  | 23505 | unique_violation | 409 | "Resource already exists" |
  | 23503 | foreign_key_violation | 400 | "Referenced resource not found" |
  | 23514 | check_violation | 422 | "Data validation failed" |
  | 40001 | serialization_failure | 503 | "Service temporarily unavailable" |
  | 40P01 | deadlock_detected | 503 | "Service temporarily unavailable" |
  | 08006 | connection_failure | 503 | "Service temporarily unavailable" |
  | 57014 | query_canceled | 503 | "Request timed out" |
  | 53300 | too_many_connections | 503 | "Service temporarily unavailable" |
  | (other) | unclassified | 500 | "An unexpected error occurred" |

- **FR-002**: "Sanitize" means: replace the entire PG error message with the fixed lookup string from the FR-001 table — never strip/modify substrings. No constraint names, table names, column names, schema names, or SQL query text may appear in any HTTP response body.

- **FR-003**: System MUST log structured error detail server-side for every classified PG error. Required fields: `pgCode` (string), `pgConstraint` (string | null), `pgTable` (string | null), `pgSchema` (string | null), `pgDetail` (string | null), `pgColumn` (string | null), `httpStatus` (number), `requestMethod` (string), `requestPath` (string), `userId` (string | null), `timestamp` (ISO 8601).

#### Race Condition Fixes

- **FR-004**: System MUST eliminate race-condition-prone read-then-write patterns per model. Toggles (like, bookmark) retain a direction check to determine INSERT vs DELETE, but use ON CONFLICT DO NOTHING on the INSERT path to prevent 23505 violations:
  - **like.ts**: INSERT uses `INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT (user_id, post_id) DO NOTHING`. DELETE uses `DELETE FROM likes WHERE user_id = $1 AND post_id = $2`. Check `rowCount === 1` for counter direction. Counter update within same transaction.
  - **follow.ts**: `INSERT INTO follows (...) VALUES ($1, $2) ON CONFLICT (user_id_following, user_id_followed) DO NOTHING` — eliminates cross-connection bug where `isFollowing()` used a separate PoolClient. Delete uses direct `DELETE ... WHERE`. Check `rowCount`.
  - **bookmark.ts**: Same pattern as like — INSERT with ON CONFLICT DO NOTHING, DELETE for remove, `rowCount` for counter direction.

- **FR-005**: System MUST maintain accurate counters for all four types under concurrent operations: `number_of_likes` (posts), `number_of_followers` (users), `number_of_followings` (users), `number_of_bookmarks` (posts). Counter updates MUST occur within the same transaction as the INSERT/DELETE.

#### Idempotency

- **FR-006**: System MUST support an `Idempotency-Key` header on mutating requests (POST, PUT, PATCH) with lifecycle:
  - **Header**: `Idempotency-Key` (case-insensitive per HTTP spec)
  - **Value format**: UUID v4, validated via regex. Invalid values return HTTP 400.
  - **Redis key schema**: `idem:{userId}:{httpMethod}:{routePath}:{idempotencyKey}`
  - **Cached response shape**: `{ statusCode: number, body: string, contentType: string }`
  - **TTL**: 24 hours (86400 seconds), automatic Redis expiration
  - **Claim mechanism**: Redis `SET key value NX EX 86400` (atomic set-if-not-exists with TTL)
  - **Enforcement**: Optional — requests without the header proceed normally ("support", not "enforce")

- **FR-007**: System MUST scope idempotency keys to `{userId}:{httpMethod}:{routePath}` to prevent: (a) cross-user replay, (b) cross-endpoint reuse, (c) cross-method reuse.

- **FR-019**: System MUST validate `Idempotency-Key` values: empty strings, whitespace-only, and values exceeding 128 characters return HTTP 400. Values not matching UUID v4 format return HTTP 400.

- **FR-020**: System MUST silently ignore the `Idempotency-Key` header on GET and DELETE requests — no error, no caching. These methods are naturally idempotent.

- **FR-021**: When Redis is unavailable, the idempotency middleware MUST fail open — proceed without caching, log a warning (`level: warn`, message: "Idempotency middleware Redis unavailable"), consistent with rate limiter's `passOnStoreError` behavior.

- **FR-023**: System MUST NOT cache responses with HTTP status >= 500 (server errors). Responses with 4xx (client errors) and 2xx/3xx (success) MUST be cached — the client made the same request and should get the same result.

- **FR-024**: When two requests with the same key arrive concurrently, the first claims via `SET NX`. The second sees the key exists but no cached response yet — return HTTP 409 "A request with this idempotency key is already being processed".

#### Retry

- **FR-008**: System MUST retry transient database errors up to 3 attempts with exponential backoff: `100ms × 2^(attempt-1)` (100ms, 200ms, 400ms). No jitter (deterministic for testability). Retryable codes: 40001 (serialization_failure), 40P01 (deadlock_detected). Connection failures (08006) are NOT retried — they indicate infrastructure issues, not transient contention.

- **FR-022**: If SIGTERM/SIGINT arrives while a retry loop is mid-backoff, the retry MUST abort immediately. The request returns HTTP 503 "Service shutting down". The backoff timer is cleared and shutdown proceeds.

#### Pool & Shutdown

- **FR-009**: System MUST configure the pool with explicit parameters, each overridable via environment variable:

  | Parameter | Env Var | Default |
  |-----------|---------|---------|
  | connectionTimeoutMillis | `DB_CONNECTION_TIMEOUT_MS` | 5000 |
  | idleTimeoutMillis | `DB_IDLE_TIMEOUT_MS` | 30000 |
  | max | `DB_POOL_MAX` | 20 |

- **FR-010**: System MUST handle SIGTERM/SIGINT with ordered shutdown: (1) log "Shutdown signal received", (2) stop accepting new HTTP connections via `server.close()`, (3) wait up to 10s for in-flight requests to complete ("drain"), (4) `pool.end()`, (5) `redis.quit()`, (6) exit code 0. If grace period expires, force-close and exit code 1.

- **FR-011**: System MUST NOT crash on idle client errors — log the error and continue. Replace `process.exit(-1)` with structured error logging.

#### Controller Unification

- **FR-012**: System MUST route all controller errors through the centralized error handler. Exhaustive refactoring list:
  - **auth.controller.ts**: `register`, `login`, `logout` (direct `sendResponse.error()` in catch)
  - **auth.controller.ts**: `refreshToken`, `checkAuthStatus` (use `handleAuthError` utility)
  - **utilities/auth-helpers.ts**: `handleAuthError` (must throw AppError instead of calling `sendResponse.error()`)
  - **comments.controller.ts**: all 5 methods — `createComment`, `updateComment`, `deleteComment`, `getCommentsByPostId`, `getRepliesByCommentId`
  - **roles.controller.ts**: `createRole`, `assignRole` (string matching `'duplicate key'`), `updateRole`, `deleteRole` (`'Role not found'`), `revokeRole` (`'Role assignment not found'`)

- **FR-013**: Intentional status codes that MUST be preserved via `throw new AppError(message, status)`:

  | Controller | Condition | Status | Message |
  |------------|-----------|--------|---------|
  | auth (login) | User is banned | 403 | "Account is suspended" |
  | comments (update/delete) | Comment not found | 404 | "Comment not found or you don't have permission" |
  | roles (update/delete) | Role not found | 404 | "Role not found" |
  | roles (delete) | System role | 403 | "Cannot delete system-defined role" |
  | roles (revoke) | Assignment not found | 404 | "Role assignment not found" |

#### AppError Type

- **FR-018**: System MUST define an `AppError` class extending `Error`:
  - Fields: `status: number` (HTTP status), `isOperational: boolean` (expected error vs programmer error)
  - Error middleware classification priority:
    1. `error instanceof AppError` → use `error.status` and `error.message` directly
    2. Walk `.cause` chain (up to 5 levels) to find an error with a `.code` property matching a PG error code pattern (`/^[0-9A-Z]{5}$/`). If found → classify via FR-001. This is required because all model catch blocks rethrow as `new Error('...', { cause: originalPgError })` per AGENTS.md `preserve-caught-error` rule — the `.code` property lives on `error.cause`, not `error`.
    3. Check `error.code` directly (for unwrapped PG errors that bypass model catch blocks)
    4. Fallback → 500 "An unexpected error occurred"
  - `{ cause: error }` preserved on all rethrows per AGENTS.md

#### Bug Fix

- **FR-014**: Fix `this.checkPostExist` → `await this.checkPostExist(id)` in post model `update()` and `delete()`. The TOCTOU window is accepted — if the post is deleted between check and write, `rowCount === 0` triggers a 404 AppError.

#### CORS

- **FR-015**: Add `'Idempotency-Key'` to CORS `allowedHeaders` in `index.ts`. `exposedHeaders` does NOT need updating — it's a request header only, not a response header the client reads.

#### Constraints

- **FR-016**: No new database tables. Idempotency keys stored in Redis. `utilities/appError.ts` and `types/pgError.ts` are application-layer TypeScript constructs, not database entities. Compliant with Article I (raw SQL), Article VII (no new tables).

- **FR-017**: Preserve toggle semantics for like/bookmark — ON CONFLICT DO NOTHING on INSERT path, DELETE WHERE on remove path.

#### Observability

- **FR-025**: System MUST log operational events at specified levels:
  - `info`: Idempotency cache hit (key, userId, cachedStatus)
  - `warn`: Idempotency Redis unavailable (fail-open triggered)
  - `warn`: Retry attempt (pgCode, attemptNumber, delayMs, requestPath)
  - `error`: Classified PG errors (full structured detail per FR-003)
  - `error`: Retry exhaustion (pgCode, totalAttempts, requestPath)
  - `info`: Shutdown initiated / completed

#### Security

- **FR-026**: Minimum entropy enforced via UUID v4 format requirement (FR-019). Per-user scoping (FR-007) prevents cross-user enumeration — a valid key from User A returns no data when sent by User B.

#### Performance

- **FR-027**: Idempotency middleware MUST add < 10ms p99 latency for Redis ops (one SET NX on miss, one GET on hit). Verified during T019 validation by timing Redis ops in development mode with >100 sequential middleware calls.

- **FR-028**: Cached idempotency responses capped at 1MB per entry. Responses exceeding this skip caching (log warning) but proceed normally. Combined with 24h TTL and per-user scoping, this bounds Redis memory growth.

### Key Entities

- **Classified Error**: Type shape: `{ httpStatus: number, userMessage: string, pgCode: string, pgDetail: { constraint: string | null, table: string | null, schema: string | null, detail: string | null, column: string | null }, retryable: boolean }`. Maps a PG error to an HTTP response + structured server log.
- **AppError**: Class extending `Error`. Shape: `{ status: number, message: string, isOperational: boolean, cause?: Error }`. Used by controllers to throw intentional HTTP errors (403, 404) that the centralized handler respects.
- **Idempotency Record**: Redis-stored cached response. Shape: `{ statusCode: number, body: string, contentType: string }`. Keyed by `idem:{userId}:{method}:{route}:{key}`, TTL 86400s.
- **Retry Attempt**: In-memory only. Shape: `{ attempt: number, delayMs: number, pgCode: string, outcome: 'retry' | 'success' | 'exhausted' }`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero raw database error messages in any HTTP response. **Measured by**: grep all controller/model catch blocks and error middleware for constraint names, table names, or SQL fragments in response bodies; integration tests that trigger each mapped PG error code and assert response body matches FR-001 sanitized message exactly.
- **SC-002**: 100% of database unique constraint violations return HTTP 409 instead of HTTP 500. **Measured by**: integration tests triggering 23505 on likes, follows, bookmarks, roles, and user registration.
- **SC-003**: Concurrent duplicate requests produce zero duplicate rows and correct counter values. **Measured by**: integration tests sending 2 simultaneous requests (using `Promise.all`) for the same like/follow/bookmark action and asserting exactly 1 row exists + counter incremented by exactly 1.
- **SC-004**: Transient database errors retried automatically — users only see error if all 3 attempts fail. **Measured by**: unit tests mocking PG errors with codes 40001/40P01, verifying retry count and final outcome.
- **SC-005**: Server shuts down within 10 seconds with zero orphaned connections. **Measured by**: integration test sending SIGTERM, asserting `pool.totalCount === 0` and `pool.idleCount === 0` after shutdown, and process exit code 0.
- **SC-006**: All existing automated tests continue to pass. **Note**: Tests that assert on raw error message strings or inline `sendResponse.error()` response shapes in auth/comments/roles controllers MAY need updating to match the new centralized error response format. This is expected and acceptable — the test updates are part of the refactoring scope, not a regression.
- **SC-007**: Every mutating endpoint processes errors through the centralized handler. **Measured by**: static analysis — grep for `sendResponse.error` in catch blocks across all controllers; the only permitted usage is in validation checks (before async operations), not in error catch blocks.

## Clarifications

### Session 2026-05-01

- Q: Idempotency-Key storage — Redis (24h TTL) vs PostgreSQL table? → A: Redis — no new table, automatic expiration, already in stack for rate limiting. (FR-006, FR-016)
- Q: Which endpoints get Idempotency-Key enforcement? → A: All POST endpoints that create resources (create post, create comment, follow, like, bookmark toggle). GET/DELETE are naturally idempotent. (FR-006)
- Q: Retry strategy for 40001/40P01? → A: Exponential backoff (100ms → 200ms → 400ms, max 3 attempts). (FR-008)
- Q: Retry wrapper placement — model layer or Express middleware? → A: Model-layer utility — the retry must re-acquire the transaction, which only the model controls. (Assumption confirmed)
- Q: Follow/like/bookmark race conditions — ON CONFLICT DO NOTHING vs DO UPDATE? → A: ON CONFLICT DO NOTHING + check rowCount to determine insert vs. already-existed. (FR-004)
- Q: Pool configuration max connections? → A: 20 for development, configurable via environment variable. (FR-009)
- Q: Idempotency middleware before or after auth? → A: After — only authenticated users use idempotency keys, scoped to user_id. (FR-007)
- Q: Graceful shutdown — drain pool and close Redis on SIGTERM? → A: Yes, with a 10s grace period. (FR-010)
- Q: Like/bookmark are toggle endpoints (same handler creates AND removes). Pure INSERT ON CONFLICT DO NOTHING only handles INSERT direction — how to preserve toggle semantics? → A: Keep toggles — add ON CONFLICT DO NOTHING to INSERT path only, keep DELETE for unlike path, use rowCount to determine counter direction. (Updated FR-004, FR-017)

## Assumptions

- The existing Redis infrastructure (already used for rate limiting and permission caching) is suitable for storing idempotency keys. No specific Redis version, persistence mode (RDB/AOF), or eviction policy requirements — the existing configuration is sufficient. Idempotency keys use standard TTL expiration, not eviction-policy-dependent.
- Idempotency key enforcement is optional — requests without the header proceed normally and are not rejected. A migration path from optional to mandatory MAY be added in a future spec if adoption metrics warrant it, but is explicitly out of scope for Spec 007.
- When Redis is unavailable, the idempotency middleware fails open (proceeds without caching) — consistent with the rate limiter's passOnStoreError behavior
- The retry wrapper operates at the model layer because it must re-acquire the full transaction, not just the query
- The follow model's existence check (isFollowing) currently uses a separate database connection from the follow/unfollow write operation, and the ON CONFLICT fix will eliminate this cross-connection pattern entirely
- Like and bookmark are toggle endpoints (same handler for create and remove) — ON CONFLICT DO NOTHING is applied to the INSERT path only, DELETE remains for the remove path
- Post existence check in update/delete is a method reference bug (missing parentheses) that needs fixing alongside the broader error handling changes
- Environment variables for pool configuration (max connections) will use sensible defaults (20) when not set
- The 24-hour TTL for idempotency keys is sufficient for typical retry scenarios without excessive memory usage
- Client applications will be updated separately to send the Idempotency-Key header — server-side changes are explicitly decoupled. Client-side work (API interceptors, UUID generation, header attachment) is out of scope for Spec 007.
- UNIQUE constraints on `likes(user_id, post_id)`, `follows(user_id_following, user_id_followed)`, and `bookmarks(user_id, post_id)` are confirmed present — they were added in Spec 003. The ON CONFLICT DO NOTHING approach depends on these constraints.
- All SQL uses raw queries via `pg` (Article I compliant). No ORM abstractions for ON CONFLICT, SETNX, or error handling utilities.
- `types/appError.ts` and `types/pgError.ts` are application-layer TypeScript types, not database entities (Article VII compliant).
