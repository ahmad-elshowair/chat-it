import { QueryResult } from "pg";
import db from "../database/pool";
import User from "../types/users";
import passwords from "../utilities/passwords";

class AuthModel {
	//a method to create a new user
	async create(user: User): Promise<User> {
		// connect to the database
		const connection = await db.connect();
		try {
			// check ig the user exist
			const checkUser: QueryResult<User> = await db.query(
				"SELECT * FROM users WHERE email=$1",
				[user.email],
			);

			if (checkUser.rows.length > 0) {
				throw new Error(`this ${user.email} is already exist ! `);
			}

			// insert the new user
			const insertUser = await db.query(
				"INSERT INTO users (user_name, email, password) VALUES ($1, $2, $3) RETURNING *",
				[user.user_name, user.email, passwords.hashPassword(user.password)],
			);
			// return the inserted user
			return insertUser.rows[0];
		} catch (error) {
			throw new Error(
				`something wrong with create method ${(error as Error).message}`,
			);
		} finally {
			// release the connection
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
