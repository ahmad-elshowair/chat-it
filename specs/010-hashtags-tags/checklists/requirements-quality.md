# Requirements Quality Checklist: Hashtags & Tags

**Purpose**: Validate requirements completeness, clarity, consistency, and coverage for Spec 010 — "Unit tests for English"
**Created**: 2026-05-09
**Feature**: [spec.md](../spec.md)
**Focus**: Data model integrity, extraction semantics, counter consistency, trending algorithm, search separation, auth model

## Requirement Completeness

- [ ] CHK001 - Is the tag name validation regex fully specified with exact character class, length bounds, and enforcement at both application and data storage layers? [Completeness, Spec §FR-005, §FR-006]
- [ ] CHK002 - Is the auto-extraction parsing algorithm fully defined — word-boundary rules, URL exclusion, consecutive-hash exclusion, punctuation handling, and unicode character policy? [Completeness, Spec §FR-001, §FR-017, §FR-018]
- [ ] CHK003 - Is the max tags per post limit (10) specified with clear enforcement semantics (silently ignored vs. rejected with error)? [Completeness, Spec §FR-004]
- [ ] CHK004 - Are the trending time window parameters specified — default duration (24h), configurability mechanism, and the authoritative timestamp source (post_tags.created_at)? [Completeness, Spec §FR-014]
- [ ] CHK005 - Is the trending result set size (max number of tags returned) specified? [Gap, Spec §FR-014]
- [ ] CHK006 - Is the tag search result set size limit specified with an exact number rather than "e.g., 20"? [Clarity, Spec Assumptions]
- [ ] CHK007 - Are the orphan tag cleanup requirements fully specified — schedule cadence, exact cleanup condition (post_count = 0), and whether cleanup affects in-flight queries? [Completeness, Spec §FR-011]
- [ ] CHK008 - Is the separation between tag search and full-text search (spec 009) documented with explicit non-integration boundaries? [Completeness, Spec §FR-020]

## Requirement Clarity

- [ ] CHK009 - Is "silently ignoring" tags beyond the 10-tag limit unambiguous — does it mean first-10-wins, or is ordering undefined? [Clarity, Spec §FR-004]
- [ ] CHK010 - Is "prefix and substring matching" (§FR-015) precisely defined — does it mean LIKE 'query%', LIKE '%query%', trigram similarity, or a specific algorithm? [Clarity, Spec §FR-015]
- [ ] CHK011 - Is "configurable time window" (§FR-014) clarified — does configurability mean environment variable, database setting, or query parameter? [Clarity, Spec §FR-014]
- [ ] CHK012 - Is "the same post information in tag feeds as in the main feed" (§FR-013) defined with an explicit list of fields or a reference to a shared shape? [Clarity, Spec §FR-013]
- [ ] CHK013 - Is the behavior for "tag exceeding 50 characters" (Edge Cases) resolved — truncated or rejected? Only one can apply. [Ambiguity, Spec Edge Cases]
- [ ] CHK014 - Is the diff-based reconciliation algorithm on post update (§FR-002) defined with sufficient precision — does it compute set difference, or does it handle partial overlaps and ordering? [Clarity, Spec §FR-002]

## Requirement Consistency

- [ ] CHK015 - Is the case-insensitive storage requirement (§FR-003) consistent with the extraction behavior — is normalization to lowercase applied before or after the 50-char length check? [Consistency, Spec §FR-003, §FR-005]
- [ ] CHK016 - Is the denormalized post_count update requirement (§FR-009) consistent with the deferred orphan cleanup (§FR-011) — can post_count ever go negative if cleanup runs mid-transaction? [Consistency, Spec §FR-009, §FR-011]
- [ ] CHK017 - Are the authentication requirements consistent across all three tag endpoints — does "optional auth" for posts-by-tag (§FR-019) mean the endpoint works without any auth token, or does it return reduced data? [Consistency, Spec §FR-019]
- [ ] CHK018 - Is FR-020 (tag/FTS independence) consistent with FR-016 (tags displayed on search result posts) — if FTS search results show tags, does that violate independence? [Consistency, Spec §FR-016, §FR-020]

