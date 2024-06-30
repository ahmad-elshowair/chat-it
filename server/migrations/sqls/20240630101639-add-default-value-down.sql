/* reset the value of number_of_likes & number_of_comments*/
ALTER TABLE posts
ALTER COLUMN number_of_likes
SET DEFAULT NULL,
ALTER COLUMN number_Of_comments
SET DEFAULT NULL;