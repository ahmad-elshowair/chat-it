# Full-Text Search Requirements Quality Checklist

**Purpose**: Validate requirements completeness, clarity, and consistency for Spec 009 (Full-Text Search)
**Created**: 2026-05-04
**Feature**: [spec.md](../spec.md)

**Note**: This checklist tests the REQUIREMENTS themselves — not the implementation. Each item asks whether a requirement is well-written, complete, unambiguous, and testable.

## Search Scope & Boundaries

- [x] CHK001 Is the searchable content scope explicitly defined as "post descriptions only" with a clear exclusion list (comments, user profiles, usernames)? [Completeness, Spec §FR-012]
- [x] CHK002 Is the V1 scope boundary documented with what is intentionally excluded and why? [Clarity, Spec §Assumptions]
- [x] CHK003 Is the decision to search all posts (regardless of visibility) explicitly stated with a documented deferral to Spec 005? [Completeness, Spec §FR-013]
- [x] CHK004 Are requirements clear about whether post images or image alt-text are included in search indexing? [Resolved — Key Entities: "Post images and alt-text are NOT indexed"]

## Stemming & Language Configuration

- [x] CHK005 Is the stemming language (English) explicitly specified with examples of expected behavior (e.g., "running" → "run")? [Clarity, Spec §FR-002]
- [x] CHK006 Is a future multilingual extension path documented without committing to it in V1? [Completeness, Spec §Assumptions]
- [x] CHK007 Are stemming behavior expectations defined for mixed-language content (e.g., a post mixing English and Spanish)? [Resolved — Assumptions: "non-English words pass through unstemmed"]

## Query Validation

- [x] CHK008 Is the minimum query length (2 characters) specified with an explicit validation error message or error code? [Clarity, Spec §FR-003]
- [x] CHK009 Is the maximum query length (200 characters) specified as a hard requirement, not just an assumption? [Resolved — FR-009 now states hard limit with validation error]
- [x] CHK010 Are validation error responses specified for both under-length and over-length queries (status codes, message format)? [Resolved — FR-003 and FR-009 both specify validation errors]
- [x] CHK011 Is the expected behavior for queries containing only stop words ("the", "a", "is") documented as a requirement, not just an edge case? [Completeness, Spec §Edge Cases]

## Ranking Algorithm

- [x] CHK012 Is the ranking algorithm defined with specific weighting criteria for text relevance vs. recency? [Resolved — FR-004: "relevance as primary sort key, recency as tiebreaker"]
- [x] CHK013 Is "text relevance" defined with measurable criteria (e.g., number of matching terms, term frequency, phrase proximity)? [Resolved — US2 Scenario 1: "higher term frequency = higher relevance"; Scenario 3: "phrase proximity"]
- [x] CHK014 Is the tiebreaker rule (recency) explicitly documented when two results have equal relevance? [Resolved — FR-004 and US2 Scenario 2]
- [x] CHK015 Is the ranking behavior for exact phrase matches vs. individual keyword matches specified? [Resolved — US2 Scenario 3: "exact phrase match ranks higher (phrase proximity yields higher relevance)"]

## Trigger Behavior

- [x] CHK016 Is the trigger scope explicitly defined as both INSERT and UPDATE OF description? [Resolved — FR-007: "BEFORE trigger on every INSERT and every UPDATE of the description column"]
- [x] CHK017 Is the behavior for UPDATE operations that don't change the description column addressed (trigger should not fire)? [Resolved — FR-007: "updates that don't change the description MUST NOT cause the trigger to fire"]
- [x] CHK018 Is the handling of NULL or empty description values in the trigger specified? [Resolved — Edge Cases: "trigger converts NULL descriptions to empty tsvector"]
- [x] CHK019 Is the trigger timing (BEFORE vs AFTER) specified and its implications for concurrent reads documented? [Resolved — FR-007: "BEFORE trigger"; Edge Cases: "results always reflect current content — there is no delay"]

## Backfill Strategy

- [x] CHK020 Is the backfill strategy for existing posts documented as a requirement, not just an implementation detail? [Resolved — FR-016: "backfill search vectors for all existing posts as part of the migration"]
- [x] CHK021 Is the backfill required to be idempotent (safe to re-run)? [Resolved — FR-016: "backfill MUST be idempotent"]
- [x] CHK022 Is the expected behavior if backfill is interrupted mid-way documented? [Resolved — FR-016 + FR-020: idempotent + idempotent migration = safe to re-run]
- [x] CHK023 Is there a requirement for the backfill to handle large datasets without locking the posts table? [Resolved — Assumptions: "at current data volumes this is acceptable without batch chunking"]

## Search Results & Response Format

