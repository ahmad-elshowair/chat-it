
-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  comment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  parent_comment_id UUID,
  
  -- Foreign keys
  CONSTRAINT fk_post_id FOREIGN KEY (post_id) 
    REFERENCES posts(post_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) 
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_comment_id FOREIGN KEY (parent_comment_id) 
    REFERENCES comments(comment_id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);