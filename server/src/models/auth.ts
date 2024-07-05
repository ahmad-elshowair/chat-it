import { QueryResult } from "pg";
import db from "../database/pool";
import User from "../types/users";
import { buildInsertQuery } from "../utilities/build-insert-query";

class AuthModel {
	//a method to create a new user
	async create(user: User): Promise<User> {
		// CREATE
		const connection = await db.connect();
		try {
			// MAKE SURE THE USER EXIST.
			const checkUser: QueryResult<User> = await connection.query(
				"SELECT * FROM users WHERE email=$1",
				[user.email],
			);

			if (checkUser.rows.length > 0) {
				throw new Error(`User with email ${user.email} is already exist ! `);
			}

			// INSERT THE USER.
			const [query, values] = buildInsertQuery(user);

			const result: QueryResult<User> = await connection.query(query, values);

			// RETURN THE INSERTED USER.
			return result.rows[0];
		} catch (error) {
			console.error(`Error in create method: ${(error as Error).message}`);

			throw new Error(
				`something wrong with create method ${(error as Error).message}`,
			);
		} finally {
			// RELEASE THE CONNECTION.
			connection.release();
		}
	}

	// login user
	async login(email: string, password: string): Promise<User> {
		// connect to the database
		const connection = await db.connect();
		try {
			//select a user form the database
			const checkUser: QueryResult<User> = await db.query(
				"SELECT * FROM users WHERE email=$1",
				[email],
			);
			// return the user
			return checkUser.rows[0];
		} catch (error) {
			throw new Error(
				`something wrong with login method ${(error as Error).message}`,
			);
		} finally {
			// release the connection
			connection.release();
		}
	}
}

export default AuthModel;
