-- create and extension of uuid

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- create a users table if not exists

CREATE TABLE
    users (
        user_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_name VARCHAR NOT NULL,
        email VARCHAR NOT NULL UNIQUE,
        password VARCHAR NOT NULL,
        picture VARCHAR DEFAULT '',
        cover VARCHAR DEFAULT '',
        followers INTEGER [] DEFAULT '{ }',
        following INTEGER [] DEFAULT '{ }',
        is_admin BOOLEAN DEFAULT FALSE,
        description VARCHAR,
        city VARCHAR(50),
        home_town VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );