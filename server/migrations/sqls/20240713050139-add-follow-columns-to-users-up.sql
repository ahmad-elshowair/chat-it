/* ADD "number_of_followers" AND "number_of_followings" COLUMNS */
ALTER TABLE users
ADD COLUMN number_of_followers INT DEFAULT 0,
ADD COLUMN number_of_followings INT DEFAULT 0;