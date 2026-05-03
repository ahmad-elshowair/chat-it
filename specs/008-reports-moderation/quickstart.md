# Quickstart: Reports & Moderation

**Date**: 2026-05-03 | **Spec**: [spec.md](./spec.md)

## Prerequisites

- PostgreSQL 15+ with `uuid-ossp` extension enabled
- Spec 005 (RBAC) deployed — `roles`, `permissions`, `user_roles` tables exist
- Spec 006 (Audit Log) deployed — `audit_log` table exists
- Spec 007 (pgError classifier) deployed — `classifyPgError` utility available

## Implementation Order

```
1. Migration (up.sql / down.sql)
2. Types (types/report.ts)
3. Model (models/report.ts)
4. Controller (controllers/reports.controller.ts)
5. Routes (routes/apis/reports.routes.ts)
6. Register routes (routes/index.ts)
7. Run migration, lint, test
```

## Files to Create

| File | Purpose |
|------|---------|
| `server/migrations/[TS]-reports.js` | db-migrate runner |
| `server/migrations/sqls/[TS]-reports-up.sql` | CREATE TABLE reports + indexes |
| `server/migrations/sqls/[TS]-reports-down.sql` | DROP TABLE + indexes |
| `server/src/types/report.ts` | TReport, TReportInput, TargetType, ReportReason, ReportStatus |
| `server/src/models/report.ts` | ReportModel: create, getById, list, dismiss, resolve, countByStatus |
| `server/src/controllers/reports.controller.ts` | 5 handlers: createReport, listReports, getReportStats, dismissReport, resolveReport |
| `server/src/routes/apis/reports.routes.ts` | Express routes with middleware |

## Files to Modify

| File | Change |
|------|--------|
| `server/src/routes/index.ts` | Import + mount `/reports` |

## Key Patterns to Follow

- **Model**: `pool.connect()` → SQL → `connection.release()` in `finally` (see `bookmark.ts`, `role.ts`)
- **Controller**: `validationResult(req)` → `sendResponse.success/error` → `next(error)` for DB errors (see `bookmarks.controller.ts`)
- **Routes**: `Router()` → `authorizeUser` + `requirePermission` + validators → controller (see `bookmarks.routes.ts`, `roles.routes.ts`)
- **Types**: Export type aliases matching DB column types (see `bookmark.ts`, `role.ts`)

## Validation Checklist

```bash
pnpx db-migrate up                    # Run migration
pnpm run lint                         # ESLint check
pnpm run prettier:check               # Formatting check
pnpm test                             # Run test suite
```
