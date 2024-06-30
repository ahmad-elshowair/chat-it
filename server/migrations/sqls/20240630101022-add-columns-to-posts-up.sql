/* add number_of_likes & number_of_comments*/
ALTER TABLE posts
ADD COLUMN number_of_likes INTEGER,
ADD COLUMN number_Of_comments INTEGER;