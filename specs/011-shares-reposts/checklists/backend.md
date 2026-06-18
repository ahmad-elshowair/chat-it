# Backend Requirements Quality Checklist: Shares & Reposts

**Purpose**: Validate the quality, clarity, completeness, and constitution-compliance of Spec 011's backend requirements (data integrity, API contract, pagination, validation). This is a *unit test for the requirements writing* — it tests whether the spec is well-written, NOT whether the implementation works.
**Created**: 2026-06-15
**Feature**: [spec.md](../spec.md)
**Constitution**: [README Articles I–IX](../../../docs/spec-kit-database-upgrade/README.md#1-constitution)

> Each item asks "Is X specified/defined/quantified in the requirements?" — never "Does the code do X?". Items marked `[Gap]` indicate a missing requirement; `[Deferred]` indicates a HOW-level concern that legitimately belongs in `plan.md`, not the spec.

## Requirement Completeness

- [ ] CHK001 - Is the distinction between a simple repost (no commentary) and a quote post (commentary ≤ 280) fully specified, including the empty/whitespace normalization rule? [Completeness, Spec §FR-002/003/004]
- [ ] CHK002 - Is the self-share prevention requirement specified with its enforcement layer explicitly defined as data-layer (unbypassable by any client or code path)? [Completeness, Spec §FR-005]
- [ ] CHK003 - Is the requirement that the denormalized share count is maintained *automatically* (including during cascade deletions of both users and posts) documented? [Completeness, Spec §FR-007/009]
- [ ] CHK004 - Is a non-negative floor requirement (count can never go below zero) explicitly specified? [Completeness, Spec §FR-007]
- [ ] CHK005 - Is the requirement for a paginated "who shared this post" list (most-recent-first, cursor-based) defined? [Completeness, Spec §FR-013]
- [ ] CHK006 - Is the feed-scope boundary clearly defined — shares appear in `feed()` and `userPosts()` but NOT in the global discovery `index()`? [Completeness, Spec §FR-014/016]
- [ ] CHK007 - Are BOTH POST response paths specified — new creation returns the created Share record (FR-022) AND idempotent duplicate returns an `already_shared` indicator (FR-023)? [Completeness, Spec §FR-022/023]
- [ ] CHK008 - Is the `is_shared` requirement for `feed()`/`userPosts()` (to prevent frontend N+1 calls) specified? [Completeness, Spec §FR-021]

## Requirement Clarity

- [ ] CHK009 - Is the commentary length bound quantified as exactly 280 characters, inclusive (so 280 is accepted and 281 is rejected)? [Clarity, Spec §FR-002/003]
- [ ] CHK010 - Is the enforcement layer for self-share unambiguous as *data-layer* (not app-only), so a reader cannot mis-implement it as an application check alone? [Clarity, Spec §FR-005]
- [ ] CHK011 - Is the composite pagination cursor's required behavior — uniquely identifying each item with a tie-breaker for identical timestamps — clearly specified? [Clarity, Spec §FR-017]
- [ ] CHK012 - Is "activity time" ordering for the merged feed defined unambiguously per stream (posts by `updated_at`, shares by `created_at`)? [Clarity, Gap, Spec §FR-014]
- [ ] CHK013 - Is the rate-limit requirement for share creation quantified with a concrete threshold, or only referenced as "consistent with other content-creation actions"? [Clarity, Spec §FR-020]

## Requirement Consistency

- [ ] CHK014 - Does the trigger-based counter approach remain consistent with Constitution Article IV ("denormalized counters MUST be updated within the same transaction")? Triggers fire inside the enclosing transaction — is this equivalence documented to prevent a reviewer flagging a false violation? [Consistency, Constitution Art. IV, Spec §FR-007]
- [ ] CHK015 - Is the intentional divergence from the `like.ts`/`bookmark.ts` in-code counter pattern documented consistently between FR-007 and the Assumptions section, without contradiction? [Consistency, Spec §FR-007 + Assumptions]
- [ ] CHK016 - Are the feed-scope requirements mutually consistent — FR-014 (include feed + userPosts) and FR-016 (exclude index) — with no overlap or undefined surface? [Consistency, Spec §FR-014/016]
- [ ] CHK017 - Do FR-023 (idempotent `already_shared` response, no count change) and FR-006 (no duplicate, count unchanged) align without contradiction? [Consistency, Spec §FR-006/023]

## Constitution Compliance (Articles I–IX)

- [ ] CHK018 - Article I (Raw SQL, no ORM): Is the feature's adherence to parameterized raw SQL via `pg` implicit, and does the spec introduce no ORM/query-builder abstraction? [Constitution Art. I, Spec §Assumptions]
- [ ] CHK019 - Article II (Migration-First): Is the requirement for a `shares` migration (table + `posts.number_of_shares` column) and its idempotency (`IF NOT EXISTS`) referenced or deferred to plan? [Constitution Art. II, Deferred]
- [ ] CHK020 - Article IV (Transaction Safety): Is it specified that share create/delete operations that touch multiple tables use `BEGIN/COMMIT/ROLLBACK` with connection release in `finally`? [Constitution Art. IV, Gap, Spec §FR-007]
- [ ] CHK021 - Article VII (Simplicity ≤ 3 tables): Does the migration stay within the limit (1 new table + 1 column addition on an existing table)? [Constitution Art. VII, Spec §Key Entities]
- [ ] CHK022 - Article IX (Backwards Compat): Is `number_of_shares` added with a sensible default so existing rows/post-views are not broken? [Constitution Art. IX, Spec §FR-007]
- [ ] CHK023 - Article VI (Testing Gates): Is the requirement that every share model method has a corresponding test implied by the project gate, or does the spec need to restate it? [Constitution Art. VI, Deferred]

## Scenario & Edge Case Coverage

- [ ] CHK024 - Are concurrent-share requirements (no lost updates, exact final count) specified with a measurable target? [Coverage, Spec §FR-008/SC-005]
- [ ] CHK025 - Is cascade behavior specified for BOTH deletion directions (original post deleted → shares removed; sharer deleted → their shares removed + counts decremented)? [Coverage, Spec §FR-009]
- [ ] CHK026 - Is the one-level re-share limit (a share cannot reference another share) specified as a structural rule, not just an app check? [Coverage, Spec §FR-019]
- [ ] CHK027 - Is the orphan-share edge case (original post deleted mid-feed) addressed — the share must not appear? [Edge Case, Spec §Story 4.6]

## Non-Functional Requirements

- [ ] CHK028 - Is the unified-feed performance requirement quantified (e.g., ≤ 50ms p95 increase over the posts-only feed)? [Measurability, Spec §SC-007]
- [ ] CHK029 - Is the share-creation latency requirement quantified (e.g., < 3s)? [Measurability, Spec §SC-001]
- [ ] CHK030 - Are authentication requirements for all share endpoints specified (authorized user required; unauthenticated rejected)? [Coverage, Spec §Assumptions]

## Plan-Level Deferrals (HOW concerns — verify the requirement exists; mechanism belongs in plan.md)

- [ ] CHK031 - Composite indexes for paginated sorting by `original_post_id` and `user_id`: is the underlying *ordering requirement* present in the spec (FR-013 most-recent-first), with the index strategy correctly deferred to plan? [Deferred, Spec §FR-013]
- [ ] CHK032 - Feed `UNION` pre-filtering / pushed-down `LIMIT`: is the underlying *performance requirement* present (SC-007), with the query mechanism deferred to plan? [Deferred, Spec §SC-007]
- [ ] CHK033 - `express-validator` schemas for commentary ≤ 280: is the underlying *validation requirement* present (FR-003 app-layer, before DB write), with the validator library deferred to plan? [Deferred, Spec §FR-003]

## Notes

- **Reframing**: The user's focus areas were phrased as implementation checks ("are triggers created", "are indexes created"). Per the checklist's core principle, each was reframed into a requirements-quality question testing whether the underlying *requirement* is present, clear, and consistent. The implementation mechanism is validated as a plan-level deferral (CHK031–333), not demanded in the spec.
- **Genuine gaps flagged**:
  - **CHK012** — "activity time" ordering is vague in spec.md (which timestamp per stream?). Resolved in the design doc but not the spec.
  - **CHK013** — rate-limit threshold not quantified (reuses existing limiter).
  - **CHK020** — transaction-safety (Article IV) not explicitly stated for share create/delete; assumed via existing codebase pattern.
- **No conflict found** — CHK014 confirms the trigger-based counter approach satisfies Article IV (triggers execute within the enclosing transaction).
- Check items off as validated: `[x]`. Items marked `[Gap]` should be resolved in the spec before `/speckit.plan`; items marked `[Deferred]` are expected to be satisfied by `plan.md`.
