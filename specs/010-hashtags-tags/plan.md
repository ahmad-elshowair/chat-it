# Implementation Plan: Hashtags & Tags

**Branch**: `010-hashtags-tags` | **Date**: 2026-05-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-hashtags-tags/spec.md`

## Summary

Enable posts to be tagged with hashtags extracted from description text. Users discover content via trending tags (24h window), tag search (trigram), and paginated tag feeds. Tags are stored in a `tags` table with denormalized `post_count`, linked to posts via a `post_tags` junction table. All counter updates occur in the same transaction as association changes (Article IV). Orphan cleanup runs hourly via scheduled task.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Express 4, pg 8 (node-postgres), db-migrate, express-validator, express-rate-limit, rate-limit-redis, ioredis, node-cron
**Storage**: PostgreSQL 15+ (primary), Redis (rate limiter store)
**Testing**: pnpm test (deferred per constitution — manual verification + lint gates)
**Target Platform**: Linux server (Node.js)
**Project Type**: Web service (REST API)
**Performance Goals**: Tag search < 1s for 10K+ tags, trending < 2s, post create/update +50ms max overhead
**Constraints**: No ORM (Article I), migration-first (Article II), max 3 tables per migration (Article VII), no query builders (Article VIII)
**Scale/Scope**: 1K-10K unique tags, 10-50x post_tags rows vs posts, 20 results max per trending/search

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Principle | Status | Notes |
|---------|-----------|--------|-------|
| I | Raw SQL via pg, no ORM | PASS | All queries are raw SQL via `pg` PoolClient. TagModel follows existing model pattern. |
| II | Migration-first via db-migrate | PASS | Single migration creates `tags` + `post_tags` (2 tables, within Article VII limit of 3). |
| III | TypeScript strict, types in types/ | PASS | New `types/tag.ts` for TTag, TPostTag. IFeedPost gains `tags: string[]`. |
| IV | Transaction safety | PASS | syncPostTags and decrementPostCount use caller's PoolClient. post_count updated in same transaction. chk_tags_post_count >= 0 constraint. |
| V | Prettier/ESLint/JSDoc | PASS | Will follow existing conventions. JSDoc with imperative mood, @route tags. |
| VI | Testing gates | PASS | Deferred per constitution. Lint/prettier gates apply. |
| VII | Max 3 tables per migration | PASS | 2 tables (tags, post_tags) in single migration. |
| VIII | No query builders, no repository abstractions | PASS | TagModel is a plain class with raw SQL, same as all existing models. |
| IX | Backwards compatibility | PASS | New tables, new columns have defaults. IFeedPost.tags added via correlated subquery — no existing columns removed or modified. |

**Post-Design Re-check**: All gates remain PASS. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/010-hashtags-tags/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output — API contracts
├── checklists/
│   ├── requirements.md  # Spec quality checklist
│   └── requirements-quality.md # Detailed quality checklist
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
server/src/
├── configs/
│   └── config.ts              # ADD: TAG_TRENDING_WINDOW_HOURS env var
├── controllers/
│   ├── factory.ts             # MODIFY: add tag_model export
│   └── tagController.ts       # NEW: 3 endpoints (trending, search, postsByTag)
├── interfaces/
│   └── IPost.ts               # MODIFY: add tags: string[] to IFeedPost
├── middlewares/
│   ├── rateLimiter.ts         # ADD: tagSearchLimiter (30 req/min per IP)
│   └── validations/
│       └── tags.ts            # NEW: express-validator for tag endpoints
├── models/
│   ├── post.ts                # MODIFY: pass PoolClient to TagModel
│   ├── search.ts              # MODIFY: add tags subquery to IFeedPost
│   └── tag.ts                 # NEW: TagModel (findOrCreate, syncPostTags, etc.)
├── routes/
│   ├── apis/
│   │   └── tags.routes.ts     # NEW: tag route definitions
│   └── index.ts               # MODIFY: mount /api/tags
├── services/
│   └── scheduledTasks.ts      # MODIFY: add hourly orphan cleanup
├── types/
│   └── tag.ts                 # NEW: TTag, TPostTag type definitions
└── utilities/
    └── extractHashtags.ts     # NEW: #hashtag extraction from description

server/migrations/
└── sqls/
    ├── *-hashtags-up.sql      # NEW: tags + post_tags DDL
    └── *-hashtags-down.sql    # NEW: rollback DDL
```

**Structure Decision**: Follows existing project structure — new files in established directories, modifications to existing files for cross-cutting concerns.

## Complexity Tracking

No violations to justify — all constitution gates PASS.
