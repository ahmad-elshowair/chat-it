# Feature Specification: Reports & Moderation

**Feature Branch**: `008-reports-moderation`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Enable users to report posts, comments, and other users for policy violations. Provide admins with a moderation queue to review and act on reports (dismiss, warn, or remove content)."

## Clarifications

### Session 2026-05-02

- Q: Should there be an auto-action threshold (e.g., 5 reports auto-hides)? → A: Out of scope for V1
- Q: Should reports be anonymous to the reported user? → A: Yes — only admins can see reporter identity
- Q: Report reason categories? → A: spam, harassment, hate_speech, inappropriate_content, impersonation, other
- Q: Should POST /api/reports use idempotency middleware from Spec 007? → A: No — the 409 from the UNIQUE constraint is sufficient
- Q: Should resolving a report auto-delete the reported content? → A: No — resolving is flag-only in V1; content removal is a separate manual action
- Q: Should the app validate that target_id exists before inserting? → A: Yes — verify target exists by target_type, return 404 if not found

### Session 2026-05-03

- Q: Should moderation actions (dismiss, resolve) be recorded in the system audit log? → A: Yes, log all moderation actions in the system audit log.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Report Content (Priority: P1)

A registered user discovers a post, comment, or user profile that violates community guidelines. They click a "Report" action, select a reason (spam, harassment, hate speech, inappropriate content, impersonation, or other), optionally add a description, and submit. The system records the report and prevents the user from submitting duplicate reports for the same target.

**Why this priority**: Without the ability to report, no moderation can happen. This is the foundational action that feeds the entire feature.

**Independent Test**: Can be fully tested by a user submitting reports against existing posts, comments, and user profiles, and verifying the report is recorded. Delivers immediate value by giving users a voice in content quality.

**Acceptance Scenarios**:

1. **Given** a user is logged in and viewing a post, **When** they submit a report with reason "spam", **Then** the report is recorded with status "pending" and the user receives confirmation
2. **Given** a user has already reported a specific comment, **When** they attempt to report the same comment again, **Then** the system rejects the duplicate report and shows an appropriate message
3. **Given** a user is viewing their own post, **When** they attempt to report it, **Then** the system rejects with 403 Forbidden and message "You cannot report your own content"
4. **Given** a user submits a report with reason "other", **When** no description is provided, **Then** the system accepts the report (description is optional)
5. **Given** a user submits a report, **When** the target content does not exist, **Then** the system rejects the report and shows a not-found message

---

### User Story 2 - View Moderation Queue (Priority: P2)

An admin or moderator accesses the moderation queue to see all pending reports. They can filter by status (pending, dismissed, resolved) and target type (post, comment, user). The queue is paginated and ordered by most recent first.

**Why this priority**: Admins need visibility into reports before they can act on them. This is the gateway to all moderation actions.

**Independent Test**: Can be fully tested by an admin logging in, navigating to the moderation queue, and verifying they see reports ordered by date with working filters. Regular users should be blocked from accessing this view.

**Acceptance Scenarios**:

1. **Given** an admin is logged in and reports exist, **When** they view the moderation queue, **Then** they see all reports ordered by creation date (newest first) with pagination
2. **Given** an admin is viewing the queue, **When** they filter by status "pending", **Then** only pending reports are shown
3. **Given** an admin is viewing the queue, **When** they filter by target type "comment", **Then** only reports targeting comments are shown
4. **Given** a regular user attempts to access the moderation queue, **When** they make the request, **Then** they receive a forbidden access denial

---

### User Story 3 - Dismiss a Report (Priority: P2)

An admin reviews a report and determines no action is needed. They dismiss the report with an optional resolution note, which updates the report status to "dismissed" and records who dismissed it and when.

**Why this priority**: Dismissing is the simplest moderation action and prevents the queue from filling with invalid reports.

**Independent Test**: Can be tested by an admin dismissing a pending report and verifying the status changes, the resolution note is saved, and the admin identity is recorded.

**Acceptance Scenarios**:

1. **Given** an admin is viewing a pending report, **When** they dismiss it with a note, **Then** the report status becomes "dismissed", the note is saved, and the admin's identity and timestamp are recorded
2. **Given** an admin is viewing a pending report, **When** they dismiss it without a note, **Then** the report status becomes "dismissed" and the resolution note is empty
3. **Given** an admin attempts to dismiss an already-resolved report, **When** they submit the dismissal, **Then** the system rejects the action because the report is no longer pending
4. **Given** a regular user attempts to dismiss a report, **When** they submit the request, **Then** they receive a forbidden access denial

---

### User Story 4 - Resolve a Report (Priority: P2)

An admin reviews a report and determines action is warranted. They resolve the report with an optional resolution note, which updates the report status to "resolved" and records who resolved it and when. The reported content remains in place — resolution is a flagging action only.

**Why this priority**: Resolving is the primary moderation action. Note that "resolving" marks the report as handled but does NOT automatically delete the reported content in V1.

**Independent Test**: Can be tested by an admin resolving a pending report and verifying the status change, resolution note, and admin identity are all recorded.

**Acceptance Scenarios**:

1. **Given** an admin is viewing a pending report, **When** they resolve it with a note "Content removed separately", **Then** the report status becomes "resolved", the note is saved, and the admin's identity and timestamp are recorded
2. **Given** an admin attempts to resolve a dismissed report, **When** they submit the resolution, **Then** the system rejects the action because the report is no longer pending
3. **Given** an admin resolves a report, **When** the reported content is later viewed, **Then** the content still exists (resolution is flag-only in V1)

