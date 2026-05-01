# Quickstart: System Audit Log

**Feature**: 006-system-audit-log | **Date**: 2026-04-29

## Prerequisites

- PostgreSQL 15+ running with existing `post_it` database
- RBAC tables (`roles`, `permissions`, `role_permissions`, `user_roles`) already migrated (spec 005)
- Node.js + pnpm installed

## Setup

### 1. Run the migration

```bash
cd server
npx db-migrate up
```

This creates:
- `audit_log` table with BIGSERIAL PK, JSONB payload columns, and immutability trigger
- 6 indexes for filterable columns
- `audit.read` permission seeded into `permissions` table
- Permission assigned to `admin` and `super_admin` roles

### 2. Verify

```bash
psql -d post_it -c "\d audit_log"
psql -d post_it -c "SELECT name FROM permissions WHERE name = 'audit.read'"
```

### 3. Start the server

```bash
pnpm run dev
```

## Recording Audit Events

### From an existing transaction (recommended)

```typescript
import { emitAudit } from '../services/auditEmitter.js';

const connection = await pool.connect();
try {
  await connection.query('BEGIN');

  // ... business operation (e.g., assign role) ...
  await connection.query(
    'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)',
    [userId, roleId, adminId]
  );

  // Record audit event within the same transaction
  await emitAudit({
    client: connection,
    actorId: adminId,
    actorType: 'user',
    action: 'role.assign',
    entityType: 'user_role',
    entityId: userId,
    previousValues: null,
    newValues: { role: 'moderator', assigned_by: adminId },
    ipAddress: req.ip,
  });

  await connection.query('COMMIT');
} catch (error) {
  await connection.query('ROLLBACK');
  throw new Error('Role assignment failed', { cause: error });
} finally {
  connection.release();
}
```

### Without an existing transaction

```typescript
await emitAudit({
  actorId: '0',
  actorType: 'system',
  action: 'session.cleanup',
  entityType: 'refresh_token',
  entityId: tokenId,
  previousValues: { is_revoked: false },
  newValues: { is_revoked: true },
});
```

## Querying the Audit Log

```bash
# Get all audit records (paginated)
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/audit"

# Filter by action
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/audit?action=user.ban"

# Filter by entity
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/audit?entity_type=user&entity_id=<uuid>"

# Date range + pagination
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/audit?from=2026-04-20T00:00:00Z&to=2026-04-29T23:59:59Z&limit=50&cursor=<uuid>"
```

## File Map

| File | Purpose |
|------|---------|
| `server/migrations/<ts>-audit-log.js` | db-migrate runner |
| `server/migrations/sqls/<ts>-audit-log-up.sql` | Table, trigger, indexes, seed |
| `server/migrations/sqls/<ts>-audit-log-down.sql` | Reversal |
| `server/src/types/audit.ts` | `TAuditRecord`, `TAuditQueryParams`, `TAuditEmitParams` |
| `server/src/models/audit.ts` | `AuditModel` — INSERT and query methods |
| `server/src/services/auditEmitter.ts` | `emitAudit()` — public recording function |
| `server/src/controllers/audit.controller.ts` | `GET /api/audit` handler |
| `server/src/routes/apis/audit.routes.ts` | Route definition |
| `server/src/middlewares/validations/audit.ts` | Query param validators |
