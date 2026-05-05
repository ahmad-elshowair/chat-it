# Research: Full-Text Search

**Branch**: `009-full-text-search` | **Date**: 2026-05-04

## Decision 1: Trigger vs Generated Column for search_vector

**Decision**: Use explicit trigger (BEFORE INSERT OR UPDATE OF description)

**Rationale**: The spec (FR-007) requires a trigger. A `GENERATED ALWAYS AS` stored column is an alternative, but the trigger approach was chosen in clarification because it's more flexible (can be extended to include other columns later) and the spec explicitly calls for it.

**Alternatives considered**:
- `GENERATED ALWAYS AS (to_tsvector(...)) STORED` — PostgreSQL-native, no trigger needed, but less flexible for future changes and doesn't match the spec requirement
- Application-level tsvector computation — requires code changes in every write path, error-prone

## Decision 2: websearch_to_tsquery vs plainto_tsquery

**Decision**: `websearch_to_tsquery('english', $1)`

**Rationale**: Chosen in clarification. Supports exact phrases (`"coffee shop"`), exclusions (`-tea`), and OR operators (`coffee OR tea`). Unlike `plainto_tsquery` (which treats everything as AND), `websearch_to_tsquery` gives users expressive search syntax without requiring them to learn PostgreSQL query syntax. Also safely handles malformed input — unbalanced quotes are ignored gracefully.

**Alternatives considered**:
- `plainto_tsquery` — simplest, but no phrase/exclusion/OR support
- `to_tsquery` — requires proper boolean syntax from users, unsafe for direct user input
- `phraseto_tsquery` — only exact phrases, no boolean operators

## Decision 3: Composite Cursor for Ranked Pagination

**Decision**: Encode `(rank, post_id)` into cursor

**Rationale**: Search results are ordered by `rank DESC, created_at DESC`. Since `rank` is computed per-query and not stored, the standard timestamp cursor pattern won't work. The composite cursor encodes both the rank score and post_id of the last result, enabling `WHERE (rank, post_id) < (cursor_rank, cursor_post_id)` for next-page queries. For previous-page, reverse the comparison.

**Alternatives considered**:
- Offset-based pagination — simpler but inconsistent with app pattern; can skip/duplicate under inserts
- Post-ID-only cursor with re-sort — poor UX, results shuffle

## Decision 4: Search Route Location

**Decision**: Separate `search.routes.ts` mounted at `/api/search`

**Rationale**: Search is a distinct domain from CRUD posts. It has its own validation (query min/max length), its own model (SearchModel), and doesn't follow the standard REST resource pattern. A separate route keeps concerns clean and matches the spec's API design (`GET /api/search`).

**Alternatives considered**:
- Nest under `/api/posts/search` — couples search to posts, harder to extend to comments/users later
- Mount at root level — not consistent with existing route organization

## Decision 5: User Interaction State in Results

**Decision**: LEFT JOIN likes and bookmarks tables with user_id filter

**Rationale**: FR-006 requires each result to include the user's like/bookmark status. The existing feed query pattern in `post.ts` already JOINs these tables. We'll follow the same pattern.

**Alternatives considered**:
- Separate queries per result — N+1 problem
- Client-side enrichment — requires multiple API calls, poor UX

## Decision 6: Rank Score Visibility

**Decision**: Compute rank in SQL, use for sorting/cursor, strip before API response

**Rationale**: FR-015 explicitly states rank MUST NOT be in the API response. The rank is needed internally for ordering and cursor construction, but must be removed from the data before sending to the client.

**Alternatives considered**:
- Exclude from SQL entirely — can't sort or paginate
- Include in response — violates FR-015

## Decision 7: Existing Pagination Utility Reuse

**Decision**: Reuse `getCursorPaginationOptions` and `createPaginationResult` with adaptations

**Rationale**: The existing `pagination.ts` utility extracts limit/cursor/direction from request. The `createPaginationResult` utility handles `hasMore`/`nextCursor`/`previousCursor`. However, the cursor format is different (composite rank+post_id instead of just post_id), so the model's search method will handle cursor encoding/decoding internally while still using the utility for extraction and response shaping.

**Alternatives considered**:
- Build entirely new pagination — duplicates logic, inconsistent with app
- Use existing utilities as-is — won't work because cursor format differs
