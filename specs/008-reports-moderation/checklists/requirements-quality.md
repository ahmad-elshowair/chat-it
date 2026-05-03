# Requirements Quality Checklist: Reports & Moderation

**Purpose**: Validate requirements completeness, clarity, and consistency for the reports & moderation feature before planning
**Created**: 2026-05-03
**Feature**: [spec.md](../spec.md)
**Depth**: Standard (13 focus areas from user input)
**Actor/Timing**: Author pre-planning gate

## Report Reason Categories

- [ ] CHK001 - Are all six reason categories (spam, harassment, hate_speech, inappropriate_content, impersonation, other) explicitly enumerated in the spec with no gaps for common violation types? [Completeness, Spec §FR-002]
- [ ] CHK002 - Are the boundaries between reason categories clearly defined so that any report unambiguously maps to exactly one category? [Clarity]
- [ ] CHK003 - Is the "other" catch-all category documented as accepting any violation not covered by the five named categories? [Completeness, Spec §Assumptions]

## Polymorphic Target Pattern

- [ ] CHK004 - Is the target_type + target_id polymorphic pattern explicitly described with the three supported types (post, comment, user)? [Completeness, Spec §Key Entities]
- [ ] CHK005 - Are validation requirements for target_id specified per target_type (e.g., target_id must reference an existing post when target_type is "post")? [Clarity, Spec §FR-006]
- [ ] CHK006 - Is the behavior specified when a target_type is valid but target_id does not exist in the corresponding entity? [Edge Case, Spec §Edge Cases]
- [ ] CHK007 - Is the behavior specified if an unsupported target_type value is provided? [Gap]

## Access Control Requirements

- [ ] CHK008 - Are admin-only endpoints explicitly enumerated (list reports, dismiss, resolve, statistics)? [Completeness, Spec §FR-007]
- [ ] CHK009 - Is the specific permission name ("reports.manage") documented for gating admin endpoints? [Clarity, Spec §Assumptions]
- [ ] CHK010 - Are both admin and moderator roles identified as authorized for moderation actions, and is the distinction between their capabilities defined? [Clarity, Spec §FR-007]
- [ ] CHK011 - Are the authorization requirements for report creation (any authenticated user) clearly separated from admin-only actions? [Consistency, Spec §FR-001 vs FR-007]

## Self-Report Prevention

- [ ] CHK012 - Is self-report prevention specified as application-level enforcement rather than database constraint, with rationale documented? [Clarity, Spec §FR-005]
- [ ] CHK013 - Are all three self-report scenarios covered: reporting own post, own comment, and own user profile? [Completeness, Spec §FR-005]
- [ ] CHK014 - Is the expected error response for self-report attempts specified (status code, message)? [Gap]

## Resolution Workflow

- [ ] CHK015 - Are both dismissal and resolution clearly distinguished with separate status values ("dismissed" vs "resolved")? [Clarity, Spec §FR-010 vs FR-011]
- [ ] CHK016 - Is it explicitly documented that resolving a report does NOT auto-delete the reported content in V1? [Completeness, Spec §Clarifications Session 2026-05-02]
- [ ] CHK017 - Is the state transition rule defined (only "pending" reports can be dismissed or resolved)? [Completeness, Spec §FR-013]
- [ ] CHK018 - Is the behavior specified when an admin attempts to re-dismiss or re-resolve an already-handled report? [Edge Case, Spec §Edge Cases]

## RBAC Dependency (Spec 005)

- [ ] CHK019 - Is the dependency on Spec 005 (roles & permissions) explicitly documented? [Completeness, Spec §Assumptions]
- [ ] CHK020 - Is a fallback behavior specified if Spec 005 is not yet deployed (e.g., is_admin boolean)? [Gap]
- [ ] CHK021 - Is the specific permission string ("reports.manage") that maps to the RBAC system documented? [Clarity, Spec §Assumptions]

## Audit Trail

- [ ] CHK022 - Are the audit trail fields defined: who resolved (resolved_by), when (resolved_at), and what note (resolution_note)? [Completeness, Spec §FR-012]
- [ ] CHK023 - Is the requirement to log moderation actions in the system audit log (Spec 006) documented? [Completeness, Spec §FR-016]
- [ ] CHK024 - Is the behavior specified when the admin who handled a report is later deleted (resolved_by cleared, note preserved)? [Edge Case, Spec §FR-015, Edge Cases]

## Duplicate Report Prevention

- [ ] CHK025 - Is the uniqueness constraint clearly defined as (reporter_id, target_type, target_id)? [Clarity, Spec §FR-004]
- [ ] CHK026 - Is the error behavior for duplicate report attempts specified (409 Conflict)? [Completeness, Spec §Acceptance Scenarios US1]
- [ ] CHK027 - Is the duplicate prevention strategy documented as database-level (UNIQUE constraint) rather than application-level check? [Clarity, Spec §Assumptions]

## Idempotency Strategy

- [ ] CHK028 - Is the decision documented that the UNIQUE constraint's 409 Conflict is sufficient (no additional idempotency middleware)? [Completeness, Spec §Clarifications Session 2026-05-02]
- [ ] CHK029 - Is the interaction between Spec 007's pgError classifier and the 23505 unique_violation error code specified? [Gap]

## Target Existence Validation

- [ ] CHK030 - Is the requirement to validate target existence before report insertion documented? [Completeness, Spec §FR-006]
- [ ] CHK031 - Is the validation approach specified per target_type (e.g., check posts table for type "post")? [Clarity, Gap]
- [ ] CHK032 - Is the error response for non-existent targets specified (404 Not Found)? [Completeness, Spec §Acceptance Scenarios US1]

## Pagination

- [ ] CHK033 - Are pagination parameters (limit and offset) specified for the moderation queue endpoint? [Completeness, Spec §FR-008]
- [ ] CHK034 - Are sensible default values for pagination defined (e.g., default limit, max limit)? [Gap]
- [ ] CHK035 - Is the ordering requirement (newest first by creation date) explicitly stated? [Clarity, Spec §FR-008]

## Rate Limiting & Abuse Prevention

- [ ] CHK036 - Is the requirement for rate limiting on report creation documented? [Completeness, Spec §Assumptions]
- [ ] CHK037 - Is the specific rate limiter to apply (contentCreationLimiter) named? [Gap]
- [ ] CHK038 - Are rate limit thresholds specified or deferred to implementation? [Ambiguity]

## Notes

- Items with [Gap] indicate requirements that may be missing from the spec and need to be added during planning
- Items with [Ambiguity] indicate requirements that are present but lack specificity
- 80%+ items include traceability references to spec sections
- Check items off as validated: `[x]`
