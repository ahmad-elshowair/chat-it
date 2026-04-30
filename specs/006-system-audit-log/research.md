# Research: System Audit Log

**Feature**: 006-system-audit-log | **Date**: 2026-04-29

## Research Items

### R-001: Immutability Enforcement — Trigger vs RLS Policy

**Decision**: Use a `BEFORE` trigger that raises an exception on UPDATE/DELETE.

**Rationale**: A trigger is the simplest, most portable approach for this project. It works with the existing `pg` client (no special driver support needed), is visible in `\d+ audit_log` output for easy discovery, and can be documented in the migration comment per FR-008. RLS policies require `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and a policy per role — more complex for a single-table guard.

**Alternatives considered**:
- **RLS policy with `WHERE false`**: More granular per-role control, but overkill for "block all mutations". Requires superuser to enable RLS. Adds complexity for no additional benefit.
- **Application-level only**: Fragile — bypassed by direct SQL access, future migrations, or other services.
- **Generated column trick**: Using a stable generated column that references all other columns makes UPDATE impossible, but is a hack and poorly understood by future maintainers.

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log records are immutable: % operation not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
COMMENT ON TRIGGER trg_audit_log_immutable ON audit_log IS
  'Enforces append-only immutability per spec 006 FR-008. DO NOT drop without amendment.';
```

---

### R-002: Entity ID Column Type — UUID vs TEXT

**Decision**: Use `TEXT` for `entity_id`.

**Rationale**: The spec (FR-001) says entity ID is UUID, and all current platform PKs are UUIDs. However, the audit log is designed to serve future modules whose PKs might not be UUIDs (e.g., auto-increment IDs for a hypothetical notifications table). Using `TEXT` is forward-compatible with UUID strings (they fit naturally) and avoids a future migration if a non-UUID entity is added. The type alias `TAuditRecord` will document this as "UUID string for current entities".

**Alternatives considered**:
- **UUID column type**: Strict typing, but would require migration when a non-UUID entity is added. Conflicts with the extensibility goal (FR-009).
- **BIGINT**: Does not match any existing PK type in the project.

---

### R-003: Primary Key Strategy — UUID vs BIGSERIAL

**Decision**: Use `UUID DEFAULT uuid_generate_v4()` — consistent with the project convention where all table PKs are UUIDs (users, posts, follows, likes, bookmarks, etc.).

**Rationale**: Project-wide consistency outweighs the marginal pagination benefit of BIGSERIAL. Keyset pagination works with a compound cursor on `(created_at DESC, id DESC)` — `created_at` provides natural chronological ordering, and `id` serves as a deterministic tiebreaker for same-millisecond inserts. The compound index `idx_audit_log_created_at_id` supports this pattern efficiently.

**Alternatives considered**:
- **BIGSERIAL**: Optimal for keyset pagination (single-column cursor), but breaks the UUID PK convention used across every other table in the project.
- **UUID v7**: Time-ordered UUID, good for pagination, but adds dependency (`uuid-ossp` only provides v1 and v4) and inconsistency with existing tables.

---

### R-004: Audit Function Design — Model Method vs Standalone Service

**Decision**: Provide both — a public `emitAudit()` function in `services/auditEmitter.ts` and internal `record()` method in `models/audit.ts`.

**Rationale**: The model method handles the raw SQL INSERT. The service function provides the public contract (FR-003/FR-004) with a cleaner API signature: `emitAudit({ client, actorId, actorType, action, entityType, entityId, previousValues, newValues, ipAddress })`. When `client` is provided, it joins the caller's transaction; when absent, the function opens its own `pool.connect()` + BEGIN/COMMIT. This matches the project's layered architecture (controllers → models) while exposing a developer-friendly function for cross-module use.

**Alternatives considered**:
- **Model method only**: Tighter coupling — callers would need to understand connection management. Less ergonomic for future modules.
- **Standalone function only**: Bypasses the model layer, inconsistent with project patterns.

