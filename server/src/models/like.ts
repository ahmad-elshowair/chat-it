import { PoolClient, QueryResult } from "pg";
import pool from "../database/pool";
import Like from "../types/like";
import Post from "../types/post";

class LikeModel {
	// like a post
	async like(like: Like): Promise<{ message: string }> {
		// connect to the database
		const connection: PoolClient = await pool.connect();
		try {
			// check if the post exist
			const postExist: QueryResult<Post> = await connection.query(
				"SELECT * FROM posts WHERE post_id = $1",
				[like.post_id],
			);
			if (postExist.rowCount === 0) {
				throw new Error("Post not found");
			}
			// get the current like status
			const likeStatus: QueryResult<Like> = await connection.query(
				"SELECT * FROM likes WHERE post_id = $1 AND user_id = $2",
				[like.post_id, like.user_id],
			);

			// if the user already liked the post, unlike it
			if (likeStatus.rows.length) {
				await connection.query(
					"DELETE FROM likes WHERE post_id = $1 AND user_id = $2",
					[like.post_id, like.user_id],
				);
				return { message: "like removed" };

				// otherwise, like the post
			} else {
				// like the post
				await connection.query(
					"INSERT INTO likes (user_id, post_id) VALUES ($1, $2) RETURNING *",
					[like.user_id, like.post_id],
				);
				// return like
				return { message: "liked" };
			}
		} catch (error) {
			throw new Error(`addLike model: ${(error as Error).message}`);
		} finally {
			// release the the database
			connection.release();
		}
	}
}

export default LikeModel;
