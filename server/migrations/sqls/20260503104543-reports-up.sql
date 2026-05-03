-- ───── SHARED HELPER FUNCTION ──────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ───── REPORTS TABLE ──────────────────────────────
CREATE TABLE reports (
  report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL,
  target_id UUID NOT NULL,
  reason VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ,

  CONSTRAINT chk_valid_target_type CHECK (target_type IN ('post', 'comment', 'user')),
  CONSTRAINT chk_valid_status CHECK (status IN ('pending', 'dismissed', 'resolved')),
  CONSTRAINT chk_valid_reason CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'inappropriate_content', 'impersonation', 'other')),
  CONSTRAINT uq_report UNIQUE (reporter_id, target_type, target_id)
);

-- ───── INDEXES ──────────────────────────────
CREATE INDEX idx_reports_status ON reports (status);
CREATE INDEX idx_reports_reporter_id ON reports (reporter_id);
CREATE INDEX idx_reports_target ON reports (target_type, target_id);
CREATE INDEX idx_reports_created_at ON reports (created_at DESC);

-- ───── TRIGGER ──────────────────────────────
CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
