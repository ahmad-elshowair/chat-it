-- create and extension of uuid

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- create a users table if not exists

CREATE TABLE
    users (
        user_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_name VARCHAR(20) NOT NULL,
        user_email VARCHAR(20) NOT NULL UNIQUE,
        user_password VARCHAR NOT NULL,
        user_picture VARCHAR DEFAULT '',
        user_cover VARCHAR DEFAULT '',
        user_followers INTEGER [] DEFAULT '{ }',
        user_following INTEGER [] DEFAULT '{ }',
        is_admin BOOLEAN DEFAULT FALSE,
        user_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );