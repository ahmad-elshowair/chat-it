-- ───── SHARES: COUNTER COLUMN ──────────────────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS number_of_shares INTEGER NOT NULL DEFAULT 0;

-- ───── SHARES: NON-NEGATIVE GUARD ──────────────────────────────
ALTER TABLE posts ADD CONSTRAINT chk_posts_number_of_shares CHECK (number_of_shares >= 0);

-- ───── SHARES TABLE ──────────────────────────────
CREATE TABLE IF NOT EXISTS shares (
  share_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  original_post_id UUID NOT NULL,
  commentary VARCHAR(280),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_share_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_share_post FOREIGN KEY (original_post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
  CONSTRAINT uq_share UNIQUE (user_id, original_post_id)
);

-- ───── SHARES: COMPOSITE INDEXES ──────────────────────────────
-- No standalone created_at index: every share query filters by user_id or
-- original_post_id, so the composites below already cover created_at ordering.
CREATE INDEX IF NOT EXISTS idx_shares_post_created ON shares (original_post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shares_user_created ON shares (user_id, created_at DESC);

-- ───── SHARES: SELF-SHARE PREVENTION TRIGGER ──────────────────────────────
CREATE OR REPLACE FUNCTION check_self_share()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM posts
    WHERE post_id = NEW.original_post_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Users cannot share their own posts' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_self_share
BEFORE INSERT ON shares
FOR EACH ROW
EXECUTE FUNCTION check_self_share();

-- ───── SHARES: COUNTER INCREMENT TRIGGER ──────────────────────────────
CREATE OR REPLACE FUNCTION maintain_share_count_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts
  SET number_of_shares = number_of_shares + 1
  WHERE post_id = NEW.original_post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintain_share_count_on_insert
AFTER INSERT ON shares
FOR EACH ROW
EXECUTE FUNCTION maintain_share_count_on_insert();

-- ───── SHARES: COUNTER DECREMENT TRIGGER (manual unshare + cascade deletes) ──────────
CREATE OR REPLACE FUNCTION maintain_share_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts
  SET number_of_shares = GREATEST(0, number_of_shares - 1)
  WHERE post_id = OLD.original_post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintain_share_count_on_delete
AFTER DELETE ON shares
FOR EACH ROW
EXECUTE FUNCTION maintain_share_count_on_delete();
