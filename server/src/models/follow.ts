import { QueryResult } from "pg";
import db from "../database/pool";
import Follow from "../types/follow";

export default class FollowService {
	// add follow method
	async addFollow(follower_id: string, followed_id: string): Promise<Follow> {
		try {
			const sql = `INSERT INTO follows (user_id, follow_id) VALUES ($1, $2) RETURNING *`;
			const values = [follower_id, followed_id];
			const result: QueryResult<Follow> = await db.query(sql, values);
			return result.rows[0];
		} catch (error) {
			throw new Error(`addFollow model error: ${(error as Error).message}`);
		}
	}
	// delete follow method
	async deleteFollow(
		follower_id: string,
		followed_id: string,
	): Promise<Follow> {
		try {
			const sql = `DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2 RETUNING *`;
			const values = [follower_id, followed_id];
			const result: QueryResult<Follow> = await db.query(sql, values);
			return result.rows[0];
		} catch (error) {
			throw new Error(`deleteFollow model error: ${(error as Error).message}`);
		}
	}
}
