-- Create refresh tokens table
CREATE TABLE refresh_tokens (
  token_id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  user_id uuid NOT NULL,
  fingerprint_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,
  CONSTRAINT refresh_tokens_user_id_fk FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_fingerprint ON refresh_tokens(fingerprint_hash);
CREATE INDEX idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);