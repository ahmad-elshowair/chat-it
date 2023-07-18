--  create follows table

--

CREATE TABLE
    IF NOT EXISTS follows (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id_following uuid,
        user_id_followed uuid,
        created_on timestamp DEFAULT NOW(),
        CONSTRAINT fk_user_id_following FOREIGN KEY (user_id_following) REFERENCES users(user_id) ON DELETE CASCADE,
        CONSTRAINT fk_user_id_followed FOREIGN KEY (user_id_followed) REFERENCES users(user_id) ON DELETE CASCADE
    );