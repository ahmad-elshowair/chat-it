# Research: Shares & Reposts (Spec 011)

**Phase**: 0 (Planning Research) | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

Resolves all design decisions for Spec 011. The feature spec was thorough, so no `NEEDS CLARIFICATION` markers remain — this document records *why* each mechanism was chosen over its alternatives, with cross-references to the constitution and the existing codebase.

---

## 1. Counter maintenance: DB triggers vs application-managed (like.ts/bookmark.ts pattern)

**Decision**: `posts.number_of_shares` is maintained **exclusively** by `AFTER INSERT` and `AFTER DELETE` triggers on `shares`. The `share()`/`unshare()` model methods MUST NOT also update the counter.

**Rationale**:
- **Cascade safety** — `shares.user_id` and `shares.original_post_id` both `ON DELETE CASCADE`. When a user is deleted, their shares are removed by the DB *without going through the model*. Application-managed counters (the `like.ts`/`bookmark.ts` pattern) would go stale on cascade. The `AFTER DELETE` trigger fires on cascade too, so the counter stays correct (FR-007/009).
- **Concurrency** — triggers perform an atomic `number_of_shares = number_of_shares + 1` on the post row; no lost updates under concurrent shares (FR-008, SC-005).
- **Article IV compliance** — triggers execute within the enclosing transaction, so "denormalized counters MUST be updated within the same transaction as the data change" is satisfied even though the model does not issue the `UPDATE` itself.

**Alternatives considered**:
- *Application-managed (like `like.ts:81-89`)* — rejected: drifts on user/post cascade deletion; would require a separate reconciliation job.
- *Periodic recount job* — rejected: counter is eventually-consistent, violating SC-002 ("always accurate").

**Footgun documented**: copying the `like.ts`/`bookmark.ts` pattern here causes double-counting (+1 INSERT + +1 trigger). Called out in the design doc's "Trigger vs. Model Counter" section and task T005.

---

## 2. Self-share prevention: BEFORE INSERT trigger vs CHECK vs app-only

**Decision**: `BEFORE INSERT` trigger that joins `posts` and raises `SQLSTATE 23514` when `shares.user_id = posts.user_id` of the original post. (Shares are immutable — no UPDATE path — so INSERT-only is sufficient.)

**Rationale**:
- A `CHECK` constraint **cannot** express this — it would need a subquery against `posts` to read the author, which `CHECK` forbids.
- App-only enforcement is bypassable by any other client/code path; FR-005 demands unbypassable data-layer enforcement.
- The project already uses triggers (e.g., `trg_tags_updated_at` in the hashtags migration), so this is a familiar pattern.

**Alternatives considered**:
- *CHECK constraint* — rejected: cannot subquery.
- *App-only guard* — rejected: bypassable; violates FR-005.
- *Stored procedure for share()* — rejected: over-engineered; trigger + parameterized INSERT is simpler (Art. VIII).

The controller maps `SQLSTATE 23514` → HTTP `409` (conflict). `23505` (unique violation) cannot surface because `INSERT ... ON CONFLICT DO NOTHING` swallows it.

---

## 3. Idempotency: ON CONFLICT DO NOTHING + rowCount-driven response

**Decision**: `share()` runs `INSERT ... ON CONFLICT (user_id, original_post_id) DO NOTHING`. The response keys off `rowCount`:
- `rowCount = 1` → new share created → return the created `TShare` (FR-022). The insert trigger incremented the counter.
- `rowCount = 0` → already shared (idempotent) → return `200` with an `already_shared` indicator, no counter change (FR-023). The trigger did not fire (no row inserted).

`unshare()` runs `DELETE ... WHERE user_id AND original_post_id`; counter decrement happens via the `AFTER DELETE` trigger only when `rowCount = 1`.

**Rationale**: mirrors the proven concurrency-safe pattern in `like.ts:69-89` and `bookmark.ts:90-105` (`ON CONFLICT DO NOTHING` + `rowCount` delta), adapted so the *trigger* owns the delta.

