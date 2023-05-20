-- create and extension of uuid

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- create a users table if not exists

CREATE TABLE
    IF NOT EXISTS public.users (
        user_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_name VARCHAR(20) NOT NULL,
        user_email VARCHAR(20) NOT NULL UNIQUE,
        user_password VARCHAR NOT NULL
    );