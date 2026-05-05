# Quickstart: Full-Text Search

**Branch**: `009-full-text-search` | **Date**: 2026-05-04

## Prerequisites

- PostgreSQL 15+ with `plpgsql` extension available
- Existing `posts` table with `description` column
- `db-migrate` installed (`npm install -g db-migrate`)

## Setup

1. Run migration:
   ```bash
   cd server && npx db-migrate up
   ```

2. Verify trigger works:
   ```sql
   INSERT INTO posts (user_id, description) VALUES ('<uuid>', 'Full-text search is amazing');
   SELECT search_vector FROM posts WHERE description LIKE '%amazing%';
   -- Should return: "'amazing':4 'full-text':1 'search':2"
   ```

3. Verify GIN index exists:
   ```sql
   SELECT indexname FROM pg_indexes WHERE indexname = 'idx_posts_search';
   ```

## Usage

```bash
# Basic search
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/search?q=travel&limit=10"

# Exact phrase
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/search?q=%22coffee+shop%22"

# Exclusion
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/search?q=coffee+-tea"

# Pagination
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/search?q=travel&limit=10&cursor=<nextCursor>"
```

## Files Created

| File | Purpose |
|------|---------|
| `server/src/types/search.ts` | TSearchResult type |
| `server/src/models/search.ts` | SearchModel with search method |
| `server/src/controllers/search.controller.ts` | Search controller |
| `server/src/routes/apis/search.routes.ts` | Search route |
| `server/src/middlewares/validations/search.ts` | Query validation |
| `server/migrations/XXXXXX-full-text-search-up.sql` | Migration up |
| `server/migrations/XXXXXX-full-text-search-down.sql` | Migration down |

## Files Modified

| File | Change |
|------|--------|
| `server/src/routes/index.ts` | Import + mount search routes under `/search` |
| `server/src/controllers/factory.ts` | Instantiate + export `search_model` |

## Rollback

```bash
cd server && npx db-migrate down
```

This drops the trigger, function, index, and column. Zero data loss — `search_vector` is derived data.
