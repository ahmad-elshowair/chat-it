# Tasks: Hashtags & Tags

**Input**: Design documents from `/specs/010-hashtags-tags/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included per project convention — T018 and T019 cover model/utility and controller tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Server code: `server/src/`
- Migrations: `server/migrations/sqls/`
- Types: `server/src/types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Migration, types, config, and infrastructure that all stories depend on.

- [ ] T001 Create migration files via `cd server && npx db-migrate create hashtags --sql-file`
- [ ] T002 Write `server/migrations/sqls/*-hashtags-up.sql` — CREATE EXTENSION pg_trgm, tags table (chk_tags_name + chk_tags_post_count >= 0), pg_trgm GIN index idx_tags_name_trgm, trg_tags_updated_at trigger, post_tags table with uq_post_tag, indexes idx_post_tags_post_id, idx_post_tags_tag_id, idx_post_tags_tag_created
- [ ] T003 Write `server/migrations/sqls/*-hashtags-down.sql` — drop trg_tags_updated_at trigger, then idx_post_tags_tag_created, idx_post_tags_tag_id, idx_post_tags_post_id, post_tags CASCADE, idx_tags_name_trgm, idx_tags_post_count, tags CASCADE; leave pg_trgm extension
- [ ] T004 [P] Create `server/src/types/tag.ts` — export TTag (tag_id, name, post_count, created_at, updated_at) and TPostTag (post_tag_id, post_id, tag_id, created_at)
- [ ] T005 [P] Add TAG_TRENDING_WINDOW_HOURS (default 24), RATE_LIMIT_TAG_SEARCH_WINDOW_MS (default 60000), RATE_LIMIT_TAG_SEARCH_MAX (default 30) to `server/src/configs/config.ts` with sectional comment
- [ ] T006 [P] Add tagSearchLimiter (30 req/min per IP, Redis-backed, prefix rl:tag-search:) to `server/src/middlewares/rateLimiter.ts` following existing contentCreationLimiter pattern
- [ ] T007 [P] Add tags: string[] field to IFeedPost in `server/src/interfaces/IPost.ts`

**Checkpoint**: Migration ready, types defined, config and rate limiter extended, IFeedPost updated.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core TagModel and extraction utility that ALL user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T008 Create `server/src/utilities/extractHashtags.ts` — export extractHashtags(description: string): string[] — word-boundary regex /(?<![\/\w])#([a-zA-Z0-9_]{2,50})\b/g, lowercase results, validate 2-50 chars, reject oversized (never truncate), slice to first 10 in document order, deduplicate case-insensitively, skip URL fragments and ##double
- [ ] T009 Create `server/src/models/tag.ts` TagModel class with all methods accepting optional PoolClient:
  - findOrCreate(name, connection?): CTE INSERT ON CONFLICT DO NOTHING + SELECT fallback, returns tag_id
  - syncPostTags(postId, tagNames, connection): set-diff on lowercased names, DELETE removed + INSERT new + increment/decrement post_count per tag in same transaction, return early if identical sets
  - decrementPostCount(tagId, connection): UPDATE tags SET post_count = post_count - 1 WHERE tag_id = $1 (protected by chk_tags_post_count >= 0)
  - getPostsByTag(name, userId?, limit, cursor, direction): JOIN posts+users+post_tags+tags, LEFT JOIN likes/bookmarks when userId, correlated tags subquery, cursor-based pagination on updated_at, returns IFeedPost shape. When no userId: is_liked=false, is_bookmarked=false
  - getTrending(window, limit=20): COUNT post_tags in window interval, GROUP BY tag, ORDER BY recent_count DESC post_count DESC, LIMIT 20, return empty list if no activity
  - search(query, limit=20): trigram similarity via name % $1, ORDER BY post_count DESC, LIMIT 20
  Follow existing model patterns: pool.connect(), BEGIN/COMMIT/ROLLBACK, connection.release() in finally, throw new Error with { cause }

**Checkpoint**: TagModel complete — all user stories can now be built on top of it.

---

## Phase 3: User Story 1 — Add Hashtags to Posts (Priority: P1) MVP

**Goal**: Users can create/update posts with hashtags; tags are extracted, stored, and linked automatically.

**Independent Test**: Create a post with #travel #food, verify tags appear. Edit to #travel #coffee, verify food removed and coffee added. Delete post, verify counters decrement.

### Implementation for User Story 1

- [ ] T010 [US1] Modify `server/src/models/post.ts` — create(): after INSERT, call TagModel.syncPostTags(post_id, extractHashtags(description), connection). update(): after UPDATE, call syncPostTags with new description tags. delete(): before DELETE, fetch affected tag_ids from post_tags, then after CASCADE decrement post_count for each via TagModel.decrementPostCount
- [ ] T011 [US1] Modify `server/src/controllers/factory.ts` — import TagModel, instantiate const tag_model = new TagModel(), add to exports

**Checkpoint**: Posts can be created/updated/deleted with automatic tag extraction. Tag counters are accurate. MVP complete.

---

## Phase 4: User Story 2 — Browse Posts by Hashtag (Priority: P1)

**Goal**: Users can click a hashtag and see a paginated feed of all posts with that tag.

**Independent Test**: GET /api/tags/travel/posts returns paginated posts with IFeedPost shape including is_liked/is_bookmarked when authenticated.

### Implementation for User Story 2

