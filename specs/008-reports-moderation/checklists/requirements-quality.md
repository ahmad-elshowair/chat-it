# Requirements Quality Checklist: Reports & Moderation

**Purpose**: Validate requirements completeness, clarity, and consistency for the reports & moderation feature before planning
**Created**: 2026-05-03
**Feature**: [spec.md](../spec.md)
**Depth**: Standard (13 focus areas from user input)
**Actor/Timing**: Author pre-planning gate

## Report Reason Categories

- [x] CHK001 - Are all six reason categories (spam, harassment, hate_speech, inappropriate_content, impersonation, other) explicitly enumerated in the spec with no gaps for common violation types? [Completeness, Spec §FR-002] ✅ All six enumerated
- [x] CHK002 - Are the boundaries between reason categories clearly defined so that any report unambiguously maps to exactly one category? [Clarity] ✅ Boundaries clear from category names
- [x] CHK003 - Is the "other" catch-all category documented as accepting any violation not covered by the five named categories? [Completeness, Spec §Assumptions] ✅ Documented in Assumptions

## Polymorphic Target Pattern

- [x] CHK004 - Is the target_type + target_id polymorphic pattern explicitly described with the three supported types (post, comment, user)? [Completeness, Spec §Key Entities] ✅ Three types defined
- [x] CHK005 - Are validation requirements for target_id specified per target_type (e.g., target_id must reference an existing post when target_type is "post")? [Clarity, Spec §FR-006] ✅ FR-006 now specifies per-table validation
- [x] CHK006 - Is the behavior specified when a target_type is valid but target_id does not exist in the corresponding entity? [Edge Case, Spec §Edge Cases] ✅ Returns 404 (US1 scenario 5)
- [x] CHK007 - Is the behavior specified if an unsupported target_type value is provided? [Gap → Resolved] ✅ FR-006a added: 400 Bad Request

## Access Control Requirements

- [x] CHK008 - Are admin-only endpoints explicitly enumerated (list reports, dismiss, resolve, statistics)? [Completeness, Spec §FR-007] ✅ All four admin endpoints in user stories
- [x] CHK009 - Is the specific permission name ("reports.manage") documented for gating admin endpoints? [Clarity, Spec §Assumptions] ✅ Added to Assumptions
- [x] CHK010 - Are both admin and moderator roles identified as authorized for moderation actions, and is the distinction between their capabilities defined? [Clarity, Spec §FR-007] ✅ Both roles have "reports.manage" permission per Spec 005 seed data
- [x] CHK011 - Are the authorization requirements for report creation (any authenticated user) clearly separated from admin-only actions? [Consistency, Spec §FR-001 vs FR-007] ✅ FR-001 = any user, FR-007 = admin only

## Self-Report Prevention

- [x] CHK012 - Is self-report prevention specified as application-level enforcement rather than database constraint, with rationale documented? [Clarity, Spec §FR-005] ✅ App-level, rationale in spec
- [x] CHK013 - Are all three self-report scenarios covered: reporting own post, own comment, and own user profile? [Completeness, Spec §FR-005] ✅ All three in FR-005
- [x] CHK014 - Is the expected error response for self-report attempts specified (status code, message)? [Gap → Resolved] ✅ FR-005 updated: 403 Forbidden "You cannot report your own content"

## Resolution Workflow

- [x] CHK015 - Are both dismissal and resolution clearly distinguished with separate status values ("dismissed" vs "resolved")? [Clarity, Spec §FR-010 vs FR-011] ✅ Distinct status values
- [x] CHK016 - Is it explicitly documented that resolving a report does NOT auto-delete the reported content in V1? [Completeness, Spec §Clarifications Session 2026-05-02] ✅ Documented in clarifications and US4
- [x] CHK017 - Is the state transition rule defined (only "pending" reports can be dismissed or resolved)? [Completeness, Spec §FR-013] ✅ FR-013 explicit
- [x] CHK018 - Is the behavior specified when an admin attempts to re-dismiss or re-resolve an already-handled report? [Edge Case, Spec §Edge Cases] ✅ Rejected per FR-013

## RBAC Dependency (Spec 005)

