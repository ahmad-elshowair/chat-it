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

- [ ] T001 [US0] Create `server/src/types/audit.ts` — define `TActorType`, `TAuditRecord`, `TAuditQueryParams`, `TAuditEmitParams` types per data-model.md TypeScript section. Follow existing `types/bookmark.ts` pattern (type aliases, optional fields with `?`).
- [ ] T002 [US0] Create migration runner `server/migrations/<timestamp>-audit-log.js` — follow existing pattern from `20260426082213-bookmarks.js` (read SQL file, run via `db.runSql`). Generate timestamp via `npx db-migrate create audit-log`.
- [ ] T003 [US0] Create `server/migrations/sqls/<timestamp>-audit-log-up.sql` — create `audit_log` table (UUID PK, JSONB columns, INET for ip_address, CHECK constraint on previous/new values), immutability trigger function + trigger + comment, all 5 indexes, and seed `audit.read` permission for admin/super_admin roles. Wrap in `BEGIN/COMMIT`. Per data-model.md.
- [ ] T004 [US0] Create `server/migrations/sqls/<timestamp>-audit-log-down.sql` — drop trigger, trigger function, table, and remove seeded permission/role-permission rows. Wrap in `BEGIN/COMMIT`.
- [ ] T005 [US0] Run `npx db-migrate up` and verify with `\d audit_log` that table, trigger, indexes, and seed data exist.

**Checkpoint**: Schema and types ready. User story implementation can begin.

---

## Phase 2: User Story 1 — Automatic Capture of Admin Actions (Priority: P1) 🎯 MVP

**Goal**: Every admin/moderator mutation produces an immutable audit record with full before/after snapshots, within the same transaction.

**Independent Test**: Perform an administrative action (e.g., assign a role) and verify a corresponding `audit_log` row exists with correct actor, action, entity, previous_values, and new_values.

### Implementation

- [ ] T006 [US1] Create `server/src/models/audit.ts` — `AuditModel` class with two methods: (1) `record(client: PoolClient, params: TAuditEmitParams): Promise<TAuditRecord>` — INSERT into `audit_log` using the provided client (joins caller's transaction). Validates at least one of previous/new values is non-null. Truncates JSON payloads exceeding 10 KB with `_truncated: true` marker. Follow `BookmarkModel` pattern: `QueryResult<TAuditRecord>`, `connection.query($1, $2...)`, error via `throw new Error('msg', { cause: error })`. (2) `query(params: TAuditQueryParams): Promise<IPaginatedResult<TAuditRecord>>` — builds dynamic WHERE clause from optional filters, uses compound cursor `(created_at DESC, id DESC)` for keyset pagination. Follow existing cursor pattern from `BookmarkModel.getUserBookmarks()`.
- [ ] T007 [US1] Create `server/src/services/auditEmitter.ts` — export `emitAudit(params: TAuditEmitParams): Promise<void>`. If `params.client` is provided, call `auditModel.record()` with it. If not, open `pool.connect()`, BEGIN, call `record()`, COMMIT, release in `finally`. Validate at least one of previous/new values is non-null before proceeding.
- [ ] T008 [US1] Register `AuditModel` in `server/src/controllers/factory.ts` — add `import AuditModel from '../models/audit.js'` and `const audit_model = new AuditModel()`. Export `audit_model`.
- [ ] T009 [US1] Add `emitAudit` calls to `server/src/controllers/roles.controller.ts` — in `assignRole()` (action: `role.assign`), `revokeRole()` (action: `role.revoke`), `createRole()` (action: `role.create`), `updateRole()` (action: `role.update`), `deleteRole()` (action: `role.delete`). Each call passes `client` from the model's transaction context, `req.user.id` as actorId, appropriate entity type/id, and before/after snapshots. Add `emitAudit` import. Calls go after the business operation succeeds but before the response is sent.
- [ ] T010 [P] [US1] Add `emitAudit` calls to `server/src/controllers/users.controller.ts` — in the ban user handler (action: `user.ban`) and unban handler (action: `user.unban`). Pass `previousValues: { status: 'active' }` / `newValues: { status: 'banned' }` (or reverse for unban).
- [ ] T011 [US1] Verify: manually test role assignment and user ban via API, then `SELECT * FROM audit_log` to confirm records are created with correct fields. Verify that a failed transaction (e.g., duplicate role assignment) does NOT leave an audit row.

**Checkpoint**: All RBAC admin actions and user ban/unban are audit-logged atomically. Immutability trigger blocks UPDATE/DELETE.

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

- [ ] T017 [US3] Verify RBAC integration: (1) login as super_admin, confirm `GET /api/audit` returns 200; (2) login as admin, confirm 200; (3) login as moderator (no `audit.read`), confirm 403; (4) login as regular user, confirm 403; (5) assign `audit.read` to a custom role via super_admin, assign that role to a test user, confirm 200 for that user.

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
- T007 depends on T006
- T008 depends on T006
- T009, T010 depend on T007, T008 (can run in parallel)
- T012, T013 can run in parallel (different files)
- T014 depends on T012, T013
- T015 depends on T014

### Parallel Opportunities

```
After Phase 1:
  T006 (model) → T007 (emitter) → T009, T010 (controller integrations)
  T012 (validators), T013 (controller) in parallel → T014 (routes) → T015 (mount)
```

---

## Notes

- Tasks organized so US1 + US2 form the MVP — after Phase 3, the audit log is fully functional (capture + query).
- US3–US5 are verification tasks since their requirements are satisfied by the foundational implementation (trigger, permission seed, emitAudit design).
- T009 is the largest task — it touches 5 handler methods in `roles.controller.ts`. Each handler should be modified individually with a manual test between each.
- T010 touches `users.controller.ts` — can run in parallel with T009 since they're different files.
- No new npm dependencies required — all infrastructure (pg, express, express-validator, db-migrate) already exists.
