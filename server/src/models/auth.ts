import { QueryResult } from "pg";
import db from "../database/pool";
import { User } from "../types/users";
import { buildInsertQuery } from "../utilities/build-insert-query";

class AuthModel {
	//a method to create a new user
	async register(registerCredentials: User): Promise<User> {
		const connection = await db.connect();
		try {
			// MAKE SURE THE EMAIL IS NOT EXIST.
			const result = await connection.query<User>(
				"SELECT * FROM users WHERE email=$1",
				[registerCredentials.email],
			);
			const user = result.rows[0];

			if (user) {
				throw new Error(`Email is already in user !`);
			}

			const [query, values] = buildInsertQuery(registerCredentials);
			// Insert the user into the database
			const registerUserResult: QueryResult<User> = await connection.query(
				query,
				values,
			);

			const registeredUser = registerUserResult.rows[0];

			// Commit the transaction
			await connection.query("COMMIT");

			// RETURN THE INSERTED USER.
			return registeredUser;
		} catch (error) {
			// Rollback the transaction on error
			await connection.query("ROLLBACK");
			console.error(`Error in create model: ${(error as Error).message}`);

			throw new Error(`Error in create model ${(error as Error).message}`);
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
			const result = await db.query<User>(
				"SELECT * FROM users WHERE email=$1",
				[email],
			);
			const user = result.rows[0];
			if (!user) {
				throw new Error(`user not found !`);
			}
			// return the user
			return user;
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
