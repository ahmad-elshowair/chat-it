# Implementation Plan: System Audit Log

**Branch**: `006-system-audit-log` | **Date**: 2026-04-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-system-audit-log/spec.md`

## Summary

Build a standalone, append-only audit log that records every administrative and moderation action with full before/after snapshots, within atomic database transactions. Exposes a cursor-paginated query endpoint gated by `audit.read` RBAC permission. Designed as a reusable platform service — any future module can emit audit records by calling a single function.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js
**Primary Dependencies**: Express 4, pg 8 (node-postgres), db-migrate, express-validator, express-rate-limit
**Storage**: PostgreSQL 15+ (primary), Redis (RBAC permission cache — reused)
**Testing**: Manual verification per project standards (AGENTS.md — testing deferred)
**Target Platform**: Linux server (Node.js/Express)
**Project Type**: Web service (REST API)
**Performance Goals**: Standard web app — paginated queries return in <500ms for typical result sets
**Constraints**: Single-table design (Constitution Art. VII — max 3 tables per migration), no ORM (Art. I), cursor pagination only (Art. VIII)
**Scale/Scope**: Admin/moderator-facing — low write volume (tens of actions/day), moderate read volume during investigations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|------------|--------|-------|
| I — Raw SQL, No ORM | All DB ops via `pg` parameterized queries | ✅ PASS | Model methods use `connection.query($1, $2...)` |
| II — Migration-First | Schema via `db-migrate` with up.sql/down.sql/.js | ✅ PASS | Single migration for audit table + trigger + indexes + seed |
| III — TypeScript Strict | Strict mode, types in `types/`, interfaces in `interfaces/` | ✅ PASS | `TAuditRecord` type, `ICursorPaginationOptions` reused |
| IV — Transaction Safety | BEGIN/COMMIT/ROLLBACK, `finally` release, audit joins caller txn | ✅ PASS | FR-002/FR-003: bidirectional atomicity. Controllers manage txn for audited ops; models accept optional `PoolClient` (see analysis F-001, research R-010). |
| V — RESTful API | Standardized response envelope, REST semantics | ✅ PASS | GET /api/audit with filters, response via `sendResponse` |
| VI — Tiered Rate Limiting | Rate limits applied before route handlers | ✅ PASS | Audit endpoint uses existing `globalLimiter` |
| VII — Simplicity Gate | Max 3 tables per migration | ✅ PASS | 1 table (`audit_log`) + 1 trigger + 1 permission seed row |
| VIII — Anti-Abstraction | Use `pg` Pool directly, no repository pattern | ✅ PASS | `AuditModel` follows existing `RoleModel`/`BookmarkModel` pattern |
| IX — Backwards Compatibility | No column removals/renames on existing tables | ✅ PASS | New table only. Permission seed is additive to RBAC tables |

**Gate Result**: ✅ ALL PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/006-system-audit-log/
├── plan.md                # This file
├── research.md            # Phase 0 output
├── data-model.md          # Phase 1 output
├── quickstart.md          # Phase 1 output
├── contracts/             # Phase 1 output
│   └── audit-api.md       # API endpoint contracts
└── tasks.md               # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
server/src/
├── configs/
│   └── config.ts                        # (existing) no changes
├── controllers/
│   ├── factory.ts                       # ADD: audit_model export
│   └── audit.controller.ts             # NEW: audit query endpoint handler
├── database/
│   ├── pool.ts                          # (existing) no changes
│   └── redis.ts                         # (existing) no changes
├── interfaces/
│   └── (existing)                       # no new interfaces needed
├── middlewares/
│   ├── auth/
│   │   └── requirePermission.ts         # (existing) reused for audit.read
│   └── validations/
│       └── audit.ts                     # NEW: query param validators
├── models/
│   └── audit.ts                         # NEW: AuditModel (record + query)
├── routes/
│   ├── index.ts                         # MODIFY: mount audit routes
│   └── apis/
│       └── audit.routes.ts             # NEW: GET /api/audit
├── services/
│   ├── permissionCache.ts              # (existing) no changes
│   └── auditEmitter.ts                # NEW: standalone emit function
├── types/
│   └── audit.ts                        # NEW: TAuditRecord, TAuditQueryParams
└── utilities/
    ├── response.ts                      # (existing) no changes
    └── pagination.ts                    # (existing) reused

server/migrations/
├── <timestamp>-audit-log.js            # NEW: db-migrate runner
└── sqls/
    ├── <timestamp>-audit-log-up.sql    # NEW: table + trigger + indexes + seed
    └── <timestamp>-audit-log-down.sql  # NEW: reversal
```

**Structure Decision**: Follows existing project conventions exactly — single `server/src/` directory with model/controller/route/type/middleware layers. New files only, no structural changes.

## Complexity Tracking

> No violations to justify. Single-table design fits within all constitution constraints.
