# Tasks: System Audit Log

**Input**: Design documents from `/specs/006-system-audit-log/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and shared types that ALL user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 [US0] Create `server/src/types/audit.ts` — define `TActorType`, `TAuditRecord`, `TAuditQueryParams`, `TAuditEmitParams` types per data-model.md TypeScript section. Follow existing `types/bookmark.ts` pattern (type aliases, optional fields with `?`).
- [x] T002 [US0] Create migration runner `server/migrations/<timestamp>-audit-log.js` — follow existing pattern from `20260426082213-bookmarks.js` (read SQL file, run via `db.runSql`). Generate timestamp via `npx db-migrate create audit-log`.
- [x] T003 [US0] Create `server/migrations/sqls/20260430150959-audit-log-up.sql` — create `audit_log` table (UUID PK, JSONB columns, INET for ip_address, CHECK constraint on previous/new values), immutability trigger function + trigger + comment, all 5 indexes, and seed `audit.read` permission for admin/super_admin roles. Wrap in `BEGIN/COMMIT`. Per data-model.md.
- [x] T004 [US0] Create `server/migrations/sqls/20260430150959-audit-log-down.sql` — drop trigger, trigger function, table, and remove seeded permission/role-permission rows. Wrap in `BEGIN/COMMIT`.
- [x] T005 [US0] Run `npx db-migrate up` and verify with `\d audit_log` that table, trigger, indexes, and seed data exist.

**Checkpoint**: Schema and types ready. User story implementation can begin.

---

## Phase 2: User Story 1 — Automatic Capture of Admin Actions (Priority: P1) 🎯 MVP

**Goal**: Every admin/moderator mutation produces an immutable audit record with full before/after snapshots, within the same transaction.

**Independent Test**: Perform an administrative action (e.g., assign a role) and verify a corresponding `audit_log` row exists with correct actor, action, entity, previous_values, and new_values.

### Implementation

- [ ] T006 [US1] Create `server/src/models/audit.ts` — `AuditModel` class with two methods:

  **(1) `record(client: PoolClient, params: TAuditEmitParams): Promise<TAuditRecord>`** — INSERT into `audit_log` using the provided client (joins caller's transaction). **Validation** (consolidated here — F-006): validates required string fields (`action`, `entityType`, `entityId`, `actorId`) are non-empty, validates at least one of `previousValues`/`newValues` is non-null (throws `Error` otherwise). **Truncation**: JSON payloads exceeding 10 KB are truncated with a `_truncated: true` marker (FR-010a). Follow `BookmarkModel` pattern: `QueryResult<TAuditRecord>`, `connection.query($1, $2...)`, error via `throw new Error('msg', { cause: error })`. Does NOT manage its own connection — always requires a `PoolClient`.

  **(2) `query(params: TAuditQueryParams): Promise<IPaginatedResult<TAuditRecord>>`** — uses parameterized `IS NULL OR` pattern for dynamic WHERE (F-003):

  ```sql
  SELECT * FROM audit_log
  WHERE ($1::timestamptz IS NULL OR created_at >= $1)
    AND ($2::timestamptz IS NULL OR created_at <= $2)
    AND ($3::text IS NULL OR actor_id = $3)
    AND ($4::text IS NULL OR actor_type = $4)
    AND ($5::text IS NULL OR action = $5)
    AND ($6::text IS NULL OR entity_type = $6)
    AND ($7::text IS NULL OR entity_id = $7)
    AND ($8::uuid IS NULL OR (created_at, id) < (
      SELECT created_at, id FROM audit_log WHERE id = $8
    ))
  ORDER BY created_at DESC, id DESC
  LIMIT $9
  ```

  **Compound cursor** (F-004): The cursor is a UUID (the `id` of the last record). The subquery resolves `(created_at, id)` from that UUID internally — the caller only passes a single UUID string. Builds its own `IPaginatedResult` (does NOT use the generic `createPaginationResult` utility, which only supports single-field cursors). Uses `pool.connect()` with `connection.release()` in `finally` (read-only, no transaction needed).

- [ ] T006a [US1] Refactor `server/src/models/role.ts` — update 5 methods to accept an **optional `PoolClient` parameter** (F-001). When provided, the model uses it without managing its own connection or transaction. When absent, the model manages its own `pool.connect()` / `BEGIN` / `COMMIT` / `ROLLBACK` / `release()` (backward-compatible).

  Pattern to apply to `create()`, `update()`, `delete()`, `assignRole()`, `revokeRole()`:
  ```typescript
  async assignRole(userId: string, roleId: string, assignedBy: string, externalClient?: PoolClient): Promise<TUserRole> {
    const connection = externalClient ?? await pool.connect();
    const ownsTransaction = !externalClient;
    try {
      if (ownsTransaction) await connection.query('BEGIN');
      // ... business logic unchanged ...
      if (ownsTransaction) await connection.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      if (ownsTransaction) await connection.query('ROLLBACK');
      throw new Error(`Failed to assign role: ${(error as Error).message}`, { cause: error });
    } finally {
      if (ownsTransaction) connection.release();
    }
  }
  ```

  **Verify**: Run `pnpm test` after refactoring. All existing behavior must be unchanged when called without `externalClient`.

- [ ] T007 [US1] Create `server/src/services/auditEmitter.ts` — export `emitAudit(params: TAuditEmitParams): Promise<void>`.

  **With client**: calls `auditModel.record(params.client, params)` directly — joins the caller's transaction. No validation in the service (model handles it — F-006).

  **Without client**: opens `pool.connect()`, `BEGIN`, calls `record()`, `COMMIT`, releases in `finally`. On error: `ROLLBACK` in catch, rethrow with `throw new Error('msg', { cause: error })`. Validates only that `client` OR standalone mode is correctly handled — field validation stays in the model.

- [ ] T008 [US1] Register `AuditModel` in `server/src/controllers/factory.ts` — add `import AuditModel from '../models/audit.js'` and `const audit_model = new AuditModel()`. Export `audit_model`.

- [ ] T009 [US1] Rewrite `server/src/controllers/roles.controller.ts` — each audited handler now **manages the transaction** at the controller level (F-001), calls the model with the `PoolClient`, captures `previousValues` via pre-mutation reads (F-005), then calls `emitAudit` within the same transaction:

  **Pattern for each handler:**
  ```typescript
  import pool from '../database/pool.js';
  import { emitAudit } from '../services/auditEmitter.js';

  const assignRole = async (req: ICustomRequest, res: Response, next: NextFunction) => {
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      // 1. Business operation (model uses our connection)
      const assignment = await roleModel.assignRole(userId, roleId, assignedBy!, connection);
      // 2. Audit recording (same transaction)
      await emitAudit({
        client: connection,
        actorId: assignedBy!,
        actorType: 'user',
        action: 'role.assign',
        entityType: 'user_role',
        entityId: userId,
        previousValues: null,  // creation event — no prior state
        newValues: { role: 'moderator', assigned_by: assignedBy },
        ipAddress: req.ip,
      });
      // 3. Cache invalidation
      await permissionCache.invalidate(userId);
      await connection.query('COMMIT');
      return sendResponse.success(res, assignment, 200);
    } catch (error) {
      await connection.query('ROLLBACK');
      // ... error handling ...
    } finally {
      connection.release();
    }
  };
  ```

  **Handlers and their previousValues strategy** (F-005):
  - `assignRole` — `previousValues: null` (creation), `newValues: { role_id, role_name, assigned_by }`
  - `revokeRole` — Fetch role name before revoke: `previousValues: { role_id, role_name }`, `newValues: null` (deletion)
  - `createRole` — `previousValues: null` (creation), `newValues: { name, description, permission_ids }`
  - `updateRole` — Fetch current role via `roleModel.getById(roleId, connection)` before update: `previousValues: { description, permission_ids }`, `newValues: { description, permission_ids }`
  - `deleteRole` — Fetch current role before delete: `previousValues: { name, description, is_system }`, `newValues: null` (deletion)

  **Note**: `getById()` must also be refactored to accept an optional `PoolClient` (read-only, no transaction needed, just connection reuse) to avoid an extra `pool.connect()` inside the pre-mutation read.

- [ ] T010 ~~[US1] DEFERRED~~ — `user.ban` / `user.unban` endpoints do not exist in `users.controller.ts` (F-002). Audit integration for these actions will be added when ban/unban functionality is implemented in a future spec (likely spec 007 — Reports & Moderation). The `audit_log` table and `emitAudit()` function already support these action names.

- [ ] T011 [US1] Verify: manually test role assignment and revocation via API, then `SELECT * FROM audit_log` to confirm records are created with correct fields. Verify that a failed transaction (e.g., duplicate role assignment returning 409) does NOT leave an audit row. Verify `previousValues` captures the before-state correctly for update and delete operations.

**Checkpoint**: All RBAC admin actions are audit-logged atomically. Controllers own the transaction boundary. Immutability trigger blocks UPDATE/DELETE.

---

## Phase 3: User Story 2 — Querying and Filtering Audit History (Priority: P1)

**Goal**: Super admins can search/filter audit records by actor, action, entity, and date range via a paginated endpoint.

**Independent Test**: Generate audit records through various actions, then query by each filter and verify correct results.

### Implementation

- [ ] T012 [P] [US2] Create `server/src/middlewares/validations/audit.ts` — express-validator chain for `GET /api/audit` query params: `actor_id` (optional UUID), `actor_type` (optional, in `['user', 'system']`), `action` (optional string, max 100), `entity_type` (optional string, max 50), `entity_id` (optional string), `from`/`to` (optional ISO 8601), `limit` (optional int 1–100), `cursor` (optional UUID), `direction` (optional, in `['next', 'previous']`). Follow `validations/bookmarks.ts` pattern.
- [ ] T013 [US2] Create `server/src/controllers/audit.controller.ts` — single `getAuditLogs` handler. Extracts query params via `getCursorPaginationOptions(req)`, builds `TAuditQueryParams`, calls `audit_model.query()`, returns via `sendResponse.success()` with pagination metadata. Follow `bookmarks.controller.ts` pattern: `validationResult` check, `sendResponse.error` on failure, `next(error)` in catch.
- [ ] T014 [US2] Create `server/src/routes/apis/audit.routes.ts` — `GET /` with middleware stack: `authorizeUser`, `requirePermission('audit.read')`, `auditQueryValidator`, `auditController.getAuditLogs`. Follow `roles.routes.ts` pattern.
- [ ] T015 [US2] Mount audit routes in `server/src/routes/index.ts` — add `import auditRoute from './apis/audit.routes.js'` and `routes.use('/audit', auditRoute)` alongside existing route mounts.
- [ ] T016 [US2] Verify: call `GET /api/audit` with various filter combinations (actor_id, action, entity_type, date range, pagination cursor). Confirm correct filtering, pagination metadata, and reverse-chronological order. Confirm 403 for users without `audit.read`.

**Checkpoint**: Audit log is queryable via paginated, filtered, permission-gated endpoint.

---

## Phase 4: User Story 3 — RBAC Integration: Permission-Gated Access (Priority: P2)

**Goal**: Only users with `audit.read` permission can query the audit log.

**Independent Test**: Verify admin/super_admin can query, moderator and regular user get 403.

### Verification (implemented by T014's `requirePermission('audit.read')`)

- [ ] T017 [US3] Verify RBAC integration: (1) login as super_admin, confirm `GET /api/audit` returns 200; (2) login as admin, confirm 200; (3) login as moderator (no `audit.read`), confirm 403; (4) login as regular user, confirm 403; (5) assign `audit.read` to a custom role via super_admin, assign that role to a test user, confirm 200 for that user. (6) Confirm the audit log for the custom role assignment (step 5) was recorded correctly.

**Checkpoint**: Permission gating is correct for all role levels.

---

## Phase 5: User Story 4 — Extensible Event Contract (Priority: P2)

**Goal**: Any future module can record audit events by calling `emitAudit()` with six parameters — no schema changes needed.

**Independent Test**: Call `emitAudit()` with a novel action/entity outside the RBAC domain and verify the record is created.

### Verification (implemented by T007 `emitAudit`)

- [ ] T018 [US4] Verify extensibility: call `emitAudit()` with `action: 'settings.updated'`, `entityType: 'app_settings'`, `entityId: 'general'` and confirm the record is created with all fields correct. Confirm the system does not reject unrecognized action types.
- [ ] T019 [US4] Verify standalone transaction: call `emitAudit()` WITHOUT a `client` parameter and confirm it opens its own transaction, inserts the record, and releases the connection.

**Checkpoint**: Audit recording is decoupled from RBAC — any module can emit events.

---

## Phase 6: User Story 5 — Immutability & Integrity (Priority: P2)

**Goal**: Audit records cannot be updated or deleted — even by super admins.

### Verification (implemented by T003 trigger)

- [ ] T020 [US5] Verify immutability: (1) attempt `UPDATE audit_log SET action = 'tampered' WHERE id = '<uuid>'` — confirm exception raised; (2) attempt `DELETE FROM audit_log WHERE id = '<uuid>'` — confirm exception raised; (3) confirm `created_at` matches insertion time on read-back and cannot be altered.

**Checkpoint**: Audit log is tamper-proof at the database level.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T021 [P] Run `pnpm run lint` and `pnpm run prettier:check` in both `client/` and `server/` — fix any violations.
- [ ] T022 [P] Verify all new files follow JSDoc conventions per AGENTS.md: no redundant function names, no `@description`, no type annotations in `@param`, always include `@route` for controllers.
- [ ] T023 Run `pnpm test` and confirm all existing tests still pass (no regressions from new migration or factory changes).
- [ ] T024 Verify quickstart.md: run migration on clean database, test recording example, test query example, confirm all steps work end-to-end.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Foundational)
  │
  ├── Phase 2 (US1: Capture) ← depends on T001, T002, T003, T004, T005
  │     │
  │     ├── Phase 3 (US2: Query) ← depends on T006 (model.query method)
  │     │
  │     ├── Phase 4 (US3: RBAC) ← depends on T014 (route with requirePermission)
  │     │
  │     ├── Phase 5 (US4: Extensibility) ← depends on T007 (emitAudit)
  │     │
  │     └── Phase 6 (US5: Immutability) ← depends on T003 (trigger)
  │
  └── Phase 7 (Polish) ← depends on all above
```

