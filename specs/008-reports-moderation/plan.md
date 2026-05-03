# Implementation Plan: Reports & Moderation

**Branch**: `008-reports-moderation` | **Date**: 2026-05-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-reports-moderation/spec.md`

## Summary

Build a user-facing content reporting system and admin moderation queue. Users can report posts, comments, or user profiles with a reason and optional description. Admins and moderators (via `requirePermission('reports.manage')`) view a paginated queue, and dismiss or resolve reports. Resolution is flag-only in V1 (no auto-delete). Duplicate reports are prevented by a `UNIQUE(reporter_id, target_type, target_id)` constraint surfacing as 409 Conflict via the pgError classifier.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js
**Primary Dependencies**: Express 4, pg 8 (node-postgres), db-migrate, express-validator, express-rate-limit
**Storage**: PostgreSQL 15+ (reports table), Redis (rate limiting — already in stack)
**Testing**: pnpm test (deferred per constitution — manual + lint gates)
**Target Platform**: Linux server (Node.js)
**Project Type**: Web service (REST API)
**Performance Goals**: Queue loads <2s with 1000+ reports (SC-003)
**Constraints**: Raw SQL only (Article I), no ORM, parameterized queries
**Scale/Scope**: Social platform — moderate report volume, admin-only moderation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Full-Stack TypeScript Strictness | ✅ Pass | All new files in TS strict mode, no `any` types |
| II. Security & Authentication Priority | ✅ Pass | `authorizeUser` on all routes, `requirePermission('reports.manage')` on admin routes, `contentCreationLimiter` on POST |
| III. Component-Driven UI & State Management | N/A | Backend-only spec |
| IV. Relational Data Integrity | ✅ Pass | `db-migrate` migration, FK constraints, `ON DELETE CASCADE/SET NULL` |
| V. Predictable RESTful API Design | ✅ Pass | RESTful endpoints under `/api/reports`, standardized response envelope via `sendResponse` |
| VI. Tiered Rate Limiting | ✅ Pass | `contentCreationLimiter` (25 req/min) on POST /api/reports |
| VII. File Upload Validation | N/A | No file uploads in this spec |
| VIII. Frontend Efficiency | N/A | Backend-only spec; pagination uses limit/offset (admin queue — not cursor-paginated feed) |

**Pre-Phase 0 Gate**: PASS — no violations, no NEEDS CLARIFICATION.

## Project Structure

### Documentation (this feature)

```text
specs/008-reports-moderation/
├── spec.md                    # Feature specification
├── plan.md                    # This file
├── research.md                # Phase 0 output
├── data-model.md              # Phase 1 output
├── quickstart.md              # Phase 1 output
├── contracts/                 # Phase 1 output
│   └── api.md                 # API endpoint contracts
├── checklists/
│   ├── requirements.md        # Specify-time quality checklist
│   └── requirements-quality.md # Checklist step quality checklist
└── tasks.md                   # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
server/
├── migrations/
│   ├── [TIMESTAMP]-reports.js
│   └── sqls/
│       ├── [TIMESTAMP]-reports-up.sql
│       └── [TIMESTAMP]-reports-down.sql
├── src/
│   ├── types/
│   │   └── report.ts                          # [NEW] TReport, TReportInput, TargetType, ReportReason, ReportStatus
│   ├── models/
│   │   └── report.ts                          # [NEW] ReportModel class
│   ├── controllers/
│   │   └── reports.controller.ts              # [NEW] 5 endpoint handlers
│   ├── routes/
│   │   ├── apis/
│   │   │   └── reports.routes.ts              # [NEW] Express route definitions
│   │   └── index.ts                           # [MODIFY] mount /reports
│   ├── middlewares/
│   │   └── auth/
│   │       └── requirePermission.ts           # [EXISTING] reused from Spec 005
│   └── utilities/
│       ├── pgError.ts                         # [EXISTING] 23505 → 409 mapping from Spec 007
│       └── response.ts                        # [EXISTING] sendResponse utility
└── tests/
    └── report.test.ts                         # [NEW] unit + integration tests
```

**Structure Decision**: Follows existing monorepo pattern — all server code under `server/src/`, matching Bookmark/Role model patterns.

## Complexity Tracking

No constitution violations — table is empty.
