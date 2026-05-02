# API Reliability Checklist: API Idempotency & DB Error Handling

**Purpose**: Validate that Spec 007's requirements are complete, clear, consistent, measurable, and free of gaps before implementation begins.
**Created**: 2026-05-02
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [x] CHK001 - Is the PG error code → HTTP status mapping exhaustive for all codes the app may encounter — including 23505 (unique), 23503 (FK), 23514 (check), 40001 (serialization), 40P01 (deadlock), 08006 (connection), 57014 (query_canceled), 53300 (too_many_connections)? [Completeness, Spec §FR-001]
- [x] CHK002 - Are sanitized user-facing messages defined for every mapped PG error code — not just unique violations (409) but also FK (400), check (422), connection (503), and the default (500)? [Completeness, Spec §FR-002]
- [x] CHK003 - Is the structured server-side log format explicitly defined — are the exact fields (code, constraint, table, detail, schema, query position) documented, or is "full detail" left ambiguous? [Completeness, Spec §FR-003]
- [x] CHK004 - Is the Idempotency-Key lifecycle fully specified: client generation format (UUID?), header name, Redis key schema (prefix + user_id + key), serialized response shape (status + body + headers?), TTL, and eviction behavior? [Completeness, Spec §FR-006]
- [x] CHK005 - Are requirements defined for what happens when the same Idempotency-Key is used for a request to a different endpoint or with a different HTTP method — is the key scoped to the route? [Gap]
- [x] CHK006 - Is the graceful shutdown sequence fully defined — is the order specified (stop accepting new connections → drain in-flight → close pool → close Redis → exit), or just "drain and close"? [Completeness, Spec §FR-010]
- [x] CHK007 - Are requirements defined for all controllers that need refactoring — is the exhaustive list documented (auth: register/login/logout/refreshToken/checkAuthStatus; comments: create/update/delete/getByPost/getReplies; roles: create/assign), or only a subset? [Completeness, Spec §FR-012]
- [x] CHK008 - Is the AppError (or IError extension) type shape explicitly defined — are required fields (status, message, pgCode?, cause?) documented as a requirement, or left to implementation? [Gap]
- [x] CHK009 - Are requirements defined for the `Idempotency-Key` header value format — is a UUID constraint specified, or is any string accepted? [Gap, Spec §FR-006]

## Requirement Clarity

- [x] CHK010 - Is "sanitize" in FR-002 precisely defined — does it mean replace the entire message, strip specific substrings, or map to a lookup table of safe messages per error code? [Clarity, Spec §FR-002]
- [x] CHK011 - Is "exponential backoff" in FR-008 quantified with exact timing (100ms → 200ms → 400ms) or left as a vague pattern? Does the spec state whether jitter is added? [Clarity, Spec §FR-008]
- [x] CHK012 - Is "configurable" in FR-009 specified — via environment variable, config file, or constructor argument? Is the env var name defined (e.g., `DB_POOL_MAX`)? [Clarity, Spec §FR-009]
- [x] CHK013 - Is "draining active database connections" in FR-010 precisely defined — does it mean wait for queries to finish, refuse new queries, or both? [Clarity, Spec §FR-010]
- [x] CHK014 - Is "preserve intentional status codes" in FR-013 defined with an exhaustive list of which status codes are intentional (403 BANNED, 404 not-found, 403 system-role-deletion), or is the list open-ended? [Clarity, Spec §FR-013]
- [x] CHK015 - Is "atomic database operations" in FR-004 specified precisely for each endpoint — is the exact SQL pattern (INSERT ... ON CONFLICT DO NOTHING vs. UPSERT vs. single-statement CTE) documented per model? [Clarity, Spec §FR-004]

## Requirement Consistency

