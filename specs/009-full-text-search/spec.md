# Feature Specification: Full-Text Search for Posts

**Feature Branch**: `009-full-text-search`
**Created**: 2026-05-04
**Status**: Draft
**Input**: User description: "Add PostgreSQL full-text search (FTS) capability to enable users to search posts by content in the post-it social app. Uses PostgreSQL's built-in tsvector/tsquery with GIN indexes."

## Clarifications

### Session 2026-05-04

- Q: Include comments in search or only posts? → A: Posts only for V1. Comments and user profiles are out of scope.
- Q: Public posts only or all? → A: All posts searchable for now. Visibility filtering will be added when Spec 005 (roles & permissions) is integrated.
- Q: Materialized view or real-time tsvector? → A: Real-time tsvector via trigger — simpler, always current, no refresh scheduling needed.
- Q: How should cursor pagination work for ranked search results (rank changes per query, unlike timestamp-based cursors)? → A: Composite cursor encoding (rank + post_id) to preserve rank ordering across pages.
- Q: Which text search query parser should we use for the search input? → A: websearch_to_tsquery — supports exact phrases (`"coffee shop"`), exclusions (`coffee -tea`), and OR (`coffee OR tea`), and sanitizes user input safely.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Search Posts by Keywords (Priority: P1)

As a user, I want to type keywords into a search bar and see posts whose content matches those keywords, so I can discover content beyond my social graph.

**Why this priority**: This is the core value proposition — without basic keyword search working, no other search features matter. It is the minimum viable search experience.

**Independent Test**: Can be fully tested by typing a keyword into the search endpoint and verifying that posts containing that keyword (or its stem) are returned, delivering immediate content discovery value.

**Acceptance Scenarios**:

1. **Given** posts exist with descriptions containing "traveling", **When** a user searches for "travel", **Then** the system returns posts containing "traveling" (English stemming matches the root word)
2. **Given** posts exist with descriptions "Great coffee shop" and "I love tea", **When** a user searches for "coffee", **Then** only the "Great coffee shop" post is returned
3. **Given** a user submits a search query, **When** the query is fewer than 2 characters, **Then** the system rejects it with a validation error
4. **Given** multiple posts match a search query, **When** results are returned, **Then** each result includes the post content, author name, author picture, like count, comment count, and the user's like/bookmark status
5. **Given** no posts match the search query, **When** a user searches, **Then** an empty result set is returned with standard pagination metadata
6. **Given** posts exist with descriptions "best coffee shop downtown" and "tea is great", **When** a user searches for `"coffee shop"` (exact phrase), **Then** only the first post is returned
7. **Given** posts exist about coffee and tea, **When** a user searches for `coffee -tea`, **Then** only posts about coffee that don't mention tea are returned

---

### User Story 2 - Relevance-Ranked Results (Priority: P2)

As a user, I want search results ranked by a combination of text relevance and recency, so the most useful and timely posts appear first.

**Why this priority**: Ranking is essential for usability — unsorted results would make search frustrating. It builds on P1 by ordering the results that P1 finds.

**Independent Test**: Can be tested by creating posts with varying relevance and recency, searching, and verifying the order matches the expected ranking (relevance + recency blend).

**Acceptance Scenarios**:

1. **Given** two posts match "hiking adventure" where one description contains both words and the other only one, **When** results are returned, **Then** the post with both matching words ranks higher
2. **Given** two posts with equal text relevance, **When** results are returned, **Then** the more recently created post ranks higher
3. **Given** a search returns many results, **When** a user paginates through results, **Then** ranking order is preserved across pages using a composite cursor (rank + post_id)

---

### User Story 3 - Paginated Search Results (Priority: P3)

As a user, I want to paginate through search results so I can browse large result sets without being overwhelmed.

**Why this priority**: Pagination is important for usability at scale but can initially be handled with a reasonable default limit. Follows the established cursor pagination pattern already in the app.

**Independent Test**: Can be tested by searching for a broad term that returns many results and verifying that cursor-based pagination works correctly.

**Acceptance Scenarios**:

1. **Given** a search returns more results than the requested limit, **When** the first page is returned, **Then** a `nextCursor` (composite of rank + post_id) is provided to fetch the next page
2. **Given** a user is on page 2 of results, **When** the response is returned, **Then** a `previousCursor` is provided to go back
3. **Given** a user requests 10 results per page, **When** only 5 posts match, **Then** no next cursor is provided and `hasMore` is false

---

### Edge Cases

- What happens when a user searches with only special characters or punctuation? The system should return no results without errors.
- What happens when a user searches with extremely long queries (hundreds of characters)? The system should impose a maximum query length and reject overly long queries.
- What happens when the search index is being updated (trigger delay)? The search vector is auto-populated synchronously via trigger, so results should always reflect the current post content.
- What happens with posts that have empty or null descriptions? These posts should not appear in search results.
- What happens when a user searches for common stop words (e.g., "the", "a", "is")? The system should handle this gracefully and return relevant results or an empty set.
- What happens with concurrent search requests under load? The system should handle concurrent searches without degradation.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a search endpoint that accepts a query string parameter and returns posts whose content matches the query keywords
- **FR-002**: The system MUST perform word stemming so that variants of a word match (e.g., "running" matches "run", "traveling" matches "travel")
- **FR-003**: The system MUST reject search queries shorter than 2 characters with a clear validation error
- **FR-004**: The system MUST rank search results by a combination of text relevance and post recency
- **FR-005**: The system MUST support cursor-based pagination using a composite cursor (rank + post_id) to preserve ranking order across pages
- **FR-006**: Each search result MUST include the post data and author data (post content, image, like count, comment count, author name, author picture, user's like/bookmark status)
- **FR-007**: The system MUST automatically update the search index whenever a post is created or its description is updated, using a real-time trigger
- **FR-008**: The system MUST return an empty result set (not an error) when no posts match the query
- **FR-009**: The system MUST impose a maximum query length to prevent abuse
- **FR-010**: The search endpoint MUST require authentication — only logged-in users can search
- **FR-011**: The system MUST respect the existing rate limiting infrastructure to prevent search abuse
- **FR-012**: Search scope is limited to post descriptions only — comments, user profiles, and other content are excluded in V1
- **FR-013**: All posts are searchable regardless of visibility; post-level visibility filtering will be deferred to integration with the roles & permissions system (Spec 005)
- **FR-014**: The system MUST parse search queries using a websearch-style parser that natively supports exact phrases (quoted), exclusions (minus prefix), and OR operators, while sanitizing user input safely

### Key Entities

- **Search Result**: A post matching the query, enriched with author information and the user's interaction state (liked, bookmarked). Follows the existing feed post data shape.
- **Search Query**: The user-provided text input, validated for minimum length and maximum length, parsed using a websearch-style parser that supports exact phrases, exclusions, and OR operators.
- **Search Vector**: An automatically maintained, real-time optimized representation of each post's description content, updated via trigger on every INSERT or UPDATE of description.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can find posts containing their search terms (including word variants) within the search results
- **SC-002**: 95% of searches return results within 1 second for datasets up to 10,000 posts
- **SC-003**: Search results are ordered with the most relevant and recent posts appearing first, verifiable by comparing result order against manual relevance assessment
- **SC-004**: Users can navigate through large result sets using cursor-based pagination without missing or duplicating posts
- **SC-005**: New and updated posts are searchable within the time it takes to complete the create/update operation (no noticeable delay)

## Assumptions

- Only post descriptions are searchable (comments, user profiles, and other content are out of scope for V1)
- English language stemming is sufficient for the initial launch; multilingual support is a future enhancement
- The existing authentication middleware and rate limiting infrastructure will be reused
- The existing cursor pagination utilities will be adapted for search results using a composite (rank + post_id) cursor
- Search is available to all authenticated users regardless of role
- Searching is a read-only operation with no side effects
- The maximum query length is capped at 200 characters (a reasonable limit for keyword-based search)
- Search queries support websearch-style syntax: exact phrases (`"exact phrase"`), exclusions (`-word`), and OR (`word1 OR word2`); plain keywords default to AND logic
- Post-level visibility filtering is deferred to Spec 005 integration; all posts are searchable for now