- [ ] T012 [P] [US2] Create `server/src/middlewares/validations/tags.ts` — express-validator schemas: tagNameValidator (param name matches ^[a-z0-9_]{2,50}$), tagSearchValidator (query q is non-empty string, max 50 chars), paginationValidator (limit int 1-50, cursor optional string, direction optional 'next'|'previous'), trendingValidator (limit int 1-50 optional)
- [ ] T013 [US2] Create `server/src/controllers/tagController.ts` — three exports: postsByTag (optional auth via req.user?.id, call tag_model.getPostsByTag, return paginated IFeedPost via pagination utility), trending (call tag_model.getTrending with config.tag_trending_window_hours, return array), search (validate q non-empty, call tag_model.search, return array)
- [ ] T014 [US2] Create `server/src/routes/apis/tags.routes.ts` — Router(); apply tagSearchLimiter + trendingValidator to GET /trending; apply tagSearchLimiter + tagSearchValidator to GET /search; apply tagNameValidator + paginationValidator to GET /:name/posts. Static routes (/trending, /search) registered BEFORE parameterized (/:name). Export default.
- [ ] T015 [US2] Register tag routes in `server/src/routes/index.ts` — import tags from ./apis/tags.routes.js, add routes.use('/tags', tags)

**Checkpoint**: All three tag endpoints functional. Tag feeds show IFeedPost with interaction state. MVP fully functional.

---

## Phase 5: User Story 3 — View Trending Hashtags (Priority: P2)

**Goal**: Users see trending hashtags ranked by recent 24h activity.

**Independent Test**: Create posts with hashtags, GET /api/tags/trending returns tags ranked by recent_count.

**Note**: Implementation already covered by TagModel.getTrending (T009) and tagController.trending (T013). This user story is complete at the checkpoint of Phase 4.

**Checkpoint**: Trending endpoint returns correct ranking by recent activity. No additional tasks needed.

---

## Phase 6: User Story 4 — Search for Hashtags (Priority: P2)

**Goal**: Users search for hashtags with prefix and substring matching.

**Independent Test**: GET /api/tags/search?q=travel returns matching tags. Empty q returns 400.

**Note**: Implementation already covered by TagModel.search (T009) and tagController.search (T013). This user story is complete at the checkpoint of Phase 4.

**Checkpoint**: Tag search returns trigram-matched results, rejects empty queries. No additional tasks needed.

---

## Phase 7: User Story 5 — See Tags Across All Post Views (Priority: P2)

**Goal**: Tags appear on every post in all views (feed, profile, search, detail).

**Independent Test**: GET /api/posts/all, GET /api/posts/feed, GET /api/posts/user/:id, GET /api/posts/:id, GET /api/search — all return tags: string[] on each post.

### Implementation for User Story 5

- [ ] T016 [US5] Modify `server/src/models/post.ts` — add correlated tags subquery `(SELECT COALESCE(json_agg(t.name), '[]'::json) FROM post_tags pt JOIN tags t ON t.tag_id = pt.tag_id WHERE pt.post_id = p.post_id) AS tags` to index(), feed(), userPosts(), fetchPostById() queries
- [ ] T017 [US5] Modify `server/src/models/search.ts` — add same correlated tags subquery to the search() query's inner SELECT, between existing fields and the rank column

**Checkpoint**: Tags appear on every post across all endpoints. IFeedPost.tags consistently populated.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Scheduled cleanup, testing, and verification.

- [ ] T018 Modify `server/src/utilities/scheduledTasks.ts` — add hourly orphan tag cleanup: import TagModel, cron.schedule('0 * * * *'), execute DELETE FROM tags WHERE post_count = 0, log result
- [ ] T019 Run `cd server && npx db-migrate up` — apply migration, verify no errors
- [ ] T020 Run `cd server && pnpm run lint && pnpm run prettier:check` — fix any violations
- [ ] T021 Verify schema: connect to DB, confirm chk_tags_name, chk_tags_post_count constraints exist on tags; uq_post_tag on post_tags; idx_tags_name_trgm GIN index present; trg_tags_updated_at trigger active

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — core MVP
- **US2 (Phase 4)**: Depends on Phase 2 — controller/routes layer
- **US3 (Phase 5)**: Covered by US2 implementation — no additional tasks
- **US4 (Phase 6)**: Covered by US2 implementation — no additional tasks
- **US5 (Phase 7)**: Depends on Phase 2 — cross-cutting IFeedPost changes
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (Add Tags to Posts)**: Depends on TagModel + extractHashtags — core data flow
- **US2 (Browse by Tag)**: Depends on TagModel — controller/routes layer
- **US3 (Trending)**: Covered by TagModel.getTrending — no separate tasks
- **US4 (Search)**: Covered by TagModel.search — no separate tasks
- **US5 (Tags in All Views)**: Depends on US1 (tags must exist in DB to display)

### Within Each Phase

- Phase 1: T004, T005, T006, T007 can run in parallel
- Phase 2: T008 and T009 are sequential (T009 may use extractHashtags patterns)
- Phase 3: T010 and T011 can run in parallel
- Phase 4: T12 first, then T013, then T014, then T015 (sequential — routes depend on controller which depends on validators)

### Parallel Opportunities

```
Phase 1 parallel batch: T004 + T005 + T006 + T007
Phase 3 parallel batch: T010 + T011
Phase 7 parallel batch: T016 + T017
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (migration, types, config)
2. Complete Phase 2: Foundational (TagModel + extractHashtags)
3. Complete Phase 3: US1 (post model integration)
4. Complete Phase 4: US2 (controller + routes)
5. **STOP and VALIDATE**: Create post with hashtags, browse tag feed
6. Deploy/demo if ready — trending and search already work

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 → Test tag creation and browsing → Deploy (MVP!)
3. US3 + US4 already work (no extra tasks) → Verify trending and search
4. Add US5 → Tags in all views → Deploy
5. Polish → Scheduled cleanup + verification → Deploy