## Acceptance Criteria Quality

- [ ] CHK019 - Are all 20 functional requirements (FR-001 through FR-020) traceable to at least one acceptance scenario in the user stories? [Traceability]
- [ ] CHK020 - Is SC-007 ("not degraded by more than 50ms") measurable without a defined baseline — what is the baseline post creation/update latency? [Measurability, Spec §SC-007]
- [ ] CHK021 - Is SC-005 ("95% of users can discover new content via hashtags without assistance") testable — how is "without assistance" and "discover new content" measured? [Measurability, Spec §SC-005]
- [ ] CHK022 - Are the success criteria (SC-001 through SC-007) technology-agnostic with no implementation-specific references? [Acceptance Criteria, Spec §Success Criteria]

## Scenario Coverage

- [ ] CHK023 - Are requirements defined for the scenario where a post is updated with the exact same tags — does the reconciliation diff correctly produce zero changes? [Coverage, Spec §FR-002]
- [ ] CHK024 - Are requirements defined for the scenario where a tag name exactly matches the maximum length (50 chars) — is it accepted or rejected? [Coverage, Edge Case]
- [ ] CHK025 - Are requirements defined for concurrent post deletion and tag feed queries — can a user see a post in the tag feed that has just been deleted? [Coverage, Gap]
- [ ] CHK026 - Are requirements defined for the empty search query scenario — what happens when q= is blank or missing? [Coverage, Gap, Spec §FR-015]
- [ ] CHK027 - Are requirements defined for the trending endpoint when no posts exist within the 24h window — is an empty list returned? [Coverage, Spec §FR-014]

## Edge Case Coverage

- [ ] CHK028 - Is the edge case for a post containing only hashtags and no other text addressed? [Coverage, Gap]
- [ ] CHK029 - Is the edge case for tags containing only underscores (e.g., "#___") addressed — does the regex allow it? [Coverage, Spec §FR-005]
- [ ] CHK030 - Is the edge case for a hashtag at the very start or end of the description string (no surrounding whitespace) addressed in extraction rules? [Coverage, Spec §FR-001]
- [ ] CHK031 - Is the edge case for a post that is created and immediately deleted addressed — does the tag post_count remain consistent? [Coverage, Spec §FR-010]

## Non-Functional Requirements

- [ ] CHK032 - Are rate limiting requirements specified for tag search and trending endpoints — thresholds, keying strategy, and error responses? [Gap, Spec §FR-019]
- [ ] CHK033 - Is the performance requirement for the trending query under load specified — does it scale with total post_tags volume or only the 24h window? [Gap]
- [ ] CHK034 - Are requirements for the tag search index strategy specified (prefix index, trigram, or both) to support the matching algorithm in §FR-015? [Completeness, Spec §FR-015]

## Dependencies & Assumptions

- [ ] CHK035 - Is the assumption "trending time window should be configurable without requiring code changes" validated — is the configuration mechanism specified? [Assumption, Spec Assumptions]
- [ ] CHK036 - Is the assumption "tag search results are limited to e.g., 20 results" an exact requirement or still an estimate? [Assumption, Spec Assumptions]
- [ ] CHK037 - Is the dependency on the existing post deletion cascade behavior documented — what happens to post_tags rows if the posts table cascade fails? [Dependency, Spec §FR-010]
- [ ] CHK038 - Is the assumption about IFeedPost cross-cutting changes (adding tags: string[]) validated against all existing post-returning endpoints? [Dependency, Spec §FR-016]

## Ambiguities & Conflicts

- [ ] CHK039 - Does "silently ignoring" tags beyond the limit (§FR-004) conflict with the user experience — should the user be warned that some tags were dropped? [Ambiguity, Spec §FR-004]
- [ ] CHK040 - Is the term "post count" used consistently — does it always mean the denormalized counter on the tags table, or could it be confused with the actual count of post_tags rows? [Ambiguity, Spec §FR-009]
