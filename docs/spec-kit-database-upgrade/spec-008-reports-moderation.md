# Spec 008: Reports & Moderation

> **Feature ID:** 008 | **Priority:** P2 | **Branch:** `008-reports-moderation`
>
> Return to: [README.md](./README.md)

### 🔧 Supplementary Local Skills (`~/.agents/skills`)

| Step | Skills to Invoke |
|------|------------------|
| Step 5: Plan | `database-migration`, `nodejs-backend-patterns`, `supabase-postgres-best-practices` |
| Step 7: Analyze | `supabase-postgres-best-practices`, `error-handling-patterns` |
| Step 8: Implement | `database-migration`, `nodejs-backend-patterns`, `error-handling-patterns`, `typescript-advanced-types`, `harden`, `git-advanced-workflows` |

---

## Step 1: `/speckit.constitution`

> Already established in [README.md → Constitution](./README.md#1-constitution).

---

## Step 2: `/speckit.specify`

### Prompt

```
/speckit.specify

Act as a senior backend engineer who follows PostgreSQL, TypeScript strict mode, and Node.js security best practices. Adhere to the project constitution (Articles I–IX) and AGENTS.md conventions.

Enable users to report posts, comments, and other users for policy violations in the post-it social app. Provide admins with a moderation queue to review and act on reports (dismiss, warn, or remove content).

WHY: The is_admin flag exists but has no moderation infrastructure. Without a reporting system, harmful content goes unchecked.

USER STORIES:
1. As a user, I want to report a post that violates community guidelines
2. As a user, I want to report a comment that is abusive
3. As a user, I want to report a user profile that is impersonating someone
4. As a user, I want to select a reason when reporting (spam, harassment, etc.)
5. As an admin, I want to view all pending reports in a moderation queue
6. As an admin, I want to dismiss a report (no action needed)
7. As an admin, I want to resolve a report by removing the reported content
8. As an admin, I want to see report statistics (counts by type, status)

ACCEPTANCE CRITERIA:
- Reports for posts, comments, and users
- Fields: reporter, target_type, target_id, reason, description, status
- Statuses: pending, dismissed, resolved
- Only admins can view, dismiss, resolve reports
- UNIQUE per reporter + target (no duplicate reports)
- Users cannot report own content (enforced at application level — PostgreSQL CHECK constraints cannot reference other tables)
- Admin actions logged with resolution note
- Paginated queue filterable by status
```

---

## Step 3: `/speckit.clarify`

### Prompt

```
/speckit.clarify

Act as a senior backend engineer who follows PostgreSQL, TypeScript strict mode, and Node.js security best practices. Adhere to the project constitution (Articles I–IX) and AGENTS.md conventions.

Review Spec 008 (reports & moderation) and clarify:

1. Should there be an auto-action threshold (e.g., 5 reports auto-hides)? I recommend out of scope for V1.
2. Should reports be anonymous to the reported user? I recommend yes.
3. Report reason categories? I recommend: spam, harassment, hate_speech, inappropriate_content, impersonation, other.
4. Idempotency: Spec 007 introduced an API idempotency layer. The UNIQUE (reporter_id, target_type, target_id) constraint naturally prevents duplicate reports, which translates into a 409 Conflict via the PgError handling system. Should POST /api/reports be wrapped with the idempotency middleware, or is the 409 database conflict response sufficient? I recommend the 409 from the UNIQUE constraint is sufficient — no idempotency middleware needed for report creation.
5. Orphaned content: When a moderator resolves a report, should the controller also invoke CommentModel.delete / PostModel.delete, or is resolving strictly an administrative flagging action? I recommend resolving is flag-only in V1 — the reported target is NOT automatically deleted. Moderators resolve the report, and content removal is a separate manual action outside this scope.
6. Should the app validate that target_id actually exists before inserting a report? I recommend yes — the controller should verify the target exists (by target_type) before creating the report, returning 404 if not found.

Resolve all [NEEDS CLARIFICATION] markers.
```

---

## Step 4: `/speckit.checklist`

### Prompt

```
/speckit.checklist

Act as a senior backend engineer who follows PostgreSQL, TypeScript strict mode, and Node.js security best practices. Adhere to the project constitution (Articles I–IX) and AGENTS.md conventions.

Generate a requirements quality checklist for Spec 008 (reports & moderation).

Focus areas:
- Are report reason categories exhaustively defined with clear boundaries between them?
- Is the polymorphic target_type + target_id pattern clearly specified (how is target_id validated per type)?
- Are admin-only access requirements explicitly defined (which endpoints, which roles)?
- Is the self-report prevention requirement specified (DB-level vs. app-level enforcement)?
- Are resolution workflow requirements complete (dismiss vs. resolve — what happens to reported content)?
- Is the dependency on Spec 005 (roles) clearly documented with fallback behavior?
- Are audit trail requirements defined (who resolved, when, with what note)?
- Are duplicate report prevention requirements clear (same reporter + same target)?
- Is the idempotency strategy for POST /api/reports defined (409 from UNIQUE vs. middleware)?
- Is target_id existence validation specified per target_type?
- Is pagination (limit/offset) specified for GET /api/reports with sensible defaults?
- Does the pgError classifier correctly map UNIQUE violation (23505) on reports to 409 Conflict?
- Is contentCreationLimiter applied to POST /api/reports to prevent abuse?

Validate against the constitution (Articles I–IX) and flag any requirement gaps.
```

---

## Step 5: `/speckit.plan`

### Prompt

```
/speckit.plan

Act as a senior backend engineer who follows PostgreSQL, TypeScript strict mode, and Node.js security best practices. Adhere to the project constitution (Articles I–IX) and AGENTS.md conventions.

Invoke these supplementary skills from ~/.agents/skills:
- database-migration
- nodejs-backend-patterns
- supabase-postgres-best-practices

Tech stack: PostgreSQL 15+, db-migrate, raw SQL via pg, TypeScript 5.x, Express 4.

---

### Database Migration

New table: `reports` with polymorphic target_type ('post', 'comment', 'user') and target_id.
- report_id UUID PK DEFAULT uuid_generate_v4()
- reporter_id UUID FK→users(user_id) ON DELETE CASCADE
- target_type VARCHAR(20) NOT NULL, CHECK IN ('post','comment','user')
- target_id UUID NOT NULL (polymorphic — references different tables based on target_type)
- reason VARCHAR(50) NOT NULL, CHECK IN ('spam','harassment','hate_speech','inappropriate_content','impersonation','other')
- description TEXT
- status VARCHAR(20) DEFAULT 'pending', CHECK IN ('pending','dismissed','resolved')
- resolved_by UUID FK→users(user_id) ON DELETE SET NULL
- resolution_note TEXT
- created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
- updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
- resolved_at TIMESTAMPTZ

Constraints:
- UNIQUE(reporter_id, target_type, target_id) — prevents duplicate reports
- FK reporter_id → users(user_id) ON DELETE CASCADE — user deletion removes their reports
- FK resolved_by → users(user_id) ON DELETE SET NULL — preserves report history if admin deleted

Indexes:
- idx_reports_status ON reports(status) — moderation queue filtering
- idx_reports_reporter_id ON reports(reporter_id) — user's report history
- idx_reports_target ON reports(target_type, target_id) — lookup reports for a specific target
- idx_reports_created_at ON reports(created_at DESC) — chronological queue ordering

Migration files:
- [NEW] server/migrations/sqls/[TIMESTAMP]-reports-up.sql
- [NEW] server/migrations/sqls/[TIMESTAMP]-reports-down.sql
- [NEW] server/migrations/[TIMESTAMP]-reports.js

---

### Type Definitions

[NEW] server/src/types/report.ts — strict TypeScript types:
- TReport — database row shape (all fields including report_id, timestamps)
- TReportInput — creation shape (reporter_id, target_type, target_id, reason, description)
- TargetType — literal union: 'post' | 'comment' | 'user'
- ReportReason — literal union: 'spam' | 'harassment' | 'hate_speech' | 'inappropriate_content' | 'impersonation' | 'other'
- ReportStatus — literal union: 'pending' | 'dismissed' | 'resolved'

---

### Models Layer

[NEW] server/src/models/report.ts — database access operations:
- create(reporterId, targetType, targetId, reason, description) — INSERT, UNIQUE violation bubbles to pgError as 409
- getById(reportId) — SELECT single report by UUID
- list(status?, targetType?, limit, offset) — paginated, index-backed query for moderation queue
- dismiss(reportId, resolvedBy, resolutionNote) — UPDATE status='dismissed', set resolved_by, resolved_at, resolution_note
- resolve(reportId, resolvedBy, resolutionNote) — UPDATE status='resolved', set resolved_by, resolved_at, resolution_note
- countByStatus() — aggregate counts grouped by status for admin dashboard

Note: DB constraint violations (e.g., duplicate reports 23505) bubble up and are formatted into HTTP responses by the pgError classify middleware from Spec 007.

---

### API Controllers

[NEW] server/src/controllers/reports.controller.ts — 5 endpoint handlers:
- createReport — extracts user ID from JWT, validates target_type/target_id/reason, checks target existence, invokes model. Returns 201.
- listReports — admin-only. Supports query filters (?status=&targetType=). Paginated with default limit/offset.
- getReportStats — admin-only. Returns aggregate counts by status.
- dismissReport — admin-only. Validates report exists and is 'pending', updates to 'dismissed'.
- resolveReport — admin-only. Validates report exists and is 'pending', updates to 'resolved'. Does NOT auto-delete reported content (V1 is flag-only).

---

### Routes

[NEW] server/src/routes/apis/reports.routes.ts — Express routes:
- POST   /api/reports               → createReport (authenticated user, contentCreationLimiter)
- GET    /api/reports               → listReports (admin only, ?status=&targetType=&limit=&offset=)
- GET    /api/reports/stats         → getReportStats (admin only)
- PATCH  /api/reports/:id/dismiss   → dismissReport (admin only)
- PATCH  /api/reports/:id/resolve   → resolveReport (admin only)

Uses requirePermission('reports.manage') for admin routes (or is_admin fallback if Spec 005 not done).
Input validation via express-validator on POST body and query params.

[MODIFY] server/src/routes/index.ts — mount /api/reports on the main router.

---

Dependency: Spec 005 (roles) for requirePermission('reports.manage'). Fallback: is_admin boolean.
Integration: Spec 007 pgError classifier maps 23505 → 409 for duplicate reports.
```

---

## Step 6: `/speckit.tasks`

### Prompt

```
/speckit.tasks

Act as a senior backend engineer who follows PostgreSQL, TypeScript strict mode, and Node.js security best practices. Adhere to the project constitution (Articles I–IX) and AGENTS.md conventions.

Generate task breakdown for Spec 008 (reports & moderation).

T001 [ ] Create migration files (cd server && npx db-migrate create reports --sql-file)
T002 [ ] Write up.sql — reports table with FKs, CHECKs, UNIQUE, indexes
T003 [ ] Write down.sql — drop indexes then table
T004 [ ] Create types/report.ts (TReport, TReportInput, ReportStatus, ReportReason, TargetType)
T005 [ ] Create models/report.ts (create, getById, list, dismiss, resolve, countByStatus)
T006 [ ] Create admin-only middleware (or use requirePermission if Spec 005 done)
T007 [ ] Create controllers/reports.controller.ts (5 endpoints: createReport, listReports, getReportStats, dismissReport, resolveReport)
T008 [ ] Create routes/apis/reports.routes.ts with express-validator input validation
T009 [ ] Write tests for ReportModel
T010 [ ] Write tests for reports.controller (include admin guard tests, 409 duplicate test, 404 target-not-found test)
T011 [ ] Register reportRoutes in server/src/routes/index.ts (import + mount under /api/reports)
T012 [ ] Add contentCreationLimiter to POST /api/reports
T013 [ ] Run migration (npx db-migrate up), verify schema with \d reports
T014 [ ] Run pnpm run lint && pnpm run prettier:check && pnpm test
```

---

## Step 7: `/speckit.analyze`

### Prompt

```
/speckit.analyze

Act as a senior backend engineer who follows PostgreSQL, TypeScript strict mode, and Node.js security best practices. Adhere to the project constitution (Articles I–IX) and AGENTS.md conventions.

Invoke these supplementary skills from ~/.agents/skills:
- supabase-postgres-best-practices
- error-handling-patterns

Analyze Spec 008 (reports & moderation):

1. Polymorphic target_type + target_id — is this the right pattern, or should we use separate FK columns (post_id, comment_id, user_id) with CHECK ensuring exactly one is non-null?
2. UNIQUE(reporter_id, target_type, target_id) — does this correctly prevent duplicates across all target types?
3. Admin-only routes — are all 4 admin endpoints protected? Can a regular user bypass via direct PATCH?
4. CHECK constraints — do they validate enum fields at DB level for target_type, status, and reason?
5. resolved_by uses ON DELETE SET NULL — preserves report history if an admin account is deleted. Correct?
6. Target existence validation — should the controller verify target_id exists before INSERT? What happens if a post is deleted between report creation and admin review?
7. Self-report prevention — app-level check in controller. What prevents a user from reporting their own post/comment? Is reporter_id == post.user_id checked?
8. Pagination performance — does the list query use the created_at DESC index efficiently for offset pagination?
9. pgError integration — does the 23505 UNIQUE violation on duplicate reports correctly surface as 409 Conflict through the Spec 007 error classifier?
10. Race condition — can two concurrent POST /api/reports for the same target both succeed before the UNIQUE constraint kicks in? (DB constraint handles this — confirm)
11. Does the model follow existing patterns (pool.connect(), transactions for writes, connection.release() in finally)?
```

---

## Step 8: `/speckit.implement`

### Prompt

```
/speckit.implement

Act as a senior backend engineer who follows PostgreSQL, TypeScript strict mode, and Node.js security best practices. Adhere to the project constitution (Articles I–IX) and AGENTS.md conventions.

Invoke these supplementary skills from ~/.agents/skills:
- database-migration
- nodejs-backend-patterns
- error-handling-patterns
- typescript-advanced-types
- harden
- git-advanced-workflows

Implement Spec 008: Reports & Moderation.

Steps:
1. cd server && npx db-migrate create reports --sql-file
2. Write up.sql with reports table (polymorphic target, CHECK constraints, indexes)
3. Write down.sql
4. Create types/report.ts
5. Create models/report.ts
6. Create admin-only middleware (or reuse requirePermission if Spec 005 done)
7. Create controllers/reports.controller.ts
8. Create routes/apis/reports.routes.ts
9. Register routes in server/src/routes/index.ts
10. npx db-migrate up
11. pnpm run lint && pnpm run prettier:check && pnpm test

CRITICAL:
- Do NOT auto-delete reported content on resolve — V1 is flag-only (resolved in Step 3 clarify)
- UNIQUE violation (23505) on duplicate reports must surface as 409 Conflict via pgError classifier (Spec 007)
- Controller must validate target_id existence before INSERT — return 404 if target not found
- Controller must prevent self-reporting — check reporter_id != content owner
- All admin routes protected by requirePermission('reports.manage') or is_admin fallback
- Add contentCreationLimiter to POST /api/reports to prevent report spam
- Model follows existing patterns: pool.connect(), transactions for writes, connection.release() in finally (Article IV)
- Preserve { cause: error } on all rethrows (AGENTS.md preserve-caught-error rule)
- No any types, no non-null assertions on optional chains (Article III + V)
- JSDoc follows project conventions (no redundant names, no @description, include @route)
```

### Full `up.sql`

```sql
CREATE TABLE IF NOT EXISTS reports (
  report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_id UUID NOT NULL,
  reason VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  resolved_by UUID,
  resolution_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT fk_report_reporter FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_report_resolver FOREIGN KEY (resolved_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT uq_report UNIQUE (reporter_id, target_type, target_id),
  CONSTRAINT chk_valid_target_type CHECK (target_type IN ('post', 'comment', 'user')),
  CONSTRAINT chk_valid_status CHECK (status IN ('pending', 'dismissed', 'resolved')),
  CONSTRAINT chk_valid_reason CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'inappropriate_content', 'impersonation', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
```

### Full `down.sql`

```sql
DROP INDEX IF EXISTS idx_reports_created_at;
DROP INDEX IF EXISTS idx_reports_target;
DROP INDEX IF EXISTS idx_reports_reporter_id;
DROP INDEX IF EXISTS idx_reports_status;
DROP TABLE IF EXISTS reports CASCADE;
```
