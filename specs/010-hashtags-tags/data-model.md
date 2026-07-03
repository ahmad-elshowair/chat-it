# Data Model: Hashtags & Tags

**Feature**: Spec 010 | **Date**: 2026-05-09

## Entity Relationship Diagram

```text
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      posts       │       │    post_tags     │       │       tags       │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ post_id (PK)     │◄──────│ post_id (FK)     │──────►│ tag_id (PK)      │
│ user_id (FK)     │       │ tag_id (FK)      │       │ name (UNIQUE)    │
│ description      │       │ post_tag_id (PK) │       │ post_count       │
│ image            │       │ created_at       │       │ created_at       │
│ number_of_likes  │       └──────────────────┘       │ updated_at       │
│ number_of_comments│                                 └──────────────────┘
│ updated_at       │
│ search_vector    │  (from spec 009)
└──────────────────┘

Relationship: posts ←→ tags = many-to-many via post_tags
```

## Tables

### `tags`

Stores unique hashtag names with a denormalized post count.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `tag_id` | `UUID` | `PRIMARY KEY` | `uuid_generate_v4()` | Surrogate key |
| `name` | `VARCHAR(50)` | `NOT NULL, UNIQUE` | — | Lowercase only, enforced by `chk_tags_name` |
| `post_count` | `INTEGER` | `NOT NULL` | `0` | Denormalized counter; `chk_tags_post_count >= 0` |
| `created_at` | `TIMESTAMPTZ` | — | `CURRENT_TIMESTAMP` | Row creation time |
| `updated_at` | `TIMESTAMPTZ` | — | `CURRENT_TIMESTAMP` | Auto-updated via trigger |

**Constraints**:
- `chk_tags_name`: `CHECK (name ~ '^[a-z0-9_]{2,50}$')` — enforces lowercase alphanumeric + underscore, 2-50 chars inclusive
- `chk_tags_post_count`: `CHECK (post_count >= 0)` — prevents negative counters

**Indexes**:
- `tags_pkey` on `tag_id` (implicit PK)
- `tags_name_key` on `name` (implicit UNIQUE)
- `idx_tags_post_count` on `post_count DESC` — for badge/display queries
- `idx_tags_name_trgm` on `name` using `gin(name gin_trgm_ops)` — for trigram tag search

**Triggers**:
- `trg_tags_updated_at`: `BEFORE UPDATE` → `update_updated_at_column()` — auto-updates `updated_at`

**State Transitions**: None — tags are created, linked, and eventually cleaned up. No lifecycle states.

### `post_tags`

Junction table linking posts to tags (many-to-many).

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `post_tag_id` | `UUID` | `PRIMARY KEY` | `uuid_generate_v4()` | Surrogate key |
| `post_id` | `UUID` | `NOT NULL, FK → posts(post_id) ON DELETE CASCADE` | — | Cascade deletes junction when post is deleted |
| `tag_id` | `UUID` | `NOT NULL, FK → tags(tag_id) ON DELETE CASCADE` | — | Cascade deletes junction when tag is deleted |
| `created_at` | `TIMESTAMPTZ` | — | `CURRENT_TIMESTAMP` | **Authoritative timestamp for trending calculations** |

**Constraints**:
- `uq_post_tag`: `UNIQUE (post_id, tag_id)` — prevents duplicate associations

**Indexes**:
- `post_tags_pkey` on `post_tag_id` (implicit PK)
- `idx_post_tags_post_id` on `post_id` — for looking up tags by post
- `idx_post_tags_tag_id` on `tag_id` — for looking up posts by tag
- `idx_post_tags_tag_created` on `(tag_id, created_at DESC)` — composite for trending window query

## Modified Entities

### `IFeedPost` (interface — `interfaces/IPost.ts`)

Add field:

| Field | Type | Notes |
|-------|------|-------|
| `tags` | `string[]` | Tag names associated with the post; included in all post-returning endpoints |

**Affected queries**: `PostModel.index()`, `PostModel.feed()`, `PostModel.userPosts()`, `PostModel.fetchPostById()`, `SearchModel.search()` — each gains a correlated subquery:
```sql
(
  SELECT COALESCE(json_agg(t.name), '[]'::json)
  FROM post_tags pt
  JOIN tags t ON t.tag_id = pt.tag_id
  WHERE pt.post_id = p.post_id
) AS tags
```

## Validation Rules

| Rule | Layer | Enforcement |
|------|-------|-------------|
| Tag name: lowercase alphanumeric + underscore, 2-50 chars | App + DB | `extractHashtags` normalizes to lowercase, validates length; `chk_tags_name` DB constraint is defense-in-depth |
| Max 10 tags per post | App | `extractHashtags` slices to first 10 before calling `syncPostTags` |
| Tag name > 50 chars | App | Rejected during extraction — never truncated |
| No duplicate tags per post | DB | `uq_post_tag (post_id, tag_id)` constraint |
| post_count >= 0 | DB | `chk_tags_post_count` constraint |
| Search query non-empty | App | `express-validator` in `middlewares/validations/tags.ts` |

## Counter Maintenance

| Operation | post_count Change | Transaction Scope |
|-----------|-------------------|-------------------|
| Tag added to post | `+1` per new tag | Same transaction as `post_tags` INSERT |
| Tag removed from post | `-1` per removed tag | Same transaction as `post_tags` DELETE |
| Post deleted | `-1` per associated tag | Same transaction as post DELETE; CASCADE handles `post_tags` rows |
| Orphan cleanup (hourly) | N/A — tag is deleted | Separate scheduled task |

## Data Volume Estimates

| Entity | Expected Growth | Notes |
|--------|----------------|-------|
| `tags` | ~1,000-10,000 rows | Unique hashtags across all posts; grows slowly |
| `post_tags` | ~10-50x posts | Average 3-5 tags per post; grows with posts |
| Trending query scan | ~24h window only | Composite index `idx_post_tags_tag_created` limits scan |
