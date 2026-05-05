# API Contract: Search

**Branch**: `009-full-text-search` | **Date**: 2026-05-04

## Endpoint

### Search Posts

`GET /api/search`

**Authentication**: Required (Bearer token)

**Rate Limiting**: Global baseline (150 req/min per IP)

**Query Parameters**:

| Param | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| `q` | string | YES | min 2 chars, max 200 chars | — |
| `limit` | integer | NO | 1–50 | 10 |
| `cursor` | string | NO | valid Base64 cursor | — |
| `direction` | string | NO | 'next' \| 'previous' | 'next' |

**Success Response** (200):

```json
{
  "success": true,
  "data": [IFeedPost],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJyYW5rIjowLjAx...",
    "previousCursor": "eyJyYW5rIjowLjAy..."
  }
}
```

**Empty Results** (200):

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "hasMore": false
  }
}
```

**Validation Errors** (400):

```json
{
  "success": false,
  "message": "validation error",
  "errors": [
    {
      "type": "field",
      "msg": "Query must be at least 2 characters",
      "param": "q",
      "location": "query"
    }
  ]
}
```

**Invalid Cursor** (400):

```json
{
  "success": false,
  "message": "Invalid cursor: referenced post not found"
}
```

**Unauthorized** (401):

```json
{
  "success": false,
  "message": "UNAUTHENTICATED!"
}
```

**Rate Limited** (429):

```
Retry-After: 60
```

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```
