import { QueryResult } from "pg";
import db from "../database/pool";
import User from "../types/users";
import passwords from "../utilities/passwords";

class UserModel {
	// get all users
	async getAll(): Promise<User[] | undefined> {
		try {
			// connect to the database
			const connection = await db.connect();
			// get all the users
			const getUsersQuery = "SELECT * FROM users";
			const getUsers: QueryResult<User> = await db.query(getUsersQuery);
			// if there are not users return a message
			if (getUsers.rowCount < 1) {
				throw new Error("NO USERS FOND!");
			}
			const users = getUsers.rows;
			// return the users
			return users;
		} catch (error) {
			throw new Error(`model: ${(error as Error).message}`);
		}
	}

	// update the user
	async update(id: string, body: User): Promise<User | undefined> {
		// connect to the database
		const connection = await db.connect();
		try {
			// get the user
			const getUserQuery = "SELECT * FROM users WHERE user_id = $1";
			const getUser: QueryResult<User> = await db.query(getUserQuery, [id]);
			// if the user is not found return a message
			if (getUser.rowCount === 0) {
				throw new Error("THIS USER IS NOT EXIST !");
			}
			// update the user
			const updateUserQuery =
				"UPDATE users SET user_name = $1, email = $2, password = $3, picture =$4, cover = $5, followers= $6, following = $7, is_admin = $8, description = $9, city = $10, home_town = $11, updated_at = $12 WHERE user_id = $13 RETURNING *";
			const updateUser: QueryResult<User> = await db.query(updateUserQuery, [
				body.user_name,
				body.email,
				passwords.hashPassword(body.password),
				body.picture,
				body.cover,
				body.followers,
				body.following,
				body.is_admin,
				body.description,
				body.city,
				body.home_town,
				body.updated_at,
				id,
			]);

			// return the user
			return updateUser.rows[0];
		} catch (error) {
			throw new Error(`cannot update ${id} due to ${(error as Error).message}`);
		} finally {
			// release the connection
			connection.release();
		}
	}

	// delete the user
}
export default UserModel;
