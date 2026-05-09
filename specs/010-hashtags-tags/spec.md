# Feature Specification: Hashtags & Tags

**Feature Branch**: `010-hashtags-tags`  
**Created**: 2026-05-06  
**Status**: Draft  
**Input**: User description: "Enable posts to be tagged with hashtags in the post-it social app. Users discover posts by searching hashtags, viewing trending tags, and clicking hashtags in posts to see related content."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Hashtags to Posts (Priority: P1)

A user composing a post types hashtags (e.g., #travel, #food) in the description. After submitting, the post displays with clickable tag badges. Tags that don't yet exist are created automatically; tags already in the system are reused. Duplicate tags within the same post are silently collapsed. The system enforces a maximum of 10 unique tags per post.

**Why this priority**: Without tags on posts, no other hashtag feature functions. This is the foundation — the data entry point that makes discovery, trending, and search possible.

**Independent Test**: Can be fully tested by creating and editing posts with hashtags and verifying that tags appear on the post. Delivers value immediately — users can start tagging content.

**Acceptance Scenarios**:

1. **Given** a user is composing a post, **When** they include "#travel #food" in the description and submit, **Then** the post displays with both tags as clickable badges
2. **Given** a user submits a post with "#Travel" and "#travel", **Then** only one tag "travel" appears (case-insensitive deduplication)
3. **Given** a user submits a post with 12 unique hashtags, **Then** only the first 10 tags are extracted and linked to the post
4. **Given** a user edits a post changing "#travel #food" to "#travel #coffee", **Then** "#food" is removed, "#travel" remains, and "#coffee" is added
5. **Given** a user edits a post removing all hashtags, **Then** all tag associations are removed from that post and the post count for each tag decreases

---

### User Story 2 - Browse Posts by Hashtag (Priority: P1)

A user clicks on any hashtag displayed on a post and is taken to a paginated feed showing all public posts that share that tag, ordered by most recent first. The feed uses cursor-based pagination and shows the same post card format as the main feed (including interaction state like whether the user has liked or bookmarked each post).

**Why this priority**: Clicking a hashtag to see related content is the core discovery loop. Without it, hashtags are decorative labels with no navigational value. Combined with Story 1, this forms the minimum viable hashtag feature.

**Independent Test**: Can be tested by navigating to a tag feed URL and verifying paginated results appear with correct post data. Delivers content discovery value independently.

**Acceptance Scenarios**:

1. **Given** a user clicks on the "#travel" tag, **When** the tag feed loads, **Then** they see all posts containing #travel ordered by most recent first
2. **Given** a tag feed with more than 10 posts, **When** the user reaches the bottom, **Then** a "load more" mechanism fetches the next page via cursor
3. **Given** a user is authenticated and viewing a tag feed, **When** posts are displayed, **Then** each post shows accurate liked/bookmarked status for that user
4. **Given** a user navigates to a tag that has zero posts, **Then** they see an empty state with no results

---

### User Story 3 - View Trending Hashtags (Priority: P2)

A user views a list of trending hashtags ranked by how many posts were tagged within the last 24 hours (configurable window). Each tag shows its current trending rank, recent activity count, and total post count. The list helps users discover what topics are actively being discussed right now.

**Why this priority**: Trending amplifies content discovery beyond the user's immediate social graph. It depends on Story 1 (tags must exist) but is not strictly required for the core create-and-browse loop.

**Independent Test**: Can be tested by creating several posts with hashtags and verifying the trending list reflects recent activity. Delivers discovery value independently from browsing individual tags.

**Acceptance Scenarios**:

1. **Given** 50 posts were tagged #news in the last 24 hours and 30 posts were tagged #tech, **When** the user views trending tags, **Then** #news ranks higher than #tech
2. **Given** a tag with 10,000 total posts but zero in the last 24 hours, **When** the user views trending tags, **Then** that tag does not appear in the trending list
3. **Given** two tags with equal recent activity counts, **When** the user views trending tags, **Then** the tie is broken by total post count (higher total ranks higher)

---

### User Story 4 - Search for Hashtags (Priority: P2)

A user types a query into a tag search field and sees matching hashtags returned as they type (prefix and substring matching). Results show the tag name and total post count. This helps users find existing tags to use in their posts or discover content.

**Why this priority**: Search enhances discoverability of niche tags that may not appear in trending. It is secondary to browsing by tag and trending, which cover the most common discovery paths.

**Independent Test**: Can be tested by typing search queries and verifying matching tags are returned with correct post counts. Delivers tag discovery value independently.

**Acceptance Scenarios**:

1. **Given** tags "travel", "traveling", "time-travel" exist, **When** the user searches "travel", **Then** all three tags appear in results
2. **Given** the user searches "xyz", **When** no tags match, **Then** an empty result set is returned
3. **Given** the user searches "fo", **When** tags "food", "football", "photography" exist, **Then** results include "food" and "football" (prefix match) and potentially "photography" if substring matching applies

---

### User Story 5 - See Tags Across All Post Views (Priority: P2)

A user viewing any post — in the main feed, their profile posts, the search results, or a single post detail — sees the tags associated with that post displayed as clickable badges. This ensures hashtags are consistently visible regardless of how the user arrived at the post.

**Why this priority**: Without consistent tag display across all views, hashtags feel inconsistent and broken. Users need to see tags everywhere posts appear to reinforce the tagging mental model. This is a cross-cutting requirement that applies after Stories 1-2 are functional.

**Independent Test**: Can be tested by viewing posts across different contexts (feed, profile, search, detail) and verifying tags appear on each post.

**Acceptance Scenarios**:

1. **Given** a user scrolls the main feed, **When** a post with tags appears, **Then** the tags are displayed as clickable badges on the post card
2. **Given** a user views their profile posts, **When** a post with tags appears, **Then** the tags are displayed consistently with the main feed format
3. **Given** a user searches for posts and gets results, **When** a post with tags appears, **Then** the tags are displayed on the search result post card
4. **Given** a user views a single post detail, **When** the post has tags, **Then** all tags are displayed as clickable badges

---

### Edge Cases

- What happens when a post is deleted? All tag associations are removed, and each affected tag's post count decreases. Tags that reach zero posts are not deleted immediately but are cleaned up by a background process.
- What happens when a user includes a hashtag inside a URL (e.g., "https://example.com/#section")? The #section portion is NOT extracted as a tag.
- What happens with consecutive hash symbols (e.g., "##heading")? These are NOT treated as hashtags — a valid tag requires at least 2 alphanumeric/underscore characters after a single #.
- What happens when two users simultaneously post using a brand new tag? The tag is created once; both posts link to the same tag. No duplicate tags are created.
- What happens when a user submits a tag exceeding 50 characters? The tag is rejected (not extracted) during validation — tags are never truncated.
- What happens when a tag contains only special characters (e.g., "#@@@")? No tag is extracted — tags must contain at least 2 alphanumeric or underscore characters.
- What happens with punctuation adjacent to a tag (e.g., "#travel!" or "(#food)")? The tag "travel" or "food" is extracted correctly, excluding the punctuation.
- What happens when a post contains only hashtags and no other text (e.g., "#travel #food")? Tags are extracted normally — there is no minimum non-tag text requirement.
- What happens with a hashtag at the very start of the description (e.g., "#travel is great") or the very end (e.g., "great trip #travel")? Both are extracted correctly — no surrounding whitespace is required.
- What happens when a post is created and immediately deleted? The tag associations are created and then removed in separate transactions; tag post counts increment then decrement, ending at the correct value.
- What happens when a tag name is exactly 50 characters long? It is accepted — the length bound is inclusive (2-50).
- What happens with tags containing only underscores (e.g., "#___")? They are accepted — the validation regex allows underscores as valid characters.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST extract hashtags from post description text automatically when a post is created
- **FR-002**: System MUST extract hashtags from post description text and reconcile tag associations when a post is updated — compute set difference on normalized (lowercased) tag names: remove associations for tags no longer present, add associations for newly introduced tags, preserve unchanged associations. If the resulting set is identical, no database writes occur
- **FR-003**: System MUST store tag names in lowercase to ensure case-insensitive matching (#Travel and #travel resolve to the same tag)
- **FR-004**: System MUST enforce a maximum of 10 unique tags per post, keeping only the first 10 tags in document order (left-to-right appearance in the description text) and silently ignoring any tags beyond that limit — the user receives no warning about dropped tags
- **FR-005**: System MUST validate that tag names contain only lowercase alphanumeric characters and underscores, with a length between 2 and 50 characters (inclusive — a tag of exactly 2 or exactly 50 characters is valid; tags containing only underscores such as "#___" are valid)
- **FR-006**: System MUST enforce tag name format validation at both the application layer and the data storage layer. Normalization order: (1) lowercase the extracted text, (2) validate length 2-50 chars, (3) reject if validation fails — tags are never truncated
- **FR-007**: System MUST create new tags on first use and reuse existing tags for subsequent posts
- **FR-008**: System MUST handle concurrent tag creation safely — two users posting a new tag simultaneously must not create duplicates
- **FR-009**: System MUST maintain an accurate denormalized count of posts per tag ("tag post count"), updated in the same operation as tag association changes. The tag post count MUST never go below zero (enforced by database constraint: post_count >= 0)
- **FR-010**: System MUST remove tag associations and decrease post counts when a post is deleted
- **FR-011**: System MUST clean up orphan tags (zero posts) via a scheduled background process, not during individual post deletion
- **FR-012**: System MUST provide a paginated feed of posts filtered by a specific tag, ordered by most recent first, using cursor-based pagination
- **FR-013**: System MUST display the same post information in tag feeds as in the main feed — specifically the IFeedPost shape including post metadata, author info, interaction state (is_liked, is_bookmarked when authenticated), and associated tag names
- **FR-014**: System MUST provide a trending tags list ranked by the number of new tag associations created within a configurable time window (default 24 hours, configured via environment variable), with ties broken by total tag post count. The trending query MUST only scan post_tags rows within the configured window (not the entire table). A maximum of 20 tags are returned. When no tags have activity in the window, an empty list is returned
- **FR-015**: System MUST provide tag search using trigram similarity matching (pg_trgm GIN index) supporting both prefix and substring queries. A maximum of 20 results are returned, ranked by tag post count descending. An empty or missing search query (q= blank or absent) MUST be rejected with a validation error
- **FR-016**: System MUST display associated tags on every post across all views (feed, profile, search results, post detail) — this means including tag names in the response shape for all post-returning endpoints. Displaying tags on a post is independent from querying by tag (FR-020)
- **FR-017**: System MUST ignore hashtag-like patterns inside URLs and email addresses during extraction
- **FR-018**: System MUST ignore consecutive hash symbols (##) during extraction — only single # followed by valid characters constitutes a tag
- **FR-019**: System MUST make trending and tag search endpoints available to unauthenticated users (no auth token required). Post-by-tag feeds MUST work without authentication — when no auth token is present, interaction state defaults to is_liked=false and is_bookmarked=false; when authenticated, actual interaction state is returned
- **FR-020**: Tag search and full-text search (spec 009) MUST remain independent systems — searching for "#travel" in the general search endpoint does NOT invoke tag-based matching; users use dedicated tag endpoints for hashtag discovery
- **FR-021**: Tag search and trending endpoints MUST be rate-limited using a dedicated limiter (30 requests per minute per IP) to prevent abuse. Rate-limited requests return a 429 status with a retry-after header

### Key Entities

- **Tag**: Represents a unique hashtag. Key attributes include a unique lowercase name (2-50 chars, alphanumeric + underscore), a denormalized post count, and timestamps. One tag can be associated with many posts.
- **Post-Tag Association**: A many-to-many junction linking posts to tags. Records when a specific post was associated with a specific tag, including a timestamp used for trending calculations.
- **Post** *(existing)*: Gains a collection of associated tag names displayed alongside the post in all views.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can tag posts with up to 10 hashtags and see those tags reflected immediately on the post across all views
- **SC-002**: Clicking a hashtag loads a paginated feed of all posts with that tag within 2 seconds
- **SC-003**: The trending tags list accurately reflects tags with the most activity in the past 24 hours, updating as new posts are created
- **SC-004**: Tag search returns matching results in under 1 second for queries against a tag catalog of 10,000+ tags
- **SC-005**: Users successfully find and click a hashtag from the trending list or tag search results on their first attempt without reading documentation (measured by: user can navigate from a post tag badge to a tag feed and see related posts)
- **SC-006**: Tags appear consistently on every post across all views (feed, profile, search, detail) with zero missing or stale tags
- **SC-007**: Post creation and update latency increases by no more than 50ms compared to the same operation without tag extraction (measured as p95 of the difference between with-tags and without-tags latency over 100 requests)

## Clarifications

### Session 2026-05-09

- Q: Should the existing full-text search (spec 009) also return hashtag-matched posts when users search for #travel? → A: Separate — tag search and FTS search are independent systems; users use tag endpoints for tag-based discovery.

## Assumptions

- Tags are extracted from post description text only — not from comments, image metadata, or other content
- The trending time window defaults to 24 hours and is configured via the TAG_TRENDING_WINDOW_HOURS environment variable
- Tag search results are limited to exactly 20 results per query
- Trending results are limited to exactly 20 tags per request
- Orphan tag cleanup runs hourly via scheduled task — stale tags with zero posts may be visible in search for up to one hour after the last associated post is deleted
- Hashtag extraction uses a word-boundary-aware pattern that ignores hashtags embedded in URLs, email addresses, and HTML fragments
- Existing authentication and rate limiting infrastructure will be reused; a dedicated rate limiter (30 req/min per IP) applies to tag search and trending endpoints
- Tag search and full-text search are independent systems — no cross-querying between them
- The tag post count (denormalized counter on the tags table) is the authoritative display value; it is updated atomically with post_tags changes and must never go below zero
- The post_tags cascade on post deletion is handled by the database foreign key (ON DELETE CASCADE); this is reliable and does not require application-level fallback
- Adding the tags field to IFeedPost affects all existing post-returning endpoints: feed, index, userPosts, fetchPostById, and search — each must include a tags subquery
