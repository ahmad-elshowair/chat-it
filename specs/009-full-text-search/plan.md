# Implementation Plan: Full-Text Search

**Branch**: `009-full-text-search` | **Date**: 2026-05-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-full-text-search/spec.md`

## Summary

Add PostgreSQL native full-text search to the posts table using a `tsvector` column with GIN index, auto-populated via a BEFORE trigger. Expose a `GET /api/search` endpoint with websearch-style query parsing, relevance ranking, and cursor-based pagination using composite cursors.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js
**Primary Dependencies**: Express 4, pg 8 (node-postgres), db-migrate, express-validator
**Storage**: PostgreSQL 15+ (tsvector, tsquery, GIN index, plpgsql trigger)
**Testing**: Deferred per constitution — no test framework currently established
**Target Platform**: Node.js server (Linux/macOS)
**Project Type**: Web service (REST API)
**Performance Goals**: 95% of searches < 1 second for 10,000 posts, 50 concurrent requests
**Constraints**: No external search engine; pure PostgreSQL FTS; cursor-based pagination only
**Scale/Scope**: Up to 10,000 posts searchable; single search_vector column on posts table

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Full-Stack TypeScript Strictness | PASS | All new files in TypeScript strict mode; no `any` types |
| II. Security & Authentication Priority | PASS | Auth required (FR-010); parameterized queries via pg; websearch_to_tsquery prevents injection (FR-014) |
| III. Component-Driven UI & State Management | N/A | Backend-only feature |
| IV. Relational Data Integrity | PASS | Schema changes via db-migrate migration; idempotent up/down SQL (FR-019, FR-020) |
| V. Predictable RESTful API Design | PASS | GET /api/search follows REST; uses sendResponse envelope; consistent error format |
| VI. Tiered Rate Limiting | PASS | Search uses global baseline limiter; no separate tier needed for read-only search |
| VII. File Upload Validation & Content Security | N/A | No file uploads involved |
| VIII. Frontend Efficiency & Performance | PASS | Cursor-based pagination only (no COUNT); composite cursor preserves rank order |

**Post-Phase 1 Re-check**: All gates remain PASS. No violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/009-full-text-search/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: design decisions
├── data-model.md        # Phase 1: data model
├── quickstart.md        # Phase 1: setup guide
├── contracts/
│   └── search-api.md    # Phase 1: API contract
├── checklists/
│   ├── requirements.md  # Spec quality checklist
│   └── fts-requirements.md # Detailed FTS checklist
└── tasks.md             # Phase 2: task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── types/
│   │   └── search.ts                         # NEW: TSearchResult type
│   ├── models/
│   │   └── search.ts                         # NEW: SearchModel class
│   ├── controllers/
│   │   ├── search.controller.ts              # NEW: search controller
│   │   └── factory.ts                        # MODIFY: add search_model export
│   ├── routes/
│   │   ├── index.ts                          # MODIFY: import + mount search routes
│   │   └── apis/
│   │       └── search.routes.ts              # NEW: search route definitions
│   ├── middlewares/
│   │   └── validations/
│   │       └── search.ts                     # NEW: query validation
│   ├── interfaces/
│   │   └── IPost.ts                          # EXISTING: IFeedPost (no changes)
│   └── utilities/
│       └── pagination.ts                     # EXISTING: reused for pagination
├── migrations/
│   ├── XXXXXX-full-text-search.js            # NEW: db-migrate runner
│   └── sqls/
│       ├── XXXXXX-full-text-search-up.sql    # NEW: up migration
│       └── XXXXXX-full-text-search-down.sql  # NEW: down migration
└── package.json                              # EXISTING (no changes)
```

**Structure Decision**: Follows existing monorepo pattern — all server code in `server/src/`, following the established controller/model/route/validation layered architecture.

## Complexity Tracking

No constitution violations — table not applicable.
