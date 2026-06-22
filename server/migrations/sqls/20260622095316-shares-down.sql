-- ───── DROP TRIGGERS & FUNCTIONS ──────────────────────────────
DROP TRIGGER IF EXISTS trg_maintain_share_count_on_delete ON shares;
DROP FUNCTION IF EXISTS maintain_share_count_on_delete;

DROP TRIGGER IF EXISTS trg_maintain_share_count_on_insert ON shares;
DROP FUNCTION IF EXISTS maintain_share_count_on_insert;

DROP TRIGGER IF EXISTS trg_check_self_share ON shares;
DROP FUNCTION IF EXISTS check_self_share;

-- ───── DROP INDEXES ──────────────────────────────
DROP INDEX IF EXISTS idx_shares_user_created;
DROP INDEX IF EXISTS idx_shares_post_created;

-- ───── DROP TABLE ──────────────────────────────
DROP TABLE IF EXISTS shares CASCADE;

-- ───── DROP CONSTRAINT & COLUMN FROM posts ──────────────────────────────
ALTER TABLE posts DROP CONSTRAINT IF EXISTS chk_posts_number_of_shares;
ALTER TABLE posts DROP COLUMN IF EXISTS number_of_shares;
