# Tasks: API Idempotency & DB Error Handling

**Input**: Design documents from `/specs/007-api-idempotency-db-errors/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Deferred to a dedicated testing spec. This task list covers implementation + existing test pass only.

**Organization**: Tasks are grouped by user story priority (P1 first), with shared foundational work in Phases 1–2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths under `server/src/`

---

## Phase 1: Setup (Shared Types & Utilities)

**Purpose**: Create the foundational types and utilities that all user stories depend on. No existing files modified.

- [ ] T001 [P] Create PgClassifiedError and PgErrorDetail interfaces in `server/src/types/pgError.ts`
- [ ] T002 [P] Create IdempotencyRecord interface in `server/src/types/idempotency.ts`
- [ ] T003 [P] Create AppError class (status + isOperational + cause) in `server/src/utilities/appError.ts`

**Checkpoint**: All shared types ready — no existing code touched yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and infrastructure upgrades that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Create classifyPgError() function with PG code → HTTP status lookup table in `server/src/utilities/pgError.ts` (depends on T001)
- [ ] T005 Create withRetry() generic wrapper with exponential backoff (100ms, 200ms, 400ms) for PG codes 40001/40P01 in `server/src/utilities/withRetry.ts` (depends on T004)
- [ ] T006 [P] Add DB_POOL_MAX, DB_CONNECTION_TIMEOUT_MS, DB_IDLE_TIMEOUT_MS env var parsing in `server/src/configs/config.ts`
- [ ] T007 Upgrade error middleware — check AppError instanceof first, then classifyPgError for PG errors, structured logging with FR-003 fields, sanitized user messages in `server/src/middlewares/error.ts` (depends on T003, T004)
- [ ] T008 Harden pool — add connectionTimeoutMillis, idleTimeoutMillis, max from config, replace process.exit(-1) with structured error log in `server/src/database/pool.ts` (depends on T006)

**Checkpoint**: Foundation ready — error classifier, retry wrapper, hardened pool, upgraded middleware all in place. User story implementation can now begin.

---

## Phase 3: User Story 1 — Sanitized, Classified Error Responses (Priority: P1) 🎯 MVP

**Goal**: Every database error returns a safe HTTP status + sanitized message. No constraint names, table names, or SQL leak to the client. Full structured detail in server logs.

**Independent Test**: Trigger a unique constraint violation (duplicate role creation) → verify response is HTTP 409 "Resource already exists" with no raw PG text. Verify server log contains pgCode, pgConstraint, pgTable, pgDetail.

> **NOTE**: This story is fully delivered by Phase 2 foundational work (T004, T007). No additional tasks needed — the error classifier and upgraded middleware cover all endpoints automatically.

**Checkpoint**: US1 delivered — all PG errors classified and sanitized.

---

## Phase 4: User Story 2 — Race Condition Protection (Priority: P1)

**Goal**: Like, follow, and bookmark operations are atomic — no duplicate rows under concurrent requests, accurate counters.

**Independent Test**: Send 2 concurrent like requests for the same user-post pair → verify exactly 1 like row, counter +1.

### Implementation for User Story 2

- [ ] T009 [P] [US2] Replace read-then-write with INSERT ON CONFLICT DO NOTHING on INSERT path + DELETE for unlike, rowCount-driven counter update in `server/src/models/like.ts`
- [ ] T010 [P] [US2] Replace read-then-write with INSERT ON CONFLICT DO NOTHING for follow(), remove isFollowing() from write path (eliminates cross-connection bug), DELETE for unFollow() in `server/src/models/follow.ts`
- [ ] T011 [P] [US2] Replace read-then-write with INSERT ON CONFLICT DO NOTHING for toggle() INSERT path in `server/src/models/bookmark.ts`

**Checkpoint**: US2 delivered — all three models use atomic SQL, no race conditions.

---

## Phase 5: User Story 7 — Post Existence Check Bug Fix (Priority: P1)

**Goal**: Post update() and delete() actually verify the post exists before proceeding.

**Independent Test**: Call PUT/DELETE on a non-existent post ID → verify 404 response.

### Implementation for User Story 7

- [ ] T012 [US7] Fix this.checkPostExist → await this.checkPostExist(id) in update() and delete(), ensure missing post throws AppError(404) in `server/src/models/post.ts`

**Checkpoint**: US7 delivered — existence check executes correctly.

---

## Phase 6: User Story 6 — Unified Error Handling Across All Controllers (Priority: P1)

**Goal**: Every controller routes errors through the centralized middleware. No inline sendResponse.error() in catch blocks. Intentional status codes (403 BANNED, 404 not-found) preserved via AppError.

**Independent Test**: Trigger a DB error in auth registration (duplicate email) → verify response comes from error middleware (sanitized 409), not inline response.

### Implementation for User Story 6

- [ ] T013 [US6] Refactor handleAuthError to throw AppError instead of calling sendResponse.error() in `server/src/utilities/auth-helpers.ts` (depends on T003)
- [ ] T014 [US6] Refactor register, login, logout catch blocks from sendResponse.error() to next(error), convert 403 BANNED to throw new AppError("Account is suspended", 403) in `server/src/controllers/auth.controller.ts` (depends on T013)
- [ ] T015 [P] [US6] Refactor all 5 methods from sendResponse.error() to next(error), preserve 404 for comment-not-found via AppError in `server/src/controllers/comments.controller.ts` (depends on T003)
- [ ] T016 [P] [US6] Remove ad-hoc error.message.includes('duplicate key') and 'Role not found' string matching, use AppError for intentional statuses in `server/src/controllers/roles.controller.ts` (depends on T003)

**Checkpoint**: US6 delivered — all controllers unified. Zero inline error responses in catch blocks.

---

## Phase 7: User Story 3 — Idempotency Key (Priority: P2)

**Goal**: POST/PUT/PATCH endpoints accept an optional Idempotency-Key header. Duplicate requests return the cached response. Keys scoped per user/method/route.

**Independent Test**: Send a POST with Idempotency-Key → resend the same key → verify cached response returned without handler re-execution.

### Implementation for User Story 3

- [ ] T017 [US3] Create idempotency middleware — validate UUID v4, Redis SET NX EX 86400 for claim, cache response via res.json interception, fail-open on Redis down, 1MB cap, concurrent race → 409 in `server/src/middlewares/idempotency.ts` (depends on T002)

**Checkpoint**: US3 delivered — idempotency middleware functional.

---

## Phase 8: User Story 4 + 5 — Retry & Infrastructure (Priority: P2)

**Goal**: Transient DB errors auto-retry. Graceful shutdown drains connections. CORS accepts Idempotency-Key.

**Independent Test**: Send SIGTERM → verify clean shutdown within 10s, exit code 0.

### Implementation for User Stories 4 & 5

> **NOTE**: US4 (retry) is fully delivered by Phase 2 foundational work (T005). No additional tasks.

- [ ] T018 [US5] Store server handle from app.listen(), add SIGTERM/SIGINT handlers (server.close → 10s drain → pool.end → redis.quit → exit), add 'Idempotency-Key' to CORS allowedHeaders, register idempotency middleware on mutating routes in `server/src/index.ts` (depends on T008, T017)

**Checkpoint**: US4+US5 delivered — retry, shutdown, CORS, and middleware registration all complete.

---

## Phase 9: Validation

**Purpose**: Verify all changes pass linting, formatting, and existing tests.

- [ ] T019 Run `pnpm run lint && pnpm run prettier:check && pnpm test` in `server/`

> **NOTE**: Unit and integration tests for new utilities are deferred to a dedicated testing spec. This step validates existing test pass only.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — T001, T002, T003 all run in parallel
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Auto-delivered by Phase 2 — no additional work
- **Phase 4 (US2)**: Depends on Phase 2 — T009, T010, T011 run in parallel
- **Phase 5 (US7)**: Depends on Phase 2 — single task T012
- **Phase 6 (US6)**: Depends on Phase 2 — T013 first, then T014 depends on T013, T015+T016 in parallel
- **Phase 7 (US3)**: Depends on Phase 1 (T002) — single task T017
- **Phase 8 (US4+US5)**: Depends on Phase 2 (T008) + Phase 7 (T017) — single task T018
- **Phase 9 (Validation)**: Depends on all phases complete

### User Story Dependencies

- **US1 (P1)**: Delivered by foundational work — no story-specific tasks
- **US2 (P1)**: Independent after Phase 2 — models only, no cross-story deps
- **US7 (P1)**: Independent after Phase 2 — single model fix
- **US6 (P1)**: Independent after Phase 2 — controllers only, no cross-story deps
- **US3 (P2)**: Independent after Phase 1 — new middleware, no existing code deps
- **US4 (P2)**: Delivered by foundational work — no story-specific tasks
- **US5 (P2)**: Depends on Phase 2 (pool) + Phase 7 (idempotency) for full index.ts integration

### Parallel Opportunities

```text
# Phase 1 — all 3 tasks in parallel:
T001 (types/pgError.ts) || T002 (types/idempotency.ts) || T003 (utilities/appError.ts)

