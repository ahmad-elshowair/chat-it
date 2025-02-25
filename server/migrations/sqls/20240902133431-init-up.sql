-- create and extension of uuid

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- create a users table if not exists

CREATE TABLE users (
    user_id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
    user_name VARCHAR NOT NULL UNIQUE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR NOT NULL UNIQUE,
    password VARCHAR NOT NULL,
    picture VARCHAR DEFAULT '',
    cover VARCHAR DEFAULT '',
    is_admin BOOLEAN DEFAULT FALSE,
    bio VARCHAR DEFAULT '',
    city VARCHAR(50) DEFAULT '',
    home_town VARCHAR(50) DEFAULT '',
    marital_status VARCHAR(100) DEFAULT '',
    number_of_followers INTEGER DEFAULT 0,
    number_of_followings INTEGER DEFAULT 0,
    is_online BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- CREATE POSTS TABLE

CREATE TABLE IF NOT EXISTS posts (
    post_id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
    user_id uuid,
    description VARCHAR(500),
    image VARCHAR DEFAULT '',
    number_of_likes INTEGER DEFAULT 0,
    number_Of_comments INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- CREATE FOLLOWS TABLE;

CREATE TABLE IF NOT EXISTS follows (
    id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
    user_id_following uuid,
    user_id_followed uuid,
    created_on timestamp DEFAULT NOW(),
    CONSTRAINT fk_user_id_following FOREIGN KEY (user_id_following) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_id_followed FOREIGN KEY (user_id_followed) REFERENCES users (user_id) ON DELETE CASCADE
);

-- CREATE LIKES TABLE;
CREATE TABLE IF NOT EXISTS likes (
    like_id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
    user_id uuid,
    post_id uuid,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_post_id FOREIGN KEY (post_id) REFERENCES posts (post_id) ON DELETE CASCADE
);