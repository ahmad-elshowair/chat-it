# Implementation Plan: API Idempotency & DB Error Handling

**Branch**: `007-api-idempotency-db-errors` | **Date**: 2026-05-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-api-idempotency-db-errors/spec.md`

## Summary

Harden the post-it API against duplicate mutations, race conditions, and unclassified database errors. This is a cross-cutting infrastructure spec that introduces a PostgreSQL error classifier, automatic retry for transient errors, Redis-backed idempotency, and unified error handling across all controllers — with no new database tables.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Express 4, pg 8 (node-postgres), ioredis (already installed), express-rate-limit (already installed)
**Storage**: PostgreSQL 15+ (primary), Redis (idempotency + rate limiting)
**Testing**: Manual verification + pnpm test (existing test suite)
**Target Platform**: Node.js server (Linux/macOS)
**Project Type**: Web service (REST API)
**Performance Goals**: Idempotency middleware < 10ms p99 latency per Redis op
**Constraints**: No new database tables (Article VII), raw SQL only (Article I), TypeScript strict (Article III)
**Scale/Scope**: 6 new files, 12 modified files, 0 database migrations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Full-Stack TypeScript Strictness | ✅ PASS | All new code in strict TypeScript. AppError class + PgClassifiedError interface + withRetry generic. No `any` types. |
| II. Security & Authentication Priority | ✅ PASS | Error sanitization prevents PG internal leaks (constraint names, table names, SQL). Idempotency scoped to authenticated user_id. CORS updated for new header. |
| III. Component-Driven UI & State Management | N/A | Server-only changes. No frontend modifications in this spec. |
| IV. Relational Data Integrity | ✅ PASS | No schema changes. ON CONFLICT DO NOTHING leverages existing UNIQUE constraints from Spec 003. Counter updates remain transactional (Article IV). No new migrations. |
| V. Predictable RESTful API Design | ✅ PASS | Error responses use existing standardized envelope (`{ success, status, message }`). Idempotency follows standard header convention. |
| VI. Tiered Rate Limiting | N/A | No rate limit changes. Idempotency is complementary, not a replacement. |
| VII. File Upload Validation | N/A | No file upload changes. |
| VIII. Frontend Efficiency & Performance | N/A | Server-only changes. |

**Post-Phase 1 Re-check**: All gates still pass. No violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/007-api-idempotency-db-errors/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── error-and-idempotency.md
├── checklists/
│   └── api.md           # Requirements quality checklist (48 items)
├── spec.md              # Feature specification (28 FRs)
└── tasks.md             # Phase 2 output (pending /speckit.tasks)
```

### Source Code (server/src/)

```text
server/src/
├── configs/
│   └── config.ts              # [MODIFY] Add pool env vars
├── controllers/
│   ├── auth.controller.ts     # [MODIFY] Replace sendResponse.error → next(error)
│   ├── comments.controller.ts # [MODIFY] Replace sendResponse.error → next(error)
│   └── roles.controller.ts    # [MODIFY] Remove string matching, use AppError
├── database/
│   ├── pool.ts                # [MODIFY] Timeouts, max, remove process.exit(-1)
│   └── redis.ts               # [NO CHANGE] Already configured
├── interfaces/
│   └── IError.ts              # [NO CHANGE] Backwards compatible
├── middlewares/
│   ├── error.ts               # [MODIFY] Integrate classifier + AppError
│   └── idempotency.ts         # [NEW] Idempotency-Key middleware
├── models/
│   ├── bookmark.ts            # [MODIFY] ON CONFLICT DO NOTHING
│   ├── follow.ts              # [MODIFY] ON CONFLICT DO NOTHING, remove isFollowing from write path
│   ├── like.ts                # [MODIFY] ON CONFLICT DO NOTHING on INSERT path
│   └── post.ts                # [MODIFY] Fix checkPostExist() call bug
├── types/
│   ├── idempotency.ts         # [NEW] IdempotencyRecord type
│   └── pgError.ts             # [NEW] PgClassifiedError + PgErrorDetail types
├── utilities/
│   ├── appError.ts            # [NEW] AppError class
│   ├── auth-helpers.ts        # [MODIFY] handleAuthError throws AppError
│   ├── pgError.ts             # [NEW] classifyPgError() function
│   └── withRetry.ts           # [NEW] Retry wrapper with exponential backoff
└── index.ts                   # [MODIFY] CORS, shutdown handlers, server handle
```

