import { QueryResult } from "pg";
import db from "../database/pool";

export default class FollowService {
	// add follow method
	async follow(
		follower_id: string,
		followed_id: string,
	): Promise<{ message: string }> {
		const connection = await db.connect();
		try {
			// check if the follower follows the followed
			const queryCheckFollow =
				"SELECT * FROM follows WHERE follower_id = $1 AND followed_id = $2";
			const checkFollow: QueryResult = await connection.query(
				queryCheckFollow,
				[follower_id, followed_id],
			);
			if (checkFollow.rowCount > 0) {
				// un follow the user
				await connection.query(
					"DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2 RETURNING *",
					[follower_id, followed_id],
				);
				return { message: `${followed_id} has been un followed` };
			} else {
				// add the follow
				await connection.query(
					`INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2) RETURNING *`,
					[follower_id, followed_id],
				);
				return { message: `${followed_id} has been followed !` };
			}
		} catch (error) {
			throw new Error(`Follow model error: ${(error as Error).message}`);
		} finally {
			// release the connection
			connection.release();
		}
	}
}
