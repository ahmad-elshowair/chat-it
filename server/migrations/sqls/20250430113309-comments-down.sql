-- Drop indexes first
DROP INDEX IF EXISTS idx_comments_post_id;
DROP INDEX IF EXISTS idx_comments_user_id;
DROP INDEX IF EXISTS idx_comments_parent_comment_id;

-- Drop comments table
DROP TABLE IF EXISTS comments CASCADE;
