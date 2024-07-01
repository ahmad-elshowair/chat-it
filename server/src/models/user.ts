import { QueryResult } from "pg";
import db from "../database/pool";
import User from "../types/users";
import { buildUpdateQuery } from "../utilities/build-update-query";

class UserModel {
	// get all users
	async getAll(): Promise<User[]> {
		const connection = await db.connect();
		try {
			// connect to the database
			// get all the users
			const getUsersQuery = "SELECT * FROM users";
			const getUsers: QueryResult<User> = await connection.query(getUsersQuery);
			// if there are not users return a message
			if (getUsers.rowCount < 1) {
				throw new Error("NO USERS FOND!");
			}
			const users = getUsers.rows;
			// return the users
			return users;
		} catch (error) {
			throw new Error(`model: ${(error as Error).message}`);
		} finally {
			// close the connection
			connection.release();
		}
	}

	// get a user by username
	async getAUser(identifier: { [key: string]: string }): Promise<User> {
		// connect to the database
		const connection = await db.connect();
		try {
			const keys = Object.keys(identifier);
			const values = Object.values(identifier);

			const conditions = keys
				.map((key, index) => `${key}= $${index + 1}`)
				.join(" OR ");
			console.log(conditions);

			const getAUserQuery = `SELECT * FROM users WHERE ${conditions}`;
			const result: QueryResult<User> = await connection.query(
				getAUserQuery,
				values,
			);

			// if there is not user return a message
			if (result.rowCount < 1) {
				throw new Error("NO USER FOUND!");
			}
			// return the user
			return result.rows[0];
		} catch (error) {
			throw new Error(`model: ${(error as Error).message}`);
		} finally {
			// close the connection
			connection.release();
		}
	}

	// update the user
	async update(id: string, user: User): Promise<User> {
		// connect to the database
		const connection = await db.connect();
		try {
			// get the user
			const getUserQuery = "SELECT * FROM users WHERE user_id = ($1)";
			const getUser: QueryResult<User> = await connection.query(getUserQuery, [
				id,
			]);
			// if the user is not found return a message
			if (getUser.rowCount === 0) {
				throw new Error("THIS USER IS NOT EXIST !");
			}
			// update the user

			// Build the dynamic update query.
			const [updateUserQuery, values] = buildUpdateQuery(id, user);
			const UpdateUser: QueryResult<User> = await connection.query(
				updateUserQuery,
				values,
			);

			// return the user
			return UpdateUser.rows[0];
		} catch (error) {
			throw new Error(
				`cannot update ${user.user_name} due to ${(error as Error).message}`,
			);
		} finally {
			// release the connection
			connection.release();
		}
	}

	// delete the user
	async delete(id: string): Promise<User> {
		// connect to the database
		const connection = await db.connect();
		try {
			// get the user
			const getUserQuery = "SELECT * FROM users WHERE user_id = ($1)";
			const getUser: QueryResult<User> = await connection.query(getUserQuery, [
				id,
			]);
			// if the user is not found return a message
			if (getUser.rowCount === 0) {
				throw new Error("THIS USER IS NOT EXIST !");
			}
			// delete the user
			const deleteUserQuery =
				"DELETE FROM users WHERE user_id = ($1) RETURNING *";
			const deleteUser: QueryResult<User> = await connection.query(
				deleteUserQuery,
				[id],
			);
			// return the user
			return deleteUser.rows[0];
		} catch (error) {
			throw new Error(`cannot delete ${id} due to ${(error as Error).message}`);
		} finally {
			// release the connection
			connection.release();
		}
	}
}
export default UserModel;
