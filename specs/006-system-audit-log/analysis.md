# Analysis: System Audit Log

**Feature**: 006-system-audit-log | **Date**: 2026-04-29
**Analyzed**: plan.md, tasks.md, data-model.md, contracts/audit-api.md, research.md
**Against**: Constitution Articles I–IX, existing codebase patterns

---

## Findings

### F-001 — CRITICAL: Transaction Boundary Mismatch (blocks T009, T010)

**Severity**: P0 — blocks MVP implementation

**Problem**: T009 and T010 say "add `emitAudit` calls to controllers" and pass the model's `PoolClient` to join the existing transaction. But the current architecture has **models owning the connection lifecycle** — the controller never holds the `PoolClient`.

Evidence from `roles.controller.ts:124-145`:
```typescript
const assignRole = async (req, res, next) => {
  const assignment = await roleModel.assignRole(userId, roleId, assignedBy!);
  // ← transaction is fully managed inside roleModel.assignRole()
  // ← controller has NO access to the PoolClient
};
```

And `role.ts:329-349` — the model does `pool.connect()`, `BEGIN`, `INSERT`, `COMMIT`, `release()` internally. The controller cannot inject audit recording into this transaction.

**Impact**: As designed, `emitAudit()` would execute AFTER the model's transaction has already committed — defeating FR-002 (atomicity). If the audit INSERT then fails, the business operation is already persisted.

**Resolution**: Refactor the RBAC model methods that need auditing to accept an **optional `PoolClient` parameter**. When provided, the model uses it (caller manages transaction). When absent, the model manages its own connection (backward-compatible).

Model change pattern:
```typescript
// role.ts — assignRole BEFORE:
async assignRole(userId: string, roleId: string, assignedBy: string): Promise<TUserRole> {
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    // ...
    await connection.query('COMMIT');
  } catch { await connection.query('ROLLBACK'); }
  finally { connection.release(); }
}

// role.ts — assignRole AFTER:
async assignRole(userId: string, roleId: string, assignedBy: string, externalClient?: PoolClient): Promise<TUserRole> {
  const connection = externalClient ?? await pool.connect();
  const ownsTransaction = !externalClient;
  try {
    if (ownsTransaction) await connection.query('BEGIN');
    // ... business logic unchanged ...
    if (ownsTransaction) await connection.query('COMMIT');
  } catch (error) {
    if (ownsTransaction) await connection.query('ROLLBACK');
    throw new Error(`Failed to assign role: ${(error as Error).message}`, { cause: error });
  } finally {
    if (ownsTransaction) connection.release();
  }
}
```

Controller change pattern:
```typescript
// roles.controller.ts — assignRole AFTER:
const assignRole = async (req, res, next) => {
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    const assignment = await roleModel.assignRole(userId, roleId, assignedBy!, connection);
    await emitAudit({ client: connection, actorId: assignedBy!, ... });
    await permissionCache.invalidate(userId);
    await connection.query('COMMIT');
    return sendResponse.success(res, assignment, 200);
  } catch (error) {
    await connection.query('ROLLBACK');
    next(error);
  } finally {
    connection.release();
  }
};
```

**Tasks affected**: T009 (rewrite), T010 (rewrite). Also requires a new task to refactor the 5 model methods in `role.ts`.

---

### F-002 — HIGH: No Ban/Unban Endpoints Exist (T010 invalid)

**Severity**: P1 — task cannot be executed

**Problem**: T010 says "add `emitAudit` calls to `users.controller.ts` ban/unban handlers." But the users controller (`users.controller.ts:1-185`) has **no ban or unban handlers**. The controller only has: `getUsers`, `getUserByUsername`, `getUserById`, `update`, `deleteUser`, `getUnknownUsers`, `getFriends`.

The `users.ban` / `users.unban` functionality does not exist in the codebase. The spec's action list includes them based on the RBAC spec's `users.ban` permission, but no endpoint actually bans users yet. This functionality would be part of the Reports & Moderation feature (tracker spec 007).

**Resolution**: Remove T010 from the current scope. Replace with a note that `user.ban` / `user.unban` audit integration will be added when the ban/unban endpoints are implemented in spec 007.

---

### F-003 — MEDIUM: Dynamic WHERE Clause Performance

**Severity**: P2 — affects query method implementation

**Problem**: T006 says the `query()` method "builds dynamic WHERE clause from optional filters." With up to 7 optional filters (actor_id, actor_type, action, entity_type, entity_id, from, to), the number of index combinations is high. PostgreSQL's planner may not always choose the optimal index for every combination.

**Resolution**: Use a **consistent query structure** that always filters on the compound index first, then applies additional conditions:

```sql
SELECT * FROM audit_log
WHERE ($1::timestamptz IS NULL OR created_at >= $1)
  AND ($2::timestamptz IS NULL OR created_at <= $2)
  AND ($3::text IS NULL OR actor_id = $3)
  AND ($4::text IS NULL OR actor_type = $4)
  AND ($5::text IS NULL OR action = $5)
  AND ($6::text IS NULL OR entity_type = $6)
  AND ($7::text IS NULL OR entity_id = $7)
  AND ($8::uuid IS NULL OR (created_at, id) < ($cursor_ts, $cursor_uuid))
ORDER BY created_at DESC, id DESC
LIMIT $9
```

PostgreSQL will evaluate each condition against the `idx_audit_log_created_at_id` compound index and use the selective filters effectively. The `IS NULL OR` pattern avoids dynamic SQL concatenation and keeps the query plan cacheable.

