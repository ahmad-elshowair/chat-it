-- create likes table
CREATE TABLE
    IF NOT EXISTS likes (
        like_id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
        user_id uuid,
        post_id uuid,
        created_at TIMESTAMP DEFAULT NOW (),
        CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        CONSTRAINT fk_post_id FOREIGN KEY (post_id) REFERENCES posts (post_id) ON DELETE CASCADE
    );