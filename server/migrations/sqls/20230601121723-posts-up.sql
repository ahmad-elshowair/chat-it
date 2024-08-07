-- create posts table

CREATE TABLE IF NOT EXISTS posts (
    post_id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
    user_id uuid,
    description VARCHAR(500),
    image VARCHAR DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);