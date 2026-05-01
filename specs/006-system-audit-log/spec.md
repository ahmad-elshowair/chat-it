# Feature Specification: System Audit Log

**Feature Branch**: `006-system-audit-log`
**Created**: 2026-04-29
**Status**: Draft
**Input**: User description: "Design a standalone, extensible system audit log. It should track who performed what action, on which entity, with previous and new values, within atomic transactions. Not coupled to any single feature — must serve RBAC, reports, user management, and future modules alike."

## Clarifications

### Session 2026-04-29

- Q: Which existing actions should emit audit records on day one? → A: All admin+moderator actions — RBAC operations (role assign/revoke/create/update/delete, user ban/unban) plus content moderation actions (post/comment deletions by admins/moderators, report resolution).
- Q: Should the query endpoint support filtering by `actor_type`? → A: Yes, include it now for future-proofing.
- Q: What database column type should be used for the `entity_id` field? → A: UUID (Assuming all platform entities use UUIDs).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Capture of Administrative Actions (Priority: P1)

As a platform administrator, I want every administrative action I perform (role changes, user bans, content deletions) to be automatically recorded with a timestamp, my identity, and the details of what changed — so that there is always an accountable, tamper-resistant history of who did what and when.

**Why this priority**: This is the foundational capability. Without reliable capture, no query, report, or compliance workflow can exist. It delivers immediate value by making every privileged operation auditable.

**Independent Test**: Can be fully tested by performing any administrative action (e.g., banning a user, changing a role) and verifying that a corresponding audit record is created with the correct actor, action, entity, previous values, and new values.

**Acceptance Scenarios**:

1. **Given** a super admin assigns the "moderator" role to user #42, **When** the assignment completes, **Then** an audit record is created capturing: actor = super admin's user ID, action = "role.assign", entity = "user_role", entity ID = user #42, previous values = null, new values = { role: "moderator" }
2. **Given** an admin bans user #55, **When** the ban completes, **Then** an audit record captures: action = "user.ban", previous values = { status: "active" }, new values = { status: "banned" }
3. **Given** a super admin updates a custom role's permissions, **When** the update completes, **Then** an audit record captures the permission diff (permissions added and removed)
4. **Given** an administrative action is performed within a database transaction that fails and rolls back, **When** the rollback occurs, **Then** no audit record is persisted (atomicity guarantee)

---

### User Story 2 - Querying and Filtering Audit History (Priority: P1)

As a super admin, I want to search and filter the audit log by actor, action type, entity type, entity ID, and date range — so that I can investigate incidents, verify compliance, and review specific users' activity histories.

**Why this priority**: Capture alone is useless without retrieval. This is the primary interface for consuming audit data and is required for incident investigation and compliance reviews.

**Independent Test**: Can be fully tested by generating a set of audit records through various actions, then querying by each filter criterion and verifying the correct records are returned.

**Acceptance Scenarios**:

1. **Given** audit records exist for multiple actors and action types, **When** a super admin queries by actor ID = 7, **Then** only records where actor ID = 7 are returned
2. **Given** audit records span multiple months, **When** a super admin queries with a date range of the last 7 days, **Then** only records within that range are returned
3. **Given** audit records exist for "user.ban", "role.assign", and "post.delete" actions, **When** a super admin filters by action type = "user.ban", **Then** only ban records are returned
4. **Given** a super admin queries by entity ID (e.g., user #42), **When** the query executes, **Then** all audit records affecting that entity are returned regardless of action type
5. **Given** a super admin applies multiple filters simultaneously (actor + action type + date range), **When** the query executes, **Then** only records matching all criteria are returned

---

### User Story 3 - RBAC Integration: Permission-Gated Audit Access (Priority: P2)

As a platform with role-based access control, I want audit log access to be gated behind a dedicated permission (`audit.read`) so that only authorized roles (admin, super_admin) can view audit records, while moderators and regular users cannot.

**Why this priority**: Ensures the audit log itself is protected by the RBAC system it serves. Important for security but depends on P1 capture and query capabilities existing first.

**Independent Test**: Can be tested by verifying that users with `audit.read` permission can query the log, and users without it receive 403 Forbidden.

**Acceptance Scenarios**:

1. **Given** a super admin (has `audit.read`), **When** they query the audit log, **Then** results are returned (200)
2. **Given** a moderator (no `audit.read`), **When** they attempt to query the audit log, **Then** the request is denied (403 Forbidden)
3. **Given** an admin who has been granted `audit.read`, **When** they query the audit log, **Then** results are returned (200)

---

### User Story 4 - Future Module Integration via Standardized Event Contract (Priority: P2)

As a developer, I want a simple, documented contract for emitting audit events so that any future module (reports, notifications, settings changes) can record audit entries without coupling to audit internals — just call a function with the standard parameters (actor, action, entity, values).

**Why this priority**: Extensibility is a core requirement. This ensures the audit log is not a one-off for RBAC but a reusable platform service. It can be validated independently by creating a test audit entry from a hypothetical module.

**Independent Test**: Can be tested by calling the audit recording function from outside the RBAC domain (e.g., simulating a "settings.updated" event) and verifying the record is created correctly.

**Acceptance Scenarios**:

1. **Given** any module calls the audit function with valid parameters (actor, action, entity type, entity ID, previous values, new values), **When** the call completes, **Then** an audit record is persisted
2. **Given** a module emits an audit event with an unrecognized action type, **When** the audit function receives it, **Then** the record is still persisted (the system does not restrict action types to a predefined enum)
3. **Given** a module emits an audit event within an existing database transaction, **When** the audit function is called, **Then** the audit record joins the caller's transaction rather than opening a new one

---

### User Story 5 - Audit Log Integrity and Immutability (Priority: P2)

As a compliance-conscious platform, I want audit records to be append-only — no updates or deletes — so that the audit trail cannot be tampered with after the fact.

**Why this priority**: Integrity is essential for trust in the audit log. Without immutability, the audit log itself could be manipulated to cover tracks. This is a non-functional requirement that can be enforced at the database level.

**Independent Test**: Can be tested by attempting to UPDATE or DELETE an audit record and verifying the operation is rejected.

**Acceptance Scenarios**:

1. **Given** an existing audit record, **When** any attempt is made to update its fields, **Then** the operation is rejected at the database level
2. **Given** an existing audit record, **When** any attempt is made to delete it, **Then** the operation is rejected at the database level
3. **Given** an audit record is inserted, **When** it is read back, **Then** its `created_at` timestamp matches the insertion time and cannot be altered

---

### Edge Cases

- What happens when an audit record insertion fails during a multi-step administrative transaction? The entire parent transaction rolls back, including the business operation. The audit record and the business change are atomic — one cannot succeed without the other.
- What happens when the actor is a system-level operation (e.g., automatic session cleanup, scheduled task)? The actor ID is set to a reserved system identifier, and the actor type field distinguishes it from human actors.
- What happens when an action affects multiple entities (e.g., bulk role assignment)? Each affected entity generates its own audit record within the same transaction, preserving per-entity granularity.
- What happens when previous or new values are very large (e.g., a full user profile change)? Values are stored as JSON with a generous but bounded size limit (e.g., 10 KB per field) to prevent abuse.
- What happens when querying the audit log with no matching records? An empty result set is returned with standard pagination metadata — no error.
- What happens when concurrent writes produce audit records with identical timestamps? Records include a sequential ID for deterministic ordering; timestamps are supplementary, not unique.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST create an audit record for every mutating administrative or moderation action, capturing: actor ID, actor type (user or system), action name, entity type, entity ID (UUID), previous values (JSON), new values (JSON), and timestamp. The initial action set covers: `role.assign`, `role.revoke`, `role.create`, `role.update`, `role.delete`, `user.ban`, `user.unban`, `post.delete.any`, `comment.delete.any`, `report.dismiss`, `report.escalate`. Regular-user actions (e.g., `posts.delete.own`, `comments.delete.own`) are explicitly out of scope.
- **FR-002**: Audit records MUST be persisted within the same database transaction as the business operation they describe. If either the business operation or the audit INSERT fails, the entire transaction MUST roll back — audit and business share the same transactional fate unconditionally.
- **FR-003**: The system MUST provide a function that accepts an existing database client (transaction connection) so callers can embed audit recording inside their own transactions. If no existing transaction is provided, the function MUST open and manage its own transaction.
- **FR-004**: The system MUST expose paginated query endpoints supporting the following filters (individually and in combination): actor ID, actor type, action name, entity type, entity ID, date range (from/to).
- **FR-005**: Pagination MUST use cursor-based (keyset) strategy on the sequential audit record ID, consistent with Constitution Article VIII.
- **FR-006**: The system MUST NOT execute `SELECT COUNT(*)` queries alongside paginated audit queries (Constitution Article VIII).
- **FR-007**: Access to audit log query endpoints MUST be gated by an `audit.read` permission enforced through the existing RBAC middleware (spec 005).
- **FR-008**: Audit records MUST be append-only with no exceptions — including super admins. The database MUST reject any UPDATE or DELETE operations on audit records (enforced via database-level trigger). The migration creating the trigger MUST include a comment documenting its purpose so that future migrations are aware of the immutability constraint.
- **FR-009**: The `action` field MUST accept any string value. The system MUST NOT restrict actions to a predefined enum, ensuring extensibility for future modules.
- **FR-010**: The `previous_values` and `new_values` fields MUST store full entity snapshots as JSON (not diffs). When there is no previous state (e.g., a creation event), `previous_values` MUST be null. At least one of `previous_values` or `new_values` MUST be non-null — a record with both null is invalid and MUST be rejected.
- **FR-010a**: Each JSON payload in `previous_values` and `new_values` MUST NOT exceed 10 KB. If a snapshot exceeds this limit, the system MUST truncate non-essential fields and include a `_truncated: true` marker in the JSON.
- **FR-011**: The system MUST distinguish between human actors (authenticated users) and system actors (automated processes) via an `actor_type` field. System actors MUST use a reserved `actor_id` of `0` to clearly separate them from user IDs.
- **FR-012**: When a single action affects multiple entities, the system MUST create one audit record per affected entity, all within the same transaction.
- **FR-013**: Query results MUST be returned in reverse chronological order (newest first) by default.
- **FR-014**: Each audit record MUST include an `ip_address` field capturing the originating request's IP, when available, to support security investigations.
- **FR-015**: The system MUST return audit query results using the standardized response envelope (Constitution Article V).
- **FR-016**: The `audit.read` permission MUST be added to the predefined permissions seed data and assigned to the admin and super_admin roles during migration. Custom roles MAY be granted `audit.read` only through explicit super admin assignment — it is NOT included in any custom role by default.

### Key Entities

- **Audit Record**: An immutable, append-only entry representing a single state-changing event. Contains: sequential ID, actor ID, actor type, action name, entity type, entity ID (UUID), previous values (full JSON snapshot, max 10 KB), new values (full JSON snapshot, max 10 KB), IP address, and creation timestamp. This is the sole entity of the audit log system.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every administrative mutation (role change, user ban, content deletion) produces a complete audit record with all required fields — no missing entries after 100% of test scenarios.
- **SC-002**: Super admins can locate any specific administrative action within the audit log in under 10 seconds using a combination of filters.
- **SC-003**: Audit records and their parent business operations always share the same transactional fate — a rollback of one is a rollback of both, verified across all failure scenarios.
- **SC-004**: Attempted modifications or deletions of audit records are rejected 100% of the time at the database level.
- **SC-005**: Adding audit recording to a new module requires calling a single function with six parameters — no schema changes, no new tables, no module-specific configuration.

## Assumptions

- The RBAC system (spec 005) is the primary initial consumer. The audit log is designed to serve it but is not limited to it.
- The existing `pg` client and transaction patterns (`BEGIN` / `COMMIT` / `ROLLBACK`) are the standard for database operations. The audit function must accept a `pg.PoolClient` to participate in callers' transactions.
- `previous_values` and `new_values` payloads are expected to be modest (under 10 KB each, formal limit in FR-010a).
- Date-based queries use UTC timestamps consistently.
- The `audit.read` permission is formally required by FR-016.
- Audit log retention and archival (e.g., moving old records to cold storage) are out of scope for this feature. Records accumulate indefinitely until a separate retention policy is specified.
- The IP address is captured on a best-effort basis — system-initiated actions may not have an IP address.
- PII redaction in audit records (e.g., removing email addresses from snapshots) is out of scope for this feature. A separate PII handling policy should be defined before any compliance-mandated redaction is required.
- Meta-auditing (recording when a user reads the audit log) is out of scope for this feature. Audit log read access is already gated by the `audit.read` permission (FR-007).