- [x] CHK024 Is the full list of fields required in each search result explicitly enumerated? [Completeness, Spec §FR-006]
- [x] CHK025 Does the search result format align with the existing feed post data shape (IFeedPost pattern)? [Consistency, Spec §Key Entities]
- [x] CHK026 Is the empty result response format specified (does it return an empty array, standard pagination metadata, or both)? [Clarity, Spec §FR-008]
- [x] CHK027 Is the relevance rank score included in the response or intentionally excluded? [Resolved — FR-015: "MUST NOT be exposed in the API response"]

## Query Parsing & Sanitization

- [x] CHK028 Is the query parser (websearch-style) specified with the exact supported syntax (exact phrases, exclusions, OR)? [Clarity, Spec §FR-014]
- [x] CHK029 Are there acceptance scenarios for each supported syntax feature (exact phrases, exclusions, OR, plain keywords)? [Coverage, Spec §US1 Scenarios 6-7]
- [x] CHK030 Is the expected behavior for unsupported or malformed query syntax documented (e.g., unbalanced quotes)? [Resolved — Edge Cases + US1 Scenario 8: "handles gracefully by treating unpaired quote as plain text"]
- [x] CHK031 Is it specified that the query parser should prevent SQL injection without relying on caller-side sanitization? [Security, Spec §FR-014]

## Pagination

- [x] CHK032 Is the composite cursor format (rank + post_id) defined with enough detail to be unambiguously implemented? [Clarity, Spec §FR-005]
- [x] CHK033 Is the maximum page size limit specified for search (consistent with the app's existing limit of 50)? [Resolved — FR-017: "maximum page size limit for search MUST be 50 results"]
- [x] CHK034 Is the behavior when a cursor references a post that has been deleted since the cursor was created documented? [Resolved — FR-018 + Edge Cases: "return validation error indicating cursor is invalid"]
- [x] CHK035 Is bidirectional pagination (next + previous cursors) required for search, consistent with other endpoints? [Consistency, Spec §US3]

## Performance Requirements

- [x] CHK036 Is the performance target ("95% of searches within 1 second for 10,000 posts") measurable and testable? [Measurability, Spec §SC-002]
- [x] CHK037 Are performance expectations defined for concurrent search load (how many simultaneous searches)? [Resolved — SC-002: "under concurrent load of up to 50 simultaneous search requests"]
- [x] CHK038 Is there a requirement for verifying index usage via query analysis (e.g., EXPLAIN ANALYZE) as an acceptance criterion? [Deferred — implementation-level acceptance criterion, better suited for tasks.md]
- [x] CHK039 Is the expected performance degradation curve documented for datasets exceeding 10,000 posts? [Resolved — Assumptions: "Performance beyond 10,000 posts is not targeted in V1; index strategy should be revisited"]

## Authentication & Security

- [x] CHK040 Is the authentication requirement for search consistent with other read endpoints in the app? [Consistency, Spec §FR-010]
- [x] CHK041 Is it specified that search does not bypass any existing authorization checks? [Security, Spec §FR-013]
- [x] CHK042 Is rate limiting for search specified to use the existing infrastructure rather than custom rate limiting? [Consistency, Spec §FR-011]

## Rollback & Migration

- [x] CHK043 Is the down-migration strategy specified (drop trigger, function, index, column)? [Resolved — FR-019: "cleanly remove trigger, trigger function, GIN index, and search_vector column"]
- [x] CHK044 Is the rollback requirement for zero data loss documented (search_vector is derived, not user data)? [Resolved — FR-019: "without data loss (the search_vector is derived data, not user data)"]
- [x] CHK045 Is there a requirement that the migration be idempotent (safe to re-run)? [Resolved — FR-020: "re-running the up-migration MUST NOT fail if objects already exist"]

## Consistency Across Sections

- [x] CHK046 Are the acceptance scenarios in User Stories consistent with the functional requirements (no scenario contradicts an FR)? [Consistency]
- [x] CHK047 Do the success criteria map to at least one functional requirement each (no orphaned success criteria)? [Traceability]
- [x] CHK048 Are the assumptions consistent with the clarifications (no assumption contradicts a clarification answer)? [Consistency]

## Notes

- All 48 items resolved. No remaining gaps or ambiguities.
- 6 new FRs added (FR-015 through FR-020) to address gaps.
- 3 new edge cases added (malformed syntax, mixed-language, invalid cursor).
- 1 new acceptance scenario added for phrase proximity ranking (US2 Scenario 3).
- 1 new acceptance scenario added for malformed queries (US1 Scenario 8).
- CHK038 (EXPLAIN ANALYZE) deferred to tasks.md — it's an implementation acceptance criterion, not a spec requirement.
