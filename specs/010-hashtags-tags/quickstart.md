# Quickstart: Hashtags & Tags

**Feature**: Spec 010 | **Date**: 2026-05-09

## Prerequisites

- PostgreSQL 15+ with `uuid-ossp` extension enabled
- `pg_trgm` extension (installed by migration)
- Redis running (for rate limiter store)
- Node.js 18+

## Setup

### 1. Environment Variables

Add to `.env`:

```env
# Tag trending window (hours). Default: 24
TAG_TRENDING_WINDOW_HOURS=24

# Tag search rate limiting (public endpoints)
RATE_LIMIT_TAG_SEARCH_WINDOW_MS=60000
RATE_LIMIT_TAG_SEARCH_MAX=30
```

### 2. Run Migration

```bash
cd server
npx db-migrate up
```

This creates:
- `tags` table with `chk_tags_name` and `chk_tags_post_count` constraints
- `post_tags` junction table with `uq_post_tag` unique constraint
- `pg_trgm` extension and GIN index for tag search
- `trg_tags_updated_at` trigger on tags
- Composite index `idx_post_tags_tag_created` for trending queries

### 3. Verify Schema

```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE tablename IN ('tags', 'post_tags');

-- Check constraints
SELECT conname FROM pg_constraint WHERE conrelid = 'tags'::regclass;
-- Expected: tags_pkey, tags_name_key, chk_tags_name, chk_tags_post_count

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename IN ('tags', 'post_tags');
-- Expected: idx_tags_post_count, idx_tags_name_trgm, idx_post_tags_post_id,
--           idx_post_tags_tag_id, idx_post_tags_tag_created
```

## Key Implementation Files

| File | Purpose |
|------|---------|
| `types/tag.ts` | TTag, TPostTag type definitions |
| `utilities/extractHashtags.ts` | Extract #hashtags from description → string[] |
| `models/tag.ts` | TagModel with all tag operations |
| `controllers/tagController.ts` | 3 endpoint handlers |
| `routes/apis/tags.routes.ts` | Route definitions |
| `middlewares/validations/tags.ts` | express-validator schemas |
| `middlewares/rateLimiter.ts` | tagSearchLimiter (new addition) |
| `configs/config.ts` | TAG_TRENDING_WINDOW_HOURS (new addition) |
| `services/scheduledTasks.ts` | Hourly orphan cleanup (new addition) |

## Modified Files

| File | Change |
|------|--------|
| `interfaces/IPost.ts` | Add `tags: string[]` to IFeedPost |
| `models/post.ts` | Pass PoolClient to TagModel on create/update/delete |
| `models/search.ts` | Add tags subquery for IFeedPost |
| `controllers/factory.ts` | Instantiate and export tag_model |
| `routes/index.ts` | Mount tags routes |

## Quick Test

```bash
# Create a post with hashtags (authenticated)
curl -X POST http://localhost:3000/api/posts/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"description": "Great trip! #travel #food #adventure"}'

# Get trending tags (public)
curl http://localhost:3000/api/tags/trending

# Search tags (public)
curl "http://localhost:3000/api/tags/search?q=travel"

# Get posts by tag (optional auth)
curl http://localhost:3000/api/tags/travel/posts
```

## Rollback

```bash
cd server
npx db-migrate down
```

Drops `post_tags`, `tags`, trigger, and indexes. `pg_trgm` extension is intentionally left in place.
