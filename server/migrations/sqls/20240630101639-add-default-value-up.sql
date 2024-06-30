/* alter the default value of number_of_likes & number_of_comments*/
ALTER TABLE posts
ALTER COLUMN number_of_likes
SET DEFAULT 0,
ALTER COLUMN number_Of_comments
SET DEFAULT 0;