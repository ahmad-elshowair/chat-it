/* add first_name & last_name*/
ALTER TABLE users
DROP COLUMN first_name VARCHAR(50),
DROP COLUMN last_name VARCHAR(50);