---

### R-005: JSON Snapshot Storage — JSONB vs TEXT with Validation

**Decision**: Use `JSONB` columns.

**Rationale**: JSONB validates JSON on insert (rejects malformed JSON automatically), supports `->>'key'` queries for potential future filtering (FR-018 deferred but not blocked), and has better storage efficiency via compression. The project already uses JSONB-compatible patterns (PostgreSQL 15+). No reason to use TEXT.

**Alternatives considered**:
- **TEXT + application validation**: Would need custom JSON validation. Loses native queryability. No benefit.

---

### R-006: Query Endpoint — Single GET with Query Params

**Decision**: Single `GET /api/audit` endpoint with optional query parameters for filtering.

**Rationale**: The spec (FR-004) requires paginated queries with multiple optional filters. A GET endpoint with query parameters (`?actor_id=...&action=...&entity_type=...&cursor=...`) follows REST semantics (read-only resource), matches existing pagination patterns in the project (posts, bookmarks, users), and keeps the API surface minimal.

**Alternatives considered**:
- **POST /api/audit/search**: Would allow complex filter bodies, but GET is correct for read-only queries per REST conventions. The filter set is flat and fits in query params.
- **Multiple endpoints per filter type**: Over-engineering. One endpoint with optional filters is sufficient.

---

### R-007: Integration Points — Where to Insert Audit Calls

**Decision**: Audit calls go in controllers (not models) for existing RBAC operations, since controllers have access to the request context (IP address, authenticated user ID) needed for audit fields.

**Rationale**: Models don't have access to `req.ip` or `req.user`. Controllers already orchestrate transactions for multi-step operations (e.g., role assignment in `roles.controller.ts`). The `emitAudit()` function accepts an optional `client` parameter to join existing transactions. For each auditable action, the controller calls `emitAudit()` after the business operation succeeds but before `COMMIT`.

**Alternatives considered**:
- **Middleware-based capture**: A post-handler middleware could auto-record actions, but it wouldn't have access to `previous_values` (the before-state). Requires too much magic.
- **Database triggers for capture**: Triggers on RBAC tables could auto-record changes, but they can't capture actor ID, IP address, or action semantics (trigger doesn't know if a role change was an "assign" or "revoke"). Would also violate Art. VIII (no abstractions — triggers are data-layer logic bypassing application control).

---

### R-008: Migration Split — Single vs Multiple Migrations

**Decision**: Single migration file containing table creation, trigger, indexes, and permission seed.

**Rationale**: Constitution Art. VII limits to 3 tables per migration. This feature creates exactly 1 table. The trigger and indexes are not tables. The permission seed is an `INSERT` into an existing table (`permissions` + `role_permissions`) — additive, not a new table. Everything fits in one migration file wrapped in `BEGIN/COMMIT`, consistent with the project pattern.

**Alternatives considered**:
- **Two migrations (table + seed)**: Unnecessary split. The seed is 2 INSERT statements — trivial overhead in the same transaction.

---

### R-009: Truncation Strategy for Large JSON Payloads (FR-010a)

**Decision**: Application-level truncation in the `emitAudit()` function before INSERT.

**Rationale**: The 10 KB limit per JSON field (FR-010a) should be enforced in application code (TypeScript) rather than a database `CHECK` constraint. Reasons: (1) `CHECK (length(previous_values::text) <= 10240)` requires casting JSONB to text on every insert — minor performance penalty; (2) Application-level truncation with `_truncated: true` marker is easier to implement and test; (3) The truncation logic (which fields to keep vs drop) is business logic, not a database concern. The model's INSERT will rely on the service having already enforced the limit.

**Alternatives considered**:
- **Database CHECK constraint**: Would enforce the limit at the DB level, but can't implement the `_truncated: true` marker semantics. Would cause hard failures instead of graceful truncation.
- **No enforcement**: Risks unbounded JSON payloads consuming storage.