### Within Each Phase

- T001–T004 can run in parallel (different files)
- T005 depends on T002, T003, T004
- T006 depends on T001
- T006a depends on T001 (parallel with T006 — different files)
- T007 depends on T006
- T008 depends on T006
- T009 depends on T006a + T007 + T008 (requires refactored models AND audit service)
- T010 DEFERRED — no ban/unban endpoints exist
- T012, T013 can run in parallel (different files)
- T014 depends on T012, T013
- T015 depends on T014

### Parallel Opportunities

```
After Phase 1:
  T006 (audit model) ─────────────────────────┐
  T006a (refactor role.ts) ─────────────────────┤
                                                 ├→ T007 (emitter) → T009 (controller rewrite)
  T008 (factory registration) ──────────────────┘
  T012 (validators), T013 (controller) in parallel → T014 (routes) → T015 (mount)
```

---

## Notes

- Tasks organized so US1 + US2 form the MVP — after Phase 3, the audit log is fully functional (capture + query).
- US3–US5 are verification tasks since their requirements are satisfied by the foundational implementation (trigger, permission seed, emitAudit design).
- **T006a is a prerequisite for T009** — the RBAC model methods must accept optional `PoolClient` before controllers can manage transactions. Verify backward compatibility by running existing tests after T006a.
- **T009 is the most complex task** — it rewrites 5 controller handlers to manage transactions, adds pre-mutation reads for `previousValues`, and integrates `emitAudit`. Each handler should be modified and tested individually.
- **T010 is deferred** — `user.ban` / `user.unban` endpoints do not exist yet. Will be added in spec 007 (Reports & Moderation).
- **Validation is consolidated** in `AuditModel.record()` (F-006) — the service layer only checks infrastructure concerns (client present or not), not data validity.
- No new npm dependencies required — all infrastructure (pg, express, express-validator, db-migrate) already exists.
- See `analysis.md` for the full rationale behind all task amendments.
