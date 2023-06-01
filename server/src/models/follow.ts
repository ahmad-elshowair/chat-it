import { QueryResult } from "pg";
import db from "../database/pool";
import Follow from "../types/follow";

export default class FollowService {
	// add follow method
	async addFollow(follower_id: string, followed_id: string): Promise<Follow> {
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
				throw new Error("You are already following this user");
			}

			// add the follow
			const sql = `INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2) RETURNING *`;
			const result: QueryResult<Follow> = await connection.query(sql, [
				follower_id,
				followed_id,
			]);
			return result.rows[0];
		} catch (error) {
			throw new Error(`addFollow model error: ${(error as Error).message}`);
		} finally {
			// release the connection
			connection.release();
		}
	}
	// delete follow method
	async deleteFollow(
		follower_id: string,
		followed_id: string,
	): Promise<Follow> {
		// connect to the database
		const connection = await db.connect();
		try {
			// check if the follow exist
			const queryCheckFollow =
				"SELECT * FROM follows WHERE follower_id = $1 AND followed_id = $2";
			const checkFollow: QueryResult = await connection.query(
				queryCheckFollow,
				[follower_id, followed_id],
			);
			if (checkFollow.rowCount < 1) {
				throw new Error("You are not following this user");
			}

			// delete the follow
			const sql = `DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2 RETURNING *`;

			const result: QueryResult<Follow> = await connection.query(sql, [
				follower_id,
				followed_id,
			]);
			return result.rows[0];
		} catch (error) {
			throw new Error(`deleteFollow model error: ${(error as Error).message}`);
		}
	}
}
