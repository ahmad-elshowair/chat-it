# API Contracts: Hashtags & Tags

**Feature**: Spec 010 | **Date**: 2026-05-09

## Endpoints

### GET /api/tags/trending

Returns the top trending hashtags ranked by recent activity within a configurable time window.

**Authentication**: None required (public endpoint)
**Rate Limit**: `tagSearchLimiter` — 30 req/min per IP

**Query Parameters**:

| Param | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `limit` | `integer` | No | `20` | Min 1, max 50 |

**Success Response** (200):

```json
{
  "success": true,
  "data": [
    {
      "tag_id": "uuid",
      "name": "travel",
      "post_count": 1523,
      "recent_count": 47
    }
  ]
}
```

**Empty Result** (200):

```json
{
  "success": true,
  "data": []
}
```

**Rate Limited** (429):

```json
{
  "success": false,
  "message": "Too many requests, please try again later.",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "retry_after": 45
  }
}
```

---

### GET /api/tags/search

Search for hashtags by name using trigram similarity matching.

**Authentication**: None required (public endpoint)
**Rate Limit**: `tagSearchLimiter` — 30 req/min per IP

**Query Parameters**:

| Param | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `q` | `string` | **Yes** | — | Non-empty, max 50 chars |
| `limit` | `integer` | No | `20` | Min 1, max 50 |

**Validation Error** (400) — missing or empty `q`:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": [
    {
      "field": "q",
      "message": "Search query is required"
    }
  ]
}
```

**Success Response** (200):

```json
{
  "success": true,
  "data": [
    {
      "tag_id": "uuid",
      "name": "travel",
      "post_count": 1523
    },
    {
      "tag_id": "uuid",
      "name": "traveling",
      "post_count": 342
    }
  ]
}
```

---

### GET /api/tags/:name/posts

Returns a paginated feed of posts that have a specific tag. Returns the `IFeedPost` shape consistent with the main feed.

**Authentication**: Optional — when present, includes `is_liked` and `is_bookmarked` interaction state; when absent, defaults to `false`.
**Rate Limit**: Global limiter only (no additional tier)

**Path Parameters**:

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | `string` | **Yes** | Must match `^[a-z0-9_]{2,50}$` |

**Query Parameters**:

| Param | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `limit` | `integer` | No | `10` | Min 1, max 50 |
| `cursor` | `string` | No | — | Valid post UUID |
| `direction` | `string` | No | `next` | `next` or `previous` |

**Success Response** (200) — authenticated:

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "post_id": "uuid",
        "description": "Great trip #travel",
        "updated_at": "2026-05-09T10:00:00Z",
        "image": "url or null",
        "number_of_likes": 42,
        "number_of_comments": 7,
        "user_id": "uuid",
        "user_name": "johndoe",
        "picture": "url",
        "first_name": "John",
        "last_name": "Doe",
        "is_liked": false,
        "is_bookmarked": true,
        "tags": ["travel"]
      }
    ],
    "pagination": {
      "has_more": true,
      "next_cursor": "uuid",
      "previous_cursor": "uuid"
    }
  }
}
```

**Success Response** (200) — unauthenticated: Same shape but `is_liked` and `is_bookmarked` are always `false`.

**Tag Not Found / No Posts** (200):

```json
{
  "success": true,
  "data": {
    "data": [],
    "pagination": {
      "has_more": false,
      "next_cursor": null,
      "previous_cursor": null
    }
  }
}
```

## Cross-Cutting: Tags in Post Responses

All existing post-returning endpoints gain a `tags` field in their response shape:

| Endpoint | Change |
|----------|--------|
| `GET /api/posts/all` | Each post in response includes `tags: string[]` |
| `GET /api/posts/feed` | Each post in response includes `tags: string[]` |
| `GET /api/posts/user/:user_id` | Each post in response includes `tags: string[]` |
| `GET /api/posts/:post_id` | Post response includes `tags: string[]` |
| `GET /api/search` | Each search result includes `tags: string[]` |

**Note**: This is a display-only change (FR-016) — adding tags to the response shape. It does NOT integrate hashtag matching into FTS search (FR-020).

## Error Response Envelope

All errors follow the existing project pattern:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Optional additional context"
  }
}
```

**Common Error Codes**:

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_FAILED` | Invalid query params or tag name |
| 401 | `UNAUTHENTICATED` | Auth required but not provided (N/A for tag endpoints) |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