**Structure Decision**: All new code follows the existing directory convention — types in `types/`, utilities in `utilities/`, middleware in `middlewares/`. No new directories created.

## Implementation Phases

### Phase 1 — Foundation Types & Utilities (no existing code changes)

| # | File | Action | Dependencies | FR |
|---|------|--------|--------------|----|
| 1 | `types/pgError.ts` | CREATE | — | FR-001 |
| 2 | `types/idempotency.ts` | CREATE | — | FR-006 |
| 3 | `utilities/appError.ts` | CREATE | — | FR-018 |
| 4 | `utilities/pgError.ts` | CREATE | types/pgError.ts | FR-001, FR-002 |
| 5 | `utilities/withRetry.ts` | CREATE | utilities/pgError.ts | FR-008 |

### Phase 2 — Error Middleware & Pool Hardening

| # | File | Action | Dependencies | FR |
|---|------|--------|--------------|----|
| 6 | `configs/config.ts` | MODIFY | — | FR-009 |
| 7 | `middlewares/error.ts` | MODIFY | appError, pgError | FR-001–003, FR-018 |
| 8 | `database/pool.ts` | MODIFY | config.ts | FR-009, FR-011 |

### Phase 3 — Model Race Condition Fixes

| # | File | Action | Dependencies | FR |
|---|------|--------|--------------|----|
| 9 | `models/like.ts` | MODIFY | appError | FR-004, FR-005, FR-017 |
| 10 | `models/follow.ts` | MODIFY | appError | FR-004, FR-005 |
| 11 | `models/bookmark.ts` | MODIFY | appError | FR-004, FR-005, FR-017 |
| 12 | `models/post.ts` | MODIFY | appError | FR-014 |

### Phase 4 — Controller Error Handling Unification

| # | File | Action | Dependencies | FR |
|---|------|--------|--------------|----|
| 13 | `utilities/auth-helpers.ts` | MODIFY | appError | FR-012 |
| 14 | `controllers/auth.controller.ts` | MODIFY | appError, auth-helpers | FR-012, FR-013 |
| 15 | `controllers/comments.controller.ts` | MODIFY | appError | FR-012, FR-013 |
| 16 | `controllers/roles.controller.ts` | MODIFY | appError | FR-012, FR-013 |

### Phase 5 — Idempotency & Infrastructure

| # | File | Action | Dependencies | FR |
|---|------|--------|--------------|----|
| 17 | `middlewares/idempotency.ts` | CREATE | types/idempotency, redis | FR-006, FR-007, FR-019–024 |
| 18 | `index.ts` | MODIFY | pool, redis, idempotency, server | FR-010, FR-015, FR-022 |

### Phase 6 — Validation

| # | Action | Validates |
|---|--------|-----------|
| 19 | Run `pnpm run lint && pnpm run prettier:check && pnpm test` | SC-006 |

> **Note**: Unit and integration tests for the new utilities (classifyPgError, withRetry, idempotency middleware, error middleware, model race conditions, controller error flow) are deferred to a dedicated testing spec. This spec focuses on implementation + existing test pass.

## Key Design Decisions

1. **AppError is a class in `utilities/`, not `types/`** — it contains constructor logic, not just type definitions. The error middleware uses `instanceof` for runtime checking.

2. **IError is NOT modified** — backwards compatibility preserved. Error middleware checks AppError first, PG errors second, IError third.

3. **handleAuthError is refactored, handleInvalidToken is NOT** — `handleInvalidToken` returns intentional 401/403 for auth validation (not database errors). It stays as a direct response. `handleAuthError` catches database errors and must flow through the error middleware.

4. **Like model keeps the post existence check** — the current SELECT+JOIN validates the post_id FK. ON CONFLICT DO NOTHING is added to the INSERT path only. The post check prevents creating likes for non-existent posts.

5. **Follow model drops isFollowing() from the write path** — the entire cross-connection bug is eliminated by using ON CONFLICT DO NOTHING. The `isFollowing()` method is kept for GET endpoints (checking follow status) but removed from `follow()` and `unFollow()`.

6. **Idempotency middleware is registered per-route, not globally** — only POST/PUT/PATCH routes that create resources get the middleware. GET/DELETE routes are excluded at the routing level, not filtered in the middleware.

## Complexity Tracking

> No constitution violations. No complexity justifications needed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| (none) | — | — |
