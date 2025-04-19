import { PoolClient, QueryResult } from "pg";
import pool from "../database/pool";
import { Like } from "../types/like";

class LikeModel {
  async like(
    like: Like
  ): Promise<{ message: string; action: "liked" | "unliked" }> {
    if (!like.post_id || !like.user_id)
      throw new Error(
        "Missing required fields: post_id and user_id are required"
      );
    {
      const connection: PoolClient = await pool.connect();
      try {
        // Start transaction
        await connection.query("BEGIN");

        const postCheckQuery = `
	  	SELECT 
	  		p.*,
			l.user_id AS liked_by_user 
		FROM
			posts p 
		LEFT JOIN
			likes l ON p.post_id = l.post_id AND l.user_id = $2
		WHERE p.post_id = $1`;

        const postAndLikeStatus: QueryResult = await connection.query(
          postCheckQuery,
          [like.post_id, like.user_id]
        );

        // If the post does not exist, return an error message
        if (postAndLikeStatus.rowCount === 0) {
          throw new Error("Post not found");
        }

        const post = postAndLikeStatus.rows[0];
        const isAlreadyLiked = !!post.liked_by_user;
        let message: string;
        let action: "liked" | "unliked";

        if (isAlreadyLiked) {
          // UNLIKE THE POST.
          const unlikeQuery = `
			DELETE FROM likes
			WHERE post_id = $1 AND user_id = $2
		`;
          await connection.query(unlikeQuery, [like.post_id, like.user_id]);
          message = "Like removed successfully";
          action = "unliked";
        } else {
          // LIKE THE POST.
          const likeQuery = `
			INSERT INTO likes (user_id, post_id)
			VALUES ($1, $2)`;

          await connection.query(likeQuery, [like.user_id, like.post_id]);
          message = "Post liked successfully";
          action = "liked";
        }

        // UPDATE THE number_of_likes OF A POST.
        const updateLikeCountQuery = `
		UPDATE posts
		SET
			number_of_likes = number_of_likes ${isAlreadyLiked ? "-1" : "+1"},
			updated_at = NOW()
		WHERE post_id = $1`;
        await connection.query(updateLikeCountQuery, [like.post_id]);

        // COMMIT THE TRANSACTION
        await connection.query("COMMIT");
        return { message, action };
      } catch (error) {
        // ROLLBACK THE TRANSACTION ON ERROR.
        await connection.query("ROLLBACK");
        throw new Error(`Like operation failed: ${(error as Error).message}`);
      } finally {
        // release the the database connection.
        connection.release();
      }
    }
  }

  async checkIfLiked(
    user_id: string,
    post_id: string
  ): Promise<{ isLiked: boolean }> {
    if (!user_id || !post_id) {
      throw new Error(
        "Missing required fields: user_id and post_id are required"
      );
    }

    const connection: PoolClient = await pool.connect();

    try {
      const query = `
      SELECT 1
	  FROM likes
	  WHERE user_id = $1 AND post_id = $2
    `;
      const result: QueryResult<Like> = await connection.query(query, [
        user_id,
        post_id,
      ]);

      return { isLiked: result.rows.length > 0 };
    } catch (error) {
      console.error("Error checking like Status:", error);
      throw new Error(`Error checking like: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }
}

export default LikeModel;
