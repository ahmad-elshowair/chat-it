# Quickstart: API Idempotency & DB Error Handling

**Branch**: `007-api-idempotency-db-errors` | **Date**: 2026-05-02

## What This Spec Does

Hardens the post-it API server with:
1. **Error classification** — PG error codes → correct HTTP status + sanitized messages
2. **Race condition fixes** — ON CONFLICT DO NOTHING for like/follow/bookmark
3. **Idempotency** — Redis-backed duplicate request protection
4. **Retry** — Automatic retry for deadlocks/serialization failures
5. **Pool hardening** — Timeouts, max connections, graceful shutdown
6. **Controller unification** — All errors flow through centralized middleware

## Files Created

| File | Purpose |
|------|---------|
| `utilities/appError.ts` | AppError class (status + isOperational) |
| `types/pgError.ts` | PgClassifiedError + PgErrorDetail types |
| `types/idempotency.ts` | IdempotencyRecord type |
| `utilities/pgError.ts` | classifyPgError() function |
| `utilities/withRetry.ts` | withRetry() exponential backoff wrapper |
| `middlewares/idempotency.ts` | Idempotency-Key middleware |

## Files Modified

| File | Change |
|------|--------|
| `middlewares/error.ts` | Integrate classifier, sanitize messages, structured logging |
| `database/pool.ts` | Add timeouts, max, remove process.exit(-1) |
| `index.ts` | CORS header, shutdown handlers, store server handle |
| `configs/config.ts` | Add pool env vars (DB_POOL_MAX, DB_CONNECTION_TIMEOUT_MS, DB_IDLE_TIMEOUT_MS) |
| `models/like.ts` | ON CONFLICT DO NOTHING on INSERT path |
| `models/follow.ts` | ON CONFLICT DO NOTHING, remove cross-connection isFollowing() |
| `models/bookmark.ts` | ON CONFLICT DO NOTHING on INSERT path |
| `models/post.ts` | Fix checkPostExist() call bug |
| `controllers/auth.controller.ts` | Replace sendResponse.error() with next(error) |
| `controllers/comments.controller.ts` | Replace sendResponse.error() with next(error) |
| `controllers/roles.controller.ts` | Remove ad-hoc string matching, use AppError |
| `utilities/auth-helpers.ts` | handleAuthError throws AppError instead of res.json() |

## How to Test

```bash
cd server
pnpm run lint && pnpm run prettier:check && pnpm test
```

## Implementation Order

1. Types first (pgError.ts, idempotency.ts) — no dependencies
2. AppError class — depends on nothing
3. classifyPgError() — depends on types
4. withRetry() — depends on classifyPgError
5. Error middleware upgrade — depends on classifyPgError + AppError
6. Pool hardening + config — independent
7. Model fixes (like, follow, bookmark, post) — depends on AppError
8. Controller refactoring — depends on AppError + upgraded middleware
9. Idempotency middleware — depends on types + Redis
10. index.ts (CORS, shutdown, idempotency registration) — depends on all above
