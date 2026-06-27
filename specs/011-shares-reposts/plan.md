# Implementation Plan: Shares & Reposts

**Branch**: `011-shares-reposts` | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-shares-reposts/spec.md`

## Summary

Add a `shares` table letting users repost another user's post (optionally with ≤280-char quote commentary), surfaced in the personal feed and profile timelines via an optimized `UNION ALL` of posts and shares, paginated by a composite cursor. The denormalized `posts.number_of_shares` counter is maintained exclusively by `AFTER INSERT/DELETE` triggers (not application code) so it cannot drift during cascade deletions or concurrent shares. Self-share is blocked by a `BEFORE INSERT` trigger; a `CHECK` keeps the counter ≥ 0. Notifications to the original poster are deferred to Spec 013.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 18+, Express 4
**Primary Dependencies**: pg 8 (node-postgres), db-migrate, express-validator, express-rate-limit, rate-limit-redis, Redis, jsonwebtoken, bcryptjs
**Storage**: PostgreSQL 15+ (primary), Redis (rate-limit counters — reused)
**Testing**: Project test gate (per `AGENTS.md`: `pnpm test`); every share model/controller method gets a corresponding test (Spec 011 task T011). Manual verification via `psql` + `EXPLAIN ANALYZE`.
**Target Platform**: Linux server (Node.js REST API)
**Project Type**: web-service (REST API; client integration out of scope for this spec)
**Performance Goals**: unified feed p95 ≤ +50ms over the posts-only feed (SC-007); share creation < 3s (SC-001); 100 concurrent shares of one post → exact count of 100 (SC-005)
**Constraints**: ≤3 tables per migration (README Art. VII); cursor/keyset pagination only, no `SELECT COUNT(*)` (Principle VIII); parameterized SQL only (Art. I)
**Scale/Scope**: 1 new table (`shares`) + 1 column on `posts` (`number_of_shares`) + 3 trigger functions + 2 composite indexes; 4 API endpoints; modifications to 2 existing models (`post.ts` feed/userPosts, `factory.ts`) and 2 route files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Source | Principle | Status | Notes |
|---|---|---|---|
| README Art. I | Raw SQL, no ORM | ✅ Pass | Parameterized SQL via `pg`; no query builders |
| README Art. II | Migration-First | ✅ Pass | `db-migrate` up.sql/down.sql, idempotent (`IF NOT EXISTS`) |
| README Art. III | TypeScript Strict | ✅ Pass | All new files strict; types in `types/share.ts` |
| README Art. IV | Transaction Safety | ✅ Pass (justified) | `share()`/`unshare()` use `BEGIN/COMMIT/ROLLBACK` + `finally` release. Counter maintained by triggers that fire **within the enclosing transaction** → satisfies "denormalized counters MUST be updated within the same transaction". See `research.md` §1 |
| README Art. V | Code Style | ✅ Pass | Prettier/ESLint/JSDoc conventions; no `any`, no `?.!`, unused params `_`-prefixed |
| README Art. VI | Testing Gates | ✅ Pass | Per-method tests (task T011); `pnpm run lint && prettier:check && test` before merge |
| README Art. VII | Simplicity (≤3 tables) | ✅ Pass | 1 new table + 1 column addition |
| README Art. VIII | Anti-Abstraction | ✅ Pass | `pg` Pool directly; plain model classes following `UserModel`/`PostModel` |
| README Art. IX | Backwards Compat | ✅ Pass | `number_of_shares INTEGER NOT NULL DEFAULT 0`; no existing column removed/renamed |
| Principle IV | Relational Data Integrity | ✅ Pass | FK cascades both directions; parameterized queries; no DB structure leaked to client |
| Principle V | RESTful API | ✅ Pass | GET/POST/DELETE under `/api/shares`; standardized response envelope |
| Principle VI | Tiered Rate Limiting | ✅ Pass | Reuses `contentCreationLimiter` (25 req/min/authenticated user) on `POST` |
| Principle VIII | Frontend Efficiency | ✅ Pass | Composite cursor (keyset) pagination; no `COUNT(*)`; `is_shared` projected in-feed to prevent N+1 (FR-021) |

**Gate result**: All gates pass. No violations to justify → Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/011-shares-reposts/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — design decisions & rationale
├── data-model.md        # Phase 1 — schema, triggers, indexes, relationships
├── quickstart.md        # Phase 1 — migration + verification commands
├── contracts/
│   └── shares-api.md    # Phase 1 — API contracts (4 endpoints)
├── checklists/
│   ├── requirements.md  # Spec-writing quality gate (specify step)
│   └── backend.md       # Backend requirements-quality checklist (checklist step)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
server/
├── migrations/sqls/
│   ├── <timestamp>-shares-up.sql         # NEW — table, column, triggers, indexes
│   └── <timestamp>-shares-down.sql       # NEW — reverse
└── src/
    ├── types/share.ts                    # NEW — TShare
    ├── interfaces/IPost.ts               # MODIFY — extend IFeedPost (type, share_*, activity_at, is_shared, number_of_shares)
    ├── models/share.ts                   # NEW — share/unshare/getSharesByPostId/isShared
    ├── models/post.ts                    # MODIFY — feed() + userPosts() UNION ALL + composite cursor + is_shared
    ├── controllers/shares.controller.ts  # NEW — maps SQLSTATE 23514 → 422 (classifyPgError)
    ├── controllers/factory.ts            # MODIFY — instantiate + export share_model
    ├── routes/apis/shares.routes.ts      # NEW — mount auth/idempotency/rate-limit/validation
    ├── routes/index.ts                   # MODIFY — routes.use('/shares', shares)
    └── middlewares/validations/shares.ts # NEW — express-validator (commentary ≤ 280)
```

**Structure Decision**: Single-server monolith (`server/src`) following the existing domain layout. All new files mirror the established patterns from `likes`/`bookmarks`/`tags`. No new top-level directories. Client changes are out of scope (backend-only spec).

## Complexity Tracking

> Omitted — Constitution Check has no violations requiring justification.
