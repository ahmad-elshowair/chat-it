# Research: Reports & Moderation

**Date**: 2026-05-03 | **Spec**: [spec.md](./spec.md)

## R1: Polymorphic Target Validation Strategy

**Decision**: Application-level existence check per target_type before INSERT.

**Rationale**: PostgreSQL CHECK constraints cannot reference other tables. A trigger-based FK approach (inserting into a polymorphic targets table) adds schema complexity for a single feature. The controller validates target existence by querying the appropriate table based on `target_type` before calling the model.

**Alternatives considered**:
- DB triggers checking existence per table — rejected: complex, harder to test, couples report logic to schema
- No validation (allow orphan reports) — rejected: spec requires FR-006, confusing UX
- Unified targets materialized view — rejected: over-engineering for V1

## R2: Duplicate Report Prevention

**Decision**: `UNIQUE(reporter_id, target_type, target_id)` database constraint. The pgError classifier (Spec 007) maps `23505 unique_violation` → HTTP 409 Conflict. No additional idempotency middleware.

**Rationale**: The UNIQUE constraint is the single source of truth. The pgError classifier already handles 23505 → 409 mapping. Adding idempotency middleware (Redis-based, from Spec 007) would duplicate protection without adding value — reports are not financial transactions.

**Alternatives considered**:
- Application-level check-then-insert — rejected: race condition between check and insert
- Idempotency middleware — rejected: unnecessary overhead, 23505 already mapped to 409
- ON CONFLICT DO NOTHING (silent) — rejected: user needs explicit 409 feedback

## R3: Self-Report Prevention

**Decision**: Application-level check in the controller. For posts/comments, verify `reporter_id != post.user_id` (or `comment.user_id`). For user target_type, verify `reporter_id != target_id`. Return 403 Forbidden.

**Rationale**: Cannot be enforced at DB level because it requires cross-row/cross-table lookups. The controller already fetches the target for existence validation (FR-006) — the owner check adds negligible overhead.

**Alternatives considered**:
- DB trigger with plpgsql — rejected: business logic belongs in application layer per project conventions
- No prevention — rejected: spec requires FR-005

## R4: Pagination Strategy for Moderation Queue

**Decision**: Limit/offset pagination with defaults (limit=20, max=100). Ordered by `created_at DESC`.

**Rationale**: The moderation queue is an admin-only endpoint with moderate volume. Cursor pagination (required for feeds per Constitution VIII) is not mandated here because this is not a user-facing feed. Offset pagination is simpler, supports jumping to arbitrary pages, and the index on `created_at DESC` keeps it efficient at scale.

**Alternatives considered**:
- Cursor/keyset pagination — rejected: admin queue doesn't need infinite scroll; offset supports page jumping for review workflows
- No pagination — rejected: unbounded result sets at 1000+ reports

## R5: Rate Limiting for Report Creation

**Decision**: Apply `contentCreationLimiter` (25 req/min per authenticated user) from existing middleware stack.

**Rationale**: The project already has a `contentCreationLimiter` tier (Constitution VI: 25 requests per minute for posts, comments, likes). Reports are semantically identical — user-generated content creation. Reusing the existing limiter avoids configuration drift.

**Alternatives considered**:
- Dedicated report limiter — rejected: no justification for different threshold
- No rate limiting — rejected: abuse vector (mass reporting to flood admin queue)

## R6: Model Pattern — Follow Existing BookmarkModel/RoleModel

**Decision**: Class-based model with `pool.connect()`, parameterized SQL, `connection.release()` in `finally`, transactions for writes. Follow factory pattern (`report_model` export).

**Rationale**: All existing models (BookmarkModel, RoleModel, etc.) follow this pattern. Constitution Article I mandates raw SQL via pg, Article IV mandates transactions for multi-table writes. The factory pattern in `controllers/factory.ts` provides singleton instances.

**Alternatives considered**:
- Standalone functions — rejected: inconsistent with codebase
- Query builder — rejected: Constitution Article I forbids it

## R7: Audit Log Integration

**Decision**: Call `AuditModel.create()` from the controller after dismiss/resolve operations, within the same transaction.

**Rationale**: Spec 006 (audit log) is already implemented with `AuditModel.create(action, performedBy, entityType, entityId, changes)`. FR-016 requires logging all moderation actions. The controller can invoke this within the same `pool.connect()` transaction to ensure atomicity.

**Alternatives considered**:
- Database trigger — rejected: business logic in application layer is the project convention
- Separate service — rejected: adds complexity, same-transaction guarantee is simpler
