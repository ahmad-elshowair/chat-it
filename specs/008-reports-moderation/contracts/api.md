# API Contracts: Reports & Moderation

**Date**: 2026-05-03 | **Spec**: [spec.md](./spec.md)

All endpoints use the standardized `sendResponse` envelope. Authentication required on all routes.

---

## POST /api/reports

Create a new report. Any authenticated user.

**Middleware**: `authorizeUser`, `contentCreationLimiter`

**Request**:

```json
{
  "target_type": "post",
  "target_id": "uuid-of-post",
  "reason": "spam",
  "description": "Optional free-text explanation"
}
```

**Validation** (express-validator):
- `target_type`: required, one of ['post', 'comment', 'user']
- `target_id`: required, valid UUID
- `reason`: required, one of ['spam', 'harassment', 'hate_speech', 'inappropriate_content', 'impersonation', 'other']
- `description`: optional, string, max 1000 chars

**Responses**:

| Status | Condition | Body |
|--------|-----------|------|
| 201 | Report created | `{ report_id, status: "pending", ... }` |
| 400 | Invalid input or unsupported target_type | `{ message: "..." }` |
| 401 | Not authenticated | `{ message: "..." }` |
| 403 | Self-report attempt | `{ message: "You cannot report your own content" }` |
| 404 | Target does not exist | `{ message: "Target not found" }` |
| 409 | Duplicate report (same reporter + target) | `{ message: "..." }` (via pgError 23505) |

---

## GET /api/reports

List reports (moderation queue). Admin/moderator only.

**Middleware**: `authorizeUser`, `requirePermission('reports.manage')`

**Query Parameters**:

| Param | Type | Default | Max | Notes |
|-------|------|---------|-----|-------|
| status | string | (all) | — | Filter: pending, dismissed, resolved |
| targetType | string | (all) | — | Filter: post, comment, user |
| limit | integer | 20 | 100 | Page size |
| offset | integer | 0 | — | Skip count |

**Responses**:

| Status | Condition | Body |
|--------|-----------|------|
| 200 | Success | `{ data: TReport[], pagination: { limit, offset, total } }` |
| 401 | Not authenticated | `{ message: "..." }` |
| 403 | Insufficient permissions | `{ message: "Forbidden" }` |

---

## GET /api/reports/stats

Aggregate report counts by status. Admin/moderator only.

**Middleware**: `authorizeUser`, `requirePermission('reports.manage')`

**Responses**:

| Status | Condition | Body |
|--------|-----------|------|
| 200 | Success | `{ data: { pending: number, dismissed: number, resolved: number } }` |
| 401 | Not authenticated | `{ message: "..." }` |
| 403 | Insufficient permissions | `{ message: "Forbidden" }` |

---

## PATCH /api/reports/:id/dismiss

Dismiss a pending report. Admin/moderator only.

**Middleware**: `authorizeUser`, `requirePermission('reports.manage')`

**Request**:

```json
{
  "resolution_note": "Optional note explaining dismissal"
}
```

**Validation**:
- `id`: required, valid UUID (route param)
- `resolution_note`: optional, string, max 2000 chars

**Responses**:

| Status | Condition | Body |
|--------|-----------|------|
| 200 | Dismissed successfully | `{ data: TReport }` |
| 400 | Invalid input | `{ message: "..." }` |
| 401 | Not authenticated | `{ message: "..." }` |
| 403 | Insufficient permissions | `{ message: "Forbidden" }` |
| 404 | Report not found | `{ message: "..." }` |
| 409 | Report not pending (already handled) | `{ message: "..." }` |

---

## PATCH /api/reports/:id/resolve

Resolve a pending report. Admin/moderator only.

**Middleware**: `authorizeUser`, `requirePermission('reports.manage')`

**Request**:

```json
{
  "resolution_note": "Optional note explaining resolution"
}
```

**Validation**:
- `id`: required, valid UUID (route param)
- `resolution_note`: optional, string, max 2000 chars

**Responses**:

| Status | Condition | Body |
|--------|-----------|------|
| 200 | Resolved successfully | `{ data: TReport }` |
| 400 | Invalid input | `{ message: "..." }` |
| 401 | Not authenticated | `{ message: "..." }` |
| 403 | Insufficient permissions | `{ message: "Forbidden" }` |
| 404 | Report not found | `{ message: "..." }` |
| 409 | Report not pending (already handled) | `{ message: "..." }` |
