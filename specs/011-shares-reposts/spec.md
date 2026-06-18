# Feature Specification: Shares & Reposts

**Feature Branch**: `011-shares-reposts`  
**Created**: 2026-06-15  
**Status**: Draft  
**Input**: User description: "Allow users to share/repost other users' posts in the post-it social app, optionally adding their own commentary (quote post). Shared posts appear in the sharer's followers' feeds and on the sharer's profile feed."

## Clarifications

### Session 2026-06-15
- Q: Should the feed queries (feed() and userPosts()) return is_shared: boolean for all posts (including the original post and embedded original posts) to prevent frontend N+1 API calls? → A: Yes, return is_shared (boolean) directly in the post/share objects within the feed query results.
- Q: What should the response body look like for a successful share creation (POST /api/shares/:post_id)? → A: Return the fully created TShare object: { share_id: string, user_id: string, original_post_id: string, commentary: string | null, created_at: Date }.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Share a Post (Simple Repost & Quote Post) (Priority: P1)

A user views a post authored by another user and chooses to share it. They can perform a simple repost (no added text) or a quote post (their own commentary, up to 280 characters). The system records the share and prevents the user from sharing their own posts or sharing the same post more than once.

**Why this priority**: Sharing is the entry point for the entire feature — without the ability to create a share, no other capability (counts, feeds, attribution) has data to work with. This is the foundation and the MVP.

**Independent Test**: Can be fully tested by sharing another user's post (with and without commentary) and verifying a share record is created and the post's share count increases. Delivers immediate value — users can amplify content.

**Acceptance Scenarios**:

1. **Given** a user views another user's post, **When** they repost it without commentary, **Then** a share record is created, returned in the response, and the post's share count increases by exactly 1
2. **Given** a user reposts with commentary "Must read!", **When** the share is created, **Then** the commentary is stored, returned in the response share object, and associated with the share
3. **Given** a user submits commentary of exactly 280 characters, **When** validated, **Then** it is accepted (the length bound is inclusive)
4. **Given** a user submits commentary of 281 characters, **When** validated, **Then** the request is rejected before any data is written
5. **Given** a user submits commentary that is empty or whitespace-only, **When** the share is created, **Then** it is treated as a simple repost with no commentary stored
6. **Given** a user attempts to share their own post, **When** the request is processed, **Then** it is rejected with a conflict error and no share is created
7. **Given** a user has already shared a post, **When** they attempt to share it again, **Then** no duplicate share is created, the share count does not change (idempotent), and the response indicates `already_shared`

---

### User Story 2 - View Share Count & Who Shared (Priority: P1)

A user viewing any post sees how many times it has been shared. They can open a paginated list of the users who shared the post, ordered most-recent-first. Authenticated users also see whether they themselves have shared a given post, so the share button can render the correct state.

**Why this priority**: Without visibility of shares, the feature is invisible — users get no feedback that their share was recorded and no social proof that a post is spreading. Combined with Story 1, this forms the minimum viable share feature (create + display).

**Independent Test**: Can be tested by sharing a post several times and verifying the count and sharer list reflect those shares. Delivers social-proof value independently.

**Acceptance Scenarios**:

1. **Given** a post has been shared 5 times, **When** a user views the post, **Then** the share count displays as 5
2. **Given** a user opens the "who shared" list for a post with many shares, **When** the list loads, **Then** the sharers are returned most-recent-first with cursor-based pagination
3. **Given** a post has never been shared, **When** viewed, **Then** the share count displays as 0
4. **Given** an authenticated user has shared a post, **When** they view that post, **Then** they see an indication that they have shared it (is_shared = true)
5. **Given** an authenticated user has not shared a post, **When** they view it, **Then** is_shared = false

---

### User Story 3 - Undo a Share & Check Share Status (Priority: P2)

A user who previously shared a post can undo the share, which removes their share record and decreases the post's share count. They can also query whether they have already shared a specific post (to render the correct share/unshare button state).

**Why this priority**: The ability to reverse a share is important for user control but is not part of the minimum create-and-display loop. It depends on Story 1 existing.

**Independent Test**: Can be tested by sharing then unsharing a post and verifying the share is removed and the count returns to its prior value. Delivers user-control value independently.

**Acceptance Scenarios**:

1. **Given** a user has shared a post, **When** they unshare it, **Then** the share record is removed and the post's share count decreases by exactly 1
2. **Given** a user has not shared a post, **When** they attempt to unshare, **Then** the operation is a no-op (idempotent) and the share count does not go negative
3. **Given** a user unshares and then re-shares the same post with new commentary, **When** the new share is created, **Then** the new commentary is stored on the fresh share
4. **Given** a user unshares a post, **When** they subsequently check share status, **Then** is_shared returns false

