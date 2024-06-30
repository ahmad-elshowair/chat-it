/* drop number_of_likes & number_of_comments*/
ALTER TABLE posts
DROP COLUMN number_of_likes INTEGER,
DROP COLUMN number_Of_comments INTEGER;