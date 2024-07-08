import { PoolClient, QueryResult } from "pg";
import pool from "../database/pool";
import Like from "../types/like";

class LikeModel {
	// like a post
	async like(like: Like): Promise<{ message: string }> {
		// connect to the database
		const connection: PoolClient = await pool.connect();
		try {
			// Start transaction
			await connection.query("BEGIN");

			// Check if the post exists and get the current like status in one query
			const postAndLikeStatus: QueryResult = await connection.query(
				"SELECT p.*, l.user_id AS liked_by_user FROM posts p LEFT JOIN likes l ON p.post_id = l.post_id AND l.user_id = $2 WHERE p.post_id = $1",
				[like.post_id, like.user_id],
			);

			// If the post does not exist, return an error message
			if (postAndLikeStatus.rowCount === 0) {
				throw new Error("Post not found");
			}

			const post = postAndLikeStatus.rows[0];

			let message: string = "";

			// User already liked the post, unlike it
			if (post.liked_by_user) {
				await connection.query(
					"DELETE FROM likes WHERE post_id = $1 AND user_id = $2",
					[like.post_id, like.user_id],
				);
				message = "like removed";
			} else {
				// Like the post
				await connection.query(
					"INSERT INTO likes (user_id, post_id) VALUES ($1, $2)",
					[like.user_id, like.post_id],
				);
				message = "liked";
			}

			// Update the number_of_likes of a post
			await connection.query(
				`UPDATE posts SET number_of_likes = number_of_likes ${
					post.liked_by_user ? " - 1" : " + 1"
				} WHERE post_id = $1`,
				[like.post_id],
			);

			// Commit transaction
			await connection.query("COMMIT");
			return { message };
		} catch (error) {
			// Rollback transaction on error
			await connection.query("ROLLBACK");
			throw new Error(`addLike model: ${(error as Error).message}`);
		} finally {
			// release the the database connection.
			connection.release();
		}
	}
}

export default LikeModel;
