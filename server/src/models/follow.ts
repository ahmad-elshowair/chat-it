import { PoolClient, QueryResult } from "pg";
import db from "../database/pool";

export default class FollowService {
	// follow
	async follow(
		user_id_following: string,
		user_id_followed: string,
	): Promise<{ message: string }> {
		const connection: PoolClient = await db.connect();
		try {
			// START TRANSACTION
			await connection.query("BEGIN");

			// check if the follower follows the followed
			const queryCheckFollow =
				"SELECT * FROM follows WHERE user_id_following = ($1) AND user_id_followed = ($2)";
			const checkFollow: QueryResult = await connection.query(
				queryCheckFollow,
				[user_id_following, user_id_followed],
			);
			if (checkFollow.rowCount > 0) {
				// un follow the user
				await connection.query(
					"DELETE FROM follows WHERE user_id_following = ($1) AND user_id_followed = ($2)",
					[user_id_following, user_id_followed],
				);

				// DECREMENT THE "number_of_followings" FOR THE FOLLOWING USER.
				await connection.query(
					"UPDATE users SET number_of_followings = number_of_followings - 1 WHERE user_id=($1) AND number_of_followings > 0",
					[user_id_following],
				);

				// DECREMENT THE "number_of_followers" FOR THE FOLLOWED USER.
				await connection.query(
					"UPDATE users SET number_of_followers = number_of_followers - 1 WHERE user_id = ($2) AND number_of_followers > 0",
					[user_id_followed],
				);

				// COMMIT TRANSACTION
				await connection.query("COMMIT");

				return { message: `${user_id_followed} has been un followed` };
			} else {
				// add the follow
				await connection.query(
					`INSERT INTO follows (user_id_following, user_id_followed) VALUES ($1, $2)`,
					[user_id_following, user_id_followed],
				);

				// INCREMENT THE "number_of_followings" FOR THE FOLLOWING USER.
				await connection.query(
					"UPDATE users SET number_of_followings = number_of_followings + 1 WHERE user_id=($1)",
					[user_id_following],
				);

				// INCREMENT THE "number_of_followers" FOR THE FOLLOWED USER.
				await connection.query(
					"UPDATE users SET number_of_followers = number_of_followers + 1 WHERE user_id = ($2)",
					[user_id_followed],
				);

				// COMMIT TRANSACTION
				await connection.query("COMMIT");

				return { message: `${user_id_followed} has been followed !` };
			}
		} catch (error) {
			// ROLLBACK TRANSACTION ON ERROR.
			await connection.query("ROLLBACK");
			throw new Error(`Follow model error: ${(error as Error).message}`);
		} finally {
			// release the connection
			connection.release();
		}
	}

	// get number followings for a user
	async getFollowings(user_id: string): Promise<number> {
		const connection: PoolClient = await db.connect();
		try {
			// get followings query
			const query = `
          SELECT
            COUNT(DISTINCT user_id_followed) AS "followings"
          FROM
            follows
          WHERE
            user_id_following = ($1);
      `;

			// get the followings
			const result = await connection.query(query, [user_id]);
			const numOfFollowings: number = result.rows[0];
			return numOfFollowings;
		} catch (error) {
			throw new Error(
				`get followings model error: ${(error as Error).message}`,
			);
		} finally {
			// release the connection
			connection.release();
		}
	}

	// get number followers for a user
	async getFollowers(user_id: string): Promise<number> {
		const connection: PoolClient = await db.connect();
		try {
			// get the followers
			const result = await connection.query(
				`
          SELECT
            COUNT(DISTINCT f.user_id_following) AS "followers"
          FROM
            follows AS f
          WHERE
            f.user_id_followed = ($1)
        `,
				[user_id],
			);
			const numOfFollowers: number = result.rows[0];
			return numOfFollowers;
		} catch (error) {
			throw new Error(`get followers model error: ${(error as Error).message}`);
		} finally {
			// release the connection
			connection.release();
		}
	}
}
