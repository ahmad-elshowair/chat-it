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
3. **Given** a database foreign key violation occurs, **When** the request references a non-existent related record, **Then** the response is HTTP 400 with message "Invalid reference to a related resource"
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

A database error occurs in any controller — auth (register, login), comments (create, update, delete), roles (create, assign) — and is processed through the same error classification pipeline. No controller bypasses the centralized error handler with inline error responses that leak raw database messages.

**Why this priority**: Without this, the error classifier from User Story 1 only protects some endpoints. Auth and comments controllers currently bypass the error middleware entirely, continuing to leak raw error messages. Roles controller uses fragile string matching instead of error code classification. This is P1 because it's a security gap.

**Independent Test**: Can be tested by triggering a database error in auth registration (e.g., duplicate email) and comments creation, then verifying both go through the error middleware with sanitized responses.

**Acceptance Scenarios**:

1. **Given** a user registers with an email that already exists, **When** the registration fails, **Then** the response comes from the centralized error handler with a sanitized 409 message (not the raw unique constraint text)
2. **Given** a user creates a comment and a database error occurs, **When** the error is caught, **Then** it flows through the error middleware (not an inline response) and returns a sanitized message
3. **Given** an admin creates a role with a duplicate name, **When** the unique constraint fires, **Then** the response is 409 from the error middleware (no ad-hoc string matching in the controller)
4. **Given** a banned user tries to log in, **When** authentication succeeds but ban is detected, **Then** the response is still 403 with "Account is suspended" (intentional status code is preserved)

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

- What happens when two requests with the same Idempotency-Key arrive at the exact same millisecond (Redis SET race)?
- What happens when Redis is down — does the idempotency middleware block all requests or fall through gracefully?
- What happens when a retryable error (deadlock) occurs inside a transaction that has already partially completed?
- What happens when the post existence check fails because the post was deleted between the check and the update?
- What happens when the pool max connections is reached — are queued requests rejected or do they wait?
- What happens when a graceful shutdown is triggered while a retry loop is mid-backoff?
- What happens when the follow ON CONFLICT detects an existing row — should the response differ from a fresh follow?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST classify database errors by error code and return the appropriate HTTP status code (409 for unique violations, 400 for foreign key violations, 422 for check constraint violations, 503 for transient failures, 500 for unclassified errors)
- **FR-002**: System MUST sanitize all error messages sent to clients — never exposing constraint names, table names, column names, or SQL query text
- **FR-003**: System MUST preserve full database error detail (code, constraint, table, detail) in server-side structured logs
- **FR-004**: System MUST replace read-then-write patterns in like, follow, and bookmark operations with atomic database operations that eliminate race conditions
- **FR-005**: System MUST maintain accurate counters (like count, follower count, following count, bookmark count) even under concurrent operations
- **FR-006**: System MUST support an Idempotency-Key header on mutating requests (POST, PUT, PATCH) that caches responses for 24 hours
- **FR-007**: System MUST scope idempotency keys to the authenticated user to prevent cross-user response replay
- **FR-008**: System MUST automatically retry transient database errors (deadlocks, serialization failures) up to 3 times with exponential backoff before surfacing the error
- **FR-009**: System MUST configure the database connection pool with explicit connection timeout (5s), idle timeout (30s), and maximum connections (configurable, default 20)
- **FR-010**: System MUST handle SIGTERM and SIGINT signals by draining active database connections and closing the Redis connection before exiting
- **FR-011**: System MUST NOT crash (exit) on idle client errors — it must log the error and continue serving requests
- **FR-012**: System MUST route all controller errors through the centralized error handler — no controller may bypass it with inline error responses that expose raw messages
- **FR-013**: System MUST preserve intentional status codes (403 for banned users, 404 for not-found resources) when converting inline error handling to centralized error handling
- **FR-014**: System MUST fix the post model existence check so that update and delete operations correctly verify the post exists before proceeding
- **FR-015**: System MUST accept the Idempotency-Key header in CORS configuration
- **FR-016**: System MUST NOT create any new database tables — idempotency keys are stored in the existing Redis infrastructure

### Key Entities

- **Classified Error**: A database error mapped to an HTTP status, a sanitized user-facing message, and a structured server-side log entry. Attributes: original error code, HTTP status, user message, full detail for logging.
- **Idempotency Record**: A cached API response keyed by user ID and client-provided idempotency key. Attributes: user ID, idempotency key, HTTP status code, response body, expiration timestamp.
- **Retry Attempt**: A record of a transient error that was retried. Not persisted — tracked in memory during the retry loop. Attributes: attempt number, delay, error code, final outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero raw database error messages (constraint names, table names, SQL fragments) appear in any HTTP response body or error message
- **SC-002**: 100% of database unique constraint violations return HTTP 409 instead of HTTP 500
- **SC-003**: Concurrent duplicate requests (like, follow, bookmark) produce zero duplicate rows and maintain correct counter values
- **SC-004**: Transient database errors (deadlock, serialization) are retried automatically and users only see an error if all 3 attempts fail
- **SC-005**: Server shuts down cleanly within 10 seconds of receiving a termination signal, with zero orphaned database connections
- **SC-006**: All existing automated tests continue to pass without modification
- **SC-007**: Every mutating endpoint (POST, PUT, PATCH) processes errors through the centralized error handler — no inline error responses bypass it

## Assumptions

- The existing Redis infrastructure (already used for rate limiting and permission caching) is suitable for storing idempotency keys
- Idempotency key enforcement is optional — requests without the header proceed normally and are not rejected
- The retry wrapper operates at the model layer because it must re-acquire the full transaction, not just the query
- The follow model's existence check (isFollowing) currently uses a separate database connection from the follow/unfollow write operation, and the ON CONFLICT fix will eliminate this cross-connection pattern entirely
- Post existence check in update/delete is a method reference bug (missing parentheses) that needs fixing alongside the broader error handling changes
- Environment variables for pool configuration (max connections) will use sensible defaults (20) when not set
- The 24-hour TTL for idempotency keys is sufficient for typical retry scenarios without excessive memory usage
- Client applications will be updated separately to send the Idempotency-Key header — server-side enforcement does not reject missing keys