---

### User Story 5 - Report Statistics (Priority: P3)

An admin views aggregate report statistics showing counts grouped by status (pending, dismissed, resolved). This gives a high-level overview of moderation workload.

**Why this priority**: Useful for monitoring but not required for core moderation flow.

**Independent Test**: Can be tested by an admin requesting stats and verifying counts match the actual report distribution.

**Acceptance Scenarios**:

1. **Given** reports exist in various statuses, **When** an admin requests report statistics, **Then** they receive counts grouped by status (pending, dismissed, resolved)
2. **Given** no reports exist, **When** an admin requests statistics, **Then** all counts are zero
3. **Given** a regular user requests report statistics, **When** they submit the request, **Then** they receive a forbidden access denial

---

### Edge Cases

- What happens when a user tries to report content that has been deleted between the time they loaded the page and submitted the report? The system should return a not-found error.
- What happens when an admin account that resolved reports is later deleted? The report history should be preserved with the resolver field cleared but the resolution note and timestamp retained.
- What happens when a reported user deletes their account? The reports filed by that user should be removed, but reports against that user should remain for audit purposes.
- What happens when multiple users report the same content? Each report is stored independently — admins see all individual reports for the same target.
- What happens when a user tries to report their own content? The system rejects the report at the application level with a clear error message.
- What happens when an admin tries to act on a report that another admin has already handled concurrently? The second action is rejected because the report is no longer in "pending" status.
- What happens when a report is submitted with an unsupported target_type (e.g., "message" or "group")? The system rejects it with a 400 Bad Request error indicating the valid target types are post, comment, and user.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any authenticated user to submit a report against a post, comment, or user profile
- **FR-002**: System MUST require a reason category for each report from a predefined list: spam, harassment, hate speech, inappropriate content, impersonation, other
- **FR-003**: System MUST accept an optional free-text description with each report
- **FR-004**: System MUST prevent duplicate reports — a user cannot report the same target (same target type + target ID combination) more than once
- **FR-005**: System MUST prevent users from reporting their own content (posts, comments) or their own profile — rejected with a 403 Forbidden error and message "You cannot report your own content"
- **FR-006**: System MUST validate that the reported target actually exists before accepting the report — checking the posts table for target_type "post", the comments table for "comment", and the users table for "user"
- **FR-006a**: System MUST reject reports with an unsupported target_type value (any value not in: post, comment, user) with a 400 Bad Request error
- **FR-007**: System MUST restrict report viewing, dismissing, and resolving to users with moderation permissions (admins and moderators)
- **FR-008**: System MUST provide a paginated moderation queue ordered by report creation date (newest first), with a default page size of 20 and a maximum page size of 100
- **FR-009**: System MUST support filtering the moderation queue by status and target type
- **FR-010**: System MUST allow admins to dismiss a pending report with an optional resolution note
- **FR-011**: System MUST allow admins to resolve a pending report with an optional resolution note
- **FR-012**: System MUST record who performed the moderation action (dismiss/resolve) and when
- **FR-013**: System MUST reject moderation actions on reports that are no longer in pending status
- **FR-014**: System MUST provide aggregate report counts grouped by status for admin dashboard
- **FR-015**: System MUST preserve report history even if the admin who handled the report is later deleted
- **FR-016**: System MUST record all moderation actions (dismiss, resolve) in the system audit log for traceability
- **FR-017**: System MUST apply rate limiting to report creation using the existing contentCreationLimiter middleware to prevent abuse
- **FR-018**: System MUST return a 409 Conflict (via the pgError classifier mapping PG error code 23505) when a duplicate report is attempted

### Key Entities

- **Report**: Represents a user's complaint about specific content. Contains the reporter identity, target type and ID, reason category, optional description, current status, and resolution details (who resolved, when, and any note).
- **Target**: The content being reported — can be a post, comment, or user profile. The target is identified by a combination of type and unique identifier.
- **Moderation Action**: An admin's decision on a report — either dismissal or resolution. Includes the admin's identity, timestamp, and optional note.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can submit a report in under 10 seconds from clicking "Report" to receiving confirmation
- **SC-002**: Admins can review and action (dismiss or resolve) a report in under 15 seconds
- **SC-003**: The moderation queue loads within 2 seconds even with 1000+ reports
- **SC-004**: 100% of duplicate report attempts are blocked with a clear user-facing message
- **SC-005**: 100% of self-report attempts are blocked with a clear user-facing message
- **SC-006**: Zero unauthorized access to moderation queue or admin actions by regular users

## Assumptions

- Users must be authenticated to submit reports — anonymous reporting is out of scope for V1
- Reports are anonymous to the reported user — only admins can see reporter identity
- "Resolving" a report is flag-only and does NOT automatically delete the reported content in V1
- Auto-action thresholds (e.g., 5 reports auto-hides content) are out of scope for V1
- The existing role-based access control system (from Spec 005) is available and deployed — no fallback to is_admin is needed
- The requirePermission middleware uses the permission string "reports.manage" to gate all admin/moderator report endpoints
- Rate limiting on report creation is needed to prevent report spam abuse
- Duplicate report prevention relies on the database UNIQUE constraint — duplicate attempts return a conflict error, no additional idempotency middleware is required
- Report retention is indefinite — no automatic purging of old reports
- Each report reason category has clear boundaries; "other" serves as a catch-all for uncategorized violations
