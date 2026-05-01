BEGIN;

-- ───── REMOVE PERMISSION SEED ──────────────────────────────
DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT permission_id FROM permissions WHERE name = 'audit.read'
);

DELETE FROM permissions WHERE name = 'audit.read';

-- ───── DROP TRIGGER AND TABLE ──────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log;
DROP FUNCTION IF EXISTS audit_log_immutable();
DROP TABLE IF EXISTS audit_log;

COMMIT;
