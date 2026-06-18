# Quickstart: Shares & Reposts (Spec 011)

**Phase**: 1 (Design) | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

How to apply the migration, verify the schema, and smoke-test the endpoints. Run all commands from `server/`.

---

## 1. Apply the migration

```bash
cd server
npx db-migrate create shares --sql-file   # already done in plan; generates sqls/<ts>-shares-{up,down}.sql
# Fill up.sql / down.sql per data-model.md and the design doc reference SQL
npx db-migrate up
```

## 2. Verify the schema

```bash
psql -d post_it -c "\d shares"
psql -d post_it -c "\d posts"           # confirm number_of_shares INTEGER NOT NULL DEFAULT 0
psql -d post_it -c "\d+ posts" | grep chk_posts_number_of_shares
```

Confirm triggers and indexes exist:

```bash
psql -d post_it -c "SELECT tgname, tgtype, tgenabled FROM pg_trigger WHERE tgname LIKE 'trg_%share%';"
psql -d post_it -c "\di idx_shares_%"
```

Expected triggers: `trg_check_self_share`, `trg_maintain_share_count_on_insert`, `trg_maintain_share_count_on_delete`.
Expected indexes: `idx_shares_post_created`, `idx_shares_user_created` (plus the implicit `uq_share`).

## 3. Verify trigger behavior by hand

```sql
-- Self-share is blocked
INSERT INTO shares (user_id, original_post_id)
VALUES ('<your-user-id>', '<your-own-post-id>');
-- expected: ERROR 23514 "Users cannot share their own posts"

-- Counter increments/decrements via triggers (model never touches it)
SELECT number_of_shares FROM posts WHERE post_id = '<some-post>';
INSERT INTO shares (user_id, original_post_id) VALUES ('<other-user>', '<some-post>');
SELECT number_of_shares FROM posts WHERE post_id = '<some-post>';  -- +1
DELETE FROM shares WHERE user_id = '<other-user>' AND original_post_id = '<some-post>';
SELECT number_of_shares FROM posts WHERE post_id = '<some-post>';  -- back to original

-- Cascade: deleting the original post removes its shares (counter row gone with it)
-- Cascade: deleting a sharer removes their shares and decrements each affected post
```

## 4. Run lint, format, tests

```bash
pnpm run lint
pnpm run prettier:check
pnpm test          # includes new ShareModel + controller tests (task T011)
```

All must pass before merge (README Art. VI / project constitution).

## 5. Smoke-test the API (requires a running server + auth token)

```bash
# Share (simple repost)
curl -X POST http://localhost:<port>/api/shares/<post_id> \
  -H "Authorization: Bearer <token>"
# → 200 { data: { share_id, user_id, original_post_id, commentary: null, created_at } }

# Quote post
curl -X POST http://localhost:<port>/api/shares/<post_id> \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"commentary":"Must read!"}'

# Idempotent duplicate → 200 { data: { action: "already_shared" } }

# Self-share → 409

# Unshare
curl -X DELETE http://localhost:<port>/api/shares/<post_id> -H "Authorization: Bearer <token>"

# Who shared
curl "http://localhost:<port>/api/shares/post/<post_id>?limit=10" -H "Authorization: Bearer <token>"

# Is-shared
curl "http://localhost:<port>/api/shares/is-shared/<post_id>" -H "Authorization: Bearer <token>"
```

## 6. Verify feed integration

`GET /api/feed` (or the project's feed endpoint) now returns items with `type: "post" | "share"`. Confirm:
- A followed user's share appears with `shared_by_user_name`, `share_commentary`, and the embedded original post.
- `is_shared` is present on every item (no separate call needed).
- Pagination across a mixed feed does not skip or duplicate items on timestamp ties.

## 7. Confirm index usage

```sql
EXPLAIN ANALYZE
SELECT * FROM shares WHERE original_post_id = $1 ORDER BY created_at DESC LIMIT 10;
-- must use idx_shares_post_created (Index Scan), not Seq Scan

EXPLAIN ANALYZE
SELECT * FROM shares WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10;
-- must use idx_shares_user_created
```

## 8. Rollback (if needed)

```bash
npx db-migrate down     # runs down.sql: drops triggers/functions/indexes/table + column
```
