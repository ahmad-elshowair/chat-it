# Data Model: System Audit Log

**Feature**: 006-system-audit-log | **Date**: 2026-04-29

## Entity: audit_log

Single append-only table recording all auditable state-changing events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY DEFAULT uuid_generate_v4()` | Unique record identifier |
| `actor_id` | `TEXT` | `NOT NULL` | User ID (UUID string) for human actors, `'0'` for system actors |
| `actor_type` | `TEXT` | `NOT NULL DEFAULT 'user'` | `'user'` or `'system'` (FR-011) |
| `action` | `TEXT` | `NOT NULL` | Action name (e.g., `role.assign`, `user.ban`). Open string (FR-009) |
| `entity_type` | `TEXT` | `NOT NULL` | Entity category (e.g., `user_role`, `user`, `post`) |
| `entity_id` | `TEXT` | `NOT NULL` | Entity UUID string (or other identifier for future entities) |
| `previous_values` | `JSONB` | `NULL` | Full snapshot before change. Null for creation events (FR-010) |
| `new_values` | `JSONB` | `NULL` | Full snapshot after change. Null for deletion events (FR-010) |
| `ip_address` | `INET` | `NULL` | Originating IP. Null for system-initiated actions (FR-014) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record creation timestamp (UTC) |

**Check constraint**: `CHECK (previous_values IS NOT NULL OR new_values IS NOT NULL)` — at least one must be non-null (FR-010).

## Immutability Trigger

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
  'Enforces append-only immutability per spec 006 FR-008. DO NOT drop without constitution amendment.';
```

## Indexes

| Index Name | Definition | Rationale |
|------------|-----------|-----------|
| `pk_audit_log` | `PRIMARY KEY (id)` | Default b-tree on UUID PK. |
| `idx_audit_log_created_at_id` | `btree (created_at DESC, id DESC)` | **Compound keyset pagination cursor**. Provides deterministic reverse-chronological ordering with UUID tiebreaker for same-millisecond inserts (FR-005). |
| `idx_audit_log_actor_id` | `btree (actor_id)` | Filter by actor (FR-004). Admins investigating "what did user X do?". |
| `idx_audit_log_action` | `btree (action)` | Filter by action type (FR-004). "Show all user.ban events". |
| `idx_audit_log_entity` | `btree (entity_type, entity_id)` | Composite index for entity lookups (FR-004). "Show all changes to user #42". |
| `idx_audit_log_actor_type` | `btree (actor_type)` | Filter by actor type (FR-004). "Show only system-initiated events". |

**Note**: The `created_at DESC` index serves double duty — it supports both the default reverse-chronological sort order (FR-013) and the date range filter (FR-004 `from`/`to`). The compound index with `id` ensures deterministic pagination even when multiple records share the same timestamp.

**No foreign keys**: The `actor_id` references `users.user_id` but is not enforced via FK because (1) system actors use `actor_id = '0'` which has no matching user row, and (2) user deletion should not cascade-delete audit records (immutability). This is a deliberate denormalization for audit integrity.

## Seed Data

Added to existing RBAC tables via the migration:

```sql
-- New permission
INSERT INTO permissions (name, resource, action, description)
VALUES ('audit.read', 'audit', 'read', 'View audit log entries')
ON CONFLICT (name) DO NOTHING;

-- Assign to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name = 'audit.read'
ON CONFLICT DO NOTHING;

-- Assign to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.name = 'super_admin' AND p.name = 'audit.read'
ON CONFLICT DO NOTHING;
```

## Relationships

```
audit_log ──────> users (logical, NOT enforced by FK)
  actor_id references users.user_id for human actors
  actor_id = '0' for system actors

audit_log ──────> (any entity table, logical reference only)
  entity_type + entity_id identify the target entity
  No FK constraint — audit records survive entity deletion
```

## TypeScript Type

```typescript
// types/audit.ts

export type TActorType = 'user' | 'system';

export type TAuditRecord = {
  id: string;
  actor_id: string;
  actor_type: TActorType;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export type TAuditQueryParams = {
  actor_id?: string;
  actor_type?: TActorType;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
  direction?: 'next' | 'previous';
};

export type TAuditEmitParams = {
  client?: PoolClient;
  actorId: string;
  actorType: TActorType;
  action: string;
  entityType: string;
  entityId: string;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress?: string;
};
```

## Migration Boundaries

Per Constitution Art. VII (max 3 tables per migration):
- **1 table created**: `audit_log`
- **1 trigger function + trigger**: `audit_log_immutable()` + `trg_audit_log_immutable`
- **6 indexes**: All on `audit_log`
- **Seed INSERTs**: Into existing `permissions` and `role_permissions` tables (additive)

**Result**: Well within the 3-table limit. Single migration file.
