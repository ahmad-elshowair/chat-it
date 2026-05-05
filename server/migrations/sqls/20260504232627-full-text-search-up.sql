-- ───── Add search_vector column ──────────────────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- ───── Create GIN index for fast FTS lookups ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING gin(search_vector);

-- ───── Trigger function: auto-populate search_vector ──────────────────────────────
CREATE OR REPLACE FUNCTION posts_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ───── Trigger: fire on INSERT and UPDATE of description only ──────────────────────────────
DROP TRIGGER IF EXISTS trg_posts_search_vector ON posts;
CREATE TRIGGER trg_posts_search_vector
  BEFORE INSERT OR UPDATE OF description ON posts
  FOR EACH ROW EXECUTE FUNCTION posts_search_vector_update();

-- ───── Backfill existing data (idempotent) ──────────────────────────────
UPDATE posts SET search_vector = to_tsvector('english', coalesce(description, ''))
WHERE search_vector IS NULL;