**Alternatives considered**:
- *Toggle endpoint (single POST)* — rejected: cannot cleanly accept optional commentary on re-share; separate POST/DELETE chosen (clarify Q3).
- *Pre-check SELECT then INSERT* — rejected: race-prone (TOCTOU).

---

## 4. Unified feed: UNION ALL with pushed-down LIMIT

**Decision**: `feed()` and `userPosts()` become a `UNION ALL` of two branches (original posts, shares), each pre-filtered to the follow graph / profile user and pre-limited to `$limit` before the outer `ORDER BY ... LIMIT $limit`. Reference SQL is in the design doc's "Full Feed Query (Reference)" and `data-model.md`.

**Rationale**:
- `UNION ALL` (not `UNION`) skips the dedup sort.
- Pushed-down `LIMIT` means the outer sort handles at most `2 × $limit` rows → meets SC-007 (≤ +50ms p95).
- `index()` (global discovery) excludes shares (FR-016).

**Alternatives considered**:
- *Single query with LEFT JOIN shares* — rejected: can't interleave shares as distinct feed items with their own attribution.
- *Application-side merge of two queries* — rejected: breaks cursor pagination and doubles round-trips.

---

## 5. Pagination: composite cursor with tie-breaker

**Decision**: opaque cursor = `base64("${activity_at_iso8601}|${activity_id}")`, where `activity_id` is `post_id` for original posts and `share_id` for shares. Sort: `ORDER BY activity_at DESC, activity_id DESC`. Cursor filter applied **inside each branch** (not on the union) so composite indexes stay usable.

**Rationale**:
- A single timestamp key is non-unique across two streams → skipped/duplicated rows on ties (Principle VIII demands correct keyset pagination).
- `activity_id` is a deterministic, unique tie-breaker (existing `post.ts:437` already uses `…, post_id DESC`).
- In-branch filtering lets each branch use its composite index `(user_id, created_at DESC)` / `(original_post_id, created_at DESC)`.

**Alternatives considered**:
- *Offset pagination* — rejected: violates Principle VIII; slow on deep pages.
- *Two independent cursors (one per stream)* — rejected: client complexity; can't merge deterministically.

---

## 6. `is_shared` projected in-feed (FR-021)

**Decision**: both feed branches project `is_shared` via a correlated `EXISTS (SELECT 1 FROM shares sh WHERE sh.original_post_id = p.post_id AND sh.user_id = $1)`, alongside `is_liked` and `is_bookmarked`.

**Rationale**: prevents the frontend from issuing an `is-shared` call per post (N+1). `EXISTS` (not `LEFT JOIN`) avoids join fan-out inside the `UNION ALL`. The dedicated `GET /api/shares/is-shared/:post_id` endpoint remains for single-post views (N=1, acceptable).

---

## 7. Indexing strategy

**Decision**: two composite indexes — `idx_shares_user_created (user_id, created_at DESC)` and `idx_shares_post_created (original_post_id, created_at DESC)`. No standalone `(created_at)` index.

**Rationale**:
- Every share query filters by `user_id` (profile/feed) or `original_post_id` (who-shared), then sorts by `created_at` → the composites cover both.
- The `UNIQUE(user_id, original_post_id)` index already leads with `user_id`, so a separate single-column `(user_id)` index is redundant (removed in the design-doc review).

---

## 8. One-level re-sharing: structural enforcement

**Decision**: no application-level depth check. `shares.original_post_id` references `posts.post_id` only — a share can never reference another share.

**Rationale**: the schema itself makes "share a share" impossible; FR-019 is structurally enforced, not app-enforced. The client extracts the original `post_id` from any share card to perform a repost.

---

## 9. Commentary handling

**Decision**: `commentary VARCHAR(280)` nullable. Application validation (express-validator) rejects > 280 chars before any DB write (FR-003); empty/whitespace-only commentary is normalized to `NULL` (simple repost, FR-004). The `VARCHAR(280)` column is a defense-in-depth backstop, not the primary enforcement.

**Rationale**: validation at the app layer gives friendly 400 errors; the DB constraint prevents pathological writes. `280` is inclusive.