---

### User Story 4 - Shared Posts in Feed & Profile with Attribution (Priority: P2)

When a user the viewer follows shares a post, that share appears in the viewer's personal home feed interleaved with original posts, showing who shared it, when, any quote commentary, and the original post embedded with its author and interaction state. Shares also appear on the sharer's own profile feed. Pagination spans both streams (original posts and shares) using a composite cursor that is unambiguous even when items share identical timestamps.

**Why this priority**: Feed distribution is what makes sharing a viral mechanism rather than a private bookmark. It is prioritized after the create/display/manage loop because it is the most complex integration and depends on shares existing first.

**Independent Test**: Can be tested by having a followed user share a post and verifying the share appears in the viewer's feed with correct attribution and embedded original post, and that pagination across mixed items returns complete results.

**Acceptance Scenarios**:

1. **Given** the viewer follows Alice and Alice shares Bob's post, **When** the viewer loads their home feed, **Then** the share appears showing Alice as the sharer, the share time, any commentary, and Bob's original post embedded with its author
2. **Given** a user shares several posts, **When** a visitor views that user's profile feed, **Then** the shares appear alongside that user's original posts
3. **Given** the feed contains both original posts and shares, **When** the viewer paginates across several pages, **Then** the composite cursor returns each page correctly without skipping or duplicating items, even when items share identical timestamps
4. **Given** the viewer loads the global discovery feed (not the personal feed), **When** results load, **Then** shares are NOT included — shares appear only in the personal feed and profiles
5. **Given** the viewer is authenticated, **When** shared posts appear in the feed, **Then** each embedded original post shows accurate liked/bookmarked/shared status for the viewer
6. **Given** a share's original post has been deleted, **When** the feed renders, **Then** the orphan share does not appear (it was already removed when the post was deleted)

---

### Edge Cases