- [x] CHK016 - Are error code → HTTP status mappings consistent between FR-001 and Acceptance Scenario US1.3? FR-001 maps FK violations to 400, but does the acceptance scenario's wording "Invalid reference to a related resource" align with how controllers currently surface FK errors? [Consistency, Spec §FR-001 vs US1.3]
- [x] CHK017 - Is FR-012 (all controllers route through error middleware) consistent with FR-013 (preserve intentional status codes)? Are the mechanics of converting an intentional 403 into an AppError that still produces 403 through the centralized handler documented without contradiction? [Consistency, Spec §FR-012 vs FR-013]
- [x] CHK018 - Is the toggle semantics requirement in FR-017 consistent with FR-004? FR-004 says "replace read-then-write with atomic operations" but the toggle still requires a conditional read (check current state) to decide INSERT vs DELETE direction — is this tension resolved? [Consistency, Spec §FR-004 vs FR-017]
- [x] CHK019 - Is SC-006 ("all existing tests pass without modification") consistent with the controller refactoring scope (US6)? If auth/comments controllers change from sendResponse.error() to next(error), won't existing tests that assert on response shapes need updating? [Consistency, Spec §SC-006 vs US6]
- [x] CHK020 - Is the Idempotency-Key being optional (US3.4, Assumption) consistent with FR-006 which says the system "MUST support" it — is the distinction between "support" (accept if present) vs "enforce" (reject if missing) clear? [Consistency, Spec §FR-006 vs US3.4]

## Acceptance Criteria Quality

- [x] CHK021 - Is SC-001 ("zero raw database error messages") measurable — is there a defined method to scan all HTTP responses for constraint names, table names, or SQL fragments, or is it a qualitative assertion? [Measurability, Spec §SC-001]
- [x] CHK022 - Is SC-003 ("concurrent duplicate requests produce zero duplicate rows and maintain correct counter values") testable — are the exact concurrency scenarios defined (2 simultaneous requests? 10? race timing window?), or is "concurrent" left unquantified? [Measurability, Spec §SC-003]
- [x] CHK023 - Is SC-005 ("server shuts down within 10 seconds with zero orphaned connections") testable — how are "orphaned connections" measured? Is it the pool's active count, or pg_stat_activity query, or process-level check? [Measurability, Spec §SC-005]
- [x] CHK024 - Is SC-007 ("every mutating endpoint processes errors through the centralized handler") measurable — is the test methodology defined (grep for sendResponse.error in catch blocks? integration test per endpoint? static analysis rule?)? [Measurability, Spec §SC-007]

## Scenario Coverage

- [x] CHK025 - Are requirements defined for PUT and PATCH idempotency behavior — FR-006 lists POST/PUT/PATCH but all acceptance scenarios in US3 only describe POST? Are PUT/PATCH scenarios intentionally deferred or missing? [Coverage, Spec §FR-006 vs US3]
- [x] CHK026 - Are requirements defined for the `refreshToken` and `checkAuthStatus` methods in auth.controller.ts — US6 mentions "register, login, logout" but these two methods also use inline error handling via `handleAuthError`? [Coverage, Spec §US6 vs FR-012]
- [x] CHK027 - Are counter accuracy requirements in FR-005 defined for all four counter types (like_count, follower_count, following_count, bookmark_count) — or are some assumed but not explicitly listed? [Coverage, Spec §FR-005]
- [x] CHK028 - Are requirements defined for what the middleware returns when the Idempotency-Key header value is empty, whitespace-only, or exceeds a maximum length? [Coverage, Gap]
- [x] CHK029 - Is the behavior defined when an authenticated request with an Idempotency-Key targets a GET or DELETE endpoint — is the key silently ignored, or does the middleware return a warning/error? [Coverage, Gap]

## Edge Case Coverage

- [x] CHK030 - Is the concurrent Idempotency-Key race condition requirement clear — does the spec define that Redis SETNX (atomic set-if-not-exists) is the mechanism, and what happens to the second request while the first is still processing (wait? fail? proceed without caching?)? [Edge Case, Spec §Edge Cases]
- [x] CHK031 - Is the Redis-down fallback requirement precisely defined — "fail-open" is mentioned in Edge Cases but not in any FR. Should FR-006 explicitly state fail-open behavior, and is logging of the degraded state required? [Edge Case, Spec §Assumption vs FR-006]
- [x] CHK032 - Is the retry-during-shutdown edge case sufficiently specified — the Edge Cases section says "abort retry, proceed with shutdown" but is this codified in an FR, and does the aborted retry return 503 to the client or silently drop the request? [Edge Case, Spec §Edge Cases vs FR-010]
- [x] CHK033 - Is the post-deleted-between-check-and-update edge case addressed — the Edge Cases mention it, but does FR-014 cover the TOCTOU window, or only the method reference bug? [Edge Case, Spec §FR-014 vs Edge Cases]
- [x] CHK034 - Are requirements defined for what happens when the idempotency cache stores a failed response (e.g., 400 validation error) — should the client be able to retry with the same key and get a fresh attempt, or is the failure cached for 24h? [Edge Case, Gap]

