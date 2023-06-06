import { QueryResult } from "pg";
import pool from "../database/pool";
import Like from "../types/like";
import Post from "../types/post";

class LikeModel {
	// like a post
	async addLike(like: Like): Promise<Like> {
		// connect to the database
		const connection = await pool.connect();
		try {
			// check if the post exist
			const postExist: QueryResult<Post> = await connection.query(
				"SELECT * FROM posts WHERE post_id = $1",
				[like.post_id],
			);
			if (postExist.rowCount === 0) {
				throw new Error("Post not found");
			} else {
				// check if the user did like this post
				const likeExist: QueryResult<Like> = await connection.query(
					"SELECT * FROM likes WHERE post_id = $1 AND user_id = $2",
					[like.post_id, like.user_id],
				);
				if (likeExist.rowCount > 0) {
					throw new Error("You have already liked this post");
				} else {
					// add like to post
					const addLike: QueryResult<Like> = await connection.query(
						"INSERT INTO likes (user_id, post_id) VALUES ($1, $2) RETURNING *",
						[like.user_id, like.post_id],
					);
					// return like
					return addLike.rows[0];
				}
			}
		} catch (error) {
			throw new Error(`addLike model: ${(error as Error).message}`);
		} finally {
			// release the the database
			connection.release();
		}
	}

	// unlike a post
}

export default LikeModel;
