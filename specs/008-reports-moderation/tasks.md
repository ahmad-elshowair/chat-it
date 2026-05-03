# Tasks: Reports & Moderation

**Input**: Design documents from `/specs/008-reports-moderation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Not explicitly requested in spec — deferred per Constitution Quality Standards.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create database migration and TypeScript types — shared by all user stories.

- [x] T001 Create migration scaffold: `cd server && npx db-migrate create reports --sql-file`
- [x] T002 [P] Write `server/migrations/sqls/*-reports-up.sql` — CREATE TABLE reports with all columns, FKs, CHECKs, UNIQUE constraint, 4 indexes per data-model.md. Also create trigger `trg_reports_updated_at` (with shared `update_updated_at_column()` function — CREATE OR REPLACE if not exists) to auto-maintain updated_at on every UPDATE.
- [x] T003 [P] Write `server/migrations/sqls/*-reports-down.sql` — DROP indexes then DROP TABLE reports CASCADE
- [x] T004 [P] Create `server/src/types/report.ts` — export TReport, TReportInput, TargetType, ReportReason, ReportStatus per data-model.md TypeScript types section

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Report model — all controllers and routes depend on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Create `server/src/models/report.ts` — ReportModel class following existing pattern (pool.connect, parameterized SQL, connection.release in finally, factory export). Methods: create, getById, list (paginated with status/targetType filters — uses SELECT COUNT(*) for `total` in pagination envelope; acceptable for admin-only offset pagination), dismiss (accepts PoolClient for caller-transaction join), resolve (accepts PoolClient for caller-transaction join), countByStatus, targetExists (private helper — queries posts/comments/users table based on targetType, returns boolean). DB constraint violations (23505) bubble up to pgError middleware. Register singleton in `server/src/controllers/factory.ts` as `report_model`.

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Report Content (Priority: P1) 🎯 MVP

**Goal**: Any authenticated user can report a post, comment, or user profile with a reason. System prevents duplicates and self-reports.

**Independent Test**: User submits report → 201 created. Duplicate → 409. Self-report → 403. Invalid target → 400. Non-existent target → 404.

### Implementation for User Story 1

- [x] T006 [US1] Add `createReport` handler — validate target_type/target_id/reason with express-validator, check target existence via model.targetExists(targetType, targetId) returning 404 if not found (FR-006), check self-report (FR-005): if target_type='post' query posts.user_id, if 'comment' query comments.user_id, if 'user' compare reporter_id === target_id — return 403 if match. Then call model.create, return 201. DB 23505 error surfaces as 409 via next(error).
- [x] T007 [US1] Create `server/src/routes/apis/reports.routes.ts` — define POST /api/reports route with authorizeUser + contentCreationLimiter + express-validator middleware. Add validators for target_type (one of post/comment/user), target_id (UUID), reason (one of 6 categories), description (optional, max 1000 chars).
- [x] T008 [US1] Register report routes in `server/src/routes/index.ts` — import reports routes and mount under `/reports` (following existing bookmark/role pattern).

**Checkpoint**: POST /api/reports is fully functional. Users can create reports. MVP deliverable.

---

## Phase 4: User Story 2 - View Moderation Queue (Priority: P2)

**Goal**: Admins/moderators can view a paginated, filterable moderation queue.

**Independent Test**: Admin GET /api/reports → 200 with paginated results. Filter by status/targetType works. Regular user → 403.

### Implementation for User Story 2

- [x] T009 [P] [US2] Add `listReports` handler — extract query params (status, targetType, limit, offset), apply defaults (limit=20, max=100), call model.list, return paginated response.
- [x] T010 [US2] Add GET / route — with authorizeUser + requirePermission('reports.manage') + paginationValidator middleware.

**Checkpoint**: Admins can view and filter the moderation queue.

---

## Phase 5: User Story 3 - Dismiss a Report (Priority: P2)

**Goal**: Admins can dismiss a pending report with an optional note.

**Independent Test**: Admin PATCH /api/reports/:id/dismiss → 200. Non-pending report → 409. Regular user → 403.

### Implementation for User Story 3

- [x] T011 [P] [US3] Add `dismissReport` handler — acquire PoolClient via pool.connect(), BEGIN transaction. UPDATE reports SET status='dismissed', resolved_by, resolved_at, resolution_note, updated_at WHERE report_id=$1 AND status='pending'. If rowCount=0 → ROLLBACK, release, return 409. On success, call emitAudit({ client, action:'report.dismiss', entityType:'report', ... }) within same transaction. COMMIT, release in finally. Return updated report.
- [x] T012 [US3] Add PATCH /:id/dismiss route — with authorizeUser + requirePermission('reports.manage') + UUID param validator + optional resolution_note validator.

**Checkpoint**: Admins can dismiss pending reports.

---

## Phase 6: User Story 4 - Resolve a Report (Priority: P2)

**Goal**: Admins can resolve a pending report with an optional note. Resolution is flag-only (no auto-delete).

**Independent Test**: Admin PATCH /api/reports/:id/resolve → 200. Non-pending → 409. Content still exists after resolve.

### Implementation for User Story 4

- [x] T013 [P] [US4] Add `resolveReport` handler — same transaction+audit pattern as dismiss (T011) but sets status='resolved'. Does NOT delete reported content (V1 flag-only). Acquire PoolClient, BEGIN, UPDATE WHERE status='pending', emitAudit({ client, action:'report.resolve', ... }), COMMIT, release in finally.
- [x] T014 [US4] Add PATCH /:id/resolve route — with authorizeUser + requirePermission('reports.manage') + UUID param validator + optional resolution_note validator.

**Checkpoint**: Admins can resolve pending reports. Report content is NOT deleted.

---

## Phase 7: User Story 5 - Report Statistics (Priority: P3)

**Goal**: Admins can view aggregate report counts grouped by status.

**Independent Test**: Admin GET /api/reports/stats → 200 with {pending, dismissed, resolved} counts. No reports → all zeros.

### Implementation for User Story 5

- [x] T015 [US5] Add `getReportStats` handler — call model.countByStatus, return grouped counts.
- [x] T016 [US5] Add GET /stats route — with authorizeUser + requirePermission('reports.manage'). MUST be registered BEFORE /:id routes to avoid route collision.

**Checkpoint**: Admins can view report statistics dashboard.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validation gates and final verification.

- [ ] T017 Run migration: `cd server && npx db-migrate up`, verify schema with `\d reports` shows all columns, constraints, and indexes. Verify ON DELETE CASCADE on reporter_id (delete a user → their reports removed; reports against that user remain). Verify ON DELETE SET NULL on resolved_by (delete admin → resolved_by NULL, resolution_note/resolved_at preserved). Optional: seed 1000+ reports and verify GET /api/reports responds within 2s (SC-003).
- [ ] T018 Run `pnpm run lint && pnpm run prettier:check && pnpm test` — all must pass before merge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (migration + types must exist)
- **US1 (Phase 3)**: Depends on Phase 2 (model must exist)
- **US2–US5 (Phases 4–7)**: Depend on Phase 3 (routes file must exist with POST route). US2–US5 can run in parallel within their phases.
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on model + migration. No dependencies on other stories.
- **US2 (P2)**: Depends on routes file from US1 (adds GET route to same file)
- **US3 (P2)**: Depends on routes file from US1 (adds PATCH dismiss route)
- **US4 (P2)**: Depends on routes file from US1 (adds PATCH resolve route)
- **US5 (P3)**: Depends on routes file from US1 (adds GET /stats route)

### Within Each User Story

- Controller handler before route registration
- Route registration in same file as other report routes

### Parallel Opportunities

- T002 + T003 + T004 (migration up, down, types — different files)
- T009 + T011 + T013 + T015 (controller handlers for US2–US5 — different handler functions, can be written in parallel)
- T010 + T012 + T014 + T016 (route registrations — different route definitions in same file, sequential)

---

## Parallel Example: Foundational

```bash
# Phase 1 — all in parallel:
Task: "Write up.sql in server/migrations/sqls/*-reports-up.sql"
Task: "Write down.sql in server/migrations/sqls/*-reports-down.sql"
Task: "Create types/report.ts"

# Phase 2 — sequential (depends on Phase 1):
Task: "Create models/report.ts"
```

## Parallel Example: User Stories 2–5

```bash
# All controller handlers can be written in parallel:
Task: "Add listReports handler in controllers/reports.controller.ts"
Task: "Add dismissReport handler in controllers/reports.controller.ts"
Task: "Add resolveReport handler in controllers/reports.controller.ts"
Task: "Add getReportStats handler in controllers/reports.controller.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (migration, types)
2. Complete Phase 2: Foundational (model)
3. Complete Phase 3: User Story 1 (create report)
4. **STOP and VALIDATE**: Test POST /api/reports end-to-end
5. Deploy if ready — users can start reporting

### Incremental Delivery

1. Setup + Foundation → Migration + model ready
2. US1 → Users can report content (MVP!)
3. US2 → Admins can view queue
4. US3 → Admins can dismiss
5. US4 → Admins can resolve
6. US5 → Admins can see stats
7. Polish → Lint, prettier, tests pass

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US2–US5 all modify the same routes file — route registrations are sequential within the file
- T016 (GET /stats) MUST be registered before /:id routes to avoid Express path collision
- All controllers use `next(error)` pattern — pgError middleware handles DB errors (Spec 007)
- Audit log calls (FR-016) in dismiss/resolve handlers — controllers acquire PoolClient, BEGIN transaction, call model.dismiss/resolve (passing client), then emitAudit({ client, ... }) within same transaction, COMMIT, release in finally. Matches existing roles.controller.ts + auditEmitter.ts pattern.
- contentCreationLimiter on POST only — admin GET/PATCH routes don't need it
- Commit after each task or logical group
