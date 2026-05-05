-- ───── Remove trigger, function, index, column ──────────────────────────────
DROP TRIGGER IF EXISTS trg_posts_search_vector ON posts;
DROP FUNCTION IF EXISTS posts_search_vector_update();
DROP INDEX IF EXISTS idx_posts_search;
ALTER TABLE posts DROP COLUMN IF EXISTS search_vector;
