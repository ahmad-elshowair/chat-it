import pool from "../database/pool";
import Post from "../types/post";

class PostModel {
	// create a post method
	async create(post: Post) {
		// connect to the database
		const connection = await pool.connect();
		try {
			// create post query
			const sql =
				"INSERT INTO posts (user_id, description) VALUES($1, $2) RETURNING *";
			// insert post data
			const insertPost = await connection.query(sql, [
				post.user_id,
				post.description,
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

	// get all posts

	// get a post by id

	// update a post

	// delete a post
}

export default PostModel;
