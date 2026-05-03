DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
DROP TABLE IF EXISTS reports CASCADE;
-- Function update_updated_at_column() intentionally left — may be used by future tables
