# Tasks: Shares & Reposts

**Input**: Design documents from `/specs/011-shares-reposts/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/shares-api.md, quickstart.md

**Tests**: Tests are included — spec.md and plan.md require per-method tests (Article VI, task T011 in plan).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Server**: `server/src/` (monolith REST API)
- **Migrations**: `server/migrations/sqls/`
- **Tests**: `server/src/` (co-located per existing project convention, via `pnpm test`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the migration files and shared type/interface definitions that all user stories depend on.

- [ ] T001 Create migration skeleton: run `cd server && npx db-migrate create shares --sql-file` to generate `server/migrations/<timestamp>-shares.js` and `server/migrations/sqls/<timestamp>-shares-{up,down}.sql`
- [ ] T002 Write `server/migrations/sqls/<timestamp>-shares-up.sql` — ALTER TABLE posts ADD number_of_shares (NOT NULL DEFAULT 0, CHECK >= 0), CREATE TABLE shares (PK, FKs, UNIQUE), composite indexes `idx_shares_post_created` and `idx_shares_user_created`, triggers `check_self_share` + `maintain_share_count_on_insert` + `maintain_share_count_on_delete` per data-model.md
- [ ] T003 Write `server/migrations/sqls/<timestamp>-shares-down.sql` — drop triggers/functions, indexes, table, constraint, and column in reverse order per data-model.md
- [ ] T004 Run migration and verify schema: `npx db-migrate up`, then verify with `psql -d post_it -c "\d shares"`, `psql -d post_it -c "\d posts"`, trigger listing, and index listing per quickstart.md §2–§3

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the shared type definitions, validation middleware, model, controller, and route files that ALL user stories depend on. No user story can begin without these files existing.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 [P] Create `server/src/types/share.ts` — export `TShare` type with fields: `share_id`, `user_id`, `original_post_id`, `commentary` (string | null), `created_at` (Date)
- [ ] T006 [P] Extend `server/src/interfaces/IPost.ts` — add to `IFeedPost`: `type` ('post' | 'share'), `activity_id` (string), `activity_at` (Date), `shared_by_user_id` (string | null), `shared_by_user_name` (string | null), `share_commentary` (string | null), `number_of_shares` (number), `is_shared` (boolean)
- [ ] T007 [P] Create `server/src/middlewares/validations/shares.ts` — export `validateShare` (param `post_id` UUID) and `validateShareCreation` (optional body `commentary` ≤ 280 chars, trim + whitespace normalization to null) using express-validator, following the pattern in `server/src/middlewares/validations/bookmarks.ts`
- [ ] T008 Create `server/src/models/share.ts` — `ShareModel` class with methods: `share(userId, postId, commentary)` using `INSERT ... ON CONFLICT DO NOTHING RETURNING *` + rowCount-driven response (DO NOT manually update `number_of_shares` — triggers own it), `unshare(userId, postId)` using `DELETE ... WHERE` + rowCount check, `getSharesByPostId(postId, limit, cursor, direction)` with cursor pagination using `idx_shares_post_created` (ordered `created_at DESC, share_id DESC` tie-break, following the existing `getLikesByPostId` pattern), `isShared(userId, postId)` returning boolean. All methods use `pool.connect()`, `BEGIN/COMMIT/ROLLBACK`, `finally { connection.release() }`, parameterized SQL per Articles I/IV/VIII
- [ ] T009 Create `server/src/controllers/shares.controller.ts` — export `sharePost` (maps SQLSTATE 23514 from self-share trigger → 409, rowCount 0 → `{ action: 'already_shared' }`, rowCount 1 → TShare), `unsharePost` (rowCount 0 → idempotent 200, rowCount 1 → `{ action: 'unshared' }`), `getPostSharers` (paginated via `getCursorPaginationOptions` + `createPaginationResult`), `checkShareStatus` (returns `{ is_shared: boolean }`). Follow JSDoc conventions per AGENTS.md
- [ ] T010 Create `server/src/routes/apis/shares.routes.ts` — mount `authorize_user`, `contentCreationLimiter`, `idempotency`, `validateShare`/`validateShareCreation`, `validationMiddleware`, `paginationValidator` on the 4 endpoints per contracts/shares-api.md: `POST /:post_id`, `DELETE /:post_id`, `GET /post/:post_id`, `GET /is-shared/:post_id`
- [ ] T011 Register share_model in `server/src/controllers/factory.ts` — import `ShareModel`, instantiate `share_model`, add to exports (alphabetical order)
- [ ] T012 Mount shares routes in `server/src/routes/index.ts` — `import shares from './apis/shares.routes.js'` and `routes.use('/shares', shares)` (alphabetical position)

**Checkpoint**: Foundation ready — share CRUD endpoints work, triggers maintain counters, all 4 API endpoints respond correctly. User story implementation can now begin.

---

## Phase 3: User Story 1 — Share a Post (Simple Repost & Quote Post) (Priority: P1) 🎯 MVP

**Goal**: A user can share another user's post (simple repost or quote post with ≤280-char commentary). The share is recorded, the counter increments, self-shares are blocked, and duplicates are idempotent.

**Independent Test**: Share another user's post with and without commentary → verify share record returned, `number_of_shares` incremented. Attempt self-share → 409. Attempt duplicate → `already_shared`.

### Tests for User Story 1

- [ ] T013 [P] [US1] Write model tests for `ShareModel.share()` in the project test suite: test simple repost (rowCount 1, TShare returned), quote post with commentary, commentary normalization (whitespace → null), idempotent duplicate (rowCount 0), self-share trigger rejection (SQLSTATE 23514), non-existent post (FK violation)
- [ ] T014 [P] [US1] Write controller tests for `sharePost` endpoint: test 200 with TShare on new share, 200 with `already_shared` on duplicate, 409 on self-share, 400 on commentary > 280 chars, 401 unauthenticated, 404 post not found

### Implementation for User Story 1

- [ ] T015 [US1] Verify trigger behavior manually per quickstart.md §3: self-share blocked (ERROR 23514), counter increments on INSERT, counter decrements on DELETE, cascade on user/post deletion adjusts counter

**Checkpoint**: User Story 1 is fully functional — share creation with all edge cases (self-share, duplicate, commentary validation) works independently.

---

## Phase 4: User Story 2 — View Share Count & Who Shared (Priority: P1)

**Goal**: Users see the share count on posts and can open a paginated list of who shared a post. Authenticated users see `is_shared` state on individual post views.

**Independent Test**: Share a post several times → verify count reflects shares. Open "who shared" list → verify paginated most-recent-first. Check `is-shared` endpoint → true/false correctly.

### Tests for User Story 2

- [ ] T016 [P] [US2] Write model tests for `ShareModel.getSharesByPostId()`: test paginated results (most-recent-first), cursor-based next/previous, empty result for unshared post
- [ ] T017 [P] [US2] Write model tests for `ShareModel.isShared()`: test returns true when shared, false when not shared
- [ ] T018 [P] [US2] Write controller tests for `getPostSharers`: test 200 paginated response, `checkShareStatus`: test 200 with `{ is_shared: true/false }`

### Implementation for User Story 2

- [ ] T019 [US2] Verify `number_of_shares` is returned in existing `PostModel.fetchPostById()` response — if not already projected, add `p.number_of_shares` to the SELECT in `server/src/models/post.ts` fetchPostById method. Note: `is_shared` is intentionally NOT added to `fetchPostById` — single-post views use the dedicated `GET /api/shares/is-shared/:post_id` endpoint (clarify Q1 / FR-021 scopes `is_shared` to `feed()`/`userPosts()` only, to prevent N+1; a single-post view is N=1, so a dedicated call is acceptable)

**Checkpoint**: User Stories 1 AND 2 are independently functional — users can create shares and see share counts/status/sharers.

---

## Phase 5: User Story 3 — Undo a Share & Check Share Status (Priority: P2)

**Goal**: Users can undo their share (counter decrements via trigger). Duplicate undo is idempotent. Share status check returns correct state after unshare.

**Independent Test**: Share then unshare a post → verify share removed and count returns to prior value. Unshare a post never shared → no-op.

### Tests for User Story 3

- [ ] T020 [P] [US3] Write model tests for `ShareModel.unshare()`: test successful unshare (rowCount 1), idempotent unshare (rowCount 0, no counter change), re-share after unshare with new commentary
- [ ] T021 [P] [US3] Write controller tests for `unsharePost`: test 200 on successful unshare, 200 idempotent on no-op, 401 unauthenticated

### Implementation for User Story 3

- [ ] T022 [US3] Verify counter behavior on unshare: manual test per quickstart.md — share → check count → unshare → check count → unshare again (no-op, no negative)

**Checkpoint**: User Stories 1, 2, AND 3 all work independently.

---

## Phase 6: User Story 4 — Shared Posts in Feed & Profile with Attribution (Priority: P2)

**Goal**: Shares from followed users appear in the viewer's personal feed interleaved with original posts, showing sharer attribution, commentary, and the embedded original post with interaction state (is_liked, is_bookmarked, is_shared). Shares also appear in user profile timelines. Global discovery feed excludes shares. Composite cursor pagination handles timestamp ties.

**Independent Test**: Have a followed user share a post → verify the share appears in the viewer's feed with correct attribution and embedded original post. Paginate across mixed items → no skips/duplicates.

### Implementation for User Story 4

- [ ] T023 [US4] Modify `server/src/models/post.ts` `feed()` method — replace the single-query approach with the UNION ALL of two branches (posts + shares), each pre-filtered to the follow graph and pre-limited to `$limit`. Project `type`, `activity_id`, `activity_at`, `shared_by_user_id`, `shared_by_user_name`, `share_commentary`, `number_of_shares`, `is_shared` (EXISTS subquery). Outer ORDER BY `activity_at DESC, activity_id DESC` with final LIMIT. Implement composite cursor decode/encode (`base64("${activity_at}|${activity_id}")`). Apply cursor filter inside each branch per research.md §5
- [ ] T024 [US4] Modify `server/src/models/post.ts` `userPosts()` method — apply the same UNION ALL pattern as `feed()`, but replace the follow-graph WHERE with `p.user_id = $profile_user_id` (post branch) and `s.user_id = $profile_user_id` (share branch). Same composite cursor, same projection
- [ ] T025 [US4] Verify `server/src/models/post.ts` `index()` method does NOT include shares — confirm FR-016 (global discovery excludes shares). No code change needed if `index()` queries only the `posts` table

### Tests for User Story 4

- [ ] T026 [P] [US4] Write integration tests for `PostModel.feed()`: test share from followed user appears in feed with correct type/attribution, original posts still appear, shares from unfollowed users do NOT appear, `is_shared` is correct per viewer, pagination across mixed items returns complete results
- [ ] T027 [P] [US4] Write integration tests for `PostModel.userPosts()`: test user's shares appear alongside their original posts, shares are correctly attributed, pagination works across mixed items
- [ ] T028 [US4] Write integration test confirming `PostModel.index()` excludes shares — global discovery feed returns only type 'post'

**Checkpoint**: All user stories are independently functional. Feed integration is verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, lint, and documentation.

- [ ] T029 Run full lint + format check: `cd server && pnpm run lint && pnpm run prettier:check`
- [ ] T030 Run full test suite: `cd server && pnpm test` — all existing + new tests must pass
- [ ] T031 Verify index usage via EXPLAIN ANALYZE per quickstart.md §7: confirm `idx_shares_post_created` and `idx_shares_user_created` are used (Index Scan, not Seq Scan)
- [ ] T032 Run quickstart.md §5 smoke tests: curl all 4 endpoints (share, unshare, who-shared, is-shared) and verify response shapes match contracts/shares-api.md
- [ ] T033 Verify feed smoke test per quickstart.md §6: confirm feed items have `type: 'post' | 'share'`, `is_shared` is present, pagination across mixed items works
- [ ] T034 [P] Benchmark unified-feed latency vs posts-only baseline (SC-007): measure p95 of `feed()` (with the shares `UNION ALL`) against the pre-change posts-only query over ≥100 requests; confirm the delta is ≤ 50ms. Record methodology + result (e.g., a timing script hitting `GET /api/feed`, or direct `PostModel.feed()` timings). If exceeded, profile with `EXPLAIN ANALYZE` and revisit pushed-down LIMIT / index usage
- [ ] T035 [P] Concurrency test for the share counter (SC-005 / FR-008): fire 100 parallel `POST /api/shares/:post_id` requests from distinct users against the same post; assert `posts.number_of_shares` equals exactly 100 (verifies the `AFTER INSERT` trigger has no lost updates). Repeat the mirror with parallel `DELETE` to confirm the decrement path is also lossless and never goes negative
- [ ] T036 Verify migration rollback per quickstart.md §8: run `cd server && npx db-migrate down` and confirm triggers/functions/indexes/table/column are removed cleanly (no orphans in `pg_trigger` / `pg_proc` / `pg_class`); then `npx db-migrate up` to restore and re-run T004 schema checks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (migration must be applied first) — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Phase 2 completion
  - US1 (P1) + US2 (P1): Can proceed in parallel after Phase 2
  - US3 (P2): Depends on US1 (share must exist to unshare)
  - US4 (P2): Depends on US1 (shares must exist to appear in feed)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 3 (P2)**: Depends on US1 (needs `share()` to test `unshare()`)
- **User Story 4 (P2)**: Depends on US1 (needs share records to test feed integration)

### Within Each User Story

- Tests written first (TDD), verify they FAIL before implementation
- Models before controllers
- Controllers before routes
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T005, T006, T007 can all run in parallel (different files, no dependencies)
- T013, T014 (US1 tests) can run in parallel
- T016, T017, T018 (US2 tests) can run in parallel
- T020, T021 (US3 tests) can run in parallel
- T026, T027 (US4 tests) can run in parallel
- T034, T035 (verification/benchmark) can run in parallel within Phase 7
- US1 and US2 can be worked on in parallel after Phase 2

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all type/interface/validation files together:
Task T005: "Create TShare type in server/src/types/share.ts"
Task T006: "Extend IFeedPost in server/src/interfaces/IPost.ts"
Task T007: "Create validation middleware in server/src/middlewares/validations/shares.ts"

# Then sequentially:
Task T008: "Create ShareModel in server/src/models/share.ts"
Task T009: "Create shares controller in server/src/controllers/shares.controller.ts"
Task T010: "Create shares routes in server/src/routes/apis/shares.routes.ts"
Task T011: "Register share_model in server/src/controllers/factory.ts"
Task T012: "Mount shares routes in server/src/routes/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (migration)
2. Complete Phase 2: Foundational (types, model, controller, routes)
3. Complete Phase 3: User Story 1 (share/quote-post creation)
4. **STOP and VALIDATE**: Test US1 independently — share creation, self-share block, idempotent duplicate
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (share counts, who-shared, is-shared)
4. Add User Story 3 → Test independently → Deploy/Demo (unshare)
5. Add User Story 4 → Test independently → Deploy/Demo (feed integration)
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- The model layer MUST NOT manually update `posts.number_of_shares` — triggers own the counter (see research.md §1). Doing so causes double-counting.
- Controller maps SQLSTATE 23514 → HTTP 409 for self-share trigger errors
- `ON CONFLICT DO NOTHING` + rowCount drives share/unshare responses (no pre-check SELECT → no TOCTOU race)
- Commentary normalization: empty/whitespace → null (handled by validation middleware before model)
- **Commit discipline (process)**: after completing each phase (Phases 1–7), draft a short, detailed Conventional Commit message for that phase's changes, present it, and **wait for explicit approval** before running `git add` + `git commit`. Do not auto-commit between phases. Suggested scopes: `feat(db)` (migration), `feat(shares)` (model/controller/routes), `feat(feed)` (post.ts UNION), `test(shares)` (tests), `chore(shares)` (verification/benchmarks).
- Stop at any checkpoint to validate story independently