- What happens when a user attempts to share their own post? The request is rejected with a conflict error; enforcement happens at the data layer so it cannot be bypassed by any client.
- What happens when a user shares the same post twice? The second request is idempotent — no duplicate share is created and the share count does not change.
- What happens when a user shares a post that does not exist or has been deleted? The request is rejected with a "not found" error before any share is created.
- What happens when the original post is deleted? All shares of that post are removed automatically, and since the post row is gone its share count is gone with it.
- What happens when a sharer's account is deleted? All of that user's shares are removed automatically, and the share counts of every post they had shared are decremented so no drift occurs.
- What happens when commentary is empty or whitespace-only? It is normalized to no commentary (a simple repost), not stored as an empty string.
- What happens when commentary is exactly 280 characters? It is accepted — the bound is inclusive.
- What happens when commentary is 281 characters? It is rejected by validation before any data is written.
- What happens when a user unshares a post they never shared? The operation is a no-op; the share count never goes negative.
- What happens when a user tries to re-share a share (share someone else's share)? It is not possible — shares always reference original posts, never other shares. One level of sharing is allowed.
- What happens when many users share the same viral post concurrently? The share count is updated atomically for each share; no updates are lost and the final count equals the number of successful shares.
- What happens to feed pagination when an original post and a share have identical timestamps? The composite cursor uses a secondary unique identifier as a tie-breaker so neither item is skipped nor duplicated.
- What happens if the share count somehow attempts to go below zero? It is clamped to zero and cannot become negative (data-layer guard).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a user to share another user's post, creating a share record that links the sharer to the original post
- **FR-002**: System MUST support two share types — a simple repost (no commentary) and a quote post (commentary up to 280 characters, inclusive bound)
- **FR-003**: System MUST reject commentary exceeding 280 characters before any data is written (application-layer validation)
- **FR-004**: System MUST normalize empty or whitespace-only commentary to no commentary (simple repost)
- **FR-005**: System MUST prevent a user from sharing their own posts, enforced at the data layer so the rule cannot be bypassed by any client or code path
- **FR-006**: System MUST prevent duplicate shares — a user can share a given post at most once; repeated share requests are idempotent and do not change the share count
- **FR-007**: System MUST maintain an accurate denormalized share count on each post, kept in sync automatically whenever a share is created or removed — including when shares are removed as a side effect of a user or post being deleted. The count MUST never go below zero
- **FR-008**: System MUST keep the share count consistent under concurrent share/unshare operations on the same post (no lost updates)
- **FR-009**: System MUST remove all shares of a post when the original post is deleted, and remove all of a user's shares when that user is deleted, without leaving stale share records or stale counts
- **FR-010**: System MUST allow a user to undo their share; repeated undo requests are idempotent and never drive the share count below zero
- **FR-011**: System MUST allow an authenticated user to check whether they have already shared a given post (boolean result)
- **FR-012**: System MUST display the total share count on a post across all post views
- **FR-013**: System MUST provide a paginated list of users who shared a given post, ordered most-recent-first, using cursor-based pagination
- **FR-014**: System MUST include shares in the personal home feed and in user profile feeds, interleaved with original posts and ordered by activity time (most recent first), where each item's activity time is its own timestamp — the original post's update time (`updated_at`) for posts and the share's creation time (`created_at`) for shares
- **FR-015**: Each share displayed in the feed MUST show who shared it (sharer identity), when it was shared, any quote commentary, and the original post embedded with its author and the viewer's interaction state (is_liked, is_bookmarked, is_shared)
- **FR-016**: System MUST exclude shares from the global discovery feed — shares appear only in personal feeds and profiles
- **FR-017**: System MUST paginate the unified feed (original posts + shares) using a composite cursor that uniquely identifies each item, so pagination never skips or duplicates items even when items share identical timestamps
- **FR-018**: Share notifications to the original poster are out of scope for this feature and are deferred to a future notifications feature
- **FR-019**: Re-sharing a share MUST NOT be supported — users can only share original posts; one level of sharing is allowed (a share always references an original post, never another share)
- **FR-020**: Share creation MUST reuse the shared content-creation rate limiter (the same limiter applied to post and comment creation; threshold defined in shared configuration) and be idempotent at the API layer
- **FR-021**: System MUST return is_shared (boolean) for all posts returned in the feed (feed()) and user profile timeline (userPosts()) queries to prevent frontend N+1 API calls.
- **FR-022**: On creation of a new share (POST /api/shares/:post_id), the response MUST return the created Share record — share id, sharer, original post, commentary (or none), and creation timestamp
- **FR-023**: When a share request targets a post the user has already shared, the request MUST be idempotent — it MUST return 200 with an explicit `already_shared` indicator, and MUST NOT create a duplicate share, change the share count, or imply a new record was created

### Key Entities

- **Share**: Records that a user shared a post at a point in time, with optional quote commentary (up to 280 characters). Links one sharer to one original post and is unique per (sharer, original post). Cannot reference another share.
- **Post** *(existing)*: Gains a denormalized share count that is displayed alongside the post and is kept in sync automatically as shares are created and removed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can share a post (with or without commentary) in under 3 seconds and see the share count update immediately
- **SC-002**: The share count displayed on a post is always accurate, even after users delete their accounts or the original post is deleted
- **SC-003**: Shares from followed users appear in the viewer's feed with correct attribution and an embedded original post, indistinguishable in quality from original posts
- **SC-004**: Feed pagination across mixed original posts and shares returns complete results with no skipped or duplicated items across 10+ consecutive pages
- **SC-005**: Concurrent shares of a single viral post (e.g., 100 simultaneous shares) result in an exact share count of 100 — no lost updates, no drift
- **SC-006**: Self-share attempts are always blocked with a clear error, regardless of the client used
- **SC-007**: Personal feed latency for the unified (posts + shares) feed increases by no more than 50ms at p95 compared to the original posts-only feed

## Assumptions

- Sharing is limited to one level: users share original posts, never other shares. This is structurally enforced because share records always reference original posts, so no application-level depth check is required.
- Share notifications to the original poster are deferred to the notifications feature (spec 013); this feature creates no notifications.
- Quote commentary is optional; empty or whitespace-only commentary is normalized to a simple repost (no commentary).
- Commentary is capped at 280 characters, inclusive.
- The existing authentication, rate-limiting, idempotency, and cursor-pagination infrastructure is reused.
- The personal home feed and profile feeds include shares; the global discovery feed does not.
- The share count is a denormalized value maintained automatically by database rules so it cannot drift during cascade deletions or concurrent operations; application code does not manually adjust it. This intentionally differs from how like and bookmark counts are maintained, which lack such automation and are updated in application code.
- The composite pagination cursor is opaque to the client.
- Shares reference posts only, so the one-level re-share limit is structural.
- Share create and delete operations run inside explicit transactions (`BEGIN/COMMIT/ROLLBACK`) with connections released in `finally` blocks, per Constitution Article IV. Because the count-maintenance triggers fire within the enclosing transaction, the denormalized counter is updated in the same transaction as the share change — satisfying Article IV's same-transaction counter rule even though the model does not update the counter manually.
- Implementation adheres to the project constitution (Articles I–IX), including raw parameterized SQL via `pg` (Article I), migration-first delivery (Article II), TypeScript strict mode (Article III), and a test for every share model method (Article VI).