**Also**: Add `from`/`to` as a **required pair for large result sets** in a future optimization — but for the initial low-volume admin use case (tens of queries/day), the dynamic WHERE is sufficient.

---

### F-004 — MEDIUM: Pagination Utility Compatibility

**Severity**: P2 — affects T013 implementation

**Problem**: The existing `createPaginationResult()` utility (`pagination.ts:14-33`) extracts cursors using `item[idField]` — it expects a single field as the cursor. But our keyset pagination uses a **compound cursor** `(created_at, id)`. The utility cannot produce compound cursors.

```typescript
// Current utility — only supports single-field cursors:
nextCursor: hasMore && lastItem ? String(lastItem[idField]) : undefined,
```

**Resolution**: The `AuditModel.query()` method should build its own pagination result rather than using the generic utility. Encode the compound cursor as a JSON string `{"created_at":"...","id":"..."}`, base64-encoded, and decode in the query method. Alternatively, use `created_at` as the cursor (ISO string) with `id` as tiebreaker in the WHERE clause — simpler and works with the existing pattern if we bypass `createPaginationResult`.

**Recommended**: Keep it simple — use `id` (UUID) as the visible cursor, and resolve `created_at` internally. Since UUIDs are unique, `WHERE (created_at, id) < (SELECT created_at, id FROM audit_log WHERE id = $cursor)` is a single subquery that resolves both fields. This keeps the cursor a simple UUID string.

---

### F-005 — LOW: `previous_values` Capture Timing

**Severity**: P3 — affects data quality

**Problem**: T009 says each audit call should include `previousValues` (the before-state). But the controller doesn't have the current state before the mutation — the model does. For example, `assignRole` inserts into `user_roles`, but the controller doesn't know what roles the user had before.

For creation events (assign role, create role), `previousValues` is correctly null. For mutations (update role, revoke role, delete role), the model has access to the row being modified but the controller doesn't.

**Resolution**: For the initial action set:
- `role.assign`, `role.create` → `previousValues: null` (creation events) ✅
- `role.revoke` → `previousValues: { role: '<role_name>' }` — controller can look up role name from `roleId` before calling the model
- `role.update` → `previousValues` = the old permission set — controller should fetch current role (already has `roleModel.getById()`) before calling update
- `role.delete` → `previousValues` = the role's current state — controller should fetch before delete
- `user.ban` / `user.unban` → deferred to spec 007

This adds an extra read query per mutation, but since these are admin-only operations with low volume, the overhead is acceptable.

---

### F-006 — INFO: `emitAudit` Validation Gap

**Severity**: P3 — minor robustness

**Problem**: T007 says `emitAudit` validates "at least one of previous/new values is non-null." But this validation is also mentioned in T006 (model) and T007 (service). Having it in two places is redundant and could diverge.

**Resolution**: Validate once — in `AuditModel.record()` (the single INSERT point). The `emitAudit` service should only validate that required string fields (`action`, `entityType`, `entityId`, `actorId`) are present, and delegate value validation to the model. This follows the existing pattern where models are the data integrity layer.

---

## Task Amendments

| Finding | Task Change |
|---------|-------------|
| F-001 | **Add new task T006a**: Refactor `role.ts` methods (`assignRole`, `revokeRole`, `create`, `update`, `delete`) to accept optional `PoolClient` parameter |
| F-001 | **Rewrite T009**: Controllers must manage the transaction (`pool.connect()` → `BEGIN` → model call → `emitAudit` → `COMMIT`), not just add a function call |
| F-002 | **Remove T010**: Ban/unban endpoints don't exist. Replace with a comment that integration is deferred to spec 007 |
| F-003 | **Update T006**: Use parameterized `IS NULL OR` pattern for dynamic WHERE, not string concatenation |
| F-004 | **Update T006**: `query()` must build its own pagination result with subquery-based compound cursor resolution |
| F-005 | **Update T009**: Add pre-mutation read queries to capture `previous_values` before the write |
| F-006 | **Update T006, T007**: Move null-check validation into `AuditModel.record()` only |

## Updated Task Order

After amendments, the execution order becomes:

```
T001 (types)
T002, T003, T004 (migration — parallel)
T005 (run migration)
T006 (AuditModel — with F-003/F-004 fixes)
T006a (refactor role.ts — NEW)
T007 (emitAudit service — with F-006 fix)
T008 (factory registration)
T009 (roles controller — rewritten per F-001/F-005)
T010 → REMOVED, add note for spec 007
T011 (verify)
T012–T024 (unchanged)
```

## Constitution Re-Check

| Article | Status | Notes |
|---------|--------|-------|
| I | ✅ | Raw SQL parameterized queries maintained |
| II | ✅ | Migration-first approach unchanged |
| III | ✅ | TypeScript strict, new types in `types/` |
| IV | ⚠️ | F-001 fix ensures transaction safety — requires controller-level transaction management for audited operations. Models still use `finally` release. |
| V | ✅ | REST semantics, standardized envelope |
| VI | ✅ | Rate limiting via existing global limiter |
| VII | ✅ | Single table, no new tables |
| VIII | ✅ | No abstraction layer, `pg` Pool directly |
| IX | ✅ | No breaking changes to existing tables |

**Article IV note**: The refactored pattern (controller manages transaction, model accepts `PoolClient`) is consistent with Constitution Art. IV — it still uses `BEGIN/COMMIT/ROLLBACK`, connections are released in `finally`, and the transaction boundary is explicit. The controller becomes the transaction orchestrator, which is the correct layer for multi-step operations (business op + audit).
