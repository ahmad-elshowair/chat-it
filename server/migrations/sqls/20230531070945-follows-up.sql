--  create follows table

--

CREATE TABLE
    IF NOT EXISTS follows (
        follow_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        follower_id uuid,
        followed_id uuid,
        created_at timestamp DEFAULT NOW(),
        CONSTRAINT fk_follower_id FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE,
        CONSTRAINT fk_followed_id FOREIGN KEY (followed_id) REFERENCES users(user_id) ON DELETE CASCADE
    );