# Data Model: Reports & Moderation

**Date**: 2026-05-03 | **Spec**: [spec.md](./spec.md)

## Entity: Report

Represents a user's complaint about content. Single table with polymorphic target.

### Fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| report_id | UUID | PK, DEFAULT uuid_generate_v4() | Primary key |
| reporter_id | UUID | NOT NULL, FK→users(user_id) ON DELETE CASCADE | Reporter; cascading delete when user deleted |
| target_type | VARCHAR(20) | NOT NULL, CHECK IN ('post','comment','user') | Polymorphic discriminator |
| target_id | UUID | NOT NULL | References different tables based on target_type |
| reason | VARCHAR(50) | NOT NULL, CHECK IN ('spam','harassment','hate_speech','inappropriate_content','impersonation','other') | Predefined reason category |
| description | TEXT | NULLABLE | Optional free-text description |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','dismissed','resolved') | Report lifecycle status |
| resolved_by | UUID | NULLABLE, FK→users(user_id) ON DELETE SET NULL | Admin who acted; SET NULL preserves history |
| resolution_note | TEXT | NULLABLE | Admin's note on dismissal/resolution |
| created_at | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Report creation time |
| updated_at | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Last modification time |
| resolved_at | TIMESTAMPTZ | NULLABLE | When report was dismissed/resolved |

### Constraints

| Name | Type | Definition | Purpose |
|------|------|------------|---------|
| reports_pkey | PRIMARY KEY | (report_id) | Unique identification |
| fk_report_reporter | FOREIGN KEY | reporter_id → users(user_id) ON DELETE CASCADE | Reporter integrity |
| fk_report_resolver | FOREIGN KEY | resolved_by → users(user_id) ON DELETE SET NULL | Preserves history on admin deletion |
| uq_report | UNIQUE | (reporter_id, target_type, target_id) | Prevents duplicate reports |
| chk_valid_target_type | CHECK | target_type IN ('post','comment','user') | Enum enforcement |
| chk_valid_status | CHECK | status IN ('pending','dismissed','resolved') | Enum enforcement |
| chk_valid_reason | CHECK | reason IN ('spam','harassment','hate_speech','inappropriate_content','impersonation','other') | Enum enforcement |

### Indexes

| Name | Definition | Purpose |
|------|------------|---------|
| idx_reports_status | (status) | Queue filtering by status |
| idx_reports_reporter_id | (reporter_id) | User's report history |
| idx_reports_target | (target_type, target_id) | Lookup reports for a specific target |
| idx_reports_created_at | (created_at DESC) | Chronological queue ordering |

### State Transitions

```
                    ┌──────────┐
         ┌─────────│  pending  │──────────┐
         │         └──────────┘           │
         │                                │
    dismiss()                        resolve()
         │                                │
         ▼                                ▼
  ┌───────────┐                    ┌──────────┐
  │ dismissed │                    │ resolved │
  └───────────┘                    └──────────┘
```

- Only `pending` reports can transition (FR-013)
- Both transitions require `resolved_by` and `resolved_at` to be set
- No reverse transitions allowed (dismissed/resolved → pending)
- Concurrent admin actions: second UPDATE sees status ≠ 'pending' via WHERE clause, rowCount=0 → 409

### Relationships

```
users (reporter) ──── 1:N ──── reports (reporter_id, ON DELETE CASCADE)
users (resolver) ──── 1:N ──── reports (resolved_by, ON DELETE SET NULL)
posts    ──── referenced by ──── reports WHERE target_type = 'post'
comments ──── referenced by ──── reports WHERE target_type = 'comment'
users    ──── referenced by ──── reports WHERE target_type = 'user'
```

Note: `target_id` has no FK constraint — the target table is determined by `target_type` at runtime. Existence validation is application-level (FR-006).

## TypeScript Types

```typescript
type TargetType = 'post' | 'comment' | 'user';
type ReportReason = 'spam' | 'harassment' | 'hate_speech' | 'inappropriate_content' | 'impersonation' | 'other';
type ReportStatus = 'pending' | 'dismissed' | 'resolved';

type TReport = {
  report_id: string;
  reporter_id: string;
  target_type: TargetType;
  target_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
};

type TReportInput = {
  reporter_id: string;
  target_type: TargetType;
  target_id: string;
  reason: ReportReason;
  description?: string;
};
```
