-- Drop indexes
DROP INDEX IF EXISTS idx_refresh_tokens_user_id;
DROP INDEX IF EXISTS idx_refresh_tokens_fingerprint;
DROP INDEX IF EXISTS idx_refresh_tokens_is_revoked;


-- Drop refresh tokens table
DROP TABLE IF EXISTS refresh_tokens CASCADE;