- [x] CHK019 - Is the dependency on Spec 005 (roles & permissions) explicitly documented? [Completeness, Spec §Assumptions] ✅ Documented
- [x] CHK020 - Is a fallback behavior specified if Spec 005 is not yet deployed (e.g., is_admin boolean)? [Gap → Resolved] ✅ Spec 005 confirmed deployed, no fallback needed (Assumptions updated)
- [x] CHK021 - Is the specific permission string ("reports.manage") that maps to the RBAC system documented? [Clarity, Spec §Assumptions] ✅ Added to Assumptions

## Audit Trail

- [x] CHK022 - Are the audit trail fields defined: who resolved (resolved_by), when (resolved_at), and what note (resolution_note)? [Completeness, Spec §FR-012] ✅ All three fields in Key Entities
- [x] CHK023 - Is the requirement to log moderation actions in the system audit log (Spec 006) documented? [Completeness, Spec §FR-016] ✅ FR-016 explicit
- [x] CHK024 - Is the behavior specified when the admin who handled a report is later deleted (resolved_by cleared, note preserved)? [Edge Case, Spec §FR-015, Edge Cases] ✅ Both FR-015 and Edge Cases cover this

## Duplicate Report Prevention

- [x] CHK025 - Is the uniqueness constraint clearly defined as (reporter_id, target_type, target_id)? [Clarity, Spec §FR-004] ✅ Explicit in FR-004
- [x] CHK026 - Is the error behavior for duplicate report attempts specified (409 Conflict)? [Completeness, Spec §Acceptance Scenarios US1] ✅ FR-018 added: 409 via pgError
- [x] CHK027 - Is the duplicate prevention strategy documented as database-level (UNIQUE constraint) rather than application-level check? [Clarity, Spec §Assumptions] ✅ Documented in Assumptions

## Idempotency Strategy

- [x] CHK028 - Is the decision documented that the UNIQUE constraint's 409 Conflict is sufficient (no additional idempotency middleware)? [Completeness, Spec §Clarifications Session 2026-05-02] ✅ Documented
- [x] CHK029 - Is the interaction between Spec 007's pgError classifier and the 23505 unique_violation error code specified? [Gap → Resolved] ✅ FR-018 added: pgError maps 23505 → 409 Conflict

## Target Existence Validation

- [x] CHK030 - Is the requirement to validate target existence before report insertion documented? [Completeness, Spec §FR-006] ✅ FR-006 explicit
- [x] CHK031 - Is the validation approach specified per target_type (e.g., check posts table for type "post")? [Clarity, Gap → Resolved] ✅ FR-006 updated with per-table validation
- [x] CHK032 - Is the error response for non-existent targets specified (404 Not Found)? [Completeness, Spec §Acceptance Scenarios US1] ✅ US1 scenario 5 covers this

## Pagination

- [x] CHK033 - Are pagination parameters (limit and offset) specified for the moderation queue endpoint? [Completeness, Spec §FR-008] ✅ FR-008 updated
- [x] CHK034 - Are sensible default values for pagination defined (e.g., default limit, max limit)? [Gap → Resolved] ✅ FR-008 updated: default 20, max 100
- [x] CHK035 - Is the ordering requirement (newest first by creation date) explicitly stated? [Clarity, Spec §FR-008] ✅ Explicit in FR-008

## Rate Limiting & Abuse Prevention

- [x] CHK036 - Is the requirement for rate limiting on report creation documented? [Completeness, Spec §Assumptions] ✅ Documented in Assumptions
- [x] CHK037 - Is the specific rate limiter to apply (contentCreationLimiter) named? [Gap → Resolved] ✅ FR-017 added: contentCreationLimiter
- [x] CHK038 - Are rate limit thresholds specified or deferred to implementation? [Ambiguity → Resolved] ✅ Thresholds inherited from existing contentCreationLimiter config, not duplicated in spec

## Notes

- All 38 items validated — **38/38 pass**
- 8 gaps resolved by adding FR-006a, FR-017, FR-018 and updating FR-005, FR-006, FR-008, Assumptions, Edge Cases, and acceptance scenarios
- Spec 005 (RBAC) confirmed deployed — no is_admin fallback needed
- Rate limit thresholds inherited from existing contentCreationLimiter (not duplicated)
- Spec is ready for `/speckit.plan`
