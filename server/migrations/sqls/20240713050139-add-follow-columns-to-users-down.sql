/* DROP "number_of_followers" AND "number_of_followings" COLUMNS */
ALTER TABLE users
DROP COLUMN number_of_followers INT DEFAULT 0,
DROP COLUMN number_of_followings INT DEFAULT 0;