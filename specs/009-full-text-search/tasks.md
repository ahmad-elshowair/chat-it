# Tasks: Full-Text Search

**Input**: Design documents from `/specs/009-full-text-search/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/search-api.md

**Tests**: Not included — project has no test infrastructure (constitution: "Deferred per user input").

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration for search_vector column, index, trigger, and backfill

- [x] T001 Create migration files in `server/migrations/` via `cd server && npx db-migrate create full-text-search --sql-file`
- [x] T002 Write `server/migrations/sqls/*-full-text-search-up.sql` — ALTER TABLE ADD COLUMN search_vector tsvector (IF NOT EXISTS), CREATE INDEX idx_posts_search GIN (IF NOT EXISTS), CREATE OR REPLACE FUNCTION posts_search_vector_update(), CREATE TRIGGER trg_posts_search_vector BEFORE INSERT OR UPDATE OF description, idempotent backfill UPDATE WHERE search_vector IS NULL (FR-016, FR-020)
- [x] T003 Write `server/migrations/sqls/*-full-text-search-down.sql` — DROP TRIGGER IF EXISTS, DROP FUNCTION IF EXISTS, DROP INDEX IF EXISTS, ALTER TABLE DROP COLUMN IF EXISTS — zero data loss per FR-019

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type definitions and model that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create `server/src/types/search.ts` — TSearchResult extending IFeedPost with `rank: number` for internal sorting; rank MUST be stripped before API response per FR-015
- [x] T005 Create `server/src/models/search.ts` — SearchModel class with `search(userId, query, limit, cursor?, direction?)` method using `websearch_to_tsquery('english', $1)`, `ORDER BY rank DESC, p.created_at DESC` per FR-004 (implement in initial creation — not deferred), composite cursor (Base64 JSON of `{rank, post_id}`), LEFT JOIN likes + bookmarks for user interaction state, `pool.query()` for single-statement reads, `console.error('[SEARCH MODEL]')` for error logging, `throw new Error('...', { cause: error })` for rethrow (preserve-caught-error rule)
- [x] T006 Add `search_model` singleton to `server/src/controllers/factory.ts` — import SearchModel, instantiate, export

**Checkpoint**: Foundation ready — type, model, and factory registration complete. User story implementation can begin.

---

## Phase 3: User Story 1 - Search Posts by Keywords (Priority: P1) 🎯 MVP

**Goal**: Users can search posts by keywords with English stemming and see results with author data and interaction state

**Independent Test**: `GET /api/search?q=travel` returns posts containing "traveling" with full IFeedPost shape. `GET /api/search?q` (empty) returns 400. `GET /api/search?q=a` returns 400.

### Implementation for User Story 1

- [x] T007 Create `server/src/middlewares/validations/search.ts` — express-validator chain: `query('q').trim().notEmpty().isLength({min:2,max:200}).escape()`, `query('limit').optional().isInt({min:1,max:50}).toInt()`, `query('cursor').optional().isString()`, `query('direction').optional().isIn(['next','previous'])` per FR-002, FR-014
- [x] T008 Create `server/src/controllers/search.controller.ts` — `search` handler: validation check → 400, auth check → 401, parse q/limit/cursor/direction from query, call `search_model.search()`, detect hasMore (fetched limit+1), strip `rank` from response per FR-015, build nextCursor/previousCursor via `search_model.encodeCursor(rank, post_id)`, return via `sendResponse.success()` with `{data, pagination}` shape, handle AppError cursor errors → 400, `console.error('[searchController]')` for logging per FR-013
- [x] T009 Create `server/src/routes/apis/search.routes.ts` — `Router()`, `GET /` with `authorize_user` + `validateSearch` + `searchController.search`, export default
- [x] T010 Register search route in `server/src/routes/index.ts` — `import search from './apis/search.routes.js'`, `routes.use('/search', search)` per FR-001

**Checkpoint**: At this point, `GET /api/search?q=travel` returns matching posts with author data. Query validation works (< 2 chars → 400, > 200 chars → 400). Empty results return 200 with `[]`.

---

## Phase 4: User Story 2 - Relevance-Ranked Results (Priority: P2)

**Goal**: Results are ordered by text relevance (primary) with recency as tiebreaker

**Independent Test**: Create posts with varying relevance (one with 2 matching words, one with 1), search, verify the 2-word post ranks higher. Create 2 posts with equal relevance, verify newer one ranks higher.

### Implementation for User Story 2

- [x] T011 Verify `server/src/models/search.ts` — ORDER BY clause `rank DESC, p.created_at DESC` correctly implemented from T005 per FR-004; composite cursor WHERE clause uses `(rank, post_id) < (cursor_rank, cursor_post_id)` for next and `>` for previous direction — verified, no changes needed

**Checkpoint**: Search results are now correctly ranked by relevance then recency. Composite cursor preserves order across pages.

---

## Phase 5: User Story 3 - Paginated Search Results (Priority: P3)

**Goal**: Users can paginate through search results using composite cursors without missing or duplicating posts

**Independent Test**: Search for a broad term, use `nextCursor` to fetch page 2, use `previousCursor` to go back to page 1, verify no duplicates. Pass an invalid/deleted-post cursor → 400.

### Implementation for User Story 3

- [x] T012 Cursor pagination already implemented in T005 — `encodeCursor`/`decodeCursor` methods, bidirectional `(rank, post_id) < / >` conditions, post existence check → AppError(400), all in `server/src/models/search.ts`
- [x] T013 Controller error handling already implemented in T008 — catches AppError cursor errors → `sendResponse.error(res, 'Invalid cursor', 400)` in `server/src/controllers/search.controller.ts`

**Checkpoint**: Full pagination works bidirectionally. Invalid cursors return 400. Empty results return 200 with standard pagination metadata.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, quality checks, and integration validation

- [x] T014 Run migration: `cd server && npx db-migrate up` — migration applied successfully, search_vector column added, GIN index created, trigger created, backfill completed
- [x] T015 Verify trigger works — INSERT test post confirmed tsvector auto-populated with English stemming ('full-text' → 'full-text', 'search' → 'search', 'test' → 'test', 'verification' → 'verif')
- [x] T016 Run `EXPLAIN ANALYZE` — GIN index `idx_posts_search` confirmed via `Bitmap Index Scan` (seq scan on 1-row table is expected; forced index scan verified correct)
- [x] T017 Run `pnpm run lint`, `pnpm run prettier:check` in server — both pass with zero errors/warnings
- [x] T018 Validate full search flow — all cases pass: valid query returns ranked results, ranking orders multi-match posts first, empty results return 200/[], query < 2 chars → 400, missing query → 400, unauthenticated → 401, invalid cursor → 400, bidirectional cursor pagination works (page 1 → page 2 → back to page 1 with no duplicates), `rank` stripped from API response

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Phase 2 completion
  - US1 (Phase 3): Can start after Phase 2
  - US2 (Phase 4): Logically builds on US1 but only modifies model (T011 is a verification task)
  - US3 (Phase 5): Builds on US2 (needs cursor logic in model)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 — ranks results (ORDER BY already in model from T005)
- **User Story 3 (P3)**: Depends on US2 (cursor logic extends ranking)

### Parallel Opportunities

- T001, T002, T003 can run sequentially (T002 depends on T001 for filename)
- T004, T005, T006 can partially parallel (T005 depends on T004 for type)
- T007, T008 can partially parallel (T008 depends on T007 for validator import)
- T011, T012, T013 are sequential within their phases

---

## Parallel Example: Phase 2

```bash
# After T004 completes:
Task: "T005 Create server/src/models/search.ts"  # depends on T004
Task: "T006 Add search_model to factory.ts"       # can start once T005 exports
```

## Parallel Example: Phase 3

```bash
# T007 first (validation), then:
Task: "T008 Create search.controller.ts"   # depends on T007
Task: "T009 Create search.routes.ts"       # depends on T008
# T010 is last (route registration)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (migration)
2. Complete Phase 2: Foundational (type + model + factory)
3. Complete Phase 3: User Story 1 (validation + controller + route + registration)
4. **STOP and VALIDATE**: `GET /api/search?q=travel` returns results
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test search returns results → Deploy (MVP!)
3. Add User Story 2 → Test ranking order → Deploy
4. Add User Story 3 → Test pagination → Deploy
5. Polish → Run all verification → Ship

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test tasks — project has no test infrastructure per constitution
- Rank field MUST be stripped from API response (FR-015) — controller responsibility
- websearch_to_tsquery handles malformed input gracefully (unbalanced quotes → plain keywords)
- Composite cursor format: Base64(JSON.stringify({ rank, post_id }))
- Factory pattern: singleton instantiation, import in controller
- Follow sectional comments: `// ───── LABEL ──────────────────────────────`
- Commit after each task or logical group
