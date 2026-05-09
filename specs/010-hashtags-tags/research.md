# Research: Hashtags & Tags

**Feature**: Spec 010 | **Date**: 2026-05-09

## R1: Hashtag Extraction Algorithm

**Decision**: Use a word-boundary-aware regex that matches `#` followed by `[a-zA-Z0-9_]{2,50}`, excludes matches preceded by `/`, `#`, or word characters.

**Rationale**: The project stores tag names lowercase (FR-003). The extraction pipeline is: (1) extract raw matches, (2) lowercase each match, (3) validate length 2-50, (4) reject invalid matches (never truncate). The regex `/(?<![\/\w#])#([a-zA-Z0-9_]{2,50})\b/g` uses a negative lookbehind for `/` to skip URL fragments, `\w` to skip mid-word `#`, and `#` to skip `##double`/`###triple` patterns. Punctuation at the end (`#travel!`) is handled by `\b` word boundary.

**Alternatives considered**:
- Dedicated parser (e.g., nearley/chevotao): Overkill for simple hashtag extraction, adds dependency.
- Simple `/#\w+/g`: Too permissive — matches URL fragments, single-char tags, and `##double`.
- Unicode-aware extraction: Not required by spec (alphanumeric + underscore only).

## R2: Tag Search — Trigram vs LIKE Prefix

**Decision**: Use PostgreSQL `pg_trgm` GIN index with `%` (similarity) operator for tag search.

**Rationale**: The spec requires both prefix AND substring matching (FR-015). A trigram GIN index supports both natively via the `%` similarity operator, while a B-tree `text_pattern_ops` index only supports prefix (`LIKE 'query%'`). For a tag table expected to reach thousands of rows, trigram GIN provides sub-millisecond lookups for both prefix and fuzzy matches. The `pg_trgm` extension is already approved for the migration. Note: the default `pg_trgm.similarity_threshold` is 0.3, which is too aggressive for short queries (2-3 chars). The `search()` method calls `SELECT set_limit(0.1)` before the similarity query to ensure short queries still match relevant tags.

**Alternatives considered**:
- `LIKE 'query%'` with B-tree prefix index: Fast but only supports prefix, not substring.
- `LIKE '%query%'` with no index: Full table scan, unacceptable at scale.
- Full-text search (tsvector/tsquery): Designed for natural language documents, not short tag names. Poor fit for 2-50 char strings.
- `pg_trgm` with `<->` distance operator: More precise but overkill; `%` similarity is sufficient.

## R3: Trending Window Implementation

**Decision**: Use `post_tags.created_at` with a configurable interval sourced from `TAG_TRENDING_WINDOW_HOURS` env var (default 24h). Query uses `WHERE pt.created_at > NOW() - make_interval(hours => $1)`.

**Rationale**: The spec explicitly requires trending based on recent activity, not all-time post_count. The composite index `idx_post_tags_tag_created(tag_id, created_at DESC)` makes this query efficient — it only scans rows within the window, not the entire post_tags table. Using an env var allows ops to adjust the window without code changes. The `make_interval()` function accepts the hours parameter dynamically.

**Alternatives considered**:
- Materialized view refreshed periodically: Adds complexity, stale data between refreshes.
- Rolling window counter table: Over-engineered for current scale; the composite index is sufficient.
- Hardcoded `INTERVAL '24 hours'`: Less flexible, requires code change to adjust.

## R4: Concurrent Tag Creation — INSERT ON CONFLICT Pattern

**Decision**: Use CTE-based upsert: `WITH ins AS (INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING tag_id) SELECT tag_id FROM ins UNION ALL SELECT tag_id FROM tags WHERE name = $1 LIMIT 1`.

**Rationale**: Two users posting `#travel` simultaneously would both attempt `INSERT`. The `UNIQUE` constraint on `name` prevents duplicates, and `ON CONFLICT DO NOTHING` silently handles the race. The `UNION ALL` + `SELECT` fallback ensures the tag_id is always returned regardless of whether the insert succeeded or the tag already existed. This is atomic and requires no application-level locking.

**Alternatives considered**:
- Application-level `SELECT` then `INSERT`: Race condition between check and insert.
- `INSERT ... ON CONFLICT DO UPDATE SET post_count = post_count`: Unnecessary write to post_count on every lookup.
- Advisory locks: Over-engineered for this use case.

## R5: Post-Tag Reconciliation on Update (Set Difference)

**Decision**: Compute set difference on normalized lowercase tag names: (1) extract new tags from updated description, (2) fetch current tags from `post_tags` JOIN `tags`, (3) compute `toRemove = current - new`, `toAdd = new - current`, (4) if both empty, return early with zero DB writes, (5) execute deletions + insertions + counter updates in the same transaction.

**Rationale**: Set-diff reconciliation is deterministic and idempotent. The early-return when sets are identical avoids unnecessary DB writes. All counter updates (decrement for removed, increment for added) happen in the same transaction as the association changes, satisfying Article IV (transaction safety).

**Alternatives considered**:
- Delete all then re-insert: Works but causes unnecessary counter churn (decrement all, then increment all).
- Replace entire post_tags set: Same as delete-all, more I/O than diff.
- Application-level diff without set operations: More error-prone; SQL set operations are native and reliable.

## R6: Orphan Tag Cleanup Strategy

**Decision**: Hourly scheduled task using `node-cron` (already in stack via `scheduledTasks.ts`), executing `DELETE FROM tags WHERE post_count = 0`.

**Rationale**: Per-delete cleanup adds I/O to every post deletion for a low-probability event (most tags have many posts). A scheduled cleanup is cheaper and consistent with the existing pattern (token cleanup already runs hourly in `scheduledTasks.ts`). Tags with zero posts are harmless — they appear in search briefly but disappear within an hour.

**Alternatives considered**:
- Synchronous cleanup on delete: Adds latency to every delete operation.
- No cleanup at all: Tags table grows unboundedly with orphan entries.
- Trigger-based cleanup: Adds DB complexity, harder to debug and test.

## R7: Transaction Ownership — External Client Pattern

**Decision**: `TagModel.syncPostTags()` and `TagModel.decrementPostCount()` accept an optional `PoolClient` parameter. When provided, they operate within the caller's transaction. When absent, they acquire their own connection.

**Rationale**: This is the established pattern in the codebase — `AuditModel.record()`, `ReportModel.dismiss()`, and `RoleModel.create()` all accept an external client. `PostModel` methods already manage their own transactions, so passing the connection ensures tag operations are atomic with post changes (Article IV). Standalone methods (`getPostsByTag`, `getTrending`, `search`) manage their own connections since they don't need cross-model transactionality.

**Alternatives considered**:
- TagModel always manages own transaction: Would break atomicity — post insert could succeed while tag sync fails.
- Two-phase commit: Over-engineered for single-database operations.

## R8: Rate Limiting for Tag Endpoints

**Decision**: Create `tagSearchLimiter` following the existing `contentCreationLimiter` pattern — Redis-backed via `rate-limit-redis`, 30 req/min per IP, keyed by `req.ip`.

**Rationale**: Tag search and trending are public endpoints (FR-019) and thus vulnerable to abuse. 30 req/min per IP is generous for normal use but prevents scraping. The existing `limitHandler` function can be reused. Config values will be sourced from env vars following the established pattern in `config.ts`.

**Alternatives considered**:
- Reuse `contentCreationLimiter`: That's keyed by authenticated user ID, not IP — wrong for public endpoints.
- No rate limiting: Public endpoints without limiting are an open invitation for abuse.
- Stricter limit (5/min): Too restrictive for legitimate autocomplete use cases.
