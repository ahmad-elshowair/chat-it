import { QueryResult } from "pg";
import pool from "../database/pool";
import Post from "../types/post";

class PostModel {
  // create a post
  async create(post: Post): Promise<Post> {
    // connect to the database
    const connection = await pool.connect();
    try {
      // create post query
      const sql =
        "INSERT INTO posts (user_id, description, image) VALUES($1, $2, $3) RETURNING *";
      // insert post data
      const insertPost: QueryResult<Post> = await connection.query(sql, [
        post.user_id,
        post.description,
        post.image,
      ]);
      // return post
      return insertPost.rows[0];
    } catch (error) {
      throw new Error(`create model: ${(error as Error).message}`);
    } finally {
      // release the the database
      connection.release();
    }
  }

  // get a post by id
  async getById(id: string): Promise<Post> {
    // connect to the database
    const connection = await pool.connect();
    try {
      // get post data
      const post: QueryResult<Post> = await connection.query(
        "SELECT * FROM posts WHERE post_id = $1",
        [id]
      );
      // check if the post exist
      if (post.rowCount === 0) {
        throw new Error("Post not found");
      }
      // return post
      return post.rows[0];
    } catch (error) {
      throw new Error(`getById model: ${(error as Error).message}`);
    } finally {
      // release the the database
      connection.release();
    }
  }

  // get all posts
  async getAll(): Promise<Post[]> {
    // connect to the database
    const connection = await pool.connect();
    try {
      // get all posts
      const posts: QueryResult<Post> = await connection.query(
        "SELECT * FROM posts ORDER BY post_id DESC"
      );
      // return posts
      return posts.rows;
    } catch (error) {
      throw new Error(`getAll model: ${(error as Error).message}`);
    } finally {
      // release the the database
      connection.release();
    }
  }

  // update a post
  async update(id: string, post: Post): Promise<Post> {
    // connect to the database
    const connection = await pool.connect();
    try {
      // check if the post exist
      const postExist: QueryResult<Post> = await connection.query(
        "SELECT * FROM posts WHERE post_id = $1",
        [id]
      );
      if (postExist.rowCount === 0) {
        throw new Error("Post not found");
      }
      // update the post
      const updatePost: QueryResult<Post> = await connection.query(
        "UPDATE posts SET description = $1, image = $2, updated_at = $3 WHERE post_id = $4 RETURNING *",
        [post.description, post.image, post.updated_at, id]
      );
      // return post
      return updatePost.rows[0];
    } catch (error) {
      throw new Error(`update model: ${(error as Error).message}`);
    } finally {
      // release the the database
      connection.release();
    }
  }

  // delete a post
  async delete(id: string): Promise<{ message: string }> {
    // connect to the database
    const connection = await pool.connect();
    try {
      // check if the post exist
      const postExist: QueryResult<Post> = await connection.query(
        "SELECT * FROM posts WHERE post_id = $1",
        [id]
      );
      if (postExist.rowCount === 0) {
        throw new Error("Post not found");
      }
      // delete the post
      await connection.query("DELETE FROM posts WHERE post_id = $1", [id]);
      // return a message
      return { message: `POST: ${id} HAS BEEN DELETED !` };
    } catch (error) {
      throw new Error(`delete model: ${(error as Error).message}`);
    } finally {
      // release the the database
      connection.release();
    }
  }
  // get all post by user id
  async getAllByUserId(userId: string) {
    // connect to the database
    const connection = await pool.connect();
    try {
      // query of all post for a user
      const userPostsQuery = `
		SELECT 
			u.user_name, p.description, p.image, p.created_at
		FROM
			users AS U
		LEFT JOIN 
			posts AS p	
		ON
			u.user_id= p.user_id
		WHERE 
			u.user_id = ($1)
		ORDER BY 
			p.updated_at DESC
	  `;
      // get all posts of a user
      const posts = await connection.query(userPostsQuery, [userId]);
      // return posts
      return posts.rows;
    } catch (error) {
      throw new Error(
        `get all post by a user model: ${(error as Error).message}`
      );
    } finally {
      // release the the database
      connection.release();
    }
  }

  // get all the posts of a user and followings'
  async getAllByUserIdAndFollowing(userId: string): Promise<Post[]> {
    // connect to the database
    const connection = await pool.connect();
    try {
      // get all posts
      const posts: QueryResult<Post> = await connection.query(
        `
			SELECT 
				p.description, p.image, u.user_name, p.updated_at, u.picture
			FROM 
				posts p
			JOIN 
				users u 
			ON 
				p.user_id = u.user_id
			WHERE 
				u.user_id = ($1)
   			OR 
				u.user_id 
			IN (
      				SELECT 
						user_id_followed
      				FROM 
						follows
      				WHERE 
						user_id_following = ($1)
   				)
			ORDER BY
				p.updated_at DESC;`,
        [userId]
      );
      // return posts
      return posts.rows;
    } catch (error) {
      throw new Error(`getAllByUserId model: ${(error as Error).message}`);
    } finally {
      // release the the database
      connection.release();
    }
  }
}

export default PostModel;
