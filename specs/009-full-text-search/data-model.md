# Data Model: Full-Text Search

**Branch**: `009-full-text-search` | **Date**: 2026-05-04

## Entity Changes

### posts table (ALTER)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `search_vector` | `tsvector` | YES | NULL | Auto-populated by trigger; NULL until backfilled |

### New Index

| Name | Type | Column | Notes |
|------|------|--------|-------|
| `idx_posts_search` | GIN | `search_vector` | Fast FTS lookups |

### New Trigger

| Name | Timing | Event | Function |
|------|--------|-------|----------|
| `trg_posts_search_vector` | BEFORE | INSERT OR UPDATE OF description | `posts_search_vector_update()` |

### New Function

| Name | Returns | Logic |
|------|---------|-------|
| `posts_search_vector_update()` | `trigger` | `NEW.search_vector := to_tsvector('english', coalesce(NEW.description, ''))` |

## TypeScript Types

### TSearchResult (types/search.ts)

Extends `IFeedPost` for API response shape. Internal model type includes `rank: number` for sorting but must be stripped before response (FR-015).

```
TSearchResult (internal) = IFeedPost + { rank: number }
```

The controller maps `TSearchResult[]` → `IFeedPost[]` by omitting the `rank` field.

## Query Parameters

| Param | Type | Required | Validation | Default | Notes |
|-------|------|----------|------------|---------|-------|
| `q` | string | YES | min 2 chars, max 200 chars | — | Search query (FR-003, FR-009) |
| `limit` | integer | NO | 1–50 | 10 | Results per page (FR-017) |
| `cursor` | string | NO | valid composite cursor | — | Encoded `rank:post_id` (FR-005) |
| `direction` | string | NO | 'next' \| 'previous' | 'next' | Page direction |

## Cursor Format

Composite cursor encodes `(rank, post_id)` as a Base64 JSON string:

```
encode: base64(JSON.stringify({ rank: number, post_id: string }))
decode: JSON.parse(base64decode(cursor))
```

This preserves ranking order across pages without requiring stored state.

## Response Shape

Follows existing `IPaginatedResult<IFeedPost>` pattern:

```json
{
  "success": true,
  "data": [
    {
      "post_id": "uuid",
      "description": "...",
      "image": "...",
      "number_of_likes": 5,
      "number_of_comments": 3,
      "user_id": "uuid",
      "user_name": "...",
      "first_name": "...",
      "last_name": "...",
      "picture": "...",
      "is_liked": false,
      "is_bookmarked": true
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "base64...",
    "previousCursor": "base64..."
  }
}
```

No `rank` field in response (FR-015).

## SQL Query Pattern

```sql
SELECT
  p.post_id, p.description, p.image, p.number_of_likes, p.number_of_comments,
  p.created_at, p.updated_at,
  u.user_id, u.user_name, u.first_name, u.last_name, u.picture,
  l.user_id IS NOT NULL AS is_liked,
  b.user_id IS NOT NULL AS is_bookmarked,
  ts_rank(p.search_vector, websearch_to_tsquery('english', $1)) AS rank
FROM posts p
JOIN users u ON p.user_id = u.user_id
LEFT JOIN likes l ON l.post_id = p.post_id AND l.user_id = $2
LEFT JOIN bookmarks b ON b.post_id = p.post_id AND b.user_id = $2
WHERE p.search_vector @@ websearch_to_tsquery('english', $1)
  [$AND (rank, p.post_id) < ($3, $4) -- next cursor]
  [$AND (rank, p.post_id) > ($3, $4) -- previous cursor]
ORDER BY rank DESC, p.created_at DESC
LIMIT $5
```