## Non-Functional Requirements

- [x] CHK035 - Are performance requirements defined for the idempotency middleware — is there a latency budget for the Redis lookup/write on every mutating request (e.g., < 5ms p99)? [Non-Functional, Gap]
- [x] CHK036 - Is the Redis memory impact estimated — are requirements defined for the maximum expected size of cached idempotency responses (response body size limit? key count cap?) to prevent unbounded memory growth? [Non-Functional, Gap]
- [x] CHK037 - Are observability requirements defined beyond FR-003 — are there requirements for metrics (error classification counts, retry attempt counts, idempotency cache hit/miss ratio) or just logging? [Non-Functional, Gap]
- [x] CHK038 - Is the security requirement for the Idempotency-Key header defined — are there requirements preventing key enumeration attacks (e.g., rate limiting per-user key creation, or minimum key entropy)? [Non-Functional, Security, Gap]
- [x] CHK039 - Are requirements defined for the CORS allowedHeaders update — is it specified that `Idempotency-Key` is added alongside existing headers without removing any, and is `exposedHeaders` also needed for the client to read it? [Non-Functional, Spec §FR-015]

## Dependencies & Assumptions

- [x] CHK040 - Is the assumption that "existing Redis infrastructure is suitable" validated — are there requirements for the Redis version, persistence mode (RDB/AOF), or eviction policy that could affect idempotency key reliability? [Assumption, Spec §Assumptions]
- [x] CHK041 - Is the assumption that "client applications will be updated separately" documented as a dependency — are there requirements for client-side changes (API layer interceptors, UUID generation, header attachment), or is this explicitly out of scope? [Dependency, Spec §Assumptions]
- [x] CHK042 - Is the dependency on existing UNIQUE constraints documented — does the ON CONFLICT DO NOTHING approach in FR-004 depend on constraints that already exist (`likes(user_id, post_id)`, `follows(user_id_following, user_id_followed)`, `bookmarks(user_id, post_id)`), and are those constraints confirmed present? [Dependency, Spec §FR-004]
- [x] CHK043 - Is the Article I (raw SQL only) compliance explicitly confirmed — does the spec acknowledge that ON CONFLICT, SETNX, and all error handling utilities must use raw SQL/Redis commands, not ORM abstractions? [Dependency, Constitution]
- [x] CHK044 - Is the Article VII compliance for "no new tables" validated against all proposed changes — does the spec confirm that types/appError.ts and types/pgError.ts are application-layer types, not database entities? [Dependency, Spec §FR-016, Constitution]

## Ambiguities & Conflicts

- [x] CHK045 - Is there an ambiguity in the retry wrapper's scope — FR-008 says "transient database errors" but only lists deadlocks and serialization failures. Are connection timeouts (08006) also retryable, or explicitly excluded? [Ambiguity, Spec §FR-008]
- [x] CHK046 - Is there a conflict between SC-006 ("all existing tests pass without modification") and the scope of US6/US7 changes — refactoring error handling patterns in 3 controllers and fixing a bug in the post model may break tests that assert on current response shapes or error messages. Is SC-006 aspirational or a hard constraint? [Conflict, Spec §SC-006]
- [x] CHK047 - Is the "optional" nature of idempotency keys potentially ambiguous for security review — could the lack of enforcement on POST endpoints be flagged as a gap by security reviewers? Should the spec define a migration path from optional to mandatory? [Ambiguity, Spec §US3.4]
- [x] CHK048 - Is there an ambiguity in how FR-013 interacts with the `handleAuthError` utility — auth.controller.ts uses a helper function (`handleAuthError`) that itself calls `sendResponse.error()`. Is refactoring that utility also in scope, or only the direct controller catch blocks? [Ambiguity, Spec §FR-012 vs FR-013]

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline
- Link to relevant resources or documentation
- Items are numbered sequentially (CHK001–CHK048) for easy reference
- Reference: [spec.md](../spec.md) | [Spec 007 workflow](../../../docs/spec-kit-database-upgrade/spec-007-api-idempotency-db-errors.md)
