# API Contract: Audit Log

**Feature**: 006-system-audit-log | **Date**: 2026-04-29

## Endpoints

### GET /api/audit

Query audit log with optional filters and cursor-based pagination.

**Auth**: `authorizeUser` + `requirePermission('audit.read')`
**Rate Limit**: `globalLimiter` (150 req/min per IP)

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `actor_id` | `string` | No | Filter by actor user ID |
| `actor_type` | `string` | No | Filter by actor type: `user` or `system` |
| `action` | `string` | No | Filter by action name (e.g., `user.ban`) |
| `entity_type` | `string` | No | Filter by entity type (e.g., `user`, `post`) |
| `entity_id` | `string` | No | Filter by entity ID |
| `from` | `string` | No | Date range start (ISO 8601, e.g., `2026-04-20T00:00:00Z`) |
| `to` | `string` | No | Date range end (ISO 8601) |
| `limit` | `integer` | No | Page size (default: 20, max: 100) |
| `cursor` | `string` | No | Keyset pagination cursor (UUID of last audit record) |
| `direction` | `string` | No | `next` or `previous` (default: `next`) |

#### Validation Rules

- `actor_type`: Must be `'user'` or `'system'` if provided
- `action`: Max 100 characters
- `entity_type`: Max 50 characters
- `from`/`to`: Must be valid ISO 8601 datetime. If both provided, `from` must be ≤ `to`
- `limit`: Integer between 1 and 100
- `cursor`: Must be a valid UUID string if provided
- `direction`: Must be `'next'` or `'previous'`

#### Response — 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "actor_id": "a1b2c3d4-...",
      "actor_type": "user",
      "action": "user.ban",
      "entity_type": "user",
      "entity_id": "e5f6a7b8-...",
      "previous_values": { "status": "active" },
      "new_values": { "status": "banned" },
      "ip_address": "192.168.1.42",
      "created_at": "2026-04-29T14:32:00.000Z"
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "c3d4e5f6-...",
    "previousCursor": "f6e5d4c3-..."
  }
}
```

#### Response — 400 Bad Request

```json
{
  "success": false,
  "message": "Validation failed: actor_type must be 'user' or 'system'"
}
```

#### Response — 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### Response — 403 Forbidden

```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

#### Response — Empty Result

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "hasMore": false
  }
}
```

## Integration: emitAudit() Function

**Not an HTTP endpoint** — this is the internal service function for recording audit events.

### Signature

```typescript
import { PoolClient } from 'pg';

type EmitAuditParams = {
  client?: PoolClient;
  actorId: string;
  actorType: 'user' | 'system';
  action: string;
  entityType: string;
  entityId: string;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress?: string;
};

async function emitAudit(params: EmitAuditParams): Promise<void>;
```

### Behavior

| Scenario | Behavior |
|----------|----------|
| `client` provided | Calls `auditModel.record(client, params)` — joins the caller's transaction. Caller is responsible for `connection.release()`. |
| `client` NOT provided | Opens a new `pool.connect()`, BEGIN, calls `record()`, COMMIT, releases in `finally`. |
| Both `previousValues` and `newValues` are null | `auditModel.record()` throws `Error` — at least one must be non-null (validation consolidated in model). |
| JSON payload exceeds 10 KB | `auditModel.record()` truncates non-essential fields, adds `_truncated: true` marker (FR-010a). |
| Required string fields empty | `auditModel.record()` throws `Error` — `action`, `entityType`, `entityId`, `actorId` must be non-empty. |

### Usage Example (in controller — transaction managed by controller)

```typescript
import pool from '../database/pool.js';
import { emitAudit } from '../services/auditEmitter.js';

const assignRole = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');

    // 1. Business operation — model uses our connection
    const assignment = await roleModel.assignRole(userId, roleId, assignedBy!, connection);

    // 2. Audit recording — same transaction
    await emitAudit({
      client: connection,
      actorId: assignedBy!,
      actorType: 'user',
      action: 'role.assign',
      entityType: 'user_role',
      entityId: userId,
      previousValues: null,
      newValues: { role: 'moderator', assigned_by: assignedBy },
      ipAddress: req.ip,
    });

    await connection.query('COMMIT');
    return sendResponse.success(res, assignment, 200);
  } catch (error) {
    await connection.query('ROLLBACK');
    next(error);
  } finally {
    connection.release();
  }
};
```

## Auditable Actions — Initial Set

| Action Name | Entity Type | Triggered By | Permission Required |
|-------------|------------|--------------|-------------------|
| `role.assign` | `user_role` | Super admin assigns role | `roles.assign` |
| `role.revoke` | `user_role` | Super admin revokes role | `roles.assign` |
| `role.create` | `role` | Super admin creates custom role | `roles.manage` |
| `role.update` | `role` | Super admin updates role permissions | `roles.manage` |
| `role.delete` | `role` | Super admin deletes custom role | `roles.manage` |
| `user.ban` | `user` | Admin/super admin bans user | `users.ban` |
| `user.unban` | `user` | Admin/super admin unbans user | `users.ban` |
| `post.delete.any` | `post` | Admin/moderator deletes any post | `posts.delete.any` |
| `comment.delete.any` | `comment` | Admin/moderator deletes any comment | `comments.delete.any` |
| `report.dismiss` | `report` | Moderator dismisses report | `reports.manage` |
| `report.escalate` | `report` | Moderator escalates report | `reports.manage` |
