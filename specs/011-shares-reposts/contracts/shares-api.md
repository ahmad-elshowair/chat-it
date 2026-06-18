# API Contracts: Shares & Reposts (Spec 011)

**Phase**: 1 (Design) | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

All endpoints are mounted under `/api/shares` (`routes.use('/shares', shares)` in `routes/index.ts`; the `/api` prefix is applied at `server/src/index.ts:103`). All require `authorize_user` (authenticated). `POST` uses the shared `contentCreationLimiter` + `idempotency` middleware. Responses use the project's standardized envelope via `sendResponse`.

---

## `POST /api/shares/:post_id` — share / quote-post

Creates a share (simple repost or quote post). Idempotent.

**Auth**: required · **Middleware**: `authorize_user`, `contentCreationLimiter`, `idempotency`, `validateShare`, `validationMiddleware`

**Path**: `:post_id` (UUID, snake_case — matches `bookmarks`/`likes` convention)

**Body** (optional):
```json
{ "commentary": "Must read!" }
```
- `commentary`: string ≤ 280 chars (inclusive). Optional; empty/whitespace → normalized to `null` (simple repost).

**Responses**:

| Outcome | Status | Body (data) |
|---|---|---|
| New share created (rowCount 1) | `200` | `TShare` — `{ share_id, user_id, original_post_id, commentary: string \| null, created_at }` (FR-022) |
| Already shared (rowCount 0) | `200` | `{ action: "already_shared" }` — no duplicate, no count change (FR-023) |
| Self-share (trigger `23514`) | `409` | error envelope — "Users cannot share their own posts" |
| Post not found | `404` | error envelope |
| Commentary > 280 / invalid | `400` | validation error envelope |
| Unauthenticated | `401` | error envelope |

**Side effects**: `shares` INSERT → trigger increments `posts.number_of_shares`. Model MUST NOT update the counter manually.

---

## `DELETE /api/shares/:post_id` — unshare

Removes the authenticated user's share of a post. Idempotent.

**Auth**: required · **Middleware**: `authorize_user`, `validateShare`, `validationMiddleware`

**Path**: `:post_id` (UUID)

**Responses**:

| Outcome | Status | Body (data) |
|---|---|---|
| Share removed (rowCount 1) | `200` | `{ action: "unshared" }` (counter −1 via trigger) |
| No share existed (rowCount 0) | `200` | `{ action: "unshared" }` (idempotent no-op; counter unchanged) |
| Unauthenticated | `401` | error envelope |

**Side effects**: `shares` DELETE → trigger decrements `posts.number_of_shares` (clamped by `GREATEST(0, …)`).

---

## `GET /api/shares/post/:post_id` — who shared a post

Paginated list of users who shared a post, most-recent-first.

**Auth**: required · **Middleware**: `authorize_user`, `paginationValidator`, `validationMiddleware`

**Path**: `:post_id` (UUID)

**Query**: `limit`, `cursor`, `direction` (standard cursor-pagination options; `limit` capped at 50, +1 for `has_more`)

**Response** (`200`): paginated envelope of sharer objects:
```json
{
  "data": [
    { "user_id": "...", "user_name": "...", "first_name": "...", "last_name": "...", "picture": "...", "shared_at": "2026-06-15T12:00:00Z" }
  ],
  "pagination": { "next_cursor": "...", "previous_cursor": "...", "has_more": true }
}
```
- Ordered by `shares.created_at DESC`. Uses `idx_shares_post_created`. No `COUNT(*)` (Principle VIII).

---

## `GET /api/shares/is-shared/:post_id` — check share status

Whether the authenticated user has shared a given post. For single-post views (feeds use the inlined `is_shared` field — FR-021).

**Auth**: required · **Middleware**: `authorize_user`, `validateShare`, `validationMiddleware`

**Path**: `:post_id` (UUID)

**Response** (`200`):
```json
{ "data": { "is_shared": true } }
```

---

## Feed projection (modified `PostModel.feed()` / `userPosts()`)

Not a new endpoint — the existing feed/timeline responses gain share items interleaved with original posts. Each item extends `IFeedPost`:

| Field | Post item | Share item |
|---|---|---|
| `type` | `"post"` | `"share"` |
| `activity_at` | `posts.updated_at` | `shares.created_at` |
| `activity_id` | `post_id` | `share_id` |
| `shared_by_user_id` | `null` | sharer's `user_id` |
| `shared_by_user_name` | `null` | sharer's `user_name` |
| `share_commentary` | `null` | `shares.commentary` |
| `number_of_shares` | post's count | original post's count |
| `is_liked` / `is_bookmarked` / `is_shared` | viewer state (EXISTS) | viewer state (EXISTS) |
| embedded original post fields | n/a (it IS the post) | `post_id`, `description`, `image`, author… |

- Pagination: composite cursor `base64("${activity_at}|${activity_id}")`, ordered `activity_at DESC, activity_id DESC`.
- `index()` (global discovery) excludes shares (FR-016).
- Reference SQL: design doc "Full Feed Query (Reference)".
