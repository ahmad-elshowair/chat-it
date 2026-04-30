BEGIN;

-- ───── AUDIT LOG TABLE ──────────────────────────────
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'user',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_audit_values CHECK (previous_values IS NOT NULL OR new_values IS NOT NULL)
);

-- ───── IMMUTABILITY TRIGGER ──────────────────────────────
CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log records are immutable: % operation not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

COMMENT ON TRIGGER trg_audit_log_immutable ON audit_log IS
  'Enforces append-only immutability per spec 006 FR-008. DO NOT drop without constitution amendment.';

-- ───── PERFORMANCE INDEXES ──────────────────────────────
CREATE INDEX idx_audit_log_created_at_id ON audit_log (created_at DESC, id DESC);
CREATE INDEX idx_audit_log_actor_id ON audit_log (actor_id);
CREATE INDEX idx_audit_log_action ON audit_log (action);
CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_actor_type ON audit_log (actor_type);

-- ───── PERMISSION SEED ──────────────────────────────
INSERT INTO permissions (name, resource, action, description)
VALUES ('audit.read', 'audit', 'read', 'View audit log entries')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name = 'audit.read'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.name = 'super_admin' AND p.name = 'audit.read'
ON CONFLICT DO NOTHING;

COMMIT;