# Phase 2 — T006 in parallel, then T004→T005 chain, T007 waits for T003+T004:
T006 (config.ts) || T004 (pgError.ts) → T005 (withRetry.ts)
T007 (error.ts) waits for T003 + T004
T008 (pool.ts) waits for T006

# Phase 4 (US2) — all 3 model fixes in parallel:
T009 (like.ts) || T010 (follow.ts) || T011 (bookmark.ts)

# Phase 6 (US6) — T015 + T016 in parallel after T013:
T013 (auth-helpers.ts) → T014 (auth.controller.ts)
T015 (comments.controller.ts) || T016 (roles.controller.ts)
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup (3 tasks, all parallel)
2. Complete Phase 2: Foundational (5 tasks, partial parallel)
3. **US1 auto-delivered** — error classification works
4. Complete Phase 4: US2 (3 tasks, all parallel) — race conditions fixed
5. Complete Phase 5: US7 (1 task) — post bug fixed
6. Complete Phase 6: US6 (4 tasks, partial parallel) — controllers unified
7. **STOP and VALIDATE**: All P1 stories delivered — 16 tasks

### Incremental Delivery (P2 Stories)

8. Complete Phase 7: US3 (1 task) — idempotency middleware
9. Complete Phase 8: US4+US5 (1 task) — retry auto-delivered, shutdown handlers
10. Complete Phase 9: Validation (1 task) — lint + test pass

### Total: 19 tasks across 9 phases

---

## Notes

- [P] tasks = different files, no dependencies — safe to run in parallel
- [Story] label maps task to specific user story for traceability
- US1 and US4 have zero story-specific tasks — fully delivered by foundational phase
- Tests deferred to a dedicated testing spec
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
