# Data Model: Shares & Reposts (Spec 011)

**Phase**: 1 (Design) | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

Full schema DDL lives in the migration (`server/migrations/sqls/<timestamp>-shares-up.sql`, reference SQL in the design doc). This document describes the entities, fields, constraints, triggers, indexes, and relationships.

---

## Entities

### `shares` (NEW)

Records that a user shared another user's post at a point in time, with optional quote commentary.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `share_id` | `UUID` | PK, default `uuid_generate_v4()` | Surrogate key; also the `activity_id` for shares in feed pagination |
| `user_id` | `UUID` | NOT NULL, FK→`users(user_id)` ON DELETE CASCADE | The sharer |
| `original_post_id` | `UUID` | NOT NULL, FK→`posts(post_id)` ON DELETE CASCADE | Cannot reference another share → one-level re-share is structural |
| `commentary` | `VARCHAR(280)` | nullable | Quote commentary; >280 rejected by app validation; empty/whitespace → `NULL` |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | default `CURRENT_TIMESTAMP` | Activity time for shares in the feed |

**Table constraints**:
- `uq_share UNIQUE (user_id, original_post_id)` — one share per (user, post); backs `ON CONFLICT DO NOTHING` idempotency (FR-006).
- `fk_share_user` / `fk_share_post` — both `ON DELETE CASCADE` (FR-009).

### `posts` (MODIFIED — existing)

| New Column | Type | Constraints |
|---|---|---|
| `number_of_shares` | `INTEGER` | NOT NULL DEFAULT 0; `CHECK (number_of_shares >= 0)` |

- Default `0` makes the addition backwards-compatible (existing rows get 0; existing post views unaffected) — README Art. IX.
- The `CHECK` plus `GREATEST(0, …)` in the decrement trigger guarantees the count can never go negative (FR-007).

---

## Triggers

All trigger functions are `LANGUAGE plpgsql`. Created in `up.sql`, dropped in reverse order in `down.sql`.

### `trg_check_self_share` — BEFORE INSERT OR UPDATE (per row)

Function `check_self_share()`:
```sql
IF EXISTS (SELECT 1 FROM posts WHERE post_id = NEW.original_post_id AND user_id = NEW.user_id) THEN
  RAISE EXCEPTION 'Users cannot share their own posts' USING ERRCODE = '23514';
END IF;
```
- Enforces FR-005 at the data layer (unbypassable). A `CHECK` cannot do this (subquery required).
- Controller maps `SQLSTATE 23514` → HTTP `409`.

### `trg_maintain_share_count_on_insert` — AFTER INSERT (per row)

Function `maintain_share_count_on_insert()`:
```sql
UPDATE posts SET number_of_shares = number_of_shares + 1 WHERE post_id = NEW.original_post_id;
```
- Fires within the enclosing transaction → satisfies README Art. IV (same-tx counter update).
- Does **not** bump `posts.updated_at` (shares are separate feed items; re-floating the original would corrupt feed ordering).

### `trg_maintain_share_count_on_delete` — AFTER DELETE (per row)

Function `maintain_share_count_on_delete()`:
```sql
UPDATE posts SET number_of_shares = GREATEST(0, number_of_shares - 1) WHERE post_id = OLD.original_post_id;
```
- Fires on both manual `unshare()` and cascade deletes (user/post deletion) → no counter drift (FR-009, SC-002).

> **CRITICAL**: the model layer never issues a manual counter `UPDATE`. Doing so double-counts. See `research.md` §1 and the design doc's "Trigger vs. Model Counter" section.

---

## Indexes

| Index | Columns | Serves |
|---|---|---|
| `uq_share` (implicit from UNIQUE) | `(user_id, original_post_id)` | Idempotency lookup; also covers `user_id`-leading queries |
| `idx_shares_post_created` | `(original_post_id, created_at DESC)` | "Who shared this post" pagination (FR-013) + share-branch feed |
| `idx_shares_user_created` | `(user_id, created_at DESC)` | Profile/feed share-branch pagination |

No standalone `(created_at)` index — every share query filters by `user_id` or `original_post_id`, so the composites cover ordering.

---

## Relationships

```text
users 1 ──────── ∞ shares ∞ ──────── 1 posts
 (user_id FK)                    (original_post_id FK)
   │                                │
   │ ON DELETE CASCADE              │ ON DELETE CASCADE
   ▼                                ▼
 shares removed                  shares removed + counter
 + each post's counter            gone with the post row
 decremented (trigger)
```

- A `posts` row gains a denormalized `number_of_shares` (maintained by triggers).
- A share always points to a `posts` row, never to another share → **one-level re-sharing is structural** (FR-019).
- Feed `UNION ALL` joins `shares` → `posts` (original) + `users` (sharer) + `users` (original author); see `contracts/shares-api.md` for the projected shape.

---

## State Transitions

- **Absent** → `share()` INSERT (rowCount 1) → **Share exists** (counter +1 via trigger).
- **Share exists** → `share()` again (rowCount 0) → **Share exists** unchanged (idempotent, `already_shared`).
- **Share exists** → `unshare()` DELETE (rowCount 1) → **Absent** (counter −1 via trigger).
- **Share exists** → user/post deleted → cascade DELETE → **Absent** (counter adjusted via `AFTER DELETE` trigger; if the post itself is deleted, its counter row is gone too).